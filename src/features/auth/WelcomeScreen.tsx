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
  ShieldCheck,
  HeartHandshake,
  Shuffle,
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

  // Form states — strictly empty by default (no hardcoded credentials)
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
      showToast('Please enter your password (or switch to magic link)', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await onSignIn(email.trim(), useMagicLink ? undefined : password);
      if (res && !res.success) {
        showToast(res.message || 'Could not sign in. Please verify your details.', 'error');
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
      showToast('Please enter your name', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (password && password.length < 6) {
      showToast('Password should be at least 6 characters', 'error');
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
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Top Header / Back Navigation if in form mode */}
      <div className="pt-4 sm:pt-6 flex flex-col items-center text-center">
        {mode !== 'welcome' ? (
          <div className="w-full flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setMode('welcome')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#1F2430] py-1.5 px-3 rounded-full bg-white border border-[#E6E8EE] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-xs font-bold text-[#FF6B4A] bg-[#FFF0ED] px-2.5 py-1 rounded-full border border-[#FFD7CF]">
              Roomie
            </span>
          </div>
        ) : null}

        {/* Mascot & Greeting */}
        <MascotView
          state={mode === 'welcome' ? 'celebrating' : mode === 'signin' ? 'thinking' : 'cheering'}
          size={mode === 'welcome' ? 'lg' : 'md'}
          bubbleText={
            mode === 'welcome'
              ? 'Welcome to the flat!'
              : mode === 'signin'
              ? 'Welcome back!'
              : 'Happy to meet you!'
          }
        />

        <h1 className="type-big-number mt-3 tracking-tight">
          Roomie
        </h1>
        <p className="type-body text-[#6B7280] max-w-xs mt-1 text-sm sm:text-base">
          Fair chores, peaceful splits, and happy roomies living in harmony.
        </p>

        {/* Value Prop Badges (Only on Landing) */}
        {mode === 'welcome' && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] text-[#FF6B4A] text-xs font-bold border border-[#FFD7CF]">
              <HeartHandshake className="w-3.5 h-3.5" /> Fair by design
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6FAF8] text-[#19B5A5] text-xs font-bold border border-[#BBEFEA]">
              <Shuffle className="w-3.5 h-3.5" /> Secret chore draft
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] text-[#5B5BD6] text-xs font-bold border border-[#D3D5F9]">
              <ShieldCheck className="w-3.5 h-3.5" /> Multi-currency TRY/EUR/USD
            </span>
          </div>
        )}
      </div>

      {/* Main Form / Actions Container */}
      <div className="my-6">
        {mode === 'welcome' ? (
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setMode('signup')}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Create an account
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setMode('signin')}
            >
              I have an account
            </Button>

            <div className="pt-3">
              <button
                type="button"
                onClick={onQuickStart}
                className="w-full p-3 rounded-2xl bg-white border border-[#E6E8EE] hover:border-[#FF6B4A]/50 flex items-center justify-center gap-2 text-xs font-bold text-[#FF6B4A] cursor-pointer shadow-xs transition-all active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-[#FF6B4A]" />
                <span>Explore Apartment 4B Demo Flat</span>
              </button>
            </div>
          </div>
        ) : (
          <Card padding="lg" className="bg-white border border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
            {/* Segmented Tab Switcher (Sign In vs Sign Up) */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F1F3F7]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setUseMagicLink(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-[#1F2430] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#1F2430]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setUseMagicLink(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#1F2430] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#1F2430]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* SIGN IN FORM */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="type-label block mb-1 text-xs">Email address</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. alex@student.emu.edu.tr"
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-[#F7F8FB] text-sm text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:bg-white focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all"
                    />
                  </div>
                </div>

                {!useMagicLink && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="type-label block text-xs">Password</label>
                      <button
                        type="button"
                        onClick={() => setUseMagicLink(true)}
                        className="text-[11px] font-bold text-[#FF6B4A] hover:underline cursor-pointer"
                      >
                        Email me a magic link instead
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required={!useMagicLink}
                        className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-[#E6E8EE] bg-[#F7F8FB] text-sm text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:bg-white focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-[#8F9CAE] hover:text-[#1F2430] cursor-pointer p-1"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {useMagicLink && (
                  <div className="p-3 rounded-2xl bg-[#FFF8E6] border border-[#FFDDA0] flex items-center justify-between gap-2 text-xs text-[#8A6300]">
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
                    size="md"
                    fullWidth
                    disabled={loading}
                    type="submit"
                  >
                    {loading
                      ? 'Signing in...'
                      : useMagicLink
                      ? 'Send Magic Link ✉️'
                      : 'Sign in to Flat'}
                  </Button>
                </div>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div>
                  <label className="type-label block mb-1 text-xs">Your full name</label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-[#F7F8FB] text-sm text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:bg-white focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="type-label block mb-1 text-xs">Email address</label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. alex@student.emu.edu.tr"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-[#F7F8FB] text-sm text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:bg-white focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="type-label block mb-1 text-xs">Create password</label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-[#E6E8EE] bg-[#F7F8FB] text-sm text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:bg-white focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#8F9CAE] hover:text-[#1F2430] cursor-pointer p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Use at least 6 characters. You can also sign in via magic link anytime.
                  </span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? 'Creating account...' : 'Create Account & Join Flat'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center pb-2">
        <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
          Roomie never holds or moves money. All apartment debts and settlements are between roommates directly.
        </p>
      </div>
    </div>
  );
};