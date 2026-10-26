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
      'bg-[#F5F6FE] border-2 border-[#D6D8FB] shadow-[0_4px_16px_rgba(91,91,214,0.08)]',
    teal:
      'bg-[#EBFBF9] border-2 border-[#B6EFEA] shadow-[0_4px_16px_rgba(25,181,165,0.08)]',
    coral:
      'bg-[#FFF5F2] border-2 border-[#FFD3C9] shadow-[0_4px_16px_rgba(255,107,74,0.08)]',
    green:
      'bg-[#F0FDF4] border-2 border-[#BBF7D0] shadow-[0_4px_16px_rgba(61,190,109,0.08)]',
    amber:
      'bg-[#FFFBEB] border-2 border-[#FDE68A] shadow-[0_4px_16px_rgba(255,201,60,0.10)]',
    neutral:
      'bg-white border-2 border-[#E6E8EE] shadow-[0_4px_16px_rgba(31,36,48,0.05)] hover:border-[#CBD5E1]',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-[24px] transition-all ${
        tintStyles[tint]
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {iconTile && <div className="shrink-0 mt-0.5">{iconTile}</div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {typeof title === 'string' ? (
                <h4 className="type-section-heading">
                  {title}
                </h4>
              ) : (
                title
              )}
              {badge && <div className="shrink-0">{badge}</div>}
            </div>

            {subtitle && (
              <p className="type-secondary mt-0.5">
                {subtitle}
              </p>
            )}

            {detail && (
              <div className="type-secondary mt-1.5">
                {detail}
              </div>
            )}
          </div>
        </div>
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
