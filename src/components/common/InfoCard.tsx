import React from 'react';

interface InfoCardProps {
  iconTile?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  tint?: 'neutral' | 'teal' | 'coral' | 'indigo' | 'green' | 'amber';
  padding?: 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  iconTile,
  title,
  subtitle,
  badge,
  action,
  children,
  tint = 'neutral',
  padding = 'md',
  className = '',
  onClick,
}) => {
  const tintStyles = {
    neutral: 'bg-white border-2 border-[#E6E8EE] shadow-[0_4px_16px_rgba(31,36,48,0.05)]',
    teal: 'bg-[#EBFBF9] border-2 border-[#B6EFEA] shadow-[0_4px_16px_rgba(25,181,165,0.08)]',
    coral: 'bg-[#FFF5F2] border-2 border-[#FFD3C9] shadow-[0_4px_16px_rgba(255,107,74,0.08)]',
    indigo: 'bg-[#F5F6FE] border-2 border-[#D6D8FB] shadow-[0_4px_16px_rgba(91,91,214,0.08)]',
    green: 'bg-[#F0FDF4] border-2 border-[#BBF7D0] shadow-[0_4px_16px_rgba(61,190,109,0.08)]',
    amber: 'bg-[#FFFBEB] border-2 border-[#FDE68A] shadow-[0_4px_16px_rgba(255,201,60,0.10)]',
  };

  const padStyles = padding === 'lg' ? 'p-5 sm:p-6' : 'p-4 sm:p-5';

  return (
    <div
      onClick={onClick}
      className={`rounded-[24px] transition-all ${tintStyles[tint]} ${padStyles} ${
        onClick ? 'cursor-pointer hover:border-[#CBD5E1]' : ''
      } ${className}`}
    >
      {(title || iconTile || action) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {iconTile}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {typeof title === 'string' ? (
                  <h4 className="type-section-heading">
                    {title}
                  </h4>
                ) : (
                  title
                )}
                {badge}
              </div>
              {subtitle && (
                <p className="type-secondary mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {children}
    </div>
  );
};
