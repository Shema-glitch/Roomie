import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface WelcomeScreenProps {
  onSignIn: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  onSignUp: (name: string, email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  onQuickStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSignIn,
  onSignUp,
  onQuickStart,
}) => {
  const { showToast } = useToast();

  // Mode: 'welcome' | 'signin' | 'signup'
  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup'>('welcome');

  // Form states — strictly blank by default
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignInSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    if (!useMagicLink && !password) {
      showToast('Please enter your password', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await onSignIn(email.trim(), useMagicLink ? undefined : password);
      if (res && !res.success) {
        showToast(res.message || 'Could not log in. Check your details and try again.', 'error');
      } else if (useMagicLink) {
        showToast('Magic link sent! Check your inbox.', 'success');
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

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-5 sm:p-7 max-w-md mx-auto">
      {/* TOP SECTION */}
      <div className="pt-4 sm:pt-8 flex flex-col items-center text-center">
        {mode !== 'welcome' ? (
          <div className="w-full flex items-center justify-between mb-4">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => {
                setMode('welcome');
                setUseMagicLink(false);
              }}
              icon={<ChevronLeft className="w-4 h-4 text-[#475569]" />}
            >
              Back
            </Button>
            <span className="text-xs font-heading font-black tracking-wider uppercase text-[#FF6B4A] bg-[#FFF0ED] px-3 py-1 rounded-full border border-[#FFD7CF]">
              Roomie
            </span>
          </div>
        ) : null}

        {/* Mascot with Dynamic Emotion Bubble */}
        <MascotView
          state={mode === 'welcome' ? 'celebrating' : mode === 'signin' ? 'thinking' : 'cheering'}
          size={mode === 'welcome' ? 'lg' : 'md'}
          bubbleText={
            mode === 'welcome'
              ? 'Welcome to Roomie!'
              : mode === 'signin'
              ? 'Welcome back!'
              : "Let's get you set up!"
          }
        />

        {/* Hero Headlines */}
        {mode === 'welcome' ? (
          <div className="mt-4 space-y-2">
            <h1 className="font-heading font-black text-[28px] sm:text-[32px] leading-tight text-[#1F2430] tracking-tight">
              The joyful way to share a home.
            </h1>
            <p className="type-body text-[#6B7280] max-w-xs mx-auto text-sm sm:text-base leading-relaxed">
              Fair chores, peaceful splits, and happy flatmates living in harmony.
            </p>
          </div>
        ) : (
          <div className="mt-3 text-center">
            <h2 className="font-heading font-black text-2xl text-[#1F2430]">
              {mode === 'signin' ? 'Log in' : 'Create your profile'}
            </h2>
            <p className="type-secondary mt-0.5 text-xs sm:text-sm text-[#6B7280]">
              {mode === 'signin'
                ? 'Enter your credentials to enter your flat'
                : 'Join your flatmates in just a few taps'}
            </p>
          </div>
        )}
      </div>

      {/* MAIN CONTAINER */}
      <div className="my-6">
        {mode === 'welcome' ? (
          <div className="space-y-3.5">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setMode('signup')}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setMode('signin')}
            >
              I already have an account
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onQuickStart}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] py-2 px-3 rounded-full hover:bg-white transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B4A]" />
                <span>Explore demo flat</span>
              </button>
            </div>
          </div>
        ) : (
          <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
            {/* Duolingo-style Segmented Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#E6E8EE]/70">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setUseMagicLink(false);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-[#1F2430] shadow-sm'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setUseMagicLink(false);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#1F2430] shadow-sm'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* LOG IN FORM */}
            {mode === 'signin' && (
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
            )}

            {/* CREATE ACCOUNT FORM */}
            {mode === 'signup' && (
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
                    Use at least 6 characters. You can also sign in via magic link anytime.
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
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>

      {/* FOOTER DISCLAIMER */}
      <div className="text-center pb-2">
        <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
          By continuing, you agree to Roomie's Community Guidelines and Privacy Policy.
        </p>
      </div>
    </div>
  );
};