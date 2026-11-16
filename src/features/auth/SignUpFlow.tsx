import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { sound } from '../../services/sound';
import { validateEmail, validatePassword } from '../../utils/authValidation';
import { EnvelopeSimple, LockKey, User, Eye, EyeSlash, Check } from '@phosphor-icons/react';

export type SignUpStep = 'name' | 'email' | 'password';

interface SignUpFlowProps {
  step: SignUpStep;
  name: string;
  email: string;
  password: string;
  rememberMe: boolean;
  loading: boolean;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onToggleRememberMe: (val: boolean) => void;
  onStepChange: (step: SignUpStep) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onSwitchToSignIn: () => void;
}

export const SignUpFlow: React.FC<SignUpFlowProps> = ({
  step,
  name,
  email,
  password,
  rememberMe,
  loading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onToggleRememberMe,
  onStepChange,
  onSubmit,
  onSwitchToSignIn,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  if (step === 'name') {
    return (
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
                  onStepChange('email');
                }}
                className="space-y-4"
              >
                <div>
                  <label className="type-label block mb-1.5 text-xs">Full Name</label>
                  <div className="relative flex items-center">
                    <User weight="duotone" className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => onNameChange(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      autoFocus
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:border-[#FF6B4A] focus:ring-3 focus:ring-[#FF6B4A]/15 transition-all min-h-[48px]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="primary" size="lg" fullWidth disabled={name.trim().length < 2} type="submit">
                    Continue
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <div className="text-center pt-2 animate-fade-in delay-250">
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer"
            >
              Already have an account? <span className="underline text-[#FF6B4A]">Log in here</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
            Step 1 of 3: Your flatmate name.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'email') {
    const firstName = name.trim().split(' ')[0] || 'Flatmate';
    const emailCheck = validateEmail(email);

    return (
      <div key="signup_email" className="flex-1 flex flex-col justify-between py-2">
        <div className="space-y-4">
          <div className="text-center space-y-1 animate-fade-up">
            <MascotView state="celebrating" size="md" bubbleText={`Nice to meet you, ${firstName}!`} />
            <h2 className="font-heading font-black text-2xl text-[#1F2430]">
              What's your email address?
            </h2>
            <p className="type-secondary text-xs sm:text-sm text-[#6B7280]">
              We'll use this to keep your flat invites, receipts, and chore turns synced.
            </p>
          </div>

          <div className="animate-fade-up delay-150">
            <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEmailTouched(true);
                  if (!emailCheck.valid) return;
                  sound.playSuccess();
                  onStepChange('password');
                }}
                className="space-y-4"
              >
                <div>
                  <label className="type-label block mb-1.5 text-xs">Email Address</label>
                  <div className="relative flex items-center">
                    <EnvelopeSimple weight="duotone" className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        onEmailChange(e.target.value);
                        if (!emailTouched) setEmailTouched(true);
                      }}
                      placeholder="alex@university.edu"
                      autoFocus
                      required
                      className={`w-full pl-11 pr-4 py-3 rounded-2xl border-2 bg-white text-[15px] font-medium text-[#1F2430] placeholder-[#9AA5B5] focus:outline-none focus:ring-3 transition-all min-h-[48px] ${
                        emailTouched && !emailCheck.valid && email.trim()
                          ? 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15'
                          : 'border-[#E6E8EE] focus:border-[#FF6B4A] focus:ring-[#FF6B4A]/15'
                      }`}
                    />
                  </div>
                  {emailTouched && email.trim() && !emailCheck.valid && (
                    <p className="text-[12px] font-medium text-[#E5484D] mt-1.5">
                      {emailCheck.error}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={!emailCheck.valid}
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
              onClick={onSwitchToSignIn}
              className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer"
            >
              Already have an account? <span className="underline text-[#FF6B4A]">Log in here</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
            Step 2 of 3: Connecting your account.
          </p>
        </div>
      </div>
    );
  }

  const passwordCheck = validatePassword(password);

  return (
    <div key="signup_password" className="flex-1 flex flex-col justify-between py-2">
      <div className="space-y-4">
        <div className="text-center space-y-1 animate-fade-up">
          <MascotView state="cheering" size="md" bubbleText="Final step!" />
          <h2 className="font-heading font-black text-2xl text-[#1F2430]">
            Protect your account
          </h2>
          <p className="type-secondary text-xs sm:text-sm text-[#6B7280]">
            Create a strong password so you stay signed in securely on your phone.
          </p>
        </div>

        <div className="animate-fade-up delay-150">
          <Card padding="lg" className="bg-white border-2 border-[#E6E8EE] shadow-sm rounded-3xl space-y-4">
            <div className="p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-[#1F2430] truncate">{name}</span>
                <span className="text-[#9AA5B5]">•</span>
                <span className="text-[#6B7280] truncate">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => onStepChange('name')}
                className="text-[#FF6B4A] font-bold text-[11px] hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Edit
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="type-label block mb-1.5 text-xs">Create Password</label>
                <div className="relative flex items-center">
                  <LockKey weight="duotone" className="w-5 h-5 text-[#8F9CAE] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="Create a strong password"
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
                    {showPassword ? <EyeSlash weight="duotone" className="w-4 h-4" /> : <Eye weight="duotone" className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Password Rule Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
                  {passwordCheck.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                        rule.met ? 'text-[#138E82]' : 'text-[#6B7280]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          rule.met
                            ? 'bg-[#19B5A5] text-white'
                            : 'bg-[#EEF0F6] text-[#94A3B8]'
                        }`}
                      >
                        <Check weight="bold" className="w-2.5 h-2.5" />
                      </span>
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleRememberMe(!rememberMe)}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-left cursor-pointer hover:border-[#CBD5E1] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#1F2430]">Save login info</p>
                  <p className="text-[11px] text-[#6B7280]">Sign back in with 1 tap next time</p>
                </div>
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    rememberMe
                      ? 'bg-[#19B5A5] text-white'
                      : 'bg-white border-2 border-[#CBD5E1] text-transparent'
                  }`}
                >
                  <Check weight="bold" className="w-3.5 h-3.5" />
                </span>
              </button>

              <div className="pt-1">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={loading || !passwordCheck.valid}
                  type="submit"
                >
                  {loading ? 'Creating account...' : 'Create Account & Continue'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="text-center pt-2 animate-fade-in delay-250">
          <button
            type="button"
            onClick={onSwitchToSignIn}
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
  );
};
