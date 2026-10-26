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
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  size,
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

  const effectiveSize = size || maxWidth;
  const maxWidthClass = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-md sm:max-w-lg md:max-w-xl',
    lg: 'max-w-lg sm:max-w-xl md:max-w-2xl',
    xl: 'max-w-xl sm:max-w-2xl md:max-w-3xl',
  }[effectiveSize];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-[#1F2430]/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} rounded-t-[32px] sm:rounded-3xl bg-white border-2 border-[#E6E8EE] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transform transition-all animate-in slide-in-from-bottom duration-200`}
        style={{ backgroundColor: THEME.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 sm:px-8 sm:pt-6 sm:pb-4 border-b border-[#E6E8EE] bg-white sticky top-0 z-10">
            <div>
              {title && (
                <h3 className="type-title">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="type-secondary mt-0.5">{subtitle}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="w-10 h-10 rounded-2xl border border-[#E6E8EE] bg-[#F7F8FB] hover:bg-white hover:border-[#CBD5E1] shadow-2xs flex items-center justify-center text-[#64748B] hover:text-[#1F2430] transition-all cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
