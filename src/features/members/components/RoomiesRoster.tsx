import React from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { Button } from '../../../components/common/Button';
import { SectionTitle } from '../../../components/common/SectionTitle';
import { Avatar } from '../../../components/common/Avatar';
import { Chip } from '../../../components/common/Chip';
import { User, Membership } from '../../../types';
import { sound } from '../../../services/sound';
import { Flame, UserMinus, LogOut } from 'lucide-react';

interface RoomiesRosterProps {
  members: { user: User; membership: Membership }[];
  currentUser: User;
  isAdmin: boolean;
  canRemoveMembers: boolean;
  onSelectRemoveUser: (user: User) => void;
  onOpenLeaveModal: () => void;
}

export const RoomiesRoster: React.FC<RoomiesRosterProps> = ({
  members,
  currentUser,
  isAdmin,
  canRemoveMembers,
  onSelectRemoveUser,
  onOpenLeaveModal,
}) => {
  const homeCount = members.filter((m) => m.user.isHome).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle
          title={`Apartment Roomies (${members.length})`}
          subtitle="Apartment roomies, live status, and streaks"
        />
        <Chip
          status="active"
          label={`${homeCount} of ${members.length} Home`}
          size="xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        {members.map(({ user, membership }) => {
          const isMe = user.id === currentUser.id;
          return (
            <ActionCard
              key={user.id}
              tint={isMe ? 'teal' : 'neutral'}
              className="h-full flex flex-col justify-between"
              iconTile={
                <Avatar
                  src={user.avatar}
                  name={user.name}
                  flag={user.flag}
                  isHome={user.isHome}
                  statusRing={true}
                  size="md"
                />
              }
              title={
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="type-card-title truncate">{user.name}</span>
                    {isMe && (
                      <span className="text-[14px] font-bold text-[#FF6B4A] shrink-0 normal-case">
                        (You)
                      </span>
                    )}
                  </div>
                  {membership.role === 'admin' && (
                    <Chip status="admin" size="sm" className="shrink-0" />
                  )}
                </div>
              }
              subtitle={
                <span className="type-secondary text-[14px]">
                  From {user.country} {user.flag || ''}
                </span>
              }
              detail={
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="flex items-center gap-1 text-[#FF6B4A] font-bold">
                      <Flame className="w-3.5 h-3.5 fill-[#FF6B4A]" /> {user.streakDays} day streak
                    </span>
                    <span className="font-bold text-[#475569]">{user.points} points</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Chip
                      status={user.isHome ? 'active' : 'away'}
                      label={user.isHome ? 'At home' : 'Away'}
                      size="sm"
                    />
                    {isAdmin && !isMe && canRemoveMembers && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playTap();
                          onSelectRemoveUser(user);
                        }}
                        className="text-xs font-bold text-[#E5484D] hover:underline flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              }
            />
          );
        })}
      </div>

      <div className="pt-2 flex justify-start">
        <Button
          variant="secondary"
          size="md"
          onClick={onOpenLeaveModal}
          icon={<LogOut className="w-4 h-4 text-[#E5484D]" />}
        >
          Leave this apartment
        </Button>
      </div>
    </div>
  );
};
