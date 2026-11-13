import React from 'react';

export type CardTint = 'indigo' | 'teal' | 'coral' | 'green' | 'amber' | 'neutral';

interface ActionCardProps {
  tint?: CardTint;
  iconTile?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  tint = 'neutral',
  iconTile,
  title,
  subtitle,
  detail,
  badge,
  actions,
  children,
  onClick,
  className = '',
}) => {
  const tintStyles: Record<CardTint, string> = {
    indigo:
      'bg-[#F5F6FE] border-2 border-b-4 border-[#D6D8FB] hover:border-[#BFC3F8] shadow-[0_4px_16px_rgba(91,91,214,0.06)]',
    teal:
      'bg-[#EBFBF9] border-2 border-b-4 border-[#B6EFEA] hover:border-[#92E5DD] shadow-[0_4px_16px_rgba(25,181,165,0.06)]',
    coral:
      'bg-[#FFF5F2] border-2 border-b-4 border-[#FFD3C9] hover:border-[#FFB7A7] shadow-[0_4px_16px_rgba(255,107,74,0.06)]',
    green:
      'bg-[#F0FDF4] border-2 border-b-4 border-[#BBF7D0] hover:border-[#86EFAC] shadow-[0_4px_16px_rgba(61,190,109,0.06)]',
    amber:
      'bg-[#FFFBEB] border-2 border-b-4 border-[#FDE68A] hover:border-[#FCD34D] shadow-[0_4px_16px_rgba(255,201,60,0.08)]',
    neutral:
      'bg-white border-2 border-b-4 border-[#E6E8EE] hover:border-[#CBD5E1] shadow-[0_4px_16px_rgba(31,36,48,0.04)]',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-[24px] transition-[transform,opacity,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        tintStyles[tint]
      } ${
        onClick
          ? 'cursor-pointer active:translate-y-[2px] motion-reduce:active:translate-y-0'
          : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {iconTile && <div className="shrink-0 mt-0.5">{iconTile}</div>}
          <div className="flex-1 min-w-0">
            {typeof title === 'string' ? <h4 className="type-card-title">{title}</h4> : title}

            {subtitle && <p className="type-secondary mt-0.5">{subtitle}</p>}

            {detail && <div className="type-secondary mt-1.5">{detail}</div>}
          </div>
        </div>

        {badge && <div className="shrink-0 self-start">{badge}</div>}
      </div>

      {children && <div className="mt-3.5">{children}</div>}

      {actions && (
        <div className="mt-4 pt-3.5 border-t border-black/5 flex items-center gap-2.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
