import React from 'react';

export type IconTileColor =
  | 'coral'
  | 'teal'
  | 'indigo'
  | 'green'
  | 'amber'
  | 'purple'
  | 'slate'
  | 'neutral';

export type IconTileSize = 'sm' | 'md' | 'lg';

interface IconTileProps {
  icon: React.ReactNode;
  color?: IconTileColor;
  size?: IconTileSize;
  className?: string;
  onClick?: () => void;
}

export const IconTile: React.FC<IconTileProps> = ({
  icon,
  color = 'coral',
  size = 'md',
  className = '',
  onClick,
}) => {
  const colorStyles: Record<IconTileColor, string> = {
    coral: 'bg-[#FF6B4A] text-white shadow-sm shadow-[#FF6B4A]/30',
    teal: 'bg-[#19B5A5] text-white shadow-sm shadow-[#19B5A5]/30',
    indigo: 'bg-[#5B5BD6] text-white shadow-sm shadow-[#5B5BD6]/30',
    green: 'bg-[#3DBE6D] text-white shadow-sm shadow-[#3DBE6D]/30',
    amber: 'bg-[#FFC93C] text-[#1F2430] shadow-sm shadow-[#FFC93C]/30',
    purple: 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/30',
    slate: 'bg-[#475569] text-white shadow-sm',
    neutral: 'bg-[#F1F3F9] text-[#1F2430]',
  };

  const sizeStyles: Record<IconTileSize, string> = {
    sm: 'w-10 h-10 rounded-xl text-base',
    md: 'w-12 h-12 rounded-2xl text-xl',
    lg: 'w-14 h-14 rounded-2xl text-2xl',
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-center shrink-0 font-bold select-none transition-transform ${
        sizeStyles[size]
      } ${colorStyles[color]} ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
    >
      {icon}
    </div>
  );
};
