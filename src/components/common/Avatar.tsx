import React from 'react';
import { THEME } from '../../theme/tokens';

interface AvatarProps {
  src?: string;
  name: string;
  flag?: string;
  isHome?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  flag,
  isHome,
  size = 'md',
  showStatus = false,
  className = '',
}) => {
  const sizeMap = {
    xs: { dim: 28, text: 'text-[11px]', flagSize: 'text-[10px]', dotSize: 'w-2 h-2' },
    sm: { dim: 36, text: 'text-xs', flagSize: 'text-xs', dotSize: 'w-2.5 h-2.5' },
    md: { dim: 48, text: 'text-sm font-bold', flagSize: 'text-sm', dotSize: 'w-3 h-3' },
    lg: { dim: 64, text: 'text-lg font-bold', flagSize: 'text-base', dotSize: 'w-3.5 h-3.5' },
    xl: { dim: 88, text: 'text-2xl font-bold', flagSize: 'text-xl', dotSize: 'w-4 h-4' },
  };

  const { dim, text, flagSize, dotSize } = sizeMap[size];

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`}>
      <div
        className="rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm"
        style={{
          width: dim,
          height: dim,
          backgroundColor: THEME.colors.primaryLight,
          color: THEME.colors.primaryDark,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // fallback to initials on error
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span className={text}>{getInitials(name)}</span>
        )}
      </div>

      {/* Country Flag Badge */}
      {flag && (
        <span
          className={`absolute -bottom-1 -right-1 rounded-full bg-white shadow-xs border border-[#E6E8EE] px-0.5 leading-tight flex items-center justify-center ${flagSize}`}
          title={name}
        >
          {flag}
        </span>
      )}

      {/* "I'm home" status green ring / dot */}
      {showStatus && isHome !== undefined && (
        <span
          className={`absolute top-0 right-0 rounded-full border-2 border-white ${dotSize} ${
            isHome ? 'bg-[#3DBE6D]' : 'bg-[#9CA3AF]'
          }`}
          title={isHome ? 'Currently at home' : 'Currently away'}
        />
      )}
    </div>
  );
};
