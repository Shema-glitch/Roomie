import React from 'react';
import { THEME } from '../../theme/tokens';
import { EffortLevel } from '../../types';

export type ChipVariant =
  | 'default'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'reward'
  | 'success'
  | 'danger'
  | 'info'
  | 'outline';

export type StatusBadgeType =
  | 'agreed'
  | 'pending'
  | 'disputed'
  | 'cancelled'
  | 'paid'
  | 'active'
  | 'away'
  | 'admin';

interface ChipProps {
  label?: string;
  variant?: ChipVariant;
  status?: StatusBadgeType;
  effort?: EffortLevel;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label = '',
  variant = 'default',
  status,
  effort,
  icon,
  size = 'md',
  onClick,
  className = '',
}) => {
  // Override variant and icon if status is provided
  let effectiveVariant = variant;
  let effectiveLabel = label;
  let effectiveIcon = icon;

  if (status) {
    switch (status) {
      case 'agreed':
        effectiveVariant = 'success';
        effectiveLabel = label || 'Agreed';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#2CA358] shadow-xs shrink-0" />;
        break;
      case 'pending':
        effectiveVariant = 'reward';
        effectiveLabel = label || 'Pending';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#8A6200] shadow-xs shrink-0" />;
        break;
      case 'disputed':
        effectiveVariant = 'danger';
        effectiveLabel = label || 'Disputed';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#BF3337] shadow-xs shrink-0" />;
        break;
      case 'cancelled':
        effectiveVariant = 'neutral';
        effectiveLabel = label || 'Cancelled';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#64748B] shrink-0" />;
        break;
      case 'paid':
        effectiveVariant = 'success';
        effectiveLabel = label || 'Paid';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#2CA358] shadow-xs shrink-0" />;
        break;
      case 'active':
        effectiveVariant = 'success';
        effectiveLabel = label || 'Active';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#2CA358] shadow-xs shrink-0" />;
        break;
      case 'away':
        effectiveVariant = 'info';
        effectiveLabel = label || 'Away';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#5B5BD6] shrink-0" />;
        break;
      case 'admin':
        effectiveVariant = 'primary';
        effectiveLabel = label || 'Admin';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#FF6B4A] shadow-xs shrink-0" />;
        break;
    }
  }

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
      case 'neutral':
        return {
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          borderColor: '#E2E8F0',
        };
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
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          borderColor: '#E2E8F0',
        };
    }
  };

  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-[14px] font-normal' : 'px-3.5 py-1.5 text-[14px] font-semibold';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] shadow-2xs select-none ${sizeClasses} ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${className}`}
      style={getStyles()}
    >
      {effectiveIcon && <span className="inline-flex shrink-0 items-center justify-center">{effectiveIcon}</span>}
      <span className="leading-tight">{effectiveLabel}</span>
    </span>
  );
};
