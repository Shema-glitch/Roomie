import React from 'react';
import { House, AirplaneTilt } from '@phosphor-icons/react';
import { sound } from '../../services/sound';

export interface PresenceSegmentedControlProps {
  isHome: boolean;
  onSelectHome: () => void;
  onSelectAway: () => void;
  homeLabel?: string;
  awayLabel?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Shared Home / Away segmented presence toggle with 44x44px touch targets
 * reused across Home and Chores screens so presence state and action are unambiguous.
 */
export const PresenceSegmentedControl: React.FC<PresenceSegmentedControlProps> = ({
  isHome,
  onSelectHome,
  onSelectAway,
  homeLabel = 'Home',
  awayLabel = 'Away',
  compact = false,
  className = '',
}) => {
  return (
    <div
      role="group"
      aria-label="Flat presence status"
      className={`inline-grid grid-cols-2 p-1 rounded-2xl bg-[#EEF0F6] border border-[#CBD5E1] gap-1 ${className}`}
    >
      <button
        type="button"
        aria-pressed={isHome}
        onClick={() => {
          sound.playTap();
          onSelectHome();
        }}
        className={`min-h-[44px] ${
          compact ? 'px-3' : 'px-3.5'
        } rounded-xl text-xs sm:text-[13px] font-heading font-extrabold inline-flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2 ${
          isHome
            ? 'bg-[#EBF9F0] text-[#0F7A3D] border border-[#86EFAC] shadow-2xs'
            : 'text-[#4B5063] hover:text-[#1F2033] hover:bg-white/60 border border-transparent'
        }`}
      >
        <House weight={isHome ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
        <span>{homeLabel}</span>
      </button>

      <button
        type="button"
        aria-pressed={!isHome}
        onClick={() => {
          sound.playTap();
          onSelectAway();
        }}
        className={`min-h-[44px] ${
          compact ? 'px-3' : 'px-3.5'
        } rounded-xl text-xs sm:text-[13px] font-heading font-extrabold inline-flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2 ${
          !isHome
            ? 'bg-[#EEF0FD] text-[#3B4BC4] border border-[#C7D2FE] shadow-2xs'
            : 'text-[#4B5063] hover:text-[#1F2033] hover:bg-white/60 border border-transparent'
        }`}
      >
        <AirplaneTilt weight={!isHome ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
        <span>{awayLabel}</span>
      </button>
    </div>
  );
};
