import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { useBackHandler } from '../../utils/useBackHandler';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

const DRAG_DISMISS_THRESHOLD_PX = 90;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
  size,
  showClose = true,
}) => {
  useBackHandler(isOpen, 100, onClose);
  const dragStartYRef = useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      setDragOffsetY(0);
      setIsDragging(false);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    dragStartYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null || e.touches.length !== 1) return;
    const deltaY = Math.max(0, e.touches[0].clientY - dragStartYRef.current);
    setDragOffsetY(deltaY);
  };

  const handleTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    dragStartYRef.current = null;
    setIsDragging(false);
    if (dragOffsetY >= DRAG_DISMISS_THRESHOLD_PX) {
      setDragOffsetY(0);
      onClose();
    } else {
      setDragOffsetY(0);
    }
  };

  const effectiveSize = size || maxWidth;
  const maxWidthClass = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-md sm:max-w-lg md:max-w-xl',
    lg: 'max-w-lg sm:max-w-xl md:max-w-2xl',
    xl: 'max-w-xl sm:max-w-2xl md:max-w-3xl',
  }[effectiveSize];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 animate-fade-in motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        className={`fixed inset-x-0 bottom-0 sm:static w-full ${maxWidthClass} rounded-t-[28px] sm:rounded-3xl bg-white border-2 border-[#E6E8EE] sm:border-b-4 shadow-2xl overflow-hidden max-h-[88dvh] sm:max-h-[90dvh] flex flex-col pb-safe sm:pb-0 will-change-transform animate-fade-up motion-reduce:animate-none`}
        style={{
          backgroundColor: THEME.colors.surface,
          transform: dragOffsetY > 0 ? `translate3d(0, ${dragOffsetY}px, 0)` : undefined,
          transition: isDragging
            ? 'none'
            : 'transform 0.28s var(--ease-spring), opacity 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile bottom-sheet drag handle pill */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full flex justify-center pt-2.5 pb-1.5 sm:hidden bg-white touch-none cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 rounded-full bg-[#CBD5E1]" />
        </div>

        {(title || showClose) && (
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex items-center justify-between px-6 pt-3 pb-4 sm:px-8 sm:pt-6 sm:pb-4 border-b border-[#E6E8EE] bg-white sticky top-0 z-10 touch-pan-x shrink-0"
          >
            <div>
              {title && <h3 className="type-title">{title}</h3>}
              {subtitle && <p className="type-secondary mt-0.5">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="btn-tactile ease-spring w-10 h-10 rounded-2xl border-2 border-b-4 border-[#E6E8EE] bg-[#F7F8FB] hover:bg-white hover:border-[#CBD5E1] shadow-2xs flex items-center justify-center text-[#64748B] hover:text-[#1F2430] motion-reduce:transition-none cursor-pointer"
                aria-label="Close dialog"
              >
                <X weight="bold" className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-6 sm:p-8 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-6 py-4 sm:px-8 border-t border-[#E6E8EE] bg-white sticky bottom-0 z-10 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
