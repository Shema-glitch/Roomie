import React from 'react';
import { THEME } from '../../theme/tokens';

interface AvatarProps {
  src?: string;
  name: string;
  flag?: string;
  isHome?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  statusRing?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  flag,
  isHome,
  size = 'md',
  showStatus = false,
  statusRing = false,
  className = '',
}) => {
  const sizeMap = {
    xs: { dim: 32, text: 'text-[14px] font-bold', flagSize: 'text-[14px]', dotSize: 'w-2.5 h-2.5' },
    sm: { dim: 40, text: 'text-[14px] font-bold', flagSize: 'text-[14px]', dotSize: 'w-3 h-3' },
    md: { dim: 50, text: 'text-[16px] font-bold', flagSize: 'text-[14px]', dotSize: 'w-3.5 h-3.5' },
    lg: { dim: 66, text: 'text-[18px] font-bold', flagSize: 'text-[16px]', dotSize: 'w-4 h-4' },
    xl: { dim: 90, text: 'text-[24px] font-bold', flagSize: 'text-[18px]', dotSize: 'w-4.5 h-4.5' },
  };

  const { dim, text, flagSize, dotSize } = sizeMap[size];

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const ringClass =
    statusRing && isHome !== undefined
      ? isHome
        ? 'ring-3 ring-[#3DBE6D] ring-offset-2'
        : 'ring-3 ring-[#CBD5E1] ring-offset-2'
      : '';

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`}>
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm transition-all ${ringClass}`}
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

      {/* "I'm home" status green dot (if showStatus is enabled without statusRing) */}
      {showStatus && !statusRing && isHome !== undefined && (
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
