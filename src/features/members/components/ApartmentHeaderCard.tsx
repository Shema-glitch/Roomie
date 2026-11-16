import React from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Avatar } from '../../../components/common/Avatar';
import { Household, JoinRequest } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import {
  Buildings,
  QrCode,
  Copy,
  House,
  Shield,
  ShieldCheck,
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
  onReviewJoinRequest?: (req: JoinRequest) => void;
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
  onReviewJoinRequest,
}) => {
  const { showToast } = useToast();

  const copyCode = () => {
    sound.playTap();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(household.inviteCode);
      showToast(`Copied code ${household.inviteCode} to clipboard!`, 'success');
    } else {
      showToast(`Apartment code: ${household.inviteCode}`, 'info');
    }
  };

  return (
    <>
      <div className="mb-6">
        <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-3.5">
          <div className="flex items-start gap-3.5">
            <IconTile icon={<Buildings className="w-6 h-6" />} color="coral" size="md" />
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-black text-xl text-[#1F2430] truncate">
                {household.name}
              </h3>
              <p className="type-secondary text-[14px] mt-0.5 font-bold text-[#475569]">
                {household.inviteCode} • Currency: {household.currency}
              </p>
            </div>
          </div>

          <p className="text-[14px] font-medium text-[#475569] bg-[#F7F8FB] p-2.5 rounded-xl border border-[#E6E8EE]">
            The admin only approves new roomies. Everything else is decided together.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={onShowQR}
              icon={<QrCode className="w-4 h-4 text-[#475569]" />}
            >
              Show QR
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyCode}
              icon={<Copy className="w-4 h-4 text-[#475569]" />}
            >
              Copy code
            </Button>
            {onOpenHouseholdSwitcher && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenHouseholdSwitcher}
                icon={<Buildings className="w-4 h-4 text-[#475569]" />}
              >
                Switch flat
              </Button>
            )}
            {onOpenHowItWorks && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenHowItWorks}
                icon={<House className="w-4 h-4 text-[#FF6B4A]" />}
              >
                Flat guide
              </Button>
            )}
            {isAdmin && memberCount > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenHandoverModal}
                icon={<Shield className="w-4 h-4 text-[#475569]" />}
              >
                Handover admin
              </Button>
            )}
          </div>
        </InfoCard>
      </div>

      <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900 mb-5 shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block">Apartment Privacy Shield Active</span>
          <p className="text-emerald-800 leading-relaxed text-[11px]">
            All flat topics, chores, chat, and ledger balances are strictly private to active members. If any new flatmate joins, an automatic in-app privacy alert is dispatched to everyone.
          </p>
        </div>
      </div>

      {joinRequests && joinRequests.length > 0 && (
        <div className="mb-5 space-y-2.5">
          <h3 className="type-section-heading">
            Pending Join Requests ({joinRequests.length})
          </h3>
          <p className="type-secondary text-xs -mt-1 mb-1">
            Flatmate consent required. Cast your vote before new applicants are admitted.
          </p>
          {joinRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar src={req.userAvatar} name={req.userName} flag={req.userFlag} size="md" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[#1F2430] text-sm truncate">{req.userName}</h4>
                  <p className="text-xs text-[#475569] truncate">
                    {req.userEmail} • {req.votes.length} vote{req.votes.length !== 1 ? 's' : ''} cast
                  </p>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={() => onReviewJoinRequest?.(req)}>
                Review
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
