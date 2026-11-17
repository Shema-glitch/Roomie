import React, { useState } from 'react';
import { WeeklyAward } from '../../../types';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { Icon } from '@iconify/react';

interface WeeklyAwardsSectionProps {
  awards: WeeklyAward[];
  currentUserId: string;
  reducedMotion?: boolean;
  isRoomieWrappedEnabled?: boolean;
  onOpenWrapped?: () => void;
}

export const WeeklyAwardsSection: React.FC<WeeklyAwardsSectionProps> = ({
  awards,
  currentUserId,
  reducedMotion = false,
  isRoomieWrappedEnabled = false,
  onOpenWrapped,
}) => {
  const [celebrated, setCelebrated] = useState(false);

  if (!awards || awards.length === 0) return null;

  const myAward = awards.find((a) => a.recipientUserId === currentUserId);
  const otherAwards = awards.filter((a) => a.recipientUserId !== currentUserId);

  const handleCelebrate = () => {
    haptics.awardCelebrate();
    sound.awardCelebrate();
    setCelebrated(true);
    setTimeout(() => setCelebrated(false), 2500);
  };

  const colorStyles: Record<WeeklyAward['colorScheme'], { bg: string; border: string; text: string; badge: string }> = {
    amber: { bg: 'bg-[#FFF9EE]', border: 'border-[#FDE047]', text: 'text-[#854D0E]', badge: 'bg-[#FEF08A]' },
    emerald: { bg: 'bg-[#F0FDF4]', border: 'border-[#86EFAC]', text: 'text-[#166534]', badge: 'bg-[#BBF7D0]' },
    rose: { bg: 'bg-[#FFF1F2]', border: 'border-[#FECDD3]', text: 'text-[#9F1239]', badge: 'bg-[#FFE4E6]' },
    sky: { bg: 'bg-[#F0F9FF]', border: 'border-[#BAE6FD]', text: 'text-[#075985]', badge: 'bg-[#E0F2FE]' },
    purple: { bg: 'bg-[#FAF5FF]', border: 'border-[#E9D5FF]', text: 'text-[#6B21A8]', badge: 'bg-[#F3E8FF]' },
    indigo: { bg: 'bg-[#EEF2FF]', border: 'border-[#C7D2FE]', text: 'text-[#3730A3]', badge: 'bg-[#E0E7FF]' },
  };

  return (
    <div className="w-full bg-white rounded-3xl border-2 border-[#E5E9F0] p-4 sm:p-6 shadow-xs space-y-4 relative">
      {/* Celebration Confetti Burst (respects reduced motion, unclipped by parent) */}
      {!reducedMotion && celebrated && (
        <div className="absolute -top-3 inset-x-0 h-48 pointer-events-none z-30 overflow-visible">
          {Array.from({ length: 28 }).map((_, i) => {
            const colors = ['#FF6B4A', '#19B5A5', '#FFC93C', '#5B5BD6', '#3DBE6D'];
            const color = colors[i % colors.length];
            const left = `${(i * 3.6) % 100}%`;
            const delay = `${(i * 0.05) % 0.8}s`;
            const duration = `${1.2 + ((i * 0.1) % 0.8)}s`;
            return (
              <div
                key={i}
                className="absolute top-0 w-2.5 h-2.5 rounded-xs animate-confetti-gpu will-change-transform"
                style={{
                  left,
                  backgroundColor: color,
                  animationDelay: delay,
                  animationDuration: duration,
                  transform: `translate3d(0, 0, 0) rotate(${i * 24}deg)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#FEF08A] to-[#FBBF24] border-2 border-b-3 border-[#D97706] flex items-center justify-center shadow-xs shrink-0">
            <Icon icon="fluent-emoji-flat:trophy" className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-heading font-black text-[#1F2430] truncate">
              Weekly Shoutouts
            </h3>
            <p className="text-xs font-semibold text-[#64748B] truncate">
              Little wins around the flat
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCelebrate}
          className={`btn-tactile ease-spring px-3 py-1.5 rounded-xl font-heading font-black text-xs border-2 border-b-4 will-change-transform cursor-pointer flex items-center gap-1.5 shrink-0 ${
            celebrated
              ? 'bg-[#19B5A5] text-white border-[#138E82]'
              : 'bg-[#FFF8E6] text-[#B45309] border-[#F59E0B]/50 hover:bg-[#FEF3C7]'
          }`}
          title="Celebrate this week's shoutouts"
        >
          <Icon icon="fluent-emoji-flat:party-popper" className="w-4 h-4 shrink-0" />
          <span>{celebrated ? 'Cheering!' : 'Celebrate'}</span>
        </button>
      </div>

      {/* Hero Badge for Current User */}
      {myAward && (
        <div
          className={`p-4 rounded-2xl border transition-transform ${
            colorStyles[myAward.colorScheme].bg
          } ${colorStyles[myAward.colorScheme].border}`}
        >
          <div className="flex items-start gap-3.5">
            <span className="shrink-0 p-2 rounded-2xl bg-white/80 shadow-xs border border-white flex items-center justify-center">
              <Icon icon={myAward.icon} className="w-8 h-8" />
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6B4A] block">
                Your Shoutout This Week
              </span>
              <h4 className="text-base font-heading font-black text-[#1F2430] mt-0.5">
                {myAward.title}
              </h4>
              <p className="text-xs font-medium text-[#475569] mt-1 leading-relaxed">
                {myAward.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Flatmate Shoutouts in Horizontal Swipe Strip */}
      {otherAwards.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-[#64748B] px-0.5">
            Flatmate Shoutouts
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x">
            {otherAwards.map((award, idx) => {
              const style = colorStyles[award.colorScheme];
              return (
                <div
                  key={award.id}
                  style={{ '--stagger-index': idx + 1 } as React.CSSProperties}
                  className={`stagger-item card-interactive ease-spring min-w-[210px] max-w-[240px] shrink-0 snap-start p-3 rounded-2xl border ${style.bg} ${style.border} flex flex-col justify-between contain-content`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="shrink-0 flex items-center justify-center">
                      <Icon icon={award.icon} className="w-6 h-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-[#64748B] truncate">
                        {award.recipientName.split(' ')[0]}
                      </div>
                      <div className="text-xs font-heading font-black text-[#1F2430] truncate">
                        {award.title}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-[#475569] line-clamp-2 leading-tight">
                    {award.reason}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roomie Wrapped Story Pill Trigger */}
      {isRoomieWrappedEnabled && onOpenWrapped && (
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            haptics.tokenClink();
            onOpenWrapped();
          }}
          className="btn-tactile ease-spring w-full p-3 rounded-2xl bg-gradient-to-r from-[#FFF5F2] via-[#FFF8E6] to-[#EEF0FD] border border-[#FFD3C9] flex items-center justify-between text-left cursor-pointer shadow-2xs select-none gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#FFD3C9] flex items-center justify-center shrink-0">
              <Icon icon="fluent-emoji-flat:wrapped-gift" className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-black text-[#1F2430] truncate">
                  Monthly Flat Recap
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#FFE4DD] text-[#D94E30] text-[11px] font-bold shrink-0">
                  Beta
                </span>
              </div>
              <span className="text-[10px] text-[#64748B] truncate block">
                View flat recap &amp; share story card
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-[#FF6B4A] text-white text-[11px] font-black whitespace-nowrap shrink-0">
            Open Story
          </span>
        </button>
      )}
    </div>
  );
};
