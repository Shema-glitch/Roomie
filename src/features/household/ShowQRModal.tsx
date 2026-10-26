import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Household } from '../../types';
import { Copy, Check, Share2, Sparkles } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ShowQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household;
}

export const ShowQRModal: React.FC<ShowQRModalProps> = ({
  isOpen,
  onClose,
  household,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(household.inviteCode).catch(() => {});
    setCopied(true);
    showToast(`Invite code ${household.inviteCode} copied!`, 'reward');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Roomies"
      subtitle={`Scan or enter code to join ${household.name}`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-white rounded-3xl border-2 border-[#E6E8EE] shadow-sm inline-block">
          {/* Simulated crisp vector QR Code */}
          <svg width="160" height="160" viewBox="0 0 100 100" className="mx-auto">
            <rect width="100" height="100" fill="#FFFFFF" />
            <rect x="8" y="8" width="28" height="28" fill="#1F2430" rx="4" />
            <rect x="13" y="13" width="18" height="18" fill="#FFFFFF" rx="2" />
            <rect x="17" y="17" width="10" height="10" fill="#FF6B4A" rx="1.5" />

            <rect x="64" y="8" width="28" height="28" fill="#1F2430" rx="4" />
            <rect x="69" y="13" width="18" height="18" fill="#FFFFFF" rx="2" />
            <rect x="73" y="17" width="10" height="10" fill="#FF6B4A" rx="1.5" />

            <rect x="8" y="64" width="28" height="28" fill="#1F2430" rx="4" />
            <rect x="13" y="69" width="18" height="18" fill="#FFFFFF" rx="2" />
            <rect x="17" y="73" width="10" height="10" fill="#FF6B4A" rx="1.5" />

            {/* Pattern dots */}
            <rect x="42" y="12" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="52" y="12" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="42" y="24" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="42" y="44" width="16" height="16" fill="#19B5A5" rx="3" />
            <rect x="22" y="44" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="70" y="44" width="8" height="8" fill="#1F2430" rx="1" />
            <rect x="44" y="72" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="56" y="72" width="8" height="8" fill="#1F2430" rx="1" />
            <rect x="72" y="72" width="18" height="18" fill="#1F2430" rx="3" />
          </svg>
        </div>

        <Card padding="sm" className="w-full bg-[#F7F8FB] space-y-1">
          <span className="type-label block">
            Invite Code
          </span>
          <div className="type-big-number tracking-widest text-[#FF6B4A]">
            {household.inviteCode}
          </div>
          <p className="type-secondary">
            Currency: {household.currency} (Turkish Lira)
          </p>
        </Card>

        <div className="w-full space-y-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleCopy}
            icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
