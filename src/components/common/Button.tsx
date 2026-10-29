import React from 'react';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'teal'
  | 'green'
  | 'indigo'
  | 'reward'
  | 'danger'
  | 'danger-outline'
  | 'outline'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
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

  // Tactile bottom-edge styling based on variant
  const getVariantStyles = (): {
    backgroundColor: string;
    color: string;
    boxShadow: string;
    border: string;
  } => {
    if (disabled) {
      return {
        backgroundColor: '#F1F3F9',
        color: '#9CA3AF',
        boxShadow: 'none',
        border: '2px solid #E6E8EE',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: THEME.colors.primary, // #FF6B4A
          color: '#FFFFFF',
          boxShadow: `0 4px 0 ${THEME.colors.primaryDark}`, // #D94E30
          border: 'none',
        };
      case 'teal':
        return {
          backgroundColor: THEME.colors.secondary, // #19B5A5
          color: '#FFFFFF',
          boxShadow: `0 4px 0 ${THEME.colors.secondaryDark}`, // #138E82
          border: 'none',
        };
      case 'green':
        return {
          backgroundColor: THEME.colors.success, // #3DBE6D
          color: '#FFFFFF',
          boxShadow: `0 4px 0 ${THEME.colors.successDark}`, // #2CA358
          border: 'none',
        };
      case 'indigo':
        return {
          backgroundColor: THEME.colors.info, // #5B5BD6
          color: '#FFFFFF',
          boxShadow: `0 4px 0 ${THEME.colors.infoDark}`, // #4747B8
          border: 'none',
        };
      case 'reward':
        return {
          backgroundColor: THEME.colors.reward, // #FFC93C
          color: THEME.colors.ink,
          boxShadow: `0 4px 0 ${THEME.colors.rewardDark}`, // #DDA821
          border: 'none',
        };
      case 'danger':
        return {
          backgroundColor: THEME.colors.error, // #E5484D
          color: '#FFFFFF',
          boxShadow: `0 4px 0 ${THEME.colors.errorDark}`, // #BF3337
          border: 'none',
        };
      case 'danger-outline':
        return {
          backgroundColor: '#FFFFFF',
          color: '#E5484D',
          boxShadow: '0 4px 0 #CBD5E1',
          border: '2px solid #E6E8EE',
        };
      case 'tertiary':
        return {
          backgroundColor: '#F1F3F9',
          color: '#475569',
          boxShadow: '0 3px 0 #CBD5E1',
          border: '1.5px solid #E2E8F0',
        };
      case 'ghost':
        return {
          backgroundColor: '#FFFFFF',
          color: '#5B5BD6',
          boxShadow: '0 3px 0 #CBD5E1',
          border: '2px solid #E6E8EE',
        };
      case 'secondary':
      case 'outline':
      default:
        // Tactile white card with bottom edge for secondary actions
        return {
          backgroundColor: '#FFFFFF',
          color: '#1F2430',
          boxShadow: '0 4px 0 #CBD5E1',
          border: '2px solid #E6E8EE',
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'min-h-[44px] min-w-[44px] px-3.5 py-2 text-[14px] font-bold whitespace-nowrap';
      case 'lg':
        return 'min-h-[54px] px-6 py-3.5 text-[18px] font-bold whitespace-nowrap';
      case 'md':
      default:
        return 'min-h-[48px] px-5 py-2.5 text-[16px] font-bold whitespace-nowrap';
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={handleClick}
      style={{
        ...variantStyles,
        ...style,
      }}
      className={`btn-tactile inline-flex items-center justify-center gap-2 rounded-2xl cursor-pointer font-heading tracking-wide transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none ${
        fullWidth ? 'w-full' : ''
      } ${getSizeClasses()} ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
