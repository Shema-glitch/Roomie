import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { sound } from '../../../services/sound';
import { useBackHandler } from '../../../utils/useBackHandler';

export interface CenterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md';
  showClose?: boolean;
}

/**
 * Canonical CenterDialog Overlay Primitive (z-60)
 * Centered spring dialog for destructive confirmations, alerts, and brief info dialogs.
 */
export const CenterDialog: React.FC<CenterDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'sm',
  showClose = true,
}) => {
  useBackHandler(isOpen, 120, onClose);

  useEffect(() => {
    if (!isOpen) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const widthClass = maxWidth === 'md' ? 'max-w-md' : 'max-w-sm';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-fade-in motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} rounded-[28px] bg-white border-2 border-b-4 border-[#E5E9F0] shadow-2xl overflow-hidden flex flex-col max-h-[86dvh] animate-pop-in motion-reduce:animate-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#EEF1F6]">
            <div className="min-w-0">
              {title && <h3 className="type-title text-[18px] leading-snug">{title}</h3>}
              {subtitle && <p className="type-secondary text-xs mt-0.5">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="w-10 h-10 shrink-0 aspect-square rounded-full p-0 border-2 border-b-3 border-[#E6E8EE] bg-[#F7F8FB] hover:bg-white flex items-center justify-center text-[#64748B] hover:text-[#1F2430] active:translate-y-[1px] cursor-pointer"
                aria-label="Close dialog"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="p-5 overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-5 pb-5 pt-3 border-t border-[#EEF1F6] bg-white">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
};
