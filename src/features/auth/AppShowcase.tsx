import React, { useState, useEffect } from 'react';
import { MascotView } from '../../components/common/MascotView';
import { Button } from '../../components/common/Button';
import { sound } from '../../services/sound';
import { ArrowRight, Sparkles, Pause, Play } from 'lucide-react';
import { MascotState } from '../../types';

interface AppShowcaseProps {
  onComplete: () => void;
  onSkip: () => void;
  onSignIn: () => void;
  isActive?: boolean;
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

const SLIDE_DURATION = 6000; // 6 seconds per slide for relaxed, comfortable reading

export const AppShowcase: React.FC<AppShowcaseProps> = ({
  onComplete,
  onSkip,
  onSignIn,
  isActive = true,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100 for current slide
  const [isPaused, setIsPaused] = useState(false);

  const isLast = currentSlide === SLIDES.length - 1;

  // Auto-advance timer only runs when isActive is true and not paused
  useEffect(() => {
    if (!isActive || isPaused) return;

    const TICK = 40;
    const increment = (TICK / SLIDE_DURATION) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(interval);
          if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide((s) => s + 1);
            return 0;
          } else {
            onComplete();
            return 100;
          }
        }
        return next;
      });
    }, TICK);

    return () => clearInterval(interval);
  }, [isActive, isPaused, currentSlide, onComplete]);

  // Reset progress when currentSlide changes
  useEffect(() => {
    setProgress(0);
  }, [currentSlide]);

  const handleNext = () => {
    sound.playTap();
    if (!isLast) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      sound.playSuccess();
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      sound.playTap();
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    sound.playTap();
    onSkip();
  };

  const togglePause = () => {
    sound.playTap();
    setIsPaused((p) => !p);
  };

  const current = SLIDES[currentSlide];

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-white z-40 overflow-hidden flex flex-col items-center justify-between select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
    >
      <div className="w-full max-w-md h-full flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {/* MINIMALIST TOP STORY BAR */}
        <div className="pt-2 pb-1 space-y-2 shrink-0">
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
                    onClick={(e) => {
                      e.stopPropagation();
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

            {/* Pause / Play Control & Skip Link */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePause();
                }}
                className="p-1 rounded-full text-[#6B7280] hover:text-[#1F2430] hover:bg-[#F1F3F9] transition-all cursor-pointer focus:outline-none"
                aria-label={isPaused ? 'Resume auto presentation' : 'Pause presentation'}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 fill-current text-[#FF6B4A]" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
                className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] px-2 py-1 rounded-full cursor-pointer focus:outline-none"
              >
                Skip
              </button>
            </div>
          </div>

          {/* Pause indicator banner if user paused */}
          <div className="h-3.5 flex items-center justify-center">
            {isPaused && (
              <span className="text-[10px] sm:text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider animate-fade-in">
                Paused • tap or release to resume
              </span>
            )}
          </div>
        </div>

        {/* FULL SCREEN STORY CANVAS (Responsive, No Overflow, Pure White Canvas) */}
        <div
          key={currentSlide}
          className="flex-1 flex flex-col items-center justify-center text-center px-2 py-1 overflow-hidden my-auto"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX > rect.width * 0.45) {
              handleNext();
            } else {
              handlePrev();
            }
          }}
        >
          {/* Responsive Mascot */}
          <div className="animate-pop-in mb-3 sm:mb-5 shrink-0">
            <MascotView
              state={current.state}
              size="lg"
              bubbleText={current.bubbleText}
            />
          </div>

          {/* Clean, Bold Headline & Description */}
          <div className="space-y-2 max-w-sm mx-auto px-1 shrink-0">
            <h2 className="font-heading font-black text-2xl sm:text-[28px] leading-tight text-[#1F2430] tracking-tight animate-fade-up delay-150">
              {current.title}
            </h2>

            <p className="type-body text-[#6B7280] text-sm sm:text-base leading-relaxed animate-fade-up delay-250">
              {current.description}
            </p>
          </div>
        </div>

        {/* MINIMALIST BOTTOM ACTIONS (Fixed height, no vertical push) */}
        <div className="pt-3 pb-2 space-y-2.5 shrink-0">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            icon={isLast ? <Sparkles className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          >
            {isLast ? "Let's Get Started" : 'Continue'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
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
    </div>
  );
};
