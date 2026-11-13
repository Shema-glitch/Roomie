import React from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { Chore, ChoreAssignment, User } from '../../../types';
import { CHORE_REWARD_POINTS } from '../../../utils/stateTable';
import {
  CheckCircle2,
  ArrowLeftRight,
  Heart,
  ClipboardCheck,
} from 'lucide-react';

interface ChoreAssignmentListProps {
  todayDueAssignments: ChoreAssignment[];
  todayCompletedAssignments: ChoreAssignment[];
  chores: Chore[];
  roommates: User[];
  currentUser: User;
  onSelectDoneChore: (chore: Chore) => void;
  onSelectSwapChore: (chore: Chore) => void;
  onSelectKudos: (data: { chore: Chore; target: User }) => void;
}

export const ChoreAssignmentList: React.FC<ChoreAssignmentListProps> = ({
  todayDueAssignments,
  todayCompletedAssignments,
  chores,
  roommates,
  currentUser,
  onSelectDoneChore,
  onSelectSwapChore,
  onSelectKudos,
}) => {
  const getEffortPoints = (level: 'light' | 'medium' | 'heavy') =>
    CHORE_REWARD_POINTS[level] || 20;

  return (
    <>
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="type-section-heading">Today's due tasks</span>
            <Chip variant="primary" size="xs" label={`${todayDueAssignments.length} left`} />
          </div>
          <span className="type-secondary text-[13px] sm:text-[14px]">
            Complete on time to protect streak
          </span>
        </div>

        {todayDueAssignments.length === 0 ? (
          <InfoCard padding="md" className="text-center type-secondary bg-white">
            All due tasks for today have been completed
          </InfoCard>
        ) : (
          todayDueAssignments.map((a) => {
            const chore = chores.find((c) => c.id === a.choreId);
            const assignedUser = roommates.find((r) => r.id === a.userId);
            if (!chore) return null;
            const isMe = a.userId === currentUser.id;

            const scheduleLabel =
              chore.frequency === 'daily'
                ? `Daily at ${a.scheduledTime}`
                : `Weekly • ${a.scheduledDays.join(', ')} at ${a.scheduledTime}`;

            return (
              <ActionCard
                key={chore.id}
                tint="teal"
                iconTile={
                  <IconTile
                    icon={<ClipboardCheck className="w-6 h-6" />}
                    color="teal"
                    size="md"
                  />
                }
                title={chore.name}
                subtitle={scheduleLabel}
                detail={
                  <div className="space-y-1.5">
                    <p className="text-[14px] text-[#475569]">{chore.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip effort={chore.effortLevel} size="sm" />
                      <span className="type-secondary text-[14px]">
                        Assigned to:{' '}
                        <strong className="text-[#1F2430]">
                          {isMe ? 'You' : assignedUser?.name}
                        </strong>
                      </span>
                    </div>
                  </div>
                }
                actions={
                  isMe ? (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <Button
                        variant="teal"
                        size="md"
                        onClick={() => onSelectDoneChore(chore)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Done
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => onSelectSwapChore(chore)}
                        icon={<ArrowLeftRight className="w-4 h-4 text-[#475569]" />}
                      >
                        Swap
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-wrap items-center justify-between gap-2.5">
                      <span className="type-secondary text-[14px] font-bold">
                        Pending {assignedUser?.name.split(' ')[0]}'s completion
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectSwapChore(chore)}
                      >
                        Reassign
                      </Button>
                    </div>
                  )
                }
              />
            );
          })
        )}
      </div>

      {todayCompletedAssignments.length > 0 && (
        <div className="space-y-3.5 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-section-heading text-[#2CA358]">Completed today</span>
              <Chip status="agreed" label={`${todayCompletedAssignments.length} Done`} size="xs" />
            </div>
            <span className="type-secondary text-[13px] sm:text-[14px]">Streaks updated</span>
          </div>

          {todayCompletedAssignments.map((a) => {
            const chore = chores.find((c) => c.id === a.choreId);
            const assignedUser = roommates.find((r) => r.id === a.userId);
            if (!chore) return null;
            const isMe = a.userId === currentUser.id;

            return (
              <ActionCard
                key={chore.id}
                tint="green"
                iconTile={
                  <IconTile
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    color="green"
                    size="md"
                  />
                }
                title={chore.name}
                subtitle={`Completed by ${isMe ? 'You' : assignedUser?.name}`}
                detail={
                  <div className="space-y-1.5">
                    <p className="text-[14px] text-[#475569]">{chore.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip effort={chore.effortLevel} size="sm" />
                      <span className="text-[14px] font-bold text-[#2CA358]">
                        +{getEffortPoints(chore.effortLevel)} streak points awarded
                      </span>
                    </div>
                  </div>
                }
                badge={<Chip status="agreed" label="Done" size="xs" />}
                actions={
                  !isMe ? (
                    <div className="w-full flex flex-wrap items-center justify-between gap-2.5">
                      <span className="type-secondary text-[14px]">
                        Praise your roomie's contribution!
                      </span>
                      <Button
                        variant="reward"
                        size="sm"
                        onClick={() =>
                          assignedUser && onSelectKudos({ chore, target: assignedUser })
                        }
                        icon={<Heart className="w-4 h-4 text-[#1F2430]" />}
                      >
                        Send kudos
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-wrap items-center justify-between gap-2.5">
                      <span className="text-[14px] font-bold text-[#2CA358]">
                        Streak protected for today
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectSwapChore(chore)}
                      >
                        Reassign
                      </Button>
                    </div>
                  )
                }
              >
                {a.kudos.length > 0 && (
                  <div className="pt-2.5 border-t border-black/5 flex flex-wrap gap-2 items-center">
                    <span className="text-[14px] font-bold text-[#8A6200]">Roomie Kudos:</span>
                    {a.kudos.map((k) => {
                      const sender = roommates.find((r) => r.id === k.fromUser);
                      return (
                        <span
                          key={k.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-[14px] font-bold"
                        >
                          <Heart className="w-3.5 h-3.5 fill-[#FF6B4A] text-[#FF6B4A]" />
                          <span>{sender?.name.split(' ')[0] || 'Roomie'}</span>
                          {k.note && <span className="font-semibold italic">"{k.note}"</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </ActionCard>
            );
          })}
        </div>
      )}
    </>
  );
};
