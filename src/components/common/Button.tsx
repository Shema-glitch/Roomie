import React from 'react';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';

export type ButtonVariant = 'primary' | 'secondary' | 'reward' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  onClick,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    sound.playTap();
    if (onClick) onClick(e);
  };

  // Tactile edge styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: THEME.colors.primary,
          color: '#FFFFFF',
          boxShadow: disabled ? 'none' : `0 4px 0 ${THEME.colors.primaryDark}`,
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: THEME.colors.secondary,
          color: '#FFFFFF',
          boxShadow: disabled ? 'none' : `0 4px 0 ${THEME.colors.secondaryDark}`,
          border: 'none',
        };
      case 'reward':
        return {
          backgroundColor: THEME.colors.reward,
          color: THEME.colors.ink,
          boxShadow: disabled ? 'none' : `0 4px 0 ${THEME.colors.rewardDark}`,
          border: 'none',
        };
      case 'danger':
        return {
          backgroundColor: THEME.colors.error,
          color: '#FFFFFF',
          boxShadow: disabled ? 'none' : `0 4px 0 ${THEME.colors.errorDark}`,
          border: 'none',
        };
      case 'outline':
        return {
          backgroundColor: THEME.colors.surface,
          color: THEME.colors.ink,
          boxShadow: disabled ? 'none' : `0 3px 0 ${THEME.colors.line}`,
          border: `1.5px solid ${THEME.colors.line}`,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: THEME.colors.ink,
          boxShadow: 'none',
          border: 'none',
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'min-h-[40px] px-3.5 py-1.5 text-sm font-bold';
      case 'lg':
        return 'min-h-[52px] px-6 py-3.5 text-lg font-extrabold';
      case 'md':
      default:
        return 'min-h-[46px] px-4 py-2.5 text-base font-bold';
    }
  };

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={handleClick}
      className={`btn-tactile inline-flex items-center justify-center gap-2 rounded-[16px] cursor-pointer font-heading tracking-wide active:scale-[0.98] transition-all select-none ${
        fullWidth ? 'w-full' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''} ${getSizeClasses()} ${className}`}
      style={{
        ...getVariantStyles(),
        ...style,
      }}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
