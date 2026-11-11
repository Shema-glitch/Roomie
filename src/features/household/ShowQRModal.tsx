import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Household } from '../../types';
import { Copy, Check, RefreshCw, MessageSquare, Power, PowerOff, Link2 } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { sound } from '../../services/sound';
import { buildInviteUrl } from '../../utils/inviteLink';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const invitesActive = household.invitesEnabled ?? true;
  const inviteUrl = buildInviteUrl(household.inviteCode);

  useEffect(() => {
    if (!isOpen || !household.inviteCode) return;
    let active = true;
    QRCode.toDataURL(inviteUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1F2430',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [isOpen, household.inviteCode, inviteUrl]);

  const handleCopy = () => {
    sound.playTap();
    navigator.clipboard.writeText(household.inviteCode).catch(() => {});
    setCopied(true);
    showToast(`Invite code ${household.inviteCode} copied!`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    sound.playTap();
    navigator.clipboard.writeText(inviteUrl).catch(() => {});
    setCopiedLink(true);
    showToast('Invite link copied!', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
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

  const shareText = `Join our apartment "${household.name}" on Roomie!\nOpen: ${inviteUrl}\nOr use invite code: ${household.inviteCode}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShareWhatsApp = () => {
    sound.playTap();
    navigator.clipboard.writeText(shareText).catch(() => {});
    showToast('Invite link copied. Opening WhatsApp...', 'info');
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
      subtitle={`Scan or share link to join ${household.name}`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Status indicator if invites paused */}
        {!invitesActive && (
          <div className="w-full px-3 py-2 rounded-xl bg-[#FFF8E6] border border-[#FFE8A3] text-[#8A6200] text-[14px] font-bold flex items-center justify-center gap-2">
            <PowerOff className="w-4 h-4 text-[#8A6200]" />
            <span>Invites are currently turned off</span>
          </div>
        )}

        {/* Real Scannable QR Code encoding the shareable web invite URL */}
        <div className="relative p-3 bg-white rounded-3xl border-2 border-[#1F2430] shadow-sm inline-flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              width={200}
              height={200}
              alt={`QR code to join ${household.name}`}
              className={`rounded-xl select-none transition-opacity ${!invitesActive ? 'opacity-25' : 'opacity-100'}`}
            />
          ) : (
            <div className="w-[200px] h-[200px] rounded-xl bg-[#F7F8FB] animate-pulse" />
          )}
        </div>

        <p className="type-secondary text-xs text-[#64748B] max-w-[260px] leading-relaxed">
          Works with any phone camera — even without the app installed, scanning opens Roomie in their browser.
        </p>

        {/* Invite Code + Copy Link Card */}
        <Card padding="md" variant="calm" className="w-full bg-[#F7F8FB] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="type-label">Invite Code</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#19B5A5] hover:text-[#0F8B7D] cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link copied' : 'Copy invite link'}</span>
            </button>
          </div>
          <div className="type-big-number tracking-widest text-[#FF6B4A] py-0.5 select-all font-mono">
            {household.inviteCode}
          </div>
          <p className="type-secondary text-[13px] truncate" title={inviteUrl}>
            {inviteUrl}
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
