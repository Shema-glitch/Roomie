import React from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  badge,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 mb-2.5 px-0.5 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="type-section-heading">
            {title}
          </h3>
          {badge}
        </div>
        {subtitle && (
          <p className="type-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
