import React, { useMemo, useState } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { Button } from '../../../components/common/Button';
import { SectionTitle } from '../../../components/common/SectionTitle';
import { Avatar } from '../../../components/common/Avatar';
import { Chip } from '../../../components/common/Chip';
import { User, Membership } from '../../../types';
import { sound } from '../../../services/sound';
import { DotsThree, UserMinus } from '@phosphor-icons/react';
import { Icon } from '@iconify/react';

interface RoomieRosterCardProps {
  user: User;
  membership: Membership;
  isMe: boolean;
  isAdmin: boolean;
  canRemoveMembers: boolean;
  onSelectRemoveUser: (user: User) => void;
}

const RoomieRosterCard: React.FC<RoomieRosterCardProps> = React.memo(
  ({ user, membership, isMe, isAdmin, canRemoveMembers, onSelectRemoveUser }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const firstName = user.name.trim().split(/\s+/)[0] || user.name;
    return (
      <ActionCard
      tint={isMe ? 'teal' : 'neutral'}
      className="tactile-hover h-full flex flex-col justify-between"
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
              <span className="text-[13px] font-bold text-[#4B5063] shrink-0 normal-case">
                (You)
              </span>
            )}
          </div>
          <Chip
            status={user.isHome ? 'active' : 'away'}
            label={user.isHome ? 'At home' : 'Away'}
            size="xs"
            className="shrink-0"
          />
        </div>
      }
      subtitle={
        <span className="text-[13px] text-[#4B5063]">
          {membership.role === 'admin' ? 'Admin' : 'Member'} · From {user.country}{' '}
          {user.flag || ''}
        </span>
      }
      detail={
        <div className="flex items-center justify-between text-[13px] text-[#4B5063] pt-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[#1F2033] font-medium">
              <Icon icon="fluent-emoji-flat:fire" className="w-3.5 h-3.5 shrink-0" />
              {user.streakDays}d streak
            </span>
            <span aria-hidden="true">·</span>
            <span>{user.points} pts</span>
          </div>
          {isAdmin && !isMe && canRemoveMembers && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playTap();
                  setMenuOpen((prev) => !prev);
                }}
                aria-label={`More actions for ${user.name}`}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="w-11 h-11 min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-[#475569] hover:text-[#1F2430] hover:bg-[#F4F6FA] transition-colors cursor-pointer"
              >
                <DotsThree weight="bold" className="w-5 h-5" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 bottom-full mb-1 z-20 min-w-[168px] bg-white rounded-2xl border-2 border-[#E2E8F0] shadow-lg p-1.5"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.playTap();
                        setMenuOpen(false);
                        onSelectRemoveUser(user);
                      }}
                      className="w-full min-h-[44px] px-3 rounded-xl text-left text-xs font-bold text-[#B42318] hover:bg-[#FEF2F2] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <UserMinus weight="bold" className="w-4 h-4 shrink-0" />
                      <span>Remove {firstName}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      }
    />
    );
  }
);
RoomieRosterCard.displayName = 'RoomieRosterCard';

interface RoomiesRosterProps {
  members: { user: User; membership: Membership }[];
  currentUser: User;
  isAdmin: boolean;
  canRemoveMembers: boolean;
  onSelectRemoveUser: (user: User) => void;
}

export const RoomiesRoster: React.FC<RoomiesRosterProps> = React.memo(
  ({
    members,
    currentUser,
    isAdmin,
    canRemoveMembers,
    onSelectRemoveUser,
  }) => {
    const homeCount = useMemo(
      () => members.reduce((acc, m) => (m.user.isHome ? acc + 1 : acc), 0),
      [members]
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle
            title={`Apartment Roomies (${members.length})`}
            subtitle={`${homeCount} of ${members.length} currently at home`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          {members.map(({ user, membership }) => (
            <RoomieRosterCard
              key={user.id}
              user={user}
              membership={membership}
              isMe={user.id === currentUser.id}
              isAdmin={isAdmin}
              canRemoveMembers={canRemoveMembers}
              onSelectRemoveUser={onSelectRemoveUser}
            />
          ))}
        </div>
      </div>
    );
  }
);
RoomiesRoster.displayName = 'RoomiesRoster';
