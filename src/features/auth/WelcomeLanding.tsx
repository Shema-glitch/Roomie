import React from 'react';
import { Button } from '../../components/common/Button';
import { MascotView } from '../../components/common/MascotView';
import { sound } from '../../services/sound';
import { ArrowRight, QrCode, Sparkles, X } from 'lucide-react';

interface WelcomeLandingProps {
  isRevealed: boolean;
  pendingInviteCode?: string | null;
  onDismissInvite?: () => void;
  onGetStarted: () => void;
  onSignIn: () => void;
  onReplayShowcase: () => void;
  onDemoFlat: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  isRevealed,
  pendingInviteCode,
  onDismissInvite,
  onGetStarted,
  onSignIn,
  onReplayShowcase,
  onDemoFlat,
}) => {
  return (
    <div key="welcome" className="flex-1 flex flex-col justify-between pt-8 sm:pt-10 pb-2">
      <div className="my-auto space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className={isRevealed ? 'animate-pop-in' : 'opacity-0'}>
            <MascotView
              state="celebrating"
              size="xl"
              bubbleText={pendingInviteCode ? 'You got a flat invite!' : 'Welcome to Roomie!'}
            />
          </div>

          <div className="mt-4 space-y-2">
            <h1
              className={`font-heading font-black text-[26px] sm:text-[32px] leading-tight text-[#1F2430] tracking-tight ${
                isRevealed ? 'animate-fade-up delay-150' : 'opacity-0'
              }`}
            >
              The joyful way to share a home.
            </h1>
            <p
              className={`type-body text-[#6B7280] max-w-xs mx-auto text-sm sm:text-base leading-relaxed ${
                isRevealed ? 'animate-fade-up delay-250' : 'opacity-0'
              }`}
            >
              Fair chores, quiet splits, and happy flatmates living in harmony.
            </p>
          </div>
        </div>

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
