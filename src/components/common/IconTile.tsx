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
    coral: 'bg-[#FFF0ED] text-[#FF6B4A] border-2 border-b-[3px] border-[#FFD3C9]',
    teal: 'bg-[#E6FAF8] text-[#138E82] border-2 border-b-[3px] border-[#B6EFEA]',
    indigo: 'bg-[#EEF0FD] text-[#5B5BD6] border-2 border-b-[3px] border-[#C7D2FE]',
    green: 'bg-[#EBF9F0] text-[#2CA358] border-2 border-b-[3px] border-[#BBF7D0]',
    amber: 'bg-[#FFF8E6] text-[#B45309] border-2 border-b-[3px] border-[#FDE68A]',
    purple: 'bg-[#F3E8FF] text-[#7C3AED] border-2 border-b-[3px] border-[#DDD6FE]',
    slate: 'bg-[#F1F5F9] text-[#475569] border-2 border-b-[3px] border-[#CBD5E1]',
    neutral: 'bg-[#F1F5F9] text-[#475569] border-2 border-b-[3px] border-[#CBD5E1]',
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
