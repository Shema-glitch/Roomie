import React from 'react';
import { THEME } from '../../theme/tokens';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'surface' | 'flat' | 'highlight' | 'calm';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  padding = 'md',
  interactive = false,
  className = '',
  style,
  ...props
}) => {
  const getPaddingClass = () => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      case 'md':
      default:
        return 'p-4 sm:p-5';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'highlight':
        return {
          backgroundColor: THEME.colors.primaryLight,
          borderColor: '#FFD7CF',
          boxShadow: THEME.shadows.card,
        };
      case 'flat':
        return {
          backgroundColor: THEME.colors.bg,
          borderColor: THEME.colors.line,
          boxShadow: 'none',
        };
      case 'calm':
        return {
          backgroundColor: THEME.colors.surface,
          borderColor: THEME.colors.line,
          boxShadow: '0 1px 3px rgba(31, 36, 48, 0.04)',
        };
      case 'surface':
      default:
        return {
          backgroundColor: THEME.colors.surface,
          borderColor: THEME.colors.line,
          boxShadow: THEME.shadows.card,
        };
    }
  };

  return (
    <div
      {...props}
      className={`rounded-[20px] border transition-all ${getPaddingClass()} ${
        interactive ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''
      } ${className}`}
      style={{
        ...getVariantStyles(),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
