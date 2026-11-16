import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { MascotView } from '../../../components/common/MascotView';
import { AnimatedNumber } from '../../../components/common/AnimatedNumber';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { Icon } from '@iconify/react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkle,
  CheckCircle,
  Receipt,
  Heart,
  Confetti,
} from '@phosphor-icons/react';

export interface RoomieWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdName?: string;
  monthName?: string;
  totalChoresCompleted?: number;
  totalExpensesSettled?: number;
  streakDays?: number;
  currencySymbol?: string;
}

export const RoomieWrappedModal: React.FC<RoomieWrappedModalProps> = ({
  isOpen,
  onClose,
  householdName = 'Our Flat',
  monthName = 'This Month',
  totalChoresCompleted = 42,
  totalExpensesSettled = 1850,
  streakDays = 14,
  currencySymbol = '₺',
}) => {
  const [slide, setSlide] = useState<number>(0);

  if (!isOpen) return null;

  const totalSlides = 4;

  const handleNext = () => {
    if (slide < totalSlides - 1) {
      sound.playTap();
      haptics.tokenClink();
      setSlide(slide + 1);
      if (slide + 1 === totalSlides - 1) {
        sound.awardCelebrate();
        haptics.awardCelebrate();
      }
    } else {
      sound.playSuccess();
      onClose();
    }
  };

  const handlePrev = () => {
    if (slide > 0) {
      sound.playTap();
      haptics.tokenClink();
      setSlide(slide - 1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${householdName} Wrapped 🎁`}
      subtitle={`Monthly flat celebration • ${monthName} recap`}
    >
      <div className="space-y-5 py-1">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ease-spring ${
                idx === slide
                  ? 'w-8 bg-[#FF6B4A]'
                  : 'w-2 bg-[#CBD5E1]'
              }`}
            />
          ))}
        </div>

        {/* Slide 0: Chores & Streaks */}
        {slide === 0 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="celebrating" size="lg" bubbleText="Look at this clean streak! ✨" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6B4A]">
                Chores & Cleanliness
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                <AnimatedNumber value={totalChoresCompleted} /> Chores Crushed
              </h3>
              <p className="type-secondary max-w-xs mx-auto text-sm">
                Your flat maintained an unbroken <strong>{streakDays}-day streak</strong> without letting dishes pile up!
              </p>
            </div>

            <Card padding="md" className="bg-[#E6FAF8] border-2 border-[#19B5A5]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-left">
                <CheckCircle weight="duotone" className="w-6 h-6 text-[#149689]" />
                <div>
                  <span className="font-bold text-[#1F2430] text-sm block">Kitchen & Bath Harmony</span>
                  <span className="text-xs text-[#64748B]">Zero chore disputes this month</span>
                </div>
              </div>
              <Icon icon="fluent-emoji-flat:sparkles" className="w-6 h-6" />
            </Card>
          </div>
        )}

        {/* Slide 1: Financial Fairness */}
        {slide === 1 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="cheering" size="lg" bubbleText="Smooth money agreements! 💸" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#19B5A5]">
                Shared Ledger Fairness
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                {currencySymbol}<AnimatedNumber value={totalExpensesSettled} /> Shared
              </h3>
              <p className="type-secondary max-w-xs mx-auto text-sm">
                100% consent-first splits settled with zero awkward IOUs or reminders.
              </p>
            </div>

            <Card padding="md" className="bg-[#FFF8E6] border-2 border-[#FFE8A3] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-left">
                <Receipt weight="duotone" className="w-6 h-6 text-[#D97706]" />
                <div>
                  <span className="font-bold text-[#1F2430] text-sm block">100% Agreement Rate</span>
                  <span className="text-xs text-[#64748B]">Every grocery split was approved peacefully</span>
                </div>
              </div>
              <Icon icon="fluent-emoji-flat:handshake" className="w-6 h-6" />
            </Card>
          </div>
        )}

        {/* Slide 2: Household Vibe Pulse */}
        {slide === 2 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="calm" size="lg" bubbleText="Good energy in our flat! ☕" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#5B5BD6]">
                Emotional Climate
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                Chill & Welcoming
              </h3>
              <p className="type-secondary max-w-xs mx-auto text-sm">
                Average apartment vibe scored <strong>4.6 / 5.0</strong> across anonymous weekly pulse checks.
              </p>
            </div>

            <Card padding="md" className="bg-[#EEF0FD] border-2 border-[#C7D2FE] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-left">
                <Heart weight="duotone" className="w-6 h-6 text-[#5B5BD6]" />
                <div>
                  <span className="font-bold text-[#1F2430] text-sm block">Safe & Supportive</span>
                  <span className="text-xs text-[#64748B]">Protected by k-anonymity privacy</span>
                </div>
              </div>
              <Icon icon="fluent-emoji-flat:smiling-face-with-sunglasses" className="w-6 h-6" />
            </Card>
          </div>
        )}

        {/* Slide 3: Superlatives & Everyone Wins */}
        {slide === 3 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="celebrating" size="lg" bubbleText="Everyone is a winner! 🏆" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#F59E0B]">
                Flat Superlatives
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                You Made Home Great
              </h3>
              <p className="type-secondary max-w-xs mx-auto text-sm">
                Every roommate received a weekly honor. No losers, no toxic shame scoreboards.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-3 rounded-2xl bg-[#FFF5F2] border border-[#FFD3C9] flex items-center gap-2">
                <Icon icon="fluent-emoji-flat:trophy" className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-xs font-bold block text-[#1F2430]">Kitchen Hero</span>
                  <span className="text-[10px] text-[#64748B]">Top dishes champ</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#E6FAF8] border border-[#97E5DE] flex items-center gap-2">
                <Icon icon="fluent-emoji-flat:wastebasket" className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-xs font-bold block text-[#1F2430]">Bin Boss</span>
                  <span className="text-[10px] text-[#64748B]">Never missed recycling</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {slide > 0 ? (
            <Button
              variant="outline"
              size="md"
              onClick={handlePrev}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            icon={
              slide === totalSlides - 1 ? (
                <Confetti weight="fill" className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )
            }
          >
            {slide === totalSlides - 1 ? 'Finish & Celebrate' : 'Next'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
