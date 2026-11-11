import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface SignInFormProps {
  email: string;
  password: string;
  useMagicLink: boolean;
  loading: boolean;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onToggleMagicLink: (val: boolean) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onSwitchToSignUp: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  email,
  password,
  useMagicLink,
  loading,
  onEmailChange,
  onPasswordChange,
  onToggleMagicLink,
  onSubmit,
  onSwitchToSignUp,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
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
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="type-label block mb-1.5 text-xs">Email address</label>
                <div className="relative flex items-center">
                  <Mail className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
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
                      onClick={() => onToggleMagicLink(true)}
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
                      onChange={(e) => onPasswordChange(e.target.value)}
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
                    onClick={() => onToggleMagicLink(false)}
                    className="font-bold underline cursor-pointer shrink-0"
                  >
                    Use password
                  </button>
                </div>
              )}

              <div className="pt-2">
                <Button variant="primary" size="lg" fullWidth disabled={loading} type="submit">
                  {loading
                    ? 'Logging in...'
                    : useMagicLink
                    ? 'Send Magic Link'
                    : 'Log In'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="text-center pt-2 animate-fade-in delay-250">
          <button
            type="button"
            onClick={onSwitchToSignUp}
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
  );
};
