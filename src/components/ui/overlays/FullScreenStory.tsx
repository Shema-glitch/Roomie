import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '../../../utils/useBackHandler';

export interface FullScreenStoryProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Canonical FullScreenStory Overlay Primitive (z-70)
 * Immersive 100dvh ceremony / onboarding story surface rendered at document.body root.
 */
export const FullScreenStory: React.FC<FullScreenStoryProps> = ({
  isOpen,
  onClose,
  children,
  className = 'bg-white',
}) => {
  useBackHandler(Boolean(isOpen && onClose), 130, () => onClose?.());

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col items-center justify-between select-none pt-safe pb-safe ${className}`}
    >
      {children}
    </div>,
    document.body
  );
};
