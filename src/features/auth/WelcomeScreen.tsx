import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { sound } from '../../services/sound';
import { AppShowcase } from './AppShowcase';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  Check,
  Home,
  Users,
  Smile,
  Compass,
  UtensilsCrossed,
  Receipt,
  Trash2,
  Scale,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface WelcomeScreenProps {
  onSignIn: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  onSignUp: (name: string, email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  onQuickStart: () => void;
  isRevealed?: boolean;
}

type ScreenStage =
  | 'showcase'
  | 'welcome'
  | 'onboarding_intro'
  | 'onboarding_situation'
  | 'onboarding_motivate_1'
  | 'onboarding_headache'
  | 'onboarding_motivate_2'
  | 'signup_name'
  | 'signup_name_motivate'
  | 'signup_email'
  | 'signup_password'
  | 'signin';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSignIn,
  onSignUp,
  onQuickStart,
  isRevealed = true,
}) => {
  const { showToast } = useToast();

  const [stage, setStage] = useState<ScreenStage>(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = localStorage.getItem('roomie_walkthrough_seen');
      if (!hasSeen) return 'showcase';
    }
    return 'welcome';
  });

  // Onboarding survey answers
  const [situation, setSituation] = useState<string>('');
  const [headache, setHeadache] = useState<string>('');

  // Form states — blank by default
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstName = name.trim().split(' ')[0] || name.trim() || 'Flatmate';

  // Progress percentage for Duolingo-style progress bar
  const getProgress = (): number => {
    switch (stage) {
      case 'onboarding_intro':
        return 12;
      case 'onboarding_situation':
        return 25;
      case 'onboarding_motivate_1':
        return 38;
      case 'onboarding_headache':
        return 50;
      case 'onboarding_motivate_2':
        return 62;
      case 'signup_name':
        return 74;
      case 'signup_name_motivate':
        return 82;
      case 'signup_email':
        return 90;
      case 'signup_password':
        return 100;
      default:
        return 0;
    }
  };

  const handleSignInSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    if (!useMagicLink && !password) {
      showToast('Please enter your password (or switch to magic link)', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await onSignIn(email.trim(), useMagicLink ? undefined : password);
      if (res && !res.success) {
        showToast(res.message || 'Could not log in. Check your details.', 'error');
      } else if (useMagicLink) {
        showToast('Magic link sent! Check your email inbox.', 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (password && password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await onSignUp(name.trim(), email.trim(), password || undefined);
      if (res && !res.success) {
        showToast(res.message || 'Could not create account', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    sound.playTap();
    switch (stage) {
      case 'onboarding_intro':
        setStage('welcome');
        break;
      case 'onboarding_situation':
        setStage('onboarding_intro');
        break;
      case 'onboarding_motivate_1':
        setStage('onboarding_situation');
        break;
      case 'onboarding_headache':
        setStage('onboarding_motivate_1');
        break;
      case 'onboarding_motivate_2':
        setStage('onboarding_headache');
        break;
      case 'signup_name':
        setStage('onboarding_motivate_2');
        break;
      case 'signup_name_motivate':
        setStage('signup_name');
        break;
      case 'signup_email':
        setStage('signup_name_motivate');
        break;
      case 'signup_password':
        setStage('signup_email');
        break;
      case 'signin':
        setStage('welcome');
        break;
      default:
        setStage('welcome');
    }
  };

  if (stage === 'showcase') {
    return (
      <AppShowcase
        isActive={isRevealed}
        onComplete={() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('roomie_walkthrough_seen', '1');
          }
          setStage('onboarding_intro');
        }}
        onSkip={() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('roomie_walkthrough_seen', '1');
          }
          setStage('welcome');
        }}
        onSignIn={() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('roomie_walkthrough_seen', '1');
          }
          setStage('signin');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-5 sm:p-7 max-w-md mx-auto">
      {/* TOP BAR / PROGRESS HEADER */}
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

          {stage !== 'signin' && (
            <div className="flex-1 h-3.5 bg-[#E6E8EE] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-[#FF6B4A] rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 1. WELCOME SCREEN (Duolingo Landing) */}
      {stage === 'welcome' && (
        <div key="welcome" className="flex-1 flex flex-col justify-between">
          <div className="pt-4 sm:pt-8 flex flex-col items-center text-center">
            <div className={isRevealed ? 'animate-pop-in' : 'opacity-0'}>
              <MascotView
                state="celebrating"
                size="xl"
                bubbleText="Welcome to Roomie!"
              />
            </div>

            <div className="mt-4 space-y-2">
              <h1 className={`font-heading font-black text-[26px] sm:text-[32px] leading-tight text-[#1F2430] tracking-tight ${
                isRevealed ? 'animate-fade-up delay-150' : 'opacity-0'
              }`}>
                The joyful way to share a home.
              </h1>
              <p className={`type-body text-[#6B7280] max-w-xs mx-auto text-sm sm:text-base leading-relaxed ${
                isRevealed ? 'animate-fade-up delay-250' : 'opacity-0'
              }`}>
                Fair chores, quiet splits, and happy flatmates living in harmony.
              </p>
            </div>
          </div>

          <div className="my-4 sm:my-6 space-y-3">
            <div className={isRevealed ? 'animate-fade-up delay-300' : 'opacity-0'}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  sound.playTap();
                  setStage('onboarding_intro');
                }}
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Get Started
              </Button>
            </div>

            <div className={isRevealed ? 'animate-fade-up delay-350' : 'opacity-0'}>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => {
                  sound.playTap();
                  setStage('signin');
                }}
              >
                I already have an account
              </Button>
            </div>

            <div className={`pt-2 text-center flex items-center justify-center gap-2 ${isRevealed ? 'animate-fade-up delay-400' : 'opacity-0'}`}>
              <button
                type="button"
                onClick={() => setStage('showcase')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] py-1.5 px-3 rounded-full hover:bg-white transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B4A]" />
                <span>Replay presentation</span>
              </button>
              <span className="text-[#CBD5E1]">•</span>
              <button
                type="button"
                onClick={onQuickStart}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] py-1.5 px-3 rounded-full hover:bg-white transition-all cursor-pointer"
              >
                <span>Demo flat</span>
              </button>
            </div>
          </div>

          <div className={`text-center pb-2 ${isRevealed ? 'animate-fade-in delay-500' : 'opacity-0'}`}>
            <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
              By continuing, you agree to Roomie's Community Guidelines and Privacy Policy.
            </p>
          </div>
        </div>
      )}

      {/* 2. ONBOARDING INTRO (Duolingo: "Just 2 questions before...") */}
      {stage === 'onboarding_intro' && (
        <div key="onboarding_intro" className="flex-1 flex flex-col justify-between py-6 text-center items-center">
          <div className="space-y-6 my-auto max-w-xs">
            <div className="animate-pop-in">
              <MascotView
                state="celebrating"
                size="xl"
                bubbleText="Ready for flat harmony?"
              />
            </div>

            <div className="space-y-2.5 animate-fade-up delay-150">
              <h2 className="font-heading font-black text-3xl text-[#1F2430] leading-tight">
                Just <span className="text-[#FF6B4A]">2 quick questions</span> before your first use!
              </h2>
              <p className="type-body text-[#6B7280] text-sm leading-relaxed">
                We'll customize your flat preferences so chore drafts and expense splits feel effortless from day one.
              </p>
            </div>
          </div>

          <div className="w-full pt-6 animate-fade-up delay-300">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                sound.playSuccess();
                setStage('onboarding_situation');
              }}
            >
              Let's Do It
            </Button>
          </div>
        </div>
      )}

      {/* 2. ONBOARDING: QUESTION 1 (Situation) */}
      {stage === 'onboarding_situation' && (
        <div key="onboarding_situation" className="flex-1 flex flex-col justify-between py-4">
          <div className="space-y-6">
            <div className="flex items-start gap-3 animate-fade-up">
              <MascotView state="thinking" size="sm" />
              <div className="space-y-1">
                <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                  What describes your home right now?
                </h2>
                <p className="type-secondary text-sm text-[#6B7280]">
                  This helps us tailor your flat's setup.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { id: 'uni_flat', icon: <Home className="w-5 h-5" />, title: 'Student apartment / University flat', desc: 'Sharing with friends or classmates', delay: 'delay-75' },
                { id: 'shared_flat', icon: <Users className="w-5 h-5" />, title: 'Private shared flat', desc: 'Young professionals or friends sharing rent', delay: 'delay-150' },
                { id: 'new_roomies', icon: <Smile className="w-5 h-5" />, title: 'Moving into a new place soon', desc: 'Setting up rules & chores from scratch', delay: 'delay-200' },
                { id: 'exploring', icon: <Compass className="w-5 h-5" />, title: 'Just curious & exploring', desc: 'Checking out how Roomie works', delay: 'delay-250' },
              ].map((opt) => (
                <div key={opt.id} className={`animate-fade-up ${opt.delay}`}>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setSituation(opt.id);
                    }}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] ${
                      situation === opt.id
                        ? 'border-[#FF6B4A] bg-[#FFF0ED] shadow-xs'
                        : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={`p-2.5 rounded-xl ${situation === opt.id ? 'bg-[#FF6B4A] text-white' : 'bg-[#F1F3F9] text-[#475569]'}`}>
                        {opt.icon}
                      </span>
                      <div>
                        <h4 className="font-heading font-black text-[15px] text-[#1F2430]">
                          {opt.title}
                        </h4>
                        <p className="type-secondary text-xs text-[#6B7280]">
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                    {situation === opt.id && (
                      <span className="w-6 h-6 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 animate-fade-up delay-300">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!situation}
              onClick={() => {
                sound.playSuccess();
                setStage('onboarding_motivate_1');
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* 3. MOTIVATION INTERSTITIAL 1 (Duolingo Cheer) */}
      {stage === 'onboarding_motivate_1' && (
        <div key="onboarding_motivate_1" className="flex-1 flex flex-col justify-between py-6 text-center items-center">
          <div className="space-y-6 my-auto max-w-xs">
            <div className="animate-pop-in">
              <MascotView
                state="cheering"
                size="xl"
                bubbleText="You're in good hands!"
              />
            </div>

            <div className="space-y-2 animate-fade-up delay-150">
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                88% of flatmates say clear chores prevent house drama.
              </h2>
              <p className="type-body text-[#6B7280] text-sm leading-relaxed">
                Roomie gives everyone an equal voice, clear rotations, and zero awkwardness when splitting costs.
              </p>
            </div>
          </div>

          <div className="w-full pt-6 animate-fade-up delay-300">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                sound.playTap();
                setStage('onboarding_headache');
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* 4. ONBOARDING: QUESTION 2 (Biggest Headache) */}
      {stage === 'onboarding_headache' && (
        <div key="onboarding_headache" className="flex-1 flex flex-col justify-between py-4">
          <div className="space-y-6">
            <div className="flex items-start gap-3 animate-fade-up">
              <MascotView state="thinking" size="sm" />
              <div className="space-y-1">
                <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                  What would make home life 10x better?
                </h2>
                <p className="type-secondary text-sm text-[#6B7280]">
                  Select the biggest pain point in your flat.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { id: 'dishes', icon: <UtensilsCrossed className="w-5 h-5" />, title: 'Dishes piling up in the sink', delay: 'delay-75' },
                { id: 'bills', icon: <Receipt className="w-5 h-5" />, title: 'Splitting grocery bills & utilities', delay: 'delay-150' },
                { id: 'trash', icon: <Trash2 className="w-5 h-5" />, title: 'Knowing who takes out the trash & bins', delay: 'delay-200' },
                { id: 'fairness', icon: <Scale className="w-5 h-5" />, title: 'One person feeling like they do all the cleaning', delay: 'delay-250' },
              ].map((opt) => (
                <div key={opt.id} className={`animate-fade-up ${opt.delay}`}>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setHeadache(opt.id);
                    }}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] ${
                      headache === opt.id
                        ? 'border-[#FF6B4A] bg-[#FFF0ED] shadow-xs'
                        : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={`p-2.5 rounded-xl ${headache === opt.id ? 'bg-[#FF6B4A] text-white' : 'bg-[#F1F3F9] text-[#475569]'}`}>
                        {opt.icon}
                      </span>
                      <h4 className="font-heading font-black text-[15px] text-[#1F2430]">
                        {opt.title}
                      </h4>
                    </div>
                    {headache === opt.id && (
                      <span className="w-6 h-6 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 animate-fade-up delay-300">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!headache}
              onClick={() => {
                sound.playSuccess();
                setStage('onboarding_motivate_2');
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* 5. MOTIVATION INTERSTITIAL 2 (Secret Draft Solution) */}
      {stage === 'onboarding_motivate_2' && (
        <div key="onboarding_motivate_2" className="flex-1 flex flex-col justify-between py-6 text-center items-center">
          <div className="space-y-6 my-auto max-w-xs">
            <div className="animate-pop-in">
              <MascotView
                state="celebrating"
                size="xl"
                bubbleText="Say goodbye to sticky notes!"
              />
            </div>

            <div className="space-y-2 animate-fade-up delay-150">
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                With the Secret Draft, chores balance out automatically.
              </h2>
              <p className="type-body text-[#6B7280] text-sm leading-relaxed">
                Pick what you want, avoid what you hate. Roomie matches tasks fairly so no one gets stuck with all the heavy lifting.
              </p>
            </div>
          </div>

          <div className="w-full pt-6 animate-fade-up delay-300">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                sound.playSuccess();
                setStage('signup_name');
              }}
            >
              Create My Profile
            </Button>
          </div>
        </div>
      )}

      {/* 6A. LEVEL 1: WHAT'S YOUR NAME? */}
      {stage === 'signup_name' && (
        <div key="signup_name" className="flex-1 flex flex-col justify-between py-2">
          <div className="space-y-4">
            <div className="text-center space-y-1 animate-fade-up">
              <MascotView state="thinking" size="md" bubbleText="What's your name?" />
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                What should your flat call you?
              </h2>
              <p className="type-secondary text-xs sm:text-sm text-[#6B7280]">
                Your flatmates will see this on the chore board and expense tabs.
              </p>
            </div>

            <div className="animate-fade-up delay-150">
              <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    sound.playSuccess();
                    setStage('signup_name_motivate');
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="type-label block mb-1.5 text-xs">Full Name</label>
                    <div className="relative flex items-center">
                      <User className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        autoFocus
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={!name.trim()}
                      type="submit"
                    >
                      Continue
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            <div className="text-center pt-2 animate-fade-in delay-250">
              <button
                type="button"
                onClick={() => setStage('signin')}
                className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer"
              >
                Already have an account? <span className="underline text-[#FF6B4A]">Log in here</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
              Level 1 of 3: Setting up your profile.
            </p>
          </div>
        </div>
      )}

      {/* 6B. LEVEL 1 INTERSTITIAL: "NICE TO MEET YOU!" */}
      {stage === 'signup_name_motivate' && (
        <div key="signup_name_motivate" className="flex-1 flex flex-col justify-between py-6 text-center items-center">
          <div className="space-y-6 my-auto max-w-xs">
            <div className="animate-pop-in">
              <MascotView
                state="celebrating"
                size="xl"
                bubbleText={`Nice to meet you, ${firstName}!`}
              />
            </div>

            <div className="space-y-2 animate-fade-up delay-150">
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                Awesome! I'll call you <span className="text-[#FF6B4A]">{name.trim()}</span> 🤝
              </h2>
              <p className="type-body text-[#6B7280] text-sm leading-relaxed">
                Next, let's link your email so flatmates can send invitations and chore rotations right to your inbox.
              </p>
            </div>
          </div>

          <div className="w-full pt-6 animate-fade-up delay-300">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                sound.playSuccess();
                setStage('signup_email');
              }}
            >
              Add My Email
            </Button>
          </div>
        </div>
      )}

      {/* 6C. LEVEL 2: WHAT'S YOUR EMAIL? */}
      {stage === 'signup_email' && (
        <div key="signup_email" className="flex-1 flex flex-col justify-between py-2">
          <div className="space-y-4">
            <div className="text-center space-y-1 animate-fade-up">
              <MascotView state="thinking" size="md" bubbleText="Keep it handy!" />
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                What's your email address?
              </h2>
              <p className="type-secondary text-xs sm:text-sm text-[#6B7280]">
                We'll use this to keep your invitations, receipts, and chore turns safe.
              </p>
            </div>

            <div className="animate-fade-up delay-150">
              <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!email.trim() || !email.includes('@')) return;
                    sound.playSuccess();
                    setStage('signup_password');
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="type-label block mb-1.5 text-xs">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@university.edu"
                        autoFocus
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={!email.trim() || !email.includes('@')}
                      type="submit"
                    >
                      Continue
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            <div className="text-center pt-2 animate-fade-in delay-250">
              <button
                type="button"
                onClick={() => setStage('signin')}
                className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer"
              >
                Already have an account? <span className="underline text-[#FF6B4A]">Log in here</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
              Level 2 of 3: Connecting your account.
            </p>
          </div>
        </div>
      )}

      {/* 6D. LEVEL 3: PROTECT YOUR ACCOUNT */}
      {stage === 'signup_password' && (
        <div key="signup_password" className="flex-1 flex flex-col justify-between py-2">
          <div className="space-y-4">
            <div className="text-center space-y-1 animate-fade-up">
              <MascotView state="cheering" size="md" bubbleText="Final step!" />
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                Protect your account
              </h2>
              <p className="type-secondary text-xs sm:text-sm text-[#6B7280]">
                Create a password so you can securely sign into your flat anytime.
              </p>
            </div>

            <div className="animate-fade-up delay-150">
              <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
                {/* Account Summary Chip */}
                <div className="p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-[#1F2430] truncate">{name}</span>
                    <span className="text-[#9AA5B5]">•</span>
                    <span className="text-[#6B7280] truncate">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStage('signup_name')}
                    className="text-[#FF6B4A] font-bold text-[11px] hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <form onSubmit={handleSignUpSubmit} className="space-y-4">
                  <div>
                    <label className="type-label block mb-1.5 text-xs">Create Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        autoFocus
                        required
                        className="w-full pl-11 pr-11 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all min-h-[48px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-[#8F9CAE] hover:text-[#1F2430] cursor-pointer p-1.5"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[12px] text-[#6B7280] mt-1 block">
                      Use at least 6 characters.
                    </span>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={loading || password.length < 6}
                      type="submit"
                    >
                      {loading ? 'Creating account...' : 'Create Account & Enter 🚀'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            <div className="text-center pt-2 animate-fade-in delay-250">
              <button
                type="button"
                onClick={() => setStage('signin')}
                className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer"
              >
                Already have an account? <span className="underline text-[#FF6B4A]">Log in here</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
              By creating an account, you agree to Roomie's Community Guidelines and Privacy Policy.
            </p>
          </div>
        </div>
      )}

      {/* 7. LOG IN (Direct Log In for returning users) */}
      {stage === 'signin' && (
        <div key="signin" className="flex-1 flex flex-col justify-between py-2">
          <div className="space-y-4">
            <div className="text-center space-y-1 animate-fade-up">
              <MascotView state="thinking" size="md" bubbleText="Welcome back!" />
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                Log in to your flat
              </h2>
              <p className="type-secondary text-xs sm:text-sm text-[#6B7280]">
                Enter your credentials to enter your apartment
              </p>
            </div>

            <div className="animate-fade-up delay-150">
              <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  <div>
                    <label className="type-label block mb-1.5 text-xs">Email address</label>
                    <div className="relative flex items-center">
                      <Mail className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@university.edu"
                        autoFocus
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all min-h-[48px]"
                      />
                    </div>
                  </div>

                  {!useMagicLink && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="type-label block text-xs">Password</label>
                        <button
                          type="button"
                          onClick={() => setUseMagicLink(true)}
                          className="text-[12px] font-bold text-[#FF6B4A] hover:underline cursor-pointer"
                        >
                          Email magic link instead
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <Lock className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required={!useMagicLink}
                          className="w-full pl-11 pr-11 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all min-h-[48px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-[#8F9CAE] hover:text-[#1F2430] cursor-pointer p-1.5"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {useMagicLink && (
                    <div className="p-3.5 rounded-2xl bg-[#FFF8E6] border border-[#FFDDA0] flex items-center justify-between gap-2 text-xs text-[#8A6300]">
                      <span>We will send a 1-tap sign-in link to your email.</span>
                      <button
                        type="button"
                        onClick={() => setUseMagicLink(false)}
                        className="font-bold underline cursor-pointer shrink-0"
                      >
                        Use password
                      </button>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={loading}
                      type="submit"
                    >
                      {loading
                        ? 'Logging in...'
                        : useMagicLink
                        ? 'Send Magic Link ✉️'
                        : 'Log In'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            <div className="text-center pt-2 animate-fade-in delay-250">
              <button
                type="button"
                onClick={() => setStage('onboarding_situation')}
                className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer"
              >
                New here? <span className="underline text-[#FF6B4A]">Get started</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
              Roomie helps you and your flatmates track chores and balances fairly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};