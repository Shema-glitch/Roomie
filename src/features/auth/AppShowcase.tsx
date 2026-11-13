import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MascotView } from '../../components/common/MascotView';
import { Button } from '../../components/common/Button';
import { sound } from '../../services/sound';
import { ArrowRight, CheckCircle2, Pause, Play } from 'lucide-react';
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

const SLIDE_DURATION = 6000; // 6 seconds per slide for relaxed reading
const HOLD_TO_PAUSE_MS = 180;
const SWIPE_THRESHOLD_PX = 40;

export const AppShowcase: React.FC<AppShowcaseProps> = ({
  onComplete,
  onSkip,
  onSignIn,
  isActive = true,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  // Refs avoid stale closures when going back or resuming mid-slide
  const elapsedMsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; didHold: boolean; didSwipe: boolean } | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const isPaused = isManualPaused || isHolding;
  const isLast = currentSlide === SLIDES.length - 1;
  const isSlideDone = progress >= 100;

  const goToSlide = useCallback((nextIdx: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, nextIdx));
    elapsedMsRef.current = 0;
    setProgress(0);
    setCurrentSlide(clamped);
  }, []);

  // Reset from 0 whenever showcase becomes active from inactive
  useEffect(() => {
    if (!isActive) {
      elapsedMsRef.current = 0;
      setProgress(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || isPaused) return;
    // Once the final slide reaches 100%, rest cleanly on the CTA instead of yanking the user away
    if (isLast && elapsedMsRef.current >= SLIDE_DURATION) return;

    const startTime = Date.now() - elapsedMsRef.current;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      elapsedMsRef.current = elapsed;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION) * 100);
      setProgress(pct);

      if (elapsed >= SLIDE_DURATION) {
        clearInterval(interval);
        if (currentSlide < SLIDES.length - 1) {
          goToSlide(currentSlide + 1);
        } else {
          // Stay cleanly on slide 3 at 100% until user taps Let's Get Started / Continue
          elapsedMsRef.current = SLIDE_DURATION;
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isActive, isPaused, isLast, currentSlide, goToSlide]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const handleNext = () => {
    sound.playTap();
    if (!isLast) {
      goToSlide(currentSlide + 1);
    } else {
      sound.playSuccess();
      onCompleteRef.current();
    }
  };

  const handlePrev = () => {
    sound.playTap();
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    } else {
      // Tapping back on slide 1 cleanly replays slide 1 from 0%
      goToSlide(0);
    }
  };

  const handleSkip = () => {
    sound.playTap();
    onSkip();
  };

  const toggleManualPause = () => {
    sound.playTap();
    setIsManualPaused((p) => !p);
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, didHold: false, didSwipe: false };
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      if (pointerStartRef.current) {
        pointerStartRef.current.didHold = true;
      }
      setIsHolding(true);
    }, HOLD_TO_PAUSE_MS);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    if (Math.abs(dx) > 12) {
      clearHoldTimer();
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    clearHoldTimer();
    setIsHolding(false);

    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // Horizontal swipe navigation
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && !isLast) {
        handleNext();
      } else if (dx > 0) {
        handlePrev();
      }
      return;
    }

    // Short press & release -> tap left/right zones; long press just resumes playback
    if (start.didHold) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.38) {
      handlePrev();
    } else if (!isLast) {
      handleNext();
    }
  };

  const handleCanvasPointerCancel = () => {
    clearHoldTimer();
    setIsHolding(false);
    pointerStartRef.current = null;
  };

  const current = SLIDES[currentSlide];

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-white z-40 overflow-hidden flex flex-col items-center justify-between select-none">
      <div className="w-full max-w-md h-full flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe overflow-hidden">
        {/* TOP STORY BAR */}
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
                    onClick={() => {
                      sound.playTap();
                      goToSlide(idx);
                    }}
                    className="flex-1 h-2 py-0.5 cursor-pointer focus:outline-none"
                    aria-label={`Jump to slide ${idx + 1}`}
                  >
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#E6E8EE]">
                      <div
                        className="h-full bg-[#FF6B4A] rounded-full transition-all duration-75 ease-linear"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pause / Play Control & Skip Link */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleManualPause}
                className="p-1.5 rounded-full text-[#6B7280] hover:text-[#1F2430] hover:bg-[#F1F3F9] transition-all cursor-pointer focus:outline-none"
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
                onClick={handleSkip}
                className="text-xs font-bold text-[#6B7280] hover:text-[#FF6B4A] px-2.5 py-1 rounded-full cursor-pointer focus:outline-none"
              >
                Skip
              </button>
            </div>
          </div>

          <div className="h-3.5 flex items-center justify-center">
            {isPaused ? (
              <span className="text-[10px] sm:text-[11px] font-bold text-[#8F9CAE] uppercase tracking-wider animate-fade-in">
                Paused • {isHolding ? 'release to resume' : 'tap play to resume'}
              </span>
            ) : isLast && isSlideDone ? (
              <span className="text-[10px] sm:text-[11px] font-bold text-[#8F9CAE] tracking-wide animate-fade-in">
                Ready whenever you are
              </span>
            ) : null}
          </div>
        </div>

        {/* FULL SCREEN STORY CANVAS (Tap edges or swipe between slides, hold to pause) */}
        <div
          key={currentSlide}
          className="flex-1 flex flex-col items-center justify-center text-center px-2 py-1 overflow-hidden my-auto touch-pan-y"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerCancel}
        >
          <div className="animate-pop-in mb-3 sm:mb-5 shrink-0">
            <MascotView
              state={current.state}
              size="lg"
              bubbleText={current.bubbleText}
            />
          </div>

          <div className="space-y-2 max-w-sm mx-auto px-1 shrink-0">
            <h2 className="font-heading font-black text-2xl sm:text-[28px] leading-tight text-[#1F2430] tracking-tight animate-fade-up delay-150">
              {current.title}
            </h2>

            <p className="type-body text-[#6B7280] text-sm sm:text-base leading-relaxed animate-fade-up delay-250">
              {current.description}
            </p>
          </div>
        </div>

        {/* MINIMALIST BOTTOM ACTIONS */}
        <div className="pt-3 pb-2 space-y-2.5 shrink-0">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleNext}
            icon={isLast ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
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
    </div>
  );
};
