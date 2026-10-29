import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Household } from '../../types';
import { Copy, Check, RefreshCw, MessageSquare, Power, PowerOff, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { sound } from '../../services/sound';

interface ShowQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household;
  onRefreshCode?: () => Promise<string>;
  onToggleInvites?: () => Promise<boolean>;
}

export const ShowQRModal: React.FC<ShowQRModalProps> = ({
  isOpen,
  onClose,
  household,
  onRefreshCode,
  onToggleInvites,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const invitesActive = household.invitesEnabled ?? true;

  const handleCopy = () => {
    sound.playTap();
    navigator.clipboard.writeText(household.inviteCode).catch(() => {});
    setCopied(true);
    showToast(`Invite code ${household.inviteCode} copied!`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    if (!onRefreshCode) return;
    setRefreshing(true);
    sound.playTap();
    try {
      const newCode = await onRefreshCode();
      showToast(`New invite code generated: ${newCode}`, 'info');
    } catch {
      showToast('Could not refresh invite code', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggle = async () => {
    if (!onToggleInvites) return;
    setToggling(true);
    sound.playTap();
    try {
      const active = await onToggleInvites();
      showToast(
        active ? 'Apartment invites turned on' : 'Apartment invites paused',
        'info'
      );
    } catch {
      showToast('Could not update invite status', 'error');
    } finally {
      setToggling(false);
    }
  };

  const shareText = `Join our apartment "${household.name}" on Roomie! Use invite code: ${household.inviteCode}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShareWhatsApp = () => {
    sound.playTap();
    navigator.clipboard.writeText(shareText).catch(() => {});
    showToast('Invite text copied. Opening WhatsApp...', 'info');
    const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      showToast('Copied invite message for WhatsApp!', 'info');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Roomies"
      subtitle={`Scan or enter code to join ${household.name}`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Status indicator if invites paused */}
        {!invitesActive && (
          <div className="w-full px-3 py-2 rounded-xl bg-[#FFF8E6] border border-[#FFE8A3] text-[#8A6200] text-[14px] font-bold flex items-center justify-center gap-2">
            <PowerOff className="w-4 h-4 text-[#8A6200]" />
            <span>Invites are currently turned off</span>
          </div>
        )}

        {/* Crisp Plain Dark Modules on Pure White QR Code - Scannable and Large */}
        <div className="p-4 bg-white rounded-3xl border-2 border-[#1F2430] shadow-sm inline-block">
          <svg
            width="200"
            height="200"
            viewBox="0 0 100 100"
            className="mx-auto"
            aria-label="Apartment QR Code"
          >
            {/* Pure white background */}
            <rect width="100" height="100" fill="#FFFFFF" />

            {/* Top-Left Finder Pattern (Solid dark modules only) */}
            <rect x="8" y="8" width="28" height="28" fill="#1F2430" rx="3" />
            <rect x="13" y="13" width="18" height="18" fill="#FFFFFF" rx="2" />
            <rect x="17" y="17" width="10" height="10" fill="#1F2430" rx="1.5" />

            {/* Top-Right Finder Pattern */}
            <rect x="64" y="8" width="28" height="28" fill="#1F2430" rx="3" />
            <rect x="69" y="13" width="18" height="18" fill="#FFFFFF" rx="2" />
            <rect x="73" y="17" width="10" height="10" fill="#1F2430" rx="1.5" />

            {/* Bottom-Left Finder Pattern */}
            <rect x="8" y="64" width="28" height="28" fill="#1F2430" rx="3" />
            <rect x="13" y="69" width="18" height="18" fill="#FFFFFF" rx="2" />
            <rect x="17" y="73" width="10" height="10" fill="#1F2430" rx="1.5" />

            {/* Plain Dark Data Modules */}
            <rect x="42" y="10" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="52" y="10" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="42" y="20" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="52" y="20" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="42" y="30" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="10" y="42" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="20" y="42" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="30" y="42" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="42" y="42" width="16" height="16" fill="#1F2430" rx="2" />
            <rect x="64" y="42" width="8" height="8" fill="#1F2430" rx="1" />
            <rect x="78" y="42" width="12" height="6" fill="#1F2430" rx="1" />
            <rect x="42" y="64" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="52" y="64" width="6" height="6" fill="#1F2430" rx="1" />
            <rect x="42" y="76" width="6" height="14" fill="#1F2430" rx="1" />
            <rect x="54" y="76" width="8" height="8" fill="#1F2430" rx="1" />
            <rect x="68" y="68" width="10" height="10" fill="#1F2430" rx="1" />
            <rect x="82" y="68" width="8" height="8" fill="#1F2430" rx="1" />
            <rect x="68" y="82" width="22" height="8" fill="#1F2430" rx="1" />
          </svg>
        </div>

        {/* 8-Character Random Invite Code Card */}
        <Card padding="md" variant="calm" className="w-full bg-[#F7F8FB] space-y-1">
          <div className="flex items-center justify-between">
            <span className="type-label">Invite Code</span>
            <span className="text-[14px] font-bold text-[#64748B]">8-character code</span>
          </div>
          <div className="type-big-number tracking-widest text-[#FF6B4A] py-1 select-all font-mono">
            {household.inviteCode}
          </div>
          <p className="type-secondary text-[14px]">
            Roomies enter this code to join {household.name}
          </p>
        </Card>

        {/* Action Controls */}
        <div className="w-full space-y-2">
          {/* WhatsApp share */}
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleShareWhatsApp}
            icon={<MessageSquare className="w-4 h-4 text-[#3DBE6D]" />}
          >
            Share on WhatsApp
          </Button>

          {/* Copy code */}
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleCopy}
            icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied code!' : 'Copy Code'}
          </Button>

          {/* Management Row: Refresh code & Turn off/on code */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={handleRefresh}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              {refreshing ? 'Refreshing...' : 'Refresh code'}
            </Button>

            <Button
              variant={invitesActive ? 'outline' : 'secondary'}
              size="sm"
              disabled={toggling}
              onClick={handleToggle}
              icon={invitesActive ? <PowerOff className="w-3.5 h-3.5 text-[#E5484D]" /> : <Power className="w-3.5 h-3.5 text-[#3DBE6D]" />}
            >
              {invitesActive ? 'Turn off code' : 'Turn on code'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
