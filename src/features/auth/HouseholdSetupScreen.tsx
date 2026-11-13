import React, { useEffect, useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { IconTile } from '../../components/common/IconTile';
import { MascotView } from '../../components/common/MascotView';
import { CurrencyCode, Household, User } from '../../types';
import { sound } from '../../services/sound';
import { useBackHandler } from '../../utils/useBackHandler';
import { CreateHouseholdFlowModal } from '../household/CreateHouseholdFlowModal';
import { JoinHouseholdFlowModal } from '../household/JoinHouseholdFlowModal';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  QrCode,
  UserPlus,
} from 'lucide-react';

interface HouseholdSetupScreenProps {
  currentUser: User | null;
  pendingInviteCode?: string | null;
  onClearPendingInvite?: () => void;
  onCreateHousehold: (
    name: string,
    currency: CurrencyCode,
    options?: { rotationInterval?: 'weekly' | 'monthly'; starterChores?: string[] }
  ) => Promise<Household>;
  onJoinHousehold: (
    code: string
  ) => Promise<{ success: boolean; household?: { name: string }; message: string }>;
  onSetupComplete: () => void;
  onExploreDemo: () => void;
  onBackToWelcome: () => void;
}

export const HouseholdSetupScreen: React.FC<HouseholdSetupScreenProps> = ({
  currentUser,
  pendingInviteCode,
  onClearPendingInvite,
  onCreateHousehold,
  onJoinHousehold,
  onSetupComplete,
  onExploreDemo,
  onBackToWelcome,
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(Boolean(pendingInviteCode));
  const [pendingRequest, setPendingRequest] = useState<{
    code: string;
    householdName?: string;
  } | null>(null);

  useEffect(() => {
    if (pendingInviteCode) {
      setJoinOpen(true);
    }
  }, [pendingInviteCode]);

  const firstName = currentUser?.name?.trim().split(' ')[0] || 'Flatmate';

  // When neither child modal is open, hardware back steps cleanly back to Welcome
  useBackHandler(!createOpen && !joinOpen, 50, () => {
    sound.playTap();
    onBackToWelcome();
  });

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FB] flex flex-col justify-between p-5 sm:p-7 pt-safe pb-safe max-w-md mx-auto">
      {/* TOP BAR */}
      <div className="pt-2 pb-3 flex items-center justify-between gap-2 w-full">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onBackToWelcome();
          }}
          className="inline-flex items-center gap-1 p-1.5 -ml-2 text-[#475569] hover:text-[#1F2430] active:scale-95 transition-transform cursor-pointer focus:outline-none text-xs font-bold whitespace-nowrap shrink-0"
          aria-label="Back to welcome"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5] shrink-0" />
          <span>Sign out</span>
        </button>

        <div className="px-3 py-1 rounded-full bg-white border border-[#E6E8EE] text-xs font-bold text-[#475569] truncate min-w-0 max-w-[58%] sm:max-w-[220px]">
          {currentUser?.name || currentUser?.email || 'New Flatmate'}
        </div>
      </div>

      {/* HERO & CHOICES */}
      <div className="flex-1 flex flex-col justify-center space-y-6 py-2">
        <div className="text-center space-y-2 animate-fade-up">
          <MascotView
            state="celebrating"
            size="lg"
            bubbleText={`Welcome, ${firstName}!`}
          />
          <h1 className="font-heading font-black text-2xl sm:text-[28px] leading-tight text-[#1F2430] tracking-tight pt-1">
            Now, where are you moving in?
          </h1>
          <p className="type-body text-[#6B7280] text-sm leading-relaxed max-w-xs mx-auto">
            Set up your own apartment in seconds, or join your flatmates with an invite code.
          </p>
        </div>

        {pendingInviteCode && !pendingRequest && (
          <Card
            padding="md"
            className="bg-[#F0FDFB] border-2 border-[#19B5A5]/45 rounded-3xl animate-fade-up"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-white text-[#19B5A5] shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-heading font-black text-sm text-[#1F2430] truncate">
                    Invite ready: {pendingInviteCode}
                  </p>
                  <p className="type-secondary text-xs text-[#475569]">
                    Tap to confirm and join your flatmates
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  sound.playTap();
                  setJoinOpen(true);
                }}
              >
                Join
              </Button>
            </div>
          </Card>
        )}

        {pendingRequest && (
          <Card
            padding="md"
            className="bg-[#FFF8E6] border-2 border-[#FFDDA0] rounded-3xl animate-fade-up"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white text-[#D97706] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-left">
                <p className="font-heading font-black text-sm text-[#1F2430]">
                  Waiting for flatmate approval
                </p>
                <p className="type-secondary text-xs text-[#6B7280] leading-relaxed">
                  Request sent for{' '}
                  <span className="font-bold text-[#1F2430]">
                    {pendingRequest.householdName || pendingRequest.code}
                  </span>
                  . You can create a new flat or peek at the demo flat while they review.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-3 animate-fade-up delay-150">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setCreateOpen(true);
            }}
            className="w-full p-4 rounded-3xl border-2 border-[#FF6B4A] bg-white hover:bg-[#FFF9F7] shadow-xs flex items-center justify-between gap-3 text-left cursor-pointer transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <IconTile icon={<Home className="w-6 h-6" />} color="coral" size="md" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-black text-[16px] leading-snug text-[#1F2430]">
                  Create a New Flat
                </h2>
                <p className="type-secondary text-xs text-[#6B7280] mt-1 leading-relaxed">
                  Name your apartment, pick starter chores & invite roomies
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#FF6B4A] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setJoinOpen(true);
            }}
            className="w-full p-4 rounded-3xl border-2 border-[#E6E8EE] hover:border-[#19B5A5] bg-white shadow-xs flex items-center justify-between gap-3 text-left cursor-pointer transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19B5A5]/70"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <IconTile icon={<UserPlus className="w-6 h-6" />} color="indigo" size="md" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-black text-[16px] leading-snug text-[#1F2430]">
                  Join an Existing Flat
                </h2>
                <p className="type-secondary text-xs text-[#6B7280] mt-1 leading-relaxed">
                  Scan a roommate’s QR or enter an 8-letter invite code
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#94A3B8] shrink-0" />
          </button>
        </div>
      </div>

      {/* FOOTER ESCAPE HATCH TO DEMO */}
      <div className="pt-4 pb-2 text-center space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            sound.playTap();
            onExploreDemo();
          }}
          icon={<Home className="w-4 h-4 text-[#FF6B4A]" />}
        >
          Explore the Demo Flat instead
        </Button>
        <p className="type-secondary text-[11px] text-[#8F9CAE]">
          Demo mode lets you test chores & expense splits with sample flatmates anytime.
        </p>
      </div>

      <CreateHouseholdFlowModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateHousehold}
        onCompleted={() => onSetupComplete()}
      />

      <JoinHouseholdFlowModal
        isOpen={joinOpen}
        initialCode={pendingInviteCode}
        onClose={() => setJoinOpen(false)}
        onJoin={onJoinHousehold}
        onCompleted={(status, info) => {
          onClearPendingInvite?.();
          if (status === 'joined') {
            onSetupComplete();
          } else {
            setPendingRequest(info);
          }
        }}
      />
    </div>
  );
};
