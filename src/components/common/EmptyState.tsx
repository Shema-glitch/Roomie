import React from 'react';
import { THEME } from '../../theme/tokens';
import { MascotView } from './MascotView';
import { Button } from './Button';
import { MascotState } from '../../types';

interface EmptyStateProps {
  title: string;
  description: string;
  mascotState?: MascotState;
  bubbleText?: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  mascotState = 'sleepy',
  bubbleText,
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 rounded-[24px] bg-white border border-[#E6E8EE] shadow-sm text-center flex flex-col items-center justify-center space-y-4 ${className}`}>
      <MascotView state={mascotState} size="lg" bubbleText={bubbleText} />
      <div className="space-y-1 max-w-xs">
        <h3 className="font-heading font-black text-xl text-[#1F2430]">
          {title}
        </h3>
        <p className="text-xs text-[#6B7280] font-medium leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2 w-full max-w-xs">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={onAction}
            icon={actionIcon}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
