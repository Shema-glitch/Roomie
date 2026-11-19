import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { VibeRating } from '../../../types';
import { VIBE_DEFINITIONS, VIBE_RATINGS_LIST, getCurrentWeekKey } from '../../../utils/vibe';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { ShieldCheck, Heart, CheckCircle } from '@phosphor-icons/react';
import { Icon } from '@iconify/react';

interface VibeCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: VibeRating) => Promise<void>;
  memberCount?: number;
}

export const VibeCheckModal: React.FC<VibeCheckModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  memberCount = 3,
}) => {
  const currentWeekKey = getCurrentWeekKey();
  const [selectedRating, setSelectedRating] = useState<VibeRating | null>(null);
  const [hasVotedThisWeek, setHasVotedThisWeek] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const unlockThreshold = Math.max(1, Math.min(3, memberCount || 3));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`roomie_vibe_submitted_${currentWeekKey}`);
      if (stored && VIBE_DEFINITIONS[stored as VibeRating]) {
        setSelectedRating(stored as VibeRating);
        setHasVotedThisWeek(true);
      }
    }
  }, [currentWeekKey]);

  if (!isOpen) return null;

  const handleSelect = (rating: VibeRating) => {
    setSelectedRating(rating);
    haptics.tokenClink();
    sound.tokenClink();
  };

  const handleConfirm = async () => {
    if (!selectedRating || submitting) return;
    setSubmitting(true);
    try {
      haptics.vibeSubmit();
      sound.vibeSubmit(selectedRating);

      await onSubmit(selectedRating);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`roomie_vibe_submitted_${currentWeekKey}`, selectedRating);
      }
      setHasVotedThisWeek(true);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Flat Check-in"
      subtitle={
        hasVotedThisWeek
          ? 'You checked in this week · Tap to update'
          : 'How are you feeling in the flat this week?'
      }
      maxWidth="md"
      footer={
        <button
          type="button"
          disabled={!selectedRating || submitting}
          onClick={handleConfirm}
          className={`tactile-press w-full py-3.5 px-4 rounded-2xl font-heading font-black text-sm text-white border-2 border-b-4 transition-colors cursor-pointer flex items-center justify-center gap-2 ${
            selectedRating && !submitting
              ? 'bg-[#FF6B4A] border-[#D94E30] hover:bg-[#F55B39] shadow-sm'
              : 'bg-[#CBD5E1] border-[#94A3B8] opacity-60 cursor-not-allowed'
          }`}
        >
          <Heart weight="fill" className="w-4 h-4" />
          <span>{submitting ? 'Submitting...' : 'Submit Check-in'}</span>
        </button>
      }
    >
      <div className="space-y-4 py-1">
        {/* 5 Tactile Selectable Vibe Cards */}
        <div className="space-y-2">
          {VIBE_RATINGS_LIST.map((rating, idx) => {
            const meta = VIBE_DEFINITIONS[rating];
            const isSelected = selectedRating === rating;

            return (
              <button
                key={rating}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelect(rating)}
                style={{ '--stagger-index': idx } as React.CSSProperties}
                className={`stagger-item tactile-press w-full p-3 sm:p-3.5 rounded-2xl border-2 border-b-4 text-start cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'bg-[#FFF5F2] border-[#FF6B4A] shadow-sm'
                    : 'bg-[#F8FAFC] border-[#E6E8EE] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-white border border-[#FFD3C9] shadow-2xs' : 'bg-white/80'
                    }`}
                  >
                    <Icon icon={meta.icon} className="w-7 h-7" />
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-heading font-black truncate ${
                        isSelected ? 'text-[#C2410C]' : 'text-[#1F2430]'
                      }`}
                    >
                      {meta.label}
                    </div>
                    <div className="text-xs font-medium text-[#64748B] truncate">
                      {meta.description}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle
                    weight="fill"
                    className="spring-pop w-5 h-5 text-[#FF6B4A] shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Privacy Notice */}
        <div className="p-3 rounded-2xl bg-[#F0FDF4] border-2 border-[#BBF7D0] flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" weight="fill" />
          <p className="text-xs font-semibold text-[#0F7A3D] leading-snug">
            Completely anonymous — group mood unlocks once {unlockThreshold}{' '}
            {unlockThreshold === 1 ? 'roomie checks' : 'roomies check'} in.
          </p>
        </div>
      </div>
    </Modal>
  );
};
