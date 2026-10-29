import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { THEME } from '../../theme/tokens';
import { Shuffle, ArrowRight, ShieldCheck, HeartHandshake, Lock } from 'lucide-react';
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
  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup'>('welcome');
  const [email, setEmail] = useState('kai.tanaka@student.emu.edu.tr');
  const [password, setPassword] = useState('RoomieApp2026!');
  const [name, setName] = useState('Kai Tanaka');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignInSubmit = async () => {
    if (!email.trim()) {
      showToast('Please enter your email', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await onSignIn(email.trim(), password || undefined);
      if (res && !res.success) {
        showToast(res.message || 'Could not sign in', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      showToast('Please enter your name and email', 'error');
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
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Section */}
      <div className="pt-8 flex flex-col items-center text-center">
        <MascotView state="celebrating" size="xl" bubbleText="Welcome to the apartment!" />
        <h1 className="type-big-number mt-4 tracking-tight">
          Roomie
        </h1>
        <p className="type-body max-w-xs mt-2">
          Fair chores, peaceful splits, and happy roomies living in harmony.
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] text-[#FF6B4A] text-[14px] font-bold border border-[#FFD7CF]">
            <HeartHandshake className="w-3.5 h-3.5" /> Fair by design
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6FAF8] text-[#19B5A5] text-[14px] font-bold border border-[#BBEFEA]">
            <Shuffle className="w-3.5 h-3.5" /> Secret chore draft
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] text-[#5B5BD6] text-[14px] font-bold border border-[#D3D5F9]">
            <ShieldCheck className="w-3.5 h-3.5" /> TRNC student friendly
          </span>
        </div>
      </div>

      {/* Middle Form / Action Container */}
      <div className="my-8">
        {mode === 'welcome' && (
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setMode('signup')}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Get started
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setMode('signin')}
            >
              I have an account
            </Button>
            <div className="text-center pt-2">
              <button
                onClick={onQuickStart}
                className="type-secondary font-bold text-[#FF6B4A] hover:underline cursor-pointer"
              >
                Explore Apartment 4B Demo
              </button>
            </div>
          </div>
        )}

        {mode === 'signin' && (
          <Card padding="lg" className="space-y-4">
            <div className="text-center">
              <h2 className="type-title">Sign in</h2>
              <p className="type-secondary">Enter your email and password</p>
            </div>
            <div>
              <label className="type-label block mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-body focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <div>
              <label className="type-label block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-body focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={loading}
              onClick={handleSignInSubmit}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <button
              onClick={() => setMode('welcome')}
              className="w-full text-center type-secondary font-bold hover:text-[#1F2430] pt-2 cursor-pointer"
            >
              Back
            </button>
          </Card>
        )}

        {mode === 'signup' && (
          <Card padding="lg" className="space-y-4">
            <div className="text-center">
              <h2 className="type-title">Create account</h2>
              <p className="type-secondary">Join your apartment in seconds</p>
            </div>
            <div>
              <label className="type-label block mb-1">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kai Tanaka"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-body focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <div>
              <label className="type-label block mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-body focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <div>
              <label className="type-label block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-body focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={loading}
              onClick={handleSignUpSubmit}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <button
              onClick={() => setMode('welcome')}
              className="w-full text-center type-secondary font-bold hover:text-[#1F2430] pt-2 cursor-pointer"
            >
              Back
            </button>
          </Card>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center pb-2">
        <p className="type-secondary leading-relaxed">
          Roomie does not process banking payments. Roomies track balances & settle directly in cash or transfer.
        </p>
      </div>
    </div>
  );
};
