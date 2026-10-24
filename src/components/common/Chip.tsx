import React from 'react';
import { THEME } from '../../theme/tokens';
import { EffortLevel } from '../../types';

export type ChipVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'reward'
  | 'success'
  | 'danger'
  | 'info'
  | 'outline';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  effort?: EffortLevel;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'default',
  effort,
  icon,
  size = 'md',
  onClick,
  className = '',
}) => {
  // Override variant if effort level is provided
  let effectiveVariant = variant;
  let effectiveLabel = label;

  if (effort) {
    if (effort === 'light') {
      effectiveVariant = 'secondary';
      effectiveLabel = label || 'Light effort (1 pt)';
    } else if (effort === 'medium') {
      effectiveVariant = 'reward';
      effectiveLabel = label || 'Medium effort (2 pts)';
    } else if (effort === 'heavy') {
      effectiveVariant = 'primary';
      effectiveLabel = label || 'Heavy effort (3 pts)';
    }
  }

  const getStyles = () => {
    switch (effectiveVariant) {
      case 'primary':
        return {
          backgroundColor: THEME.colors.primaryLight,
          color: THEME.colors.primaryDark,
          borderColor: '#FFC8BE',
        };
      case 'secondary':
        return {
          backgroundColor: THEME.colors.secondaryLight,
          color: THEME.colors.secondaryDark,
          borderColor: '#BBEFEA',
        };
      case 'reward':
        return {
          backgroundColor: THEME.colors.rewardLight,
          color: '#8A6200',
          borderColor: '#FFE8A3',
        };
      case 'success':
        return {
          backgroundColor: THEME.colors.successLight,
          color: THEME.colors.successDark,
          borderColor: '#B8ECC8',
        };
      case 'danger':
        return {
          backgroundColor: THEME.colors.errorLight,
          color: THEME.colors.errorDark,
          borderColor: '#F8BFC2',
        };
      case 'info':
        return {
          backgroundColor: THEME.colors.infoLight,
          color: THEME.colors.info,
          borderColor: '#D3D5F9',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: THEME.colors.ink,
          borderColor: THEME.colors.line,
        };
      case 'default':
      default:
        return {
          backgroundColor: THEME.colors.bg,
          color: THEME.colors.muted,
          borderColor: THEME.colors.line,
        };
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs font-bold';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold select-none ${sizeClasses} ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${className}`}
      style={getStyles()}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{effectiveLabel}</span>
    </span>
  );
};
