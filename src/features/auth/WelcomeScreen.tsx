import React, { useState } from 'react';
import { ChevronLeft, MailCheck } from 'lucide-react';
import { sound } from '../../services/sound';
import { useToast } from '../../components/common/Toast';
import { useBackHandler } from '../../utils/useBackHandler';
import { validateEmail, validatePassword } from '../../utils/authValidation';
import { WelcomeLanding } from './WelcomeLanding';
import { SignUpFlow, SignUpStep } from './SignUpFlow';
import { SignInForm } from './SignInForm';

const AppShowcase = React.lazy(() =>
  import('./AppShowcase').then((m) => ({ default: m.AppShowcase }))
);

interface WelcomeScreenProps {
  onSignIn: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  onSignUp: (
    name: string,
    email: string,
    password?: string
  ) => Promise<{ success: boolean; message?: string; requiresEmailVerification?: boolean }>;
  onQuickStart: () => void;
  pendingInviteCode?: string | null;
  onDismissInvite?: () => void;
  isRevealed?: boolean;
}

type ScreenStage = 'showcase' | 'welcome' | 'signup' | 'signin';

const SIGNUP_PROGRESS: Record<SignUpStep, number> = {
  name: 34,
  email: 68,
  password: 100,
};

function markWalkthroughSeen() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('roomie_walkthrough_seen', '1');
  }
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSignIn,
  onSignUp,
  onQuickStart,
  pendingInviteCode,
  onDismissInvite,
  isRevealed = true,
}) => {
  const { showToast } = useToast();

  const [stage, setStage] = useState<ScreenStage>(() => {
    if (pendingInviteCode) {
      return 'welcome';
    }
    if (typeof window !== 'undefined' && !localStorage.getItem('roomie_walkthrough_seen')) {
      return 'showcase';
    }
    return 'welcome';
  });

  const [signUpStep, setSignUpStep] = useState<SignUpStep>('name');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const exitShowcaseTo = (nextStage: Exclude<ScreenStage, 'showcase'>) => {
    markWalkthroughSeen();
    if (nextStage === 'signup') setSignUpStep('name');
    setStage(nextStage);
  };

  const handleBack = () => {
    sound.playTap();
    if (stage === 'signup') {
      if (signUpStep === 'password') {
        setSignUpStep('email');
        return;
      }
      if (signUpStep === 'email') {
        setSignUpStep('name');
        return;
      }
    }
    setStage('welcome');
  };

  useBackHandler(isRevealed && stage === 'showcase', 50, () => exitShowcaseTo('welcome'));
  useBackHandler(isRevealed && stage !== 'welcome' && stage !== 'showcase', 50, handleBack);

  const handleSignInSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      showToast(emailCheck.error || 'Please enter a valid email address.', 'error');
      return;
    }
    if (!useMagicLink && !password) {
      showToast('Please enter your password (or switch to magic link).', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await onSignIn(email.trim().toLowerCase(), useMagicLink ? undefined : password);
      if (res && !res.success) {
        showToast(res.message || 'Could not log in. Check your details.', 'error');
      } else if (useMagicLink) {
        showToast('Magic link check sent for your account.', 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (name.trim().length < 2) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      showToast(emailCheck.error || 'Please enter a valid email address.', 'error');
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      showToast(passwordCheck.error || 'Please meet all password rules.', 'error');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await onSignUp(name.trim(), cleanEmail, password);
      if (res && !res.success) {
        showToast(res.message || 'Could not create account.', 'error');
      } else if (res?.requiresEmailVerification) {
        setVerificationSentTo(cleanEmail);
        showToast(res.message || 'Check your email to confirm your account.', 'success');
        setStage('signin');
      }
    } finally {
      setLoading(false);
    }
  };

  if (stage === 'showcase') {
    if (!isRevealed) {
      return <div className="min-h-[100dvh] bg-white" />;
    }

    return (
      <React.Suspense fallback={<div className="min-h-[100dvh] bg-white" />}>
        <AppShowcase
          isActive={isRevealed}
          onComplete={() => exitShowcaseTo('welcome')}
          onSkip={() => exitShowcaseTo('welcome')}
          onSignIn={() => exitShowcaseTo('signin')}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FB] flex flex-col justify-between p-5 sm:p-7 pt-safe pb-safe max-w-md mx-auto">
      {stage !== 'welcome' && (
        <div className="pt-2 pb-4 flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-2 text-[#475569] hover:text-[#1F2430] active:scale-90 transition-transform cursor-pointer shrink-0 focus:outline-none"
            aria-label="Go back"
          >
            <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
          </button>

          {stage === 'signup' && (
            <div className="flex-1 h-3.5 bg-[#E6E8EE] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-[#FF6B4A] rounded-full transition-all duration-300"
                style={{ width: `${SIGNUP_PROGRESS[signUpStep]}%` }}
              />
            </div>
          )}
        </div>
      )}

      {stage === 'welcome' && (
        <WelcomeLanding
          isRevealed={isRevealed}
          pendingInviteCode={pendingInviteCode}
          onDismissInvite={onDismissInvite}
          onGetStarted={() => {
            setVerificationSentTo(null);
            setSignUpStep('name');
            setStage('signup');
          }}
          onSignIn={() => setStage('signin')}
          onReplayShowcase={() => setStage('showcase')}
          onDemoFlat={onQuickStart}
        />
      )}

      {stage === 'signup' && (
        <SignUpFlow
          step={signUpStep}
          name={name}
          email={email}
          password={password}
          loading={loading}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onStepChange={setSignUpStep}
          onSubmit={handleSignUpSubmit}
          onSwitchToSignIn={() => setStage('signin')}
        />
      )}

      {stage === 'signin' && (
        <div className="flex-1 flex flex-col">
          {verificationSentTo && (
            <div className="mb-4 p-3.5 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-start gap-2.5">
              <MailCheck className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
              <div className="text-left text-xs leading-relaxed text-[#3730A3]">
                <p className="font-black">Confirm your email to continue</p>
                <p className="mt-0.5 text-[#4338CA]">
                  We sent a verification link to <span className="font-bold">{verificationSentTo}</span>. Once confirmed, sign in below.
                </p>
              </div>
            </div>
          )}
          <SignInForm
            email={email}
            password={password}
            useMagicLink={useMagicLink}
            loading={loading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onToggleMagicLink={setUseMagicLink}
            onSubmit={handleSignInSubmit}
            onSwitchToSignUp={() => {
              setVerificationSentTo(null);
              setSignUpStep('name');
              setStage('signup');
            }}
          />
        </div>
      )}
    </div>
  );
};
