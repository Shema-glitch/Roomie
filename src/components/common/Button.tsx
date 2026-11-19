import React from 'react';
import { CircleNotch, IconContext } from '@phosphor-icons/react';
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
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  onClick,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const isDisabled = Boolean(disabled || loading);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    sound.playTap();
    if (onClick) onClick(e);
  };

  const getVariantStyles = (): {
    backgroundColor: string;
    color: string;
    boxShadow: string;
    border: string;
  } => {
    if (isDisabled) {
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
          backgroundColor: THEME.colors.primary,
          color: '#1F2033',
          boxShadow: `0 4px 0 ${THEME.colors.primaryDark}`,
          border: 'none',
        };
      case 'teal':
        return {
          backgroundColor: '#0B7A6E',
          color: '#FFFFFF',
          boxShadow: '0 4px 0 #075950',
          border: 'none',
        };
      case 'green':
        return {
          backgroundColor: '#0F7A3D',
          color: '#FFFFFF',
          boxShadow: '0 4px 0 #0A5C2D',
          border: 'none',
        };
      case 'indigo':
        return {
          backgroundColor: '#3B4BC4',
          color: '#FFFFFF',
          boxShadow: '0 4px 0 #2D3BA3',
          border: 'none',
        };
      case 'reward':
        return {
          backgroundColor: THEME.colors.reward,
          color: '#1F2033',
          boxShadow: `0 4px 0 ${THEME.colors.rewardDark}`,
          border: 'none',
        };
      case 'danger':
        return {
          backgroundColor: '#B42318',
          color: '#FFFFFF',
          boxShadow: '0 4px 0 #8E1B12',
          border: 'none',
        };
      case 'danger-outline':
        return {
          backgroundColor: '#FFFFFF',
          color: '#B42318',
          boxShadow: '0 4px 0 #E2E8F0',
          border: '2px solid #FECACA',
        };
      case 'tertiary':
        return {
          backgroundColor: '#F1F3F9',
          color: '#1F2033',
          boxShadow: '0 3px 0 #CBD5E1',
          border: '1.5px solid #CBD5E1',
        };
      case 'ghost':
        return {
          backgroundColor: '#FFFFFF',
          color: '#3B4BC4',
          boxShadow: '0 3px 0 #CBD5E1',
          border: '2px solid #E6E8EE',
        };
      case 'secondary':
      case 'outline':
      default:
        return {
          backgroundColor: '#FFFFFF',
          color: '#1F2033',
          boxShadow: '0 4px 0 #CBD5E1',
          border: '2px solid #E2E8F0',
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'min-h-[44px] min-w-[44px] px-3.5 py-2 text-[13px] font-heading font-extrabold tracking-normal whitespace-nowrap';
      case 'lg':
        return 'min-h-[56px] px-6 py-3.5 text-[16px] font-heading font-extrabold tracking-normal whitespace-nowrap';
      case 'md':
      default:
        return 'min-h-[48px] px-5 py-2.5 text-[14px] font-heading font-extrabold tracking-normal whitespace-nowrap';
    }
  };

  const variantStyles = getVariantStyles();
  const isSolidFillVariant =
    variant === 'primary' ||
    variant === 'teal' ||
    variant === 'green' ||
    variant === 'indigo' ||
    variant === 'reward' ||
    variant === 'danger';

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={handleClick}
      style={{
        ...variantStyles,
        ...style,
      }}
      className={`btn-tactile ease-spring inline-flex items-center justify-center gap-2 rounded-2xl cursor-pointer font-heading tracking-wide motion-reduce:transition-none motion-reduce:active:scale-100 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none ${
        fullWidth ? 'w-full' : ''
      } ${getSizeClasses()} ${className}`}
    >
      {loading ? (
        <CircleNotch weight="bold" className="w-4 h-4 shrink-0 animate-spin" />
      ) : (
        icon && (
          <IconContext.Provider value={{ weight: isSolidFillVariant ? 'bold' : 'duotone' }}>
            <span className="shrink-0 flex items-center justify-center">{icon}</span>
          </IconContext.Provider>
        )
      )}
      {children && <span>{children}</span>}
    </button>
  );
};
