import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { VibeRating } from '../../../types';
import { VIBE_DEFINITIONS, VIBE_RATINGS_LIST, getCurrentWeekKey } from '../../../utils/vibe';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { ShieldCheck, Heart, Check } from '@phosphor-icons/react';
import { Icon } from '@iconify/react';

interface VibeCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: VibeRating) => Promise<void>;
}

export const VibeCheckModal: React.FC<VibeCheckModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const currentWeekKey = getCurrentWeekKey();
  const [selectedRating, setSelectedRating] = useState<VibeRating | null>(null);
  const [hasVotedThisWeek, setHasVotedThisWeek] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check previous submission receipt
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
      title="Weekly Vibe Check"
      subtitle={
        hasVotedThisWeek
          ? 'You voted this week · Tap to update'
          : 'How are you feeling in the flat this week?'
      }
      maxWidth="md"
      footer={
        <button
          type="button"
          disabled={!selectedRating || submitting}
          onClick={handleConfirm}
          className={`w-full py-3.5 px-4 rounded-2xl font-heading font-black text-sm text-white border-2 border-b-4 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            selectedRating && !submitting
              ? 'bg-[#FF6B4A] border-[#D94E30] hover:bg-[#F55B39] active:translate-y-[2px] active:border-b-2 shadow-sm'
              : 'bg-[#CBD5E1] border-[#94A3B8] opacity-60 cursor-not-allowed'
          }`}
        >
          <Heart weight="fill" className="w-4 h-4" />
          <span>
            {submitting
              ? 'Sharing Anonymously...'
              : hasVotedThisWeek
              ? 'Update My Vibe'
              : 'Share Anonymously'}
          </span>
        </button>
      }
    >
      <div className="space-y-4 py-1">
        {/* 5 Vibe Emotion Cards */}
        <div className="space-y-2">
          {VIBE_RATINGS_LIST.map((rating, idx) => {
            const meta = VIBE_DEFINITIONS[rating];
            const isSelected = selectedRating === rating;

            return (
              <button
                key={rating}
                type="button"
                onClick={() => handleSelect(rating)}
                style={{ '--stagger-index': idx } as React.CSSProperties}
                className={`stagger-item btn-tactile ease-spring w-full p-3 sm:p-3.5 rounded-2xl border-2 text-left cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#FFF8E6] border-[#F59E0B] border-b-4 translate-y-[-1px] shadow-sm'
                    : 'bg-[#F8FAFC] border-[#E6E8EE] border-b-3 hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 flex items-center justify-center">
                    <Icon icon={meta.icon} className="w-7 h-7" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-heading font-black text-[#1F2430] truncate">
                      {meta.label}
                    </div>
                    <div className="text-xs font-medium text-[#64748B] truncate">
                      {meta.description}
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'border-[#F59E0B] bg-[#F59E0B] text-white'
                      : 'border-[#CBD5E1] bg-white'
                  }`}
                >
                  {isSelected && <Check weight="bold" className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Privacy Shield Notice */}
        <div className="p-3 rounded-2xl bg-[#F0FDF4] border-2 border-[#BBF7D0] flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" weight="fill" />
          <p className="text-[11px] font-semibold text-[#166534] leading-snug">
            <span className="font-bold">100% Anonymous:</span> Answers are never linked to your
            name or user ID. Apartment average reveals once 3 or more roommates have submitted.
          </p>
        </div>
      </div>
    </Modal>
  );
};
