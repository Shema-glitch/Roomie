import React, { useState } from 'react';
import { BottomSheet } from '../../components/ui/overlays';
import {
  Sparkle,
  Fire,
  CheckCircle,
  HouseLine,
  ShareNetwork,
  Copy,
  Medal,
  ShieldCheck,
  Check,
} from '@phosphor-icons/react';
import { Icon } from '@iconify/react';
import { TenantReputationPassport } from '../../types';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { useToast } from '../../components/common/Toast';

export interface TenantPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  passport: TenantReputationPassport | null;
}

export const TenantPassportModal: React.FC<TenantPassportModalProps> = ({
  isOpen,
  onClose,
  passport,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !passport) return null;

  const handleCopyLink = async () => {
    const shareText = `Roomie Track Record for ${passport.userName}: ${passport.harmonyScore}/100 Harmony Score • ${passport.choreStreakDays}d Streak • ${passport.totalChoresCompleted} Chores Completed.`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      sound.playTap();
      haptics.tokenClink();
      showToast('Track record copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${passport.userName}'s Roomie Track Record`,
      text: `Check out ${passport.userName}'s Roomie Track Record: ${passport.harmonyScore}/100 Harmony Score.`,
      url: typeof window !== 'undefined' ? window.location.href : 'https://roomie.app',
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        sound.playTap();
        haptics.tokenClink();
        return;
      } catch {
        // Fallback to copy link
      }
    }
    handleCopyLink();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Roomie Track Record"
      size="md"
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-2.5 px-3 rounded-2xl border-2 border-b-4 border-[#CBD5E1] bg-white text-xs font-bold text-[#1F2430] hover:bg-[#F8FAFC] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <Check weight="bold" className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy weight="bold" className="w-4 h-4 text-[#64748B]" />
            )}
            {copied ? 'Copied' : 'Copy Summary'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-[#FF6B4A] border-2 border-b-4 border-[#D94E30] text-[#1F2033] text-xs font-extrabold hover:bg-[#FF7D61] active:translate-y-[1px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShareNetwork weight="bold" className="w-4 h-4" />
            Share record
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Track Record Identity Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white border-2 border-[#334155] shadow-xl relative overflow-hidden space-y-3.5">
          {/* Background watermark badge */}
          <ShieldCheck
            weight="fill"
            className="absolute -end-4 -bottom-4 w-32 h-32 text-white/5 pointer-events-none"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-wider text-[#FF9278] uppercase bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              Verified Roomie Record
            </span>
            <div className="flex items-center gap-1 text-xs text-[#CBD5E1]">
              <Sparkle weight="fill" className="w-3.5 h-3.5 text-[#FCD34D]" />
              <span>Since {passport.verifiedSince}</span>
            </div>
          </div>

          {/* User Hero Row */}
          <div className="flex items-center gap-3">
            <img
              src={passport.userAvatar}
              alt={passport.userName}
              className="w-14 h-14 rounded-2xl border-2 border-[#FF6B4A] object-cover shadow-md"
            />
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                {passport.userName}
                {passport.userCountry && (
                  <span className="text-xs font-normal text-[#94A3B8]">
                    ({passport.userCountry})
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                {passport.tenancyCount} {passport.tenancyCount === 1 ? 'Apartment' : 'Apartments'}
              </p>
            </div>
          </div>

          {/* Harmony Score Banner */}
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-[#FF9278] block">
                Harmony score
              </span>
              <span className="text-xl font-black text-white tracking-tight">
                {passport.harmonyScore}
                <span className="text-xs font-normal text-[#CBD5E1]"> / 100</span>
              </span>
            </div>
            <div className="text-end">
              <span className="text-xs font-bold text-[#FDE047] uppercase block">
                Verified tier
              </span>
              <span className="text-xs font-extrabold text-white">
                {passport.harmonyScore >= 90
                  ? 'Gold Exemplar'
                  : passport.harmonyScore >= 75
                  ? 'Silver Peer'
                  : passport.harmonyScore > 0
                  ? 'Reliable Roomie'
                  : 'Getting Started'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Key Reputation Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border-2 border-b-3 border-[#E5E9F0]">
            <Fire weight="fill" className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <div className="text-base font-extrabold text-[#1F2033]">{passport.choreStreakDays}d</div>
            <div className="text-xs font-bold text-[#4B5063] uppercase">Streak</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border-2 border-b-3 border-[#E5E9F0]">
            <CheckCircle weight="fill" className="w-5 h-5 text-[#0F7A3D] mx-auto mb-1" />
            <div className="text-base font-extrabold text-[#1F2033]">{passport.totalChoresCompleted}</div>
            <div className="text-xs font-bold text-[#4B5063] uppercase">Chores</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border-2 border-b-3 border-[#E5E9F0]">
            <HouseLine weight="fill" className="w-5 h-5 text-[#D94E30] mx-auto mb-1" />
            <div className="text-base font-extrabold text-[#1F2033]">{passport.tenancyCount}</div>
            <div className="text-xs font-bold text-[#4B5063] uppercase">Tenancies</div>
          </div>
        </div>

        {/* Honorary Badges Earned */}
        <div className="space-y-2">
          <span className="text-xs font-extrabold text-[#1F2430] flex items-center gap-1.5">
            <Medal weight="duotone" className="w-4 h-4 text-[#D97706]" />
            Peer-Awarded Honors
          </span>
          <div className="flex flex-wrap gap-1.5">
            {passport.topAwards.map((award, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF] shadow-2xs"
              >
                <Icon icon="fluent-emoji-flat:sparkles" className="w-3.5 h-3.5" />
                {award}
              </span>
            ))}
          </div>
        </div>

        {/* Personal Flat History Copy */}
        <div className="p-3 rounded-2xl bg-[#FFF5F2] border border-[#FFD7CF] text-xs text-[#9A3412] leading-relaxed">
          <strong>Your flat history:</strong> Share proof that you&apos;re a reliable roommate when applying for your next flat—without exposing private rent or chat details.
        </div>
      </div>
    </BottomSheet>
  );
};
