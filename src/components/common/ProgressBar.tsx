import React from 'react';
import { THEME } from '../../theme/tokens';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: 'primary' | 'secondary' | 'reward' | 'success';
  height?: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'reward',
  height = 12,
  label,
  showPercent = false,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const getColor = () => {
    switch (color) {
      case 'primary':
        return THEME.colors.primary;
      case 'secondary':
        return THEME.colors.secondary;
      case 'success':
        return THEME.colors.success;
      case 'reward':
      default:
        return THEME.colors.reward;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="type-label">{label}</span>}
          {showPercent && <span className="type-secondary">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div
        className="w-full bg-[#E6E8EE] rounded-full overflow-hidden p-0.5"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
    </div>
  );
};
