import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showClose = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1F2430]/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} rounded-t-[28px] sm:rounded-[24px] bg-white border border-[#E6E8EE] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transform transition-transform animate-in slide-in-from-bottom duration-200`}
        style={{ backgroundColor: THEME.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#E6E8EE]">
            <div>
              {title && (
                <h3 className="font-heading font-extrabold text-xl text-[#1F2430] leading-snug">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#6B7280] font-medium mt-0.5">{subtitle}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F7F8FB] text-[#6B7280] hover:text-[#1F2430] transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
