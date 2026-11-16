import React, { useState } from 'react';
import { VibeRating } from '../../../types';
import { VIBE_DEFINITIONS, VIBE_RATINGS_LIST } from '../../../utils/vibe';
import { sound } from '../../../services/sound';
import { haptics } from '../../../services/haptics';
import { X, ShieldCheck, Heart } from '@phosphor-icons/react';

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
  const [selectedRating, setSelectedRating] = useState<VibeRating | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (rating: VibeRating) => {
    setSelectedRating(rating);
    haptics.light();
    sound.playPop();
  };

  const handleConfirm = async () => {
    if (!selectedRating || submitting) return;
    setSubmitting(true);
    try {
      haptics.celebration();
      sound.playCelebration();
      await onSubmit(selectedRating);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-b-6 border-[#E2E8F0] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF5F2] border-2 border-[#FFD3C9] flex items-center justify-center text-xl shadow-xs">
              ✨
            </div>
            <div>
              <h3 className="text-xl font-heading font-black text-[#1F2430]">
                Weekly Vibe Check
              </h3>
              <p className="text-xs font-semibold text-[#64748B]">
                How are you feeling about the apartment this week?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#1F2430] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Vibe Emotion Cards */}
        <div className="space-y-2">
          {VIBE_RATINGS_LIST.map((rating) => {
            const meta = VIBE_DEFINITIONS[rating];
            const isSelected = selectedRating === rating;

            return (
              <button
                key={rating}
                type="button"
                onClick={() => handleSelect(rating)}
                className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#FFF8E6] border-[#F59E0B] border-b-4 translate-y-[-1px] shadow-sm'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] border-b-3 hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{meta.emoji}</span>
                  <div>
                    <div className="text-sm font-heading font-black text-[#1F2430]">
                      {meta.label}
                    </div>
                    <div className="text-xs font-medium text-[#64748B]">
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
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Privacy Shield Notice */}
        <div className="p-3 rounded-2xl bg-[#F0FDF4] border-2 border-[#BBF7D0] flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" weight="fill" />
          <p className="text-[11px] font-semibold text-[#166534] leading-snug">
            <span className="font-bold">100% Anonymous:</span> Responses are never linked to your
            name or profile. Results are only revealed when 3 or more roommates have voted.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            disabled={!selectedRating || submitting}
            onClick={handleConfirm}
            className={`w-full py-3.5 px-4 rounded-2xl font-heading font-black text-sm text-white border-2 border-b-4 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              selectedRating && !submitting
                ? 'bg-[#FF6B4A] border-[#E05333] hover:bg-[#F55B39] active:translate-y-[2px] active:border-b-2 shadow-sm'
                : 'bg-[#CBD5E1] border-[#94A3B8] opacity-60 cursor-not-allowed'
            }`}
          >
            <Heart weight="fill" className="w-4 h-4" />
            <span>{submitting ? 'Sharing Anonymously...' : 'Share Anonymously'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
