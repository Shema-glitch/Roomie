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
  | 'signup'
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
      const hasSeen = sessionStorage.getItem('roomie_showcase_seen');
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

  // Progress percentage for Duolingo-style progress bar
  const getProgress = (): number => {
    switch (stage) {
      case 'onboarding_intro':
        return 10;
      case 'onboarding_situation':
        return 30;
      case 'onboarding_motivate_1':
        return 50;
      case 'onboarding_headache':
        return 70;
      case 'onboarding_motivate_2':
        return 88;
      case 'signup':
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
      case 'signup':
        setStage('onboarding_motivate_2');
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
        onComplete={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('roomie_showcase_seen', '1');
          }
          setStage('onboarding_intro');
        }}
        onSkip={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('roomie_showcase_seen', '1');
          }
          setStage('welcome');
        }}
        onSignIn={() => {
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
          <div className="pt-8 sm:pt-14 flex flex-col items-center text-center">
            <div className={isRevealed ? 'animate-pop-in' : 'opacity-0'}>
              <MascotView
                state="celebrating"
                size="xl"
                bubbleText="Welcome to Roomie!"
              />
            </div>

            <div className="mt-5 space-y-2">
              <h1 className={`font-heading font-black text-[28px] sm:text-[34px] leading-tight text-[#1F2430] tracking-tight ${
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

          <div className="my-8 space-y-3.5">
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
                <span>See how Roomie works</span>
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
                setStage('signup');
              }}
            >
              Create My Profile
            </Button>
          </div>
        </div>
      )}

      {/* 6. CREATE PROFILE (Sign Up Form — Only after engaging) */}
      {stage === 'signup' && (
        <div key="signup" className="flex-1 flex flex-col justify-between py-2">
          <div className="space-y-4">
            <div className="text-center space-y-1 animate-fade-up">
              <MascotView state="cheering" size="sm" bubbleText="Almost there!" />
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                Save your flat profile
              </h2>
              <p className="type-secondary text-xs sm:text-sm text-[#6B7280]">
                Create your account so you can start or join your apartment.
              </p>
            </div>

            <div className="animate-fade-up delay-150">
              <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
                <form onSubmit={handleSignUpSubmit} className="space-y-4">
                  <div>
                    <label className="type-label block mb-1.5 text-xs">Full name</label>
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

                  <div>
                    <label className="type-label block mb-1.5 text-xs">Email address</label>
                    <div className="relative flex items-center">
                      <Mail className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@university.edu"
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="type-label block mb-1.5 text-xs">Create password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
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
                      disabled={loading}
                      type="submit"
                    >
                      {loading ? 'Creating account...' : 'Create Account & Enter'}
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