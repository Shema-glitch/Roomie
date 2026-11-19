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
  | 'admin'
  | 'done'
  | 'due';

interface ChipProps {
  label?: string;
  variant?: ChipVariant;
  status?: StatusBadgeType;
  effort?: EffortLevel;
  icon?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md';
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
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#0F7A3D] shadow-xs shrink-0" />;
        break;
      case 'pending':
        effectiveVariant = 'reward';
        effectiveLabel = label || 'Pending';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#9A6700] shadow-xs shrink-0" />;
        break;
      case 'disputed':
        effectiveVariant = 'danger';
        effectiveLabel = label || 'Disputed';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#B42318] shadow-xs shrink-0" />;
        break;
      case 'cancelled':
        effectiveVariant = 'neutral';
        effectiveLabel = label || 'Cancelled';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#4B5063] shrink-0" />;
        break;
      case 'paid':
        effectiveVariant = 'success';
        effectiveLabel = label || 'Paid';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#0F7A3D] shadow-xs shrink-0" />;
        break;
      case 'active':
        effectiveVariant = 'success';
        effectiveLabel = label || 'Active';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#0F7A3D] shadow-xs shrink-0" />;
        break;
      case 'away':
        effectiveVariant = 'info';
        effectiveLabel = label || 'Away';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#3B4BC4] shrink-0" />;
        break;
      case 'admin':
        effectiveVariant = 'info';
        effectiveLabel = label || 'Admin';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#3B4BC4] shadow-xs shrink-0" />;
        break;
      case 'done':
        effectiveVariant = 'success';
        effectiveLabel = label || 'Done';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#0F7A3D] shadow-xs shrink-0" />;
        break;
      case 'due':
        effectiveVariant = 'reward';
        effectiveLabel = label || 'Due Today';
        effectiveIcon = effectiveIcon || <span className="w-2 h-2 rounded-full bg-[#9A6700] shadow-xs shrink-0" />;
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
          color: '#4B5063',
          borderColor: '#CBD5E1',
        };
      case 'primary':
        return {
          backgroundColor: THEME.colors.primaryLight,
          color: '#1F2033',
          borderColor: '#FFC8BE',
        };
      case 'secondary':
        return {
          backgroundColor: '#E6FAF8',
          color: '#0B6B5F',
          borderColor: '#BBEFEA',
        };
      case 'reward':
        return {
          backgroundColor: '#FFF8E6',
          color: '#9A6700',
          borderColor: '#FDE68A',
        };
      case 'success':
        return {
          backgroundColor: '#EBF9F0',
          color: '#0F7A3D',
          borderColor: '#B8ECC8',
        };
      case 'danger':
        return {
          backgroundColor: '#FEF2F2',
          color: '#B42318',
          borderColor: '#FECACA',
        };
      case 'info':
        return {
          backgroundColor: '#EEF0FD',
          color: '#3B4BC4',
          borderColor: '#C7D2FE',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: '#1F2033',
          borderColor: THEME.colors.line,
        };
      case 'default':
      default:
        return {
          backgroundColor: '#F1F5F9',
          color: '#4B5063',
          borderColor: '#CBD5E1',
        };
    }
  };

  const sizeClasses =
    size === 'xs'
      ? 'px-2.5 py-0.5 text-xs font-extrabold tracking-wide'
      : size === 'sm'
      ? 'px-2.5 py-0.5 text-[12px] sm:text-[13px] font-bold'
      : 'px-3.5 py-1.5 text-[14px] font-semibold';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] shadow-2xs select-none whitespace-nowrap shrink-0 max-w-full ${sizeClasses} ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${className}`}
      style={getStyles()}
    >
      {effectiveIcon && <span className="inline-flex shrink-0 items-center justify-center">{effectiveIcon}</span>}
      <span className="leading-tight truncate">{effectiveLabel}</span>
    </span>
  );
};
