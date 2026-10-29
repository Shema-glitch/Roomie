import React, { useState } from 'react';
import { MascotView } from '../../components/common/MascotView';
import { Button } from '../../components/common/Button';
import { sound } from '../../services/sound';
import {
  Sparkles,
  CheckCircle2,
  Receipt,
  Trophy,
  Heart,
  ArrowRight,
  ChevronLeft,
  Users,
  UtensilsCrossed,
  Trash2,
  Coffee,
  ShieldCheck,
} from 'lucide-react';

interface AppShowcaseProps {
  onComplete: () => void;
  onSkip: () => void;
  onSignIn: () => void;
}

export const AppShowcase: React.FC<AppShowcaseProps> = ({
  onComplete,
  onSkip,
  onSignIn,
}) => {
  const [slide, setSlide] = useState<number>(0);

  const totalSlides = 3;

  const handleNext = () => {
    sound.playTap();
    if (slide < totalSlides - 1) {
      setSlide(slide + 1);
    } else {
      sound.playSuccess();
      onComplete();
    }
  };

  const handleBack = () => {
    sound.playTap();
    if (slide > 0) {
      setSlide(slide - 1);
    } else {
      onSkip();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-5 sm:p-7 max-w-md mx-auto select-none">
      {/* TOP BAR / STORY PROGRESS BARS */}
      <div className="pt-2 pb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-1 -ml-1 text-[#475569] hover:text-[#1F2430] active:scale-90 transition-transform cursor-pointer focus:outline-none"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Segmented Story Indicators (Duolingo Style) */}
          <div className="flex-1 flex items-center gap-1.5 px-1">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSlide(idx);
                }}
                className="flex-1 h-2 rounded-full overflow-hidden bg-[#E6E8EE] cursor-pointer focus:outline-none"
                aria-label={`Jump to slide ${idx + 1}`}
              >
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    idx <= slide ? 'bg-[#FF6B4A] w-full' : 'w-0'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onSkip();
            }}
            className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] px-2 py-1 rounded-full hover:bg-white transition-all cursor-pointer"
          >
            Skip
          </button>
        </div>
      </div>

      {/* SLIDE CONTENT CAROUSEL */}
      <div className="flex-1 flex flex-col justify-between py-2">
        {/* SLIDE 0: CHORE HARMONY & SECRET DRAFT */}
        {slide === 0 && (
          <div key="slide-0" className="space-y-5 my-auto">
            {/* Mascot & Category Pill */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="animate-pop-in">
                <MascotView
                  state="celebrating"
                  size="lg"
                  bubbleText="No more chore drama!"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6FAF8] border border-[#19B5A5]/30 text-[#138E82] text-xs font-bold uppercase tracking-wider animate-fade-up delay-75">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Fair Chore Draft</span>
              </div>

              <div className="space-y-1.5 animate-fade-up delay-150">
                <h2 className="font-heading font-black text-2xl sm:text-[26px] leading-tight text-[#1F2430]">
                  Chores that draft themselves fairly
                </h2>
                <p className="type-body text-[#6B7280] text-sm leading-relaxed max-w-xs mx-auto">
                  Pick the chores you like, avoid what you dread. Roomie automatically balances the effort points so no one feels taken advantage of.
                </p>
              </div>
            </div>

            {/* Interactive Feature Visual Widget */}
            <div className="bg-white rounded-3xl border-2 border-[#E6E8EE] p-4 shadow-sm space-y-2.5 animate-fade-up delay-250">
              <div className="flex items-center justify-between text-xs font-bold text-[#475569] pb-1 border-b border-[#F1F3F9]">
                <span>This Week's Draft</span>
                <span className="text-[#19B5A5] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE]">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-[#FFF0ED] text-[#FF6B4A]">
                      <UtensilsCrossed className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-xs text-[#1F2430]">Cook Sunday Dinner</div>
                      <div className="text-[11px] text-[#6B7280]">Alex matched • 15 pts</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E6FAF8] text-[#138E82]">
                    High Priority
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE]">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-[#E6FAF8] text-[#19B5A5]">
                      <Trash2 className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-xs text-[#1F2430]">Recycling & Bins</div>
                      <div className="text-[11px] text-[#6B7280]">Maya matched • 10 pts</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF0ED] text-[#FF6B4A]">
                    Assigned
                  </span>
                </div>
              </div>

              {/* Appreciation Note */}
              <div className="pt-1 text-center">
                <p className="text-[11px] font-semibold text-[#19B5A5] bg-[#E6FAF8] py-1.5 px-3 rounded-xl inline-block">
                  ✨ Zero nag notes • Everyone gets a fair voice
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: QUIET BILL SPLITTING & NO AWKWARDNESS */}
        {slide === 1 && (
          <div key="slide-1" className="space-y-5 my-auto">
            {/* Mascot & Category Pill */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="animate-pop-in">
                <MascotView
                  state="calm"
                  size="lg"
                  bubbleText="Money talk, minus the awkwardness."
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] border border-[#FF6B4A]/30 text-[#D94E30] text-xs font-bold uppercase tracking-wider animate-fade-up delay-75">
                <Receipt className="w-3.5 h-3.5" />
                <span>Quiet Split & Balances</span>
              </div>

              <div className="space-y-1.5 animate-fade-up delay-150">
                <h2 className="font-heading font-black text-2xl sm:text-[26px] leading-tight text-[#1F2430]">
                  Split bills quietly without confrontations
                </h2>
                <p className="type-body text-[#6B7280] text-sm leading-relaxed max-w-xs mx-auto">
                  Log supermarket trips, Wi-Fi bills, and household basics in 5 seconds. Roomie simplifies debts so the flat is always settled in 1 tap.
                </p>
              </div>
            </div>

            {/* Interactive Feature Visual Widget */}
            <div className="bg-white rounded-3xl border-2 border-[#E6E8EE] p-4 shadow-sm space-y-2.5 animate-fade-up delay-250">
              <div className="flex items-center justify-between text-xs font-bold text-[#475569] pb-1 border-b border-[#F1F3F9]">
                <span>Shared Apartment Receipt</span>
                <span className="font-mono text-[#FF6B4A] font-black">$48.00 total</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF8E6] border border-[#FFDDA0] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-[#8A6300]">Grocery Essentials & Spices</div>
                  <div className="text-[11px] text-[#A67800]">Split equally 3 ways</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-[#8A6300]">$16.00</div>
                  <div className="text-[10px] text-[#A67800]">per flatmate</div>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between text-xs font-bold">
                <span className="text-[#6B7280]">Simplest settlement:</span>
                <span className="text-[#138E82] bg-[#E6FAF8] px-2.5 py-1 rounded-full border border-[#19B5A5]/20">
                  Maya receives $16.00 • All square!
                </span>
              </div>

              {/* Appreciation Note */}
              <div className="pt-1 text-center">
                <p className="text-[11px] font-semibold text-[#D94E30] bg-[#FFF0ED] py-1.5 px-3 rounded-xl inline-block">
                  🤝 Flatmates stay great friends when tabs are transparent
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: GRATITUDE & COMMUNITY APPRECIATION */}
        {slide === 2 && (
          <div key="slide-2" className="space-y-5 my-auto">
            {/* Mascot & Category Pill */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="animate-pop-in">
                <MascotView
                  state="cheering"
                  size="lg"
                  bubbleText="We appreciate every little effort!"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E6] border border-[#FFC93C]/40 text-[#B88700] text-xs font-bold uppercase tracking-wider animate-fade-up delay-75">
                <Heart className="w-3.5 h-3.5 fill-[#FFC93C] text-[#B88700]" />
                <span>Gratitude & Zero-Shame</span>
              </div>

              <div className="space-y-1.5 animate-fade-up delay-150">
                <h2 className="font-heading font-black text-2xl sm:text-[26px] leading-tight text-[#1F2430]">
                  Every effort noticed. Every flatmate celebrated.
                </h2>
                <p className="type-body text-[#6B7280] text-sm leading-relaxed max-w-xs mx-auto">
                  No public loser boards or guilt trips. Roomie rewards kindness, celebrates weekly awards, and keeps home feeling warm and joyful.
                </p>
              </div>
            </div>

            {/* Interactive Feature Visual Widget */}
            <div className="bg-white rounded-3xl border-2 border-[#E6E8EE] p-4 shadow-sm space-y-3 animate-fade-up delay-250">
              <div className="flex items-center justify-between text-xs font-bold text-[#475569] pb-1 border-b border-[#F1F3F9]">
                <span>Weekly House Accolades</span>
                <span className="text-[#B88700] flex items-center gap-1 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC93C]" /> 3 Active Streaks
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#FFF8E6] to-[#FFF1CD] border border-[#FFDDA0] flex flex-col items-center text-center space-y-1">
                  <span className="text-2xl">🏆</span>
                  <div className="font-heading font-black text-xs text-[#8A6300]">Clean Sink Hero</div>
                  <div className="text-[10px] text-[#A67800]">7-day sparkling streak</div>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#E6FAF8] to-[#D0F5F1] border border-[#B2EFE9] flex flex-col items-center text-center space-y-1">
                  <span className="text-2xl">☕</span>
                  <div className="font-heading font-black text-xs text-[#138E82]">Morning Coffee Star</div>
                  <div className="text-[10px] text-[#0E6C63]">+15 Karma Tokens</div>
                </div>
              </div>

              {/* Genuine User Appreciation Callout */}
              <div className="p-3 rounded-2xl bg-[#FFF0ED] border border-[#FFD2C8] flex items-start gap-2.5 text-left">
                <ShieldCheck className="w-4 h-4 text-[#FF6B4A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#782315] leading-relaxed">
                  <strong className="font-bold">Our promise to you:</strong> We built Roomie to turn roommate life into a fun, cooperative experience you'll actually love using every day.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BUTTONS */}
        <div className="pt-6 space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleNext}
            icon={slide === totalSlides - 1 ? <Sparkles className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          >
            {slide === totalSlides - 1 ? "Let's Get Started" : 'Continue'}
          </Button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onSignIn();
              }}
              className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer py-1"
            >
              Already have an account? <span className="underline text-[#FF6B4A]">Log in here</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
