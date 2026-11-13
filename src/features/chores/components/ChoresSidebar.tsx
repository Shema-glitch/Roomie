import React from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Avatar } from '../../../components/common/Avatar';
import { Chore, User } from '../../../types';
import { Flame, Heart, Plane } from 'lucide-react';

interface ChoresSidebarProps {
  roommates: User[];
  currentUser: User;
  chores: Chore[];
  onSelectKudos: (data: { chore: Chore; target: User }) => void;
  onOpenAwayModal: () => void;
}

export const ChoresSidebar: React.FC<ChoresSidebarProps> = ({
  roommates,
  currentUser,
  chores,
  onSelectKudos,
  onOpenAwayModal,
}) => {
  const maxStreak = Math.max(...roommates.map((r) => r.streakDays), 0);

  return (
    <div className="space-y-6">
      <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4">
        <div className="min-w-0">
          <h3 className="type-section-heading">Roomie streaks and kudos</h3>
          <p className="type-secondary text-[13px] text-[#64748B] mt-0.5">
            Apartment chore consistency · Top streak: {maxStreak}d
          </p>
        </div>

        <div className="space-y-2.5">
          {roommates.map((r) => {
            const isMe = r.id === currentUser.id;
            const isTopStreak = r.streakDays === maxStreak && maxStreak > 0;
            return (
              <div
                key={r.id}
                className={`p-3 rounded-2xl flex items-center justify-between gap-2.5 border transition-all ${
                  isTopStreak
                    ? 'bg-linear-to-r from-[#FFF8E6] to-white border-[#FFE8A3] shadow-xs'
                    : isMe
                    ? 'bg-[#F7F8FB] border-[#E2E5EC]'
                    : 'bg-white border-[#E6E8EE]'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <Avatar
                    src={r.avatar}
                    name={r.name}
                    flag={r.flag}
                    isHome={r.isHome}
                    statusRing={true}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1F2430] truncate">{r.name}</p>
                      {isMe && (
                        <span className="text-[13px] font-semibold text-[#FF6B4A] shrink-0">(You)</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#64748B] flex items-center gap-1.5 whitespace-nowrap mt-0.5">
                      <span className="inline-flex items-center gap-1 font-medium text-[#1F2430]">
                        <Flame className="w-3.5 h-3.5 fill-[#FF6B4A] text-[#FF6B4A] shrink-0" />
                        {r.streakDays}d
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{r.points} pts</span>
                      {isTopStreak && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#8A6200] font-medium">Top streak</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {!isMe && (
                  <button
                    type="button"
                    onClick={() => onSelectKudos({ chore: chores[0], target: r })}
                    className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#FFF8E6] hover:bg-[#FFE8A3] text-[#8A6200] border border-[#FFE8A3] text-[13px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shrink-0 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]"
                    title={`Send kudos to ${r.name}`}
                    aria-label={`Send kudos to ${r.name}`}
                  >
                    <Heart className="w-3.5 h-3.5 fill-[#FFC93C] text-[#8A6200] shrink-0" />
                    <span className="hidden sm:inline">Kudos</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </InfoCard>

      <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <IconTile icon={<Plane className="w-5 h-5" />} color="slate" size="sm" />
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="type-card-title text-[#1F2430]">
              {currentUser.awayUntil ? 'Away mode active' : 'Going on vacation?'}
            </h4>
            <p className="type-secondary text-[14px]">
              {currentUser.awayUntil
                ? `Your chores are paused until ${currentUser.awayUntil}. Streak is protected.`
                : 'Protect your streak and notify roomies when traveling or during exam breaks.'}
            </p>
            {currentUser.awayUntil && (
              <div className="inline-block mt-1 px-2.5 py-1 rounded-xl bg-[#F1F3F9] border border-[#E2E5EC] text-[14px] font-bold text-[#475569]">
                Active until: {currentUser.awayUntil}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={onOpenAwayModal}
          icon={<Plane className="w-4 h-4 text-[#475569]" />}
        >
          {currentUser.awayUntil ? 'Manage away mode' : 'Set away mode'}
        </Button>
      </InfoCard>
    </div>
  );
};
