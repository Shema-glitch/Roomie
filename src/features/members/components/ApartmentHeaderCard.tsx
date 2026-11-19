import React, { useState } from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Avatar } from '../../../components/common/Avatar';
import { BottomSheet, CenterDialog } from '../../../components/ui/overlays';
import { Household, JoinRequest } from '../../../types';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useI18n } from '../../../i18n/I18nProvider';
import {
  Buildings,
  QrCode,
  House,
  Shield,
  ShieldCheck,
  UserPlus,
  ArrowsClockwise,
  DotsThree,
  CaretRight,
  SignOut,
} from '@phosphor-icons/react';

interface ApartmentHeaderCardProps {
  household: Household;
  isAdmin: boolean;
  memberCount: number;
  joinRequests?: JoinRequest[];
  onShowQR: () => void;
  onOpenHouseholdSwitcher?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenHandoverModal: () => void;
  onOpenLeaveModal: () => void;
  onReviewJoinRequest?: (req: JoinRequest) => void;
  onRefreshRequests?: () => Promise<void>;
}

export const ApartmentHeaderCard: React.FC<ApartmentHeaderCardProps> = ({
  household,
  isAdmin,
  memberCount,
  joinRequests,
  onShowQR,
  onOpenHouseholdSwitcher,
  onOpenHowItWorks,
  onOpenHandoverModal,
  onOpenLeaveModal,
  onReviewJoinRequest,
  onRefreshRequests,
}) => {
  const { t } = useI18n();
  const [checkingRequests, setCheckingRequests] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [requestsSheetOpen, setRequestsSheetOpen] = useState(false);

  const pendingCount = joinRequests?.length || 0;

  const handleRefresh = async () => {
    if (!onRefreshRequests || checkingRequests) return;
    sound.playTap();
    haptics.light();
    setCheckingRequests(true);
    try {
      await onRefreshRequests();
    } finally {
      setCheckingRequests(false);
    }
  };

  const handleOpenRequests = () => {
    sound.playTap();
    haptics.light();
    setRequestsSheetOpen(true);
    if (onRefreshRequests) {
      void handleRefresh();
    }
  };

  return (
    <>
      <div className="mb-6">
        <InfoCard
          padding="md"
          className="bg-white rounded-[24px] border-2 border-[#E5E9F0] shadow-xs space-y-4"
        >
          {/* Top identity row + overflow menu */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <IconTile icon={<Buildings className="w-6 h-6" />} color="coral" size="md" />
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-black text-xl text-[#1F2430] truncate">
                  {household.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F7F8FB] border border-[#E6E8EE] text-[12px] font-bold text-[#475569] font-mono">
                    {household.inviteCode}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F7F8FB] border border-[#E6E8EE] text-[12px] font-bold text-[#475569]">
                    {household.currency}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      haptics.light();
                      setPrivacyDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] font-bold text-[#047857] hover:bg-[#D1FAE5] active:scale-[0.97] transition-all cursor-pointer"
                    aria-label="Apartment privacy info"
                  >
                    <ShieldCheck weight="fill" className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span>{t('apartment.private')}</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                haptics.light();
                setSettingsSheetOpen(true);
              }}
              className="w-10 h-10 shrink-0 aspect-square rounded-full p-0 bg-[#F7F8FB] border border-[#E6E8EE] text-[#475569] hover:text-[#1F2430] hover:bg-[#EEF1F6] active:scale-95 flex items-center justify-center transition-all cursor-pointer"
              aria-label={t('apartment.settings')}
              title={t('apartment.settings')}
            >
              <DotsThree weight="bold" className="w-5 h-5" />
            </button>
          </div>

          {/* 2 Primary CTA buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => {
                sound.playTap();
                haptics.light();
                onShowQR();
              }}
              icon={<QrCode weight="duotone" className="w-4 h-4" />}
            >
              {t('apartment.inviteRoomie')}
            </Button>

            <button
              type="button"
              onClick={handleOpenRequests}
              className={`h-11 px-3.5 rounded-2xl font-heading font-black text-xs sm:text-sm tracking-wide uppercase flex items-center justify-center gap-2 border-2 border-b-4 transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer ${
                pendingCount > 0
                  ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#92400E] hover:bg-[#FEF3C7]'
                  : 'bg-[#F7F8FB] border-[#E5E9F0] text-[#1F2430] hover:bg-[#EEF1F6]'
              }`}
            >
              <UserPlus
                weight="duotone"
                className={`w-4 h-4 shrink-0 ${
                  pendingCount > 0 ? 'text-[#D97706]' : 'text-[#5B5BD6]'
                }`}
              />
              <span>{t('apartment.requests')}</span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#F59E0B] text-white text-[11px] font-black leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </InfoCard>
      </div>

      {/* Private Shield Info Dialog */}
      <CenterDialog
        isOpen={privacyDialogOpen}
        onClose={() => setPrivacyDialogOpen(false)}
        title={t('apartment.privateTitle')}
        subtitle={household.name}
        maxWidth="sm"
        footer={
          <Button variant="primary" size="md" fullWidth onClick={() => setPrivacyDialogOpen(false)}>
            {t('common.done')}
          </Button>
        }
      >
        <div className="space-y-3 text-start">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
            <ShieldCheck weight="duotone" className="w-6 h-6 text-[#059669] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#065F46] leading-relaxed font-medium">
              {t('apartment.privateBody', { name: household.name })}
            </p>
          </div>
        </div>
      </CenterDialog>

      {/* Join Requests Sheet */}
      <BottomSheet
        isOpen={requestsSheetOpen}
        onClose={() => setRequestsSheetOpen(false)}
        title={`Join Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
        subtitle={
          isAdmin
            ? 'Review and admit incoming roomies'
            : 'Vote on flatmates requesting to join'
        }
        size="md"
      >
        <div className="space-y-3 py-1">
          {pendingCount > 0 ? (
            <div className="space-y-2.5">
              {joinRequests?.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE68A] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar src={req.userAvatar} name={req.userName} flag={req.userFlag} size="md" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-heading font-black text-[#1F2430] text-sm truncate">
                        {req.userName}
                      </h4>
                      <p className="text-xs text-[#475569] truncate">
                        {req.userEmail} • {req.votes.length} vote{req.votes.length !== 1 ? 's' : ''} cast
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      sound.playTap();
                      haptics.tokenClink();
                      setRequestsSheetOpen(false);
                      onReviewJoinRequest?.(req);
                    }}
                  >
                    {isAdmin ? 'Review & Approve' : 'Review & Vote'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-center space-y-2">
              <p className="text-sm font-bold text-[#1F2430]">No pending join requests</p>
              <p className="text-xs text-[#64748B]">
                Share your invite code or QR so a new roomie can request access.
              </p>
            </div>
          )}

          {onRefreshRequests && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleRefresh}
              disabled={checkingRequests}
              icon={
                <ArrowsClockwise
                  weight="bold"
                  className={`w-4 h-4 text-[#5B5BD6] ${checkingRequests ? 'animate-spin' : ''}`}
                />
              }
            >
              {checkingRequests ? 'Checking...' : 'Check Requests'}
            </Button>
          )}
        </div>
      </BottomSheet>

      {/* Apartment Settings Overflow Sheet */}
      <BottomSheet
        isOpen={settingsSheetOpen}
        onClose={() => setSettingsSheetOpen(false)}
        title="Apartment Settings"
        subtitle={household.name}
        size="md"
      >
        <div className="space-y-2.5 py-1">
          {isAdmin && memberCount > 1 && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSettingsSheetOpen(false);
                onOpenHandoverModal();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] hover:bg-[#EEF1F6] active:scale-[0.99] flex items-center justify-between gap-3 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E9F0] flex items-center justify-center shrink-0">
                  <Shield weight="duotone" className="w-5 h-5 text-[#5B5BD6]" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-heading font-black text-sm text-[#1F2430]">Handover Admin</p>
                  <p className="text-xs text-[#64748B]">Pass doorkeeper controls to a roomie</p>
                </div>
              </div>
              <CaretRight weight="bold" className="w-4 h-4 text-[#94A3B8] shrink-0" />
            </button>
          )}

          {onOpenHouseholdSwitcher && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSettingsSheetOpen(false);
                onOpenHouseholdSwitcher();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] hover:bg-[#EEF1F6] active:scale-[0.99] flex items-center justify-between gap-3 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E9F0] flex items-center justify-center shrink-0">
                  <Buildings weight="duotone" className="w-5 h-5 text-[#FF6B4A]" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-heading font-black text-sm text-[#1F2430]">Switch Flat</p>
                  <p className="text-xs text-[#64748B]">Change or create another apartment</p>
                </div>
              </div>
              <CaretRight weight="bold" className="w-4 h-4 text-[#94A3B8] shrink-0" />
            </button>
          )}

          {onOpenHowItWorks && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSettingsSheetOpen(false);
                onOpenHowItWorks();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] hover:bg-[#EEF1F6] active:scale-[0.99] flex items-center justify-between gap-3 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E9F0] flex items-center justify-center shrink-0">
                  <House weight="duotone" className="w-5 h-5 text-[#19B5A5]" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-heading font-black text-sm text-[#1F2430]">Flat Guide</p>
                  <p className="text-xs text-[#64748B]">See how chores, ledger &amp; deposits work</p>
                </div>
              </div>
              <CaretRight weight="bold" className="w-4 h-4 text-[#94A3B8] shrink-0" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setSettingsSheetOpen(false);
              onOpenLeaveModal();
            }}
            className="w-full p-3.5 rounded-2xl bg-[#FFF5F5] border border-[#FECACA] hover:bg-[#FEE2E2] active:scale-[0.99] flex items-center justify-between gap-3 transition-all cursor-pointer mt-1"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#FECACA] flex items-center justify-center shrink-0">
                <SignOut weight="duotone" className="w-5 h-5 text-[#E5484D]" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-heading font-black text-sm text-[#C53030]">
                  Leave This Apartment
                </p>
                <p className="text-xs text-[#9B2C2C]">Sign out of this shared flat</p>
              </div>
            </div>
            <CaretRight weight="bold" className="w-4 h-4 text-[#E5484D] shrink-0" />
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
