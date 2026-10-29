import React, { useState, useEffect } from 'react';
import { MascotView } from '../../components/common/MascotView';
import { Button } from '../../components/common/Button';
import { sound } from '../../services/sound';
import { ArrowRight, Sparkles } from 'lucide-react';
import { MascotState } from '../../types';

interface AppShowcaseProps {
  onComplete: () => void;
  onSkip: () => void;
  onSignIn: () => void;
}

interface SlideItem {
  state: MascotState;
  bubbleText: string;
  title: string;
  description: string;
}

const SLIDES: SlideItem[] = [
  {
    state: 'celebrating',
    bubbleText: 'Fair is fun!',
    title: 'Fair chores, without the tension.',
    description:
      'Roomie balances household tasks based on what each flatmate actually likes and hates. No nag notes, no drama.',
  },
  {
    state: 'calm',
    bubbleText: 'All square!',
    title: 'Quiet splits, minus the awkward talk.',
    description:
      'Track shared groceries, utilities, and household basics in seconds. Roomie simplifies debts so settling up is painless.',
  },
  {
    state: 'cheering',
    bubbleText: 'Welcome home!',
    title: 'A shared home that feels like home.',
    description:
      'No guilt trips or public loser boards. Just fair rotations, warm appreciation, and roommates who stay great friends.',
  },
];

const SLIDE_DURATION = 4000; // 4 seconds per slide auto-advance

export const AppShowcase: React.FC<AppShowcaseProps> = ({
  onComplete,
  onSkip,
  onSignIn,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100 for current slide

  const isLast = currentSlide === SLIDES.length - 1;

  // Auto-advance timer
  useEffect(() => {
    setProgress(0);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION) * 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        if (currentSlide < SLIDES.length - 1) {
          setCurrentSlide((prev) => prev + 1);
        } else {
          onComplete();
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [currentSlide, onComplete]);

  const handleNext = () => {
    sound.playTap();
    if (!isLast) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      sound.playSuccess();
      onComplete();
    }
  };

  const handleSkip = () => {
    sound.playTap();
    onSkip();
  };

  const current = SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 sm:p-8 max-w-md mx-auto select-none">
      {/* MINIMALIST TOP STORY BAR */}
      <div className="pt-2 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          {/* Segmented Story Progress Indicators */}
          <div className="flex-1 flex items-center gap-2">
            {SLIDES.map((_, idx) => {
              let fillPct = 0;
              if (idx < currentSlide) fillPct = 100;
              else if (idx === currentSlide) fillPct = progress;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setCurrentSlide(idx);
                  }}
                  className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#E6E8EE] cursor-pointer focus:outline-none"
                  aria-label={`Jump to slide ${idx + 1}`}
                >
                  <div
                    className="h-full bg-[#FF6B4A] rounded-full transition-all duration-75 ease-linear"
                    style={{ width: `${fillPct}%` }}
                  />
                </button>
              );
            })}
          </div>

          {/* Minimal Skip Link */}
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] px-2 py-1 rounded-full cursor-pointer focus:outline-none"
          >
            Skip
          </button>
        </div>
      </div>

      {/* FULL SCREEN MINIMALIST STORY CANVAS (Duolingo: Pure white canvas, floating mascot, bold type) */}
      <div
        key={currentSlide}
        className="flex-1 flex flex-col items-center justify-center text-center px-2 py-6 cursor-pointer"
        onClick={(e) => {
          // Tap right half to advance, tap left half to go back
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX > rect.width * 0.4) {
            handleNext();
          } else if (currentSlide > 0) {
            sound.playTap();
            setCurrentSlide((prev) => prev - 1);
          }
        }}
      >
        {/* Large Floating Mascot (No background containers or gradients) */}
        <div className="animate-pop-in my-6">
          <MascotView
            state={current.state}
            size="xl"
            bubbleText={current.bubbleText}
          />
        </div>

        {/* Clean, Bold Display Headline */}
        <div className="space-y-3 max-w-sm mx-auto">
          <h2 className="font-heading font-black text-[28px] sm:text-[34px] leading-tight text-[#1F2430] tracking-tight animate-fade-up delay-150">
            {current.title}
          </h2>

          <p className="type-body text-[#6B7280] text-base leading-relaxed animate-fade-up delay-250">
            {current.description}
          </p>
        </div>
      </div>

      {/* MINIMALIST BOTTOM ACTIONS (Single tactile CTA + subtle login link) */}
      <div className="pt-6 pb-2 space-y-3.5">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleNext}
          icon={isLast ? <Sparkles className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
        >
          {isLast ? "Let's Get Started" : 'Continue'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onSignIn();
            }}
            className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] cursor-pointer py-1"
          >
            Already have an account? <span className="underline text-[#FF6B4A]">Log in</span>
          </button>
        </div>
      </div>
    </div>
  );
};
