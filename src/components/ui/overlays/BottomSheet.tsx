import React from 'react';
import { Modal } from '../../common/Modal';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

/**
 * Canonical BottomSheet Overlay Primitive (z-50)
 * Docked flush on mobile (inset-x-0 bottom-0 rounded-t-[28px] rounded-b-none pb-safe)
 * with tactile drag-to-dismiss handle, automatic body scroll lock, and sticky footer CTA.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  showClose = true,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={footer}
      size={size}
      showClose={showClose}
    >
      {children}
    </Modal>
  );
};
