import React, { useState, useEffect } from 'react';
import { Clock } from '@phosphor-icons/react';

interface ChoreDueCountdownBadgeProps {
  scheduledTime?: string; // e.g. "19:00" or "20:30"
  completedToday?: boolean;
  className?: string;
}

export const ChoreDueCountdownBadge: React.FC<ChoreDueCountdownBadgeProps> = ({
  scheduledTime = '20:00',
  completedToday = false,
  className = '',
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  useEffect(() => {
    if (completedToday) return;

    const calculateTime = () => {
      const now = new Date();
      const parts = scheduledTime.split(':');
      const target = new Date();
      target.setHours(parseInt(parts[0] || '20', 10), parseInt(parts[1] || '0', 10), 0, 0);

      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeftStr('Due now');
        setIsUrgent(true);
        return;
      }

      const totalMins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;

      if (hours > 0) {
        setTimeLeftStr(`${hours}h ${mins}m left`);
        setIsUrgent(hours < 2);
      } else {
        setTimeLeftStr(`${mins}m left`);
        setIsUrgent(true);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [scheduledTime, completedToday]);

  if (completedToday) {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-black uppercase tracking-wider bg-[#E6FAF8] text-[#138E82] border border-[#BBEFEA] ${className}`}>
        Completed
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-black tracking-wide border transition-colors ${
        isUrgent
          ? 'bg-[#FFF0ED] text-[#E5484D] border-[#FFD7CF] animate-pulse'
          : 'bg-[#FFF8E6] text-[#8A6200] border-[#FFE8A3]'
      } ${className}`}
    >
      <Clock weight="bold" className={`w-3.5 h-3.5 ${isUrgent ? 'text-[#E5484D]' : 'text-[#8A6200]'}`} />
      <span>{timeLeftStr || 'Due today'}</span>
    </span>
  );
};
