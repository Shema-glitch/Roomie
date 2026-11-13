import React from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { Button } from '../../../components/common/Button';
import { Avatar } from '../../../components/common/Avatar';
import { Chip } from '../../../components/common/Chip';
import { User } from '../../../types';
import { sound } from '../../../services/sound';
import { Flame, Receipt, Shuffle } from 'lucide-react';

interface HomeSidebarProps {
  roommates: User[];
  currentUser: User;
  choreDraftState: {
    state: string;
    actionLabel: string;
    badgeLabel: string;
  };
  onToggleHomeStatus: () => void;
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onOpenExpensesAction?: (action: 'add' | 'settle' | 'confirm') => void;
  onOpenChoreReveal: () => void;
  onOpenDraftPicks: () => void;
}

export const HomeSidebar: React.FC<HomeSidebarProps> = ({
  roommates,
  currentUser,
  choreDraftState,
  onToggleHomeStatus,
  onNavigateTab,
  onOpenExpensesAction,
  onOpenChoreReveal,
  onOpenDraftPicks,
}) => {
  const homeCount = roommates.filter((r) => r.isHome).length;

  return (
    <div className="space-y-6">
      <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="type-section-heading">Roomie presence</h3>
            <p className="type-secondary text-[14px]">Live apartment status</p>
          </div>
          <Chip
            status="active"
            label={`${homeCount} of ${roommates.length} Home`}
            size="xs"
          />
        </div>

        <div className="space-y-2.5">
          {roommates.map((r) => {
            const isMe = r.id === currentUser.id;
            return (
              <div
                key={r.id}
                className={`p-2.5 rounded-2xl flex items-center justify-between gap-2.5 border transition-all ${
                  isMe
                    ? 'bg-[#F7F8FB] border-[#E2E5EC]'
                    : 'bg-white border-[#F1F3F9] hover:border-[#E2E5EC]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    src={r.avatar}
                    name={r.name}
                    flag={r.flag}
                    isHome={r.isHome}
                    statusRing={true}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#1F2430] truncate">
                      {isMe ? `${r.name.split(' ')[0]} (You)` : r.name.split(' ')[0]}
                    </p>
                    <p className="type-secondary text-[13px] flex items-center gap-1 whitespace-nowrap">
                      <Flame className="w-3.5 h-3.5 text-[#FF6B4A] fill-[#FF6B4A] shrink-0" />
                      <span>
                        {r.streakDays}d streak • {r.points} pts
                      </span>
                    </p>
                  </div>
                </div>
                <Chip
                  status={r.isHome ? 'active' : 'away'}
                  label={r.isHome ? 'Home' : 'Away'}
                  size="xs"
                />
              </div>
            );
          })}
        </div>

        <Button variant="secondary" size="sm" fullWidth onClick={onToggleHomeStatus}>
          Toggle my status ({currentUser.isHome ? 'Leave home' : 'Return home'})
        </Button>
      </InfoCard>

      <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-3">
        <h3 className="type-section-heading">Quick actions</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              if (onOpenExpensesAction) {
                onOpenExpensesAction('add');
              } else {
                onNavigateTab('expenses');
              }
            }}
            className="p-3 rounded-2xl bg-[#FFF5F2] border border-[#FFD3C9] text-left hover:bg-[#FFEAE4] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FF6B4A] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2430]">Log expense</p>
            <p className="text-[14px] text-[#475569]">Split purchases</p>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              if (choreDraftState.state === 'reveal_ready') {
                onOpenChoreReveal();
              } else {
                onOpenDraftPicks();
              }
            }}
            className="p-3 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] text-left hover:bg-[#EDE9FE] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#5B5BD6] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Shuffle className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2430]">{choreDraftState.actionLabel}</p>
            <p className="text-[14px] text-[#475569]">{choreDraftState.badgeLabel}</p>
          </button>
        </div>
      </InfoCard>
    </div>
  );
};
