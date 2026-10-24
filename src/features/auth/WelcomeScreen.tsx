import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { THEME } from '../../theme/tokens';
import { Sparkles, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';

interface WelcomeScreenProps {
  onSignIn: (email: string) => void;
  onSignUp: (name: string, email: string) => void;
  onQuickStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSignIn,
  onSignUp,
  onQuickStart,
}) => {
  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup'>('welcome');
  const [email, setEmail] = useState('kai.tanaka@student.emu.edu.tr');
  const [name, setName] = useState('Kai Tanaka');

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Section */}
      <div className="pt-8 flex flex-col items-center text-center">
        <MascotView state="celebrating" size="xl" bubbleText="Welcome to the flat! 👋" />
        <h1 className="text-4xl font-heading font-black text-[#1F2430] mt-4 tracking-tight">
          Roomie
        </h1>
        <p className="text-[#6B7280] text-base font-semibold max-w-xs mt-2">
          Fair chores, peaceful splits, and happy roommates living in harmony.
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] text-[#FF6B4A] text-xs font-bold border border-[#FFD7CF]">
            <HeartHandshake className="w-3.5 h-3.5" /> Fair by design
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6FAF8] text-[#19B5A5] text-xs font-bold border border-[#BBEFEA]">
            <Sparkles className="w-3.5 h-3.5" /> Secret chore draft
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] text-[#5B5BD6] text-xs font-bold border border-[#D3D5F9]">
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
              I already have an account
            </Button>
            <div className="text-center pt-2">
              <button
                onClick={onQuickStart}
                className="text-xs font-bold text-[#FF6B4A] hover:underline cursor-pointer"
              >
                ⚡ Explore Apartment 4B Demo
              </button>
            </div>
          </div>
        )}

        {mode === 'signin' && (
          <Card padding="lg" className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-heading font-bold text-[#1F2430]">Sign in</h2>
              <p className="text-xs text-[#6B7280]">Enter your student or personal email</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1F2430] mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-sm focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => onSignIn(email)}
            >
              Sign in with Email
            </Button>
            <button
              onClick={() => setMode('welcome')}
              className="w-full text-center text-xs font-bold text-[#6B7280] hover:text-[#1F2430] pt-2"
            >
              Back to main
            </button>
          </Card>
        )}

        {mode === 'signup' && (
          <Card padding="lg" className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-heading font-bold text-[#1F2430]">Create account</h2>
              <p className="text-xs text-[#6B7280]">Join your apartment in seconds</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1F2430] mb-1">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kai Tanaka"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-sm focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1F2430] mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-sm focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => onSignUp(name, email)}
            >
              Create Account
            </Button>
            <button
              onClick={() => setMode('welcome')}
              className="w-full text-center text-xs font-bold text-[#6B7280] hover:text-[#1F2430] pt-2"
            >
              Back to main
            </button>
          </Card>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center pb-2">
        <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
          Roomie does not process banking payments. Roommates track balances & settle directly in cash or transfer.
        </p>
      </div>
    </div>
  );
};
