import React, { useState } from 'react';
import { WeeklyAward } from '../../../types';
import { sound } from '../../../services/sound';
import { haptics } from '../../../services/haptics';

interface WeeklyAwardsSectionProps {
  awards: WeeklyAward[];
  currentUserId: string;
  reducedMotion?: boolean;
}

export const WeeklyAwardsSection: React.FC<WeeklyAwardsSectionProps> = ({
  awards,
  currentUserId,
  reducedMotion = false,
}) => {
  const [celebrated, setCelebrated] = useState(false);

  if (!awards || awards.length === 0) return null;

  const myAward = awards.find((a) => a.recipientUserId === currentUserId);
  const otherAwards = awards.filter((a) => a.recipientUserId !== currentUserId);

  const handleCelebrate = () => {
    haptics.celebration();
    sound.playCelebration();
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
    <div className="w-full bg-white rounded-3xl border-2 border-b-4 border-[#E6E8EE] p-4 sm:p-6 shadow-xs space-y-4 relative overflow-hidden">
      {/* Celebration Confetti Burst (respects reduced motion) */}
      {!reducedMotion && celebrated && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => {
            const colors = ['#FF6B4A', '#19B5A5', '#FFC93C', '#5B5BD6', '#3DBE6D'];
            const color = colors[i % colors.length];
            const left = `${(i * 3.6) % 100}%`;
            const delay = `${(i * 0.05) % 0.8}s`;
            const duration = `${1.2 + ((i * 0.1) % 0.8)}s`;
            return (
              <div
                key={i}
                className="absolute top-0 w-2.5 h-2.5 rounded-xs animate-bounce"
                style={{
                  left,
                  backgroundColor: color,
                  animationDelay: delay,
                  animationDuration: duration,
                  transform: `rotate(${i * 24}deg)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#FEF08A] to-[#FBBF24] border-2 border-b-3 border-[#D97706] flex items-center justify-center text-xl shadow-xs shrink-0">
            🏆
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-heading font-black text-[#1F2430] truncate">
              Weekly Honors · Everyone Wins!
            </h3>
            <p className="text-xs font-semibold text-[#64748B] line-clamp-1 sm:line-clamp-none">
              Celebrating everyone who makes our home awesome ✨
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCelebrate}
          className={`px-3 py-1.5 rounded-xl font-heading font-black text-xs border-2 border-b-4 transition-all cursor-pointer flex items-center gap-1.5 active:translate-y-[2px] active:border-b-2 shrink-0 ${
            celebrated
              ? 'bg-[#19B5A5] text-white border-[#138E82]'
              : 'bg-[#FFF8E6] text-[#B45309] border-[#F59E0B]/50 hover:bg-[#FEF3C7]'
          }`}
          title="Celebrate this week's honors"
        >
          <span>🎉</span>
          <span>{celebrated ? 'Cheering!' : 'Celebrate'}</span>
        </button>
      </div>

      {/* Hero Badge for Current User */}
      {myAward && (
        <div
          className={`p-4 rounded-2xl border-2 border-b-4 transition-transform ${
            colorStyles[myAward.colorScheme].bg
          } ${colorStyles[myAward.colorScheme].border}`}
        >
          <div className="flex items-start gap-3.5">
            <span className="text-3xl shrink-0 p-1.5 rounded-2xl bg-white/80 shadow-xs border border-white">
              {myAward.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-[#FF6B4A]">
                  Your Award This Week
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    colorStyles[myAward.colorScheme].badge
                  } ${colorStyles[myAward.colorScheme].text}`}
                >
                  {myAward.title}
                </span>
              </div>
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

      {/* Other Flatmate Awards */}
      {otherAwards.length > 0 && (
        <div className={`grid gap-2.5 pt-1 ${
          otherAwards.length === 1
            ? 'grid-cols-1'
            : otherAwards.length === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-3'
        }`}>
          {otherAwards.map((award) => {
            const style = colorStyles[award.colorScheme];
            return (
              <div
                key={award.id}
                className={`p-3 rounded-2xl border-2 border-b-3 ${style.bg} ${style.border} flex flex-col justify-between`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl shrink-0">{award.icon}</span>
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
      )}
    </div>
  );
};
