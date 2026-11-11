import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { sound } from '../../services/sound';
import { SavedLoginAccount } from '../../utils/savedAccounts';
import { ArrowRight, QrCode, Sparkles, X, Zap } from 'lucide-react';

interface WelcomeLandingProps {
  isRevealed: boolean;
  pendingInviteCode?: string | null;
  savedAccounts?: SavedLoginAccount[];
  onDismissInvite?: () => void;
  onQuickSignIn?: (email: string) => Promise<void>;
  onRemoveSavedAccount?: (email: string) => void;
  onGetStarted: () => void;
  onSignIn: () => void;
  onReplayShowcase: () => void;
  onDemoFlat: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  isRevealed,
  pendingInviteCode,
  savedAccounts = [],
  onDismissInvite,
  onQuickSignIn,
  onRemoveSavedAccount,
  onGetStarted,
  onSignIn,
  onReplayShowcase,
  onDemoFlat,
}) => {
  const [signingInEmail, setSigningInEmail] = useState<string | null>(null);

  const handleQuickTap = async (acct: SavedLoginAccount) => {
    if (!onQuickSignIn || signingInEmail) return;
    sound.playTap();
    setSigningInEmail(acct.email);
    try {
      await onQuickSignIn(acct.email);
    } finally {
      setSigningInEmail(null);
    }
  };

  return (
    <div key="welcome" className="flex-1 flex flex-col justify-between pt-8 sm:pt-10 pb-2">
      <div className="my-auto space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className={isRevealed ? 'animate-pop-in' : 'opacity-0'}>
            <MascotView
              state="celebrating"
              size={savedAccounts.length > 0 ? 'lg' : 'xl'}
              bubbleText={
                pendingInviteCode
                  ? 'You got a flat invite!'
                  : savedAccounts.length > 0
                  ? 'Welcome back!'
                  : 'Welcome to Roomie!'
              }
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <h1
              className={`font-heading font-black text-[25px] sm:text-[31px] leading-tight text-[#1F2430] tracking-tight ${
                isRevealed ? 'animate-fade-up delay-150' : 'opacity-0'
              }`}
            >
              The joyful way to share a home.
            </h1>
            {savedAccounts.length === 0 && (
              <p
                className={`type-body text-[#6B7280] max-w-xs mx-auto text-sm sm:text-base leading-relaxed ${
                  isRevealed ? 'animate-fade-up delay-250' : 'opacity-0'
                }`}
              >
                Fair chores, quiet splits, and happy flatmates living in harmony.
              </p>
            )}
          </div>
        </div>

        {savedAccounts.length > 0 && (
          <div
            className={`space-y-2 ${isRevealed ? 'animate-fade-up delay-200' : 'opacity-0'}`}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B]">
                Quick sign-in
              </span>
              <span className="text-[11px] font-bold text-[#19B5A5] inline-flex items-center gap-1">
                <Zap className="w-3 h-3" />
                1-tap saved logins
              </span>
            </div>
            <div className="space-y-2">
              {savedAccounts.slice(0, 3).map((acct) => {
                const isBusy = signingInEmail === acct.email;
                const oneTapReady = Boolean(acct.sessionTokens?.refreshToken || acct.mode === 'local');
                return (
                  <div
                    key={acct.email}
                    className="group relative w-full p-2.5 pr-3 rounded-2xl bg-white border-2 border-[#E6E8EE] hover:border-[#FF6B4A] shadow-xs flex items-center justify-between gap-2.5 transition-all"
                  >
                    <button
                      type="button"
                      disabled={Boolean(signingInEmail)}
                      onClick={() => handleQuickTap(acct)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer disabled:opacity-60 focus:outline-none"
                    >
                      <Avatar src={acct.avatar} name={acct.name} size="md" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-heading font-black text-sm text-[#1F2430] truncate">
                            {acct.name}
                          </span>
                          {acct.flag && <span className="text-xs shrink-0">{acct.flag}</span>}
                        </div>
                        <p className="text-[11px] text-[#64748B] truncate">{acct.email}</p>
                        <span
                          className={`inline-block text-[10px] font-bold mt-0.5 ${
                            oneTapReady ? 'text-[#0F8B7D]' : 'text-[#FF6B4A]'
                          }`}
                        >
                          {isBusy
                            ? 'Signing in...'
                            : oneTapReady
                            ? 'Tap to continue'
                            : 'Tap to enter password'}
                        </span>
                      </div>
                    </button>

                    {onRemoveSavedAccount && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playTap();
                          onRemoveSavedAccount(acct.email);
                        }}
                        className="p-1.5 rounded-full text-[#94A3B8] hover:text-[#E5484D] hover:bg-[#FFF0ED] cursor-pointer shrink-0 transition-colors"
                        aria-label={`Remove saved login for ${acct.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingInviteCode && (
          <div
            className={`p-3.5 rounded-3xl bg-[#F0FDFB] border-2 border-[#19B5A5]/40 text-left space-y-1.5 ${
              isRevealed ? 'animate-fade-up delay-250' : 'opacity-0'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#0F8B7D] uppercase tracking-wider min-w-0">
                <QrCode className="w-4 h-4 shrink-0" />
                <span className="truncate">Invite Code: {pendingInviteCode}</span>
              </div>
              {onDismissInvite && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onDismissInvite();
                  }}
                  className="p-1 text-[#6B7280] hover:text-[#1F2430] rounded-full hover:bg-white/70 cursor-pointer shrink-0"
                  aria-label="Dismiss invite"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="type-secondary text-xs text-[#475569] leading-relaxed">
              No app download needed — create an account or sign in right here to join this flat immediately.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className={isRevealed ? 'animate-fade-up delay-300' : 'opacity-0'}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                sound.playTap();
                onGetStarted();
              }}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              {pendingInviteCode ? 'Create Account & Join Flat' : 'Get Started'}
            </Button>
          </div>

          <div className={isRevealed ? 'animate-fade-up delay-350' : 'opacity-0'}>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => {
                sound.playTap();
                onSignIn();
              }}
            >
              I already have an account
            </Button>
          </div>

          <div
            className={`pt-1 text-center flex items-center justify-center gap-2 ${
              isRevealed ? 'animate-fade-up delay-400' : 'opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onReplayShowcase();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] py-1.5 px-3 rounded-full hover:bg-white transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B4A]" />
              <span>Replay presentation</span>
            </button>
            <span className="text-[#CBD5E1]">•</span>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onDemoFlat();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] py-1.5 px-3 rounded-full hover:bg-white transition-all cursor-pointer"
            >
              <span>Demo flat</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`text-center pt-4 pb-1 ${isRevealed ? 'animate-fade-in delay-500' : 'opacity-0'}`}>
        <p className="type-secondary text-xs text-[#8F9CAE] leading-relaxed max-w-xs mx-auto">
          By continuing, you agree to Roomie's Community Guidelines and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
