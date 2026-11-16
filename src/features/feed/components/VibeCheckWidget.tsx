import React from 'react';
import { HouseholdVibeSummary } from '../../../types';
import { VIBE_DEFINITIONS } from '../../../utils/vibe';
import { sound } from '../../../services/sound';
import { haptics } from '../../../services/haptics';
import { LockKey, Sparkle } from '@phosphor-icons/react';

interface VibeCheckWidgetProps {
  summary?: HouseholdVibeSummary;
  totalRoommates?: number;
  onOpenCheckIn: () => void;
}

export const VibeCheckWidget: React.FC<VibeCheckWidgetProps> = ({
  summary,
  totalRoommates = 4,
  onOpenCheckIn,
}) => {
  const isSmallFlat = totalRoommates < 3;
  const isRevealed = summary?.revealed && summary.averageScore !== undefined;
  const dominantMeta = summary?.dominantMood ? VIBE_DEFINITIONS[summary.dominantMood] : null;

  const count = summary?.submissionCount || 0;
  const minRequired = summary?.minRequired || 3;
  const needed = Math.max(0, minRequired - count);

  const handleClick = () => {
    haptics.light();
    sound.playTap();
    onOpenCheckIn();
  };

  return (
    <div className="w-full bg-white rounded-3xl border-2 border-b-4 border-[#E6E8EE] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-2 border-b-3 shadow-2xs shrink-0 ${
            isRevealed
              ? 'bg-[#FFF8E6] border-[#F59E0B]'
              : 'bg-[#F1F5F9] border-[#CBD5E1]'
          }`}
        >
          {isRevealed && dominantMeta ? dominantMeta.emoji : '🔒'}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-heading font-black text-[#1F2430] truncate">
              Apartment Vibe Pulse
            </h4>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                isRevealed
                  ? 'bg-[#E6FAF8] text-[#138E82] border border-[#19B5A5]/30'
                  : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
              }`}
            >
              {isRevealed ? 'Unlocked' : 'Private'}
            </span>
          </div>

          {isSmallFlat ? (
            <p className="text-xs font-medium text-[#64748B] mt-0.5">
              Vibe Pulse requires 3+ roommates to protect anonymity. Try sending kudos in Chat!
            </p>
          ) : isRevealed && dominantMeta ? (
            <p className="text-xs font-semibold text-[#475569] mt-0.5 truncate">
              Score: <span className="font-bold text-[#FF6B4A]">{summary.averageScore} / 5</span> · {dominantMeta.label} ({dominantMeta.description})
            </p>
          ) : (
            <p className="text-xs font-medium text-[#64748B] mt-0.5 flex items-center gap-1.5 truncate">
              <LockKey className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              <span>
                {count}/{minRequired} roommates voted · {needed} more needed to reveal safely
              </span>
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="w-full sm:w-auto px-4 py-2.5 rounded-2xl font-heading font-black text-xs text-[#1F2430] bg-[#FFF8E6] border-2 border-b-4 border-[#F59E0B]/50 hover:bg-[#FEF3C7] active:translate-y-[2px] active:border-b-2 cursor-pointer transition-all flex items-center justify-center gap-2 shadow-2xs shrink-0"
      >
        <Sparkle weight="fill" className="w-4 h-4 text-[#F59E0B]" />
        <span>Share Vibe Anonymously</span>
      </button>
    </div>
  );
};
