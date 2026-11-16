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
  ShareNetwork,
  Heart,
  Confetti,
  ForkKnife,
  ShieldCheck,
} from '@phosphor-icons/react';
import {
  User,
  ChoreAssignment,
  Chore,
  Expense,
  WeeklyAward,
  HouseholdVibeSummary,
  CulturalDinner,
} from '../../../types';
import { computeRoomieWrappedMetrics } from '../../../utils/wrappedMetrics';
import { shareRoomieStoryCard } from '../../../utils/shareCardCanvas';

export interface RoomieWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdName?: string;
  semesterLabel?: string;
  roommates?: User[];
  assignments?: ChoreAssignment[];
  chores?: Chore[];
  expenses?: Expense[];
  awards?: WeeklyAward[];
  culturalDinners?: CulturalDinner[];
  vibeSummary?: HouseholdVibeSummary;
}

export const RoomieWrappedModal: React.FC<RoomieWrappedModalProps> = ({
  isOpen,
  onClose,
  householdName = 'Our Flat',
  semesterLabel = 'Fall Semester 2026',
  roommates = [],
  assignments = [],
  chores = [],
  expenses = [],
  awards = [],
  culturalDinners = [],
  vibeSummary,
}) => {
  const [slide, setSlide] = useState<number>(0);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  if (!isOpen) return null;

  const metrics = computeRoomieWrappedMetrics({
    roommates,
    assignments,
    chores,
    expenses,
    awards,
    culturalDinners,
    vibeSummary,
  });

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

  const handleShareCard = async () => {
    setIsSharing(true);
    sound.awardCelebrate();
    haptics.awardCelebrate();
    try {
      await shareRoomieStoryCard({
        metrics,
        householdName,
        semesterLabel,
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${householdName} Wrapped`}
      subtitle={`Semester living celebration · ${semesterLabel} recap`}
    >
      <div className="space-y-5 py-1">
        {/* Progress Segments */}
        <div className="flex items-center gap-1.5 px-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ease-spring ${
                idx <= slide
                  ? 'bg-[#FF6B4A]'
                  : 'bg-[#E2E8F0]'
              }`}
            />
          ))}
        </div>

        {/* Slide 0: Flat Harmony Rating & Peace */}
        {slide === 0 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="celebrating" size="lg" bubbleText="Peaceful flat vibes! ✨" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6B4A]">
                Apartment Health & Harmony
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                Flat Harmony Rating
              </h3>
            </div>

            <Card padding="lg" className="bg-[#FFF5F2] border-2 border-[#FFD9CF] space-y-3">
              <div className="flex items-center justify-center">
                <span className="text-6xl font-black text-[#FF6B4A] font-mono">
                  <AnimatedNumber value={metrics.flatHarmonyScore} suffix="%" />
                </span>
              </div>
              <p className="text-xs font-semibold text-[#7C2D12]">
                Calculated across weekly vibe pulses, dispute-free bill splits, and fair chore rotations.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#047857] text-xs font-black">
                <ShieldCheck weight="fill" className="w-4 h-4 text-[#10B981]" />
                <span>Zero Tension Household</span>
              </div>
            </Card>
          </div>
        )}

        {/* Slide 1: Team Accomplishments (Chores & Peaceful Streaks) */}
        {slide === 1 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="cheering" size="lg" bubbleText="Teamwork makes the dream work!" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#14B8A6]">
                Team Accomplishments
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                Shared Momentum
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <Card padding="md" className="bg-[#F0FDFA] border-2 border-[#CCFBF1] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#0F766E]">
                  <CheckCircle weight="fill" className="w-4 h-4 text-[#14B8A6]" />
                  <span>Chores Done</span>
                </div>
                <div className="text-3xl font-black text-[#0F766E]">
                  <AnimatedNumber value={metrics.totalChoresTogether} suffix="+" />
                </div>
                <p className="text-[11px] text-[#115E59]">Tasks completed together this semester</p>
              </Card>

              <Card padding="md" className="bg-[#EFF6FF] border-2 border-[#DBEAFE] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#1D4ED8]">
                  <ShieldCheck weight="fill" className="w-4 h-4 text-[#3B82F6]" />
                  <span>Peaceful Streak</span>
                </div>
                <div className="text-3xl font-black text-[#1D4ED8]">
                  <AnimatedNumber value={metrics.disputeFreeStreakDays} suffix="d" />
                </div>
                <p className="text-[11px] text-[#1E40AF]">Consecutive days without bill disputes</p>
              </Card>
            </div>
          </div>
        )}

        {/* Slide 2: Cultural Dinners & Social Kudos */}
        {slide === 2 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="calm" size="lg" bubbleText="Delicious dinners and good vibes!" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#F59E0B]">
                Culinary & Camaraderie
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                Chefs & Appreciation
              </h3>
            </div>

            <div className="space-y-3">
              <Card padding="sm" className="bg-[#FEF3C7]/50 border-2 border-[#FDE68A] flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/20 flex items-center justify-center shrink-0">
                    <Icon icon="fluent-emoji-flat:pot-of-food" className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#92400E]">Top Flat Chef</span>
                    <h4 className="text-base font-black text-[#1F2430]">{metrics.topChefName}</h4>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#92400E] px-2.5 py-1 rounded-xl bg-white border border-[#FDE68A]">
                  {metrics.culturalDinnersHosted} Dinners
                </span>
              </Card>

              <Card padding="sm" className="bg-[#FDF2F8] border-2 border-[#FCE7F3] flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-[#EC4899]/20 flex items-center justify-center shrink-0">
                    <Heart weight="fill" className="w-6 h-6 text-[#EC4899]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#9D174D]">Most Appreciated</span>
                    <h4 className="text-base font-black text-[#1F2430]">{metrics.mostAppreciatedFlatmateName}</h4>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#9D174D] px-2.5 py-1 rounded-xl bg-white border border-[#FCE7F3]">
                  {metrics.totalKudosExchanged} Kudos
                </span>
              </Card>
            </div>
          </div>
        )}

        {/* Slide 3: Standout Flat Honor & Shareable Story Card */}
        {slide === 3 && (
          <div className="space-y-4 text-center animate-fade-in">
            <MascotView state="celebrating" size="lg" bubbleText="You earned the top flat honor!" />
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#6366F1]">
                Standout Apartment Award
              </span>
              <h3 className="type-title text-2xl text-[#1F2430]">
                {metrics.topAwardTitle}
              </h3>
            </div>

            <Card padding="md" className="bg-[#F5F3FF] border-2 border-[#DDD6FE] space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Confetti weight="duotone" className="w-6 h-6 text-[#6366F1]" />
                <span className="text-sm font-black text-[#4338CA]">Certified Peaceful Flat</span>
              </div>
              <p className="text-xs text-[#5B21B6] leading-relaxed">
                Your flat maintained a top-tier harmony score, shared delicious cultural dinners, and resolved tasks smoothly.
              </p>
            </Card>

            <Button
              variant="indigo"
              size="lg"
              fullWidth
              loading={isSharing}
              onClick={handleShareCard}
              icon={<ShareNetwork weight="bold" className="w-5 h-5" />}
            >
              Share Story Card (Zero Financials)
            </Button>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-2">
          {slide > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              icon={<ArrowLeft weight="bold" className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            icon={slide === totalSlides - 1 ? <Sparkle weight="fill" className="w-4 h-4" /> : <ArrowRight weight="bold" className="w-4 h-4" />}
          >
            {slide === totalSlides - 1 ? 'Finish & Celebrate' : 'Next Milestone'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
