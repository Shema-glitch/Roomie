import React, { useState } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { Chore, ChoreAssignment, User } from '../../../types';
import { CHORE_REWARD_POINTS } from '../../../utils/stateTable';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import {
  CheckCircle2,
  ArrowLeftRight,
  Heart,
  ClipboardCheck,
  Sparkles,
  Camera,
} from 'lucide-react';

interface ChoreAssignmentListProps {
  todayDueAssignments: ChoreAssignment[];
  todayCompletedAssignments: ChoreAssignment[];
  chores: Chore[];
  roommates: User[];
  currentUser: User;
  onSelectDoneChore: (chore: Chore) => void;
  onQuickCompleteChore?: (choreId: string) => Promise<void>;
  onSelectSwapChore: (chore: Chore) => void;
  onSelectKudos: (data: { chore: Chore; target: User }) => void;
  onSwitchToAllFilter?: () => void;
}

export const ChoreAssignmentList: React.FC<ChoreAssignmentListProps> = ({
  todayDueAssignments,
  todayCompletedAssignments,
  chores,
  roommates,
  currentUser,
  onSelectDoneChore,
  onQuickCompleteChore,
  onSelectSwapChore,
  onSelectKudos,
  onSwitchToAllFilter,
}) => {
  const { showToast } = useToast();
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const getEffortPoints = (level: 'light' | 'medium' | 'heavy') =>
    CHORE_REWARD_POINTS[level] || 20;

  const handleQuickComplete = async (chore: Chore) => {
    if (!onQuickCompleteChore || pendingIds.has(chore.id)) return;
    sound.playSuccess();
    setOptimisticCompletedIds((prev) => new Set(prev).add(chore.id));
    setPendingIds((prev) => new Set(prev).add(chore.id));

    try {
      await onQuickCompleteChore(chore.id);
      showToast(`"${chore.name}" marked done! +${getEffortPoints(chore.effortLevel)} pts`, 'reward');
    } catch {
      setOptimisticCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(chore.id);
        return next;
      });
      showToast(`Could not complete "${chore.name}". Changes rolled back.`, 'error');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(chore.id);
        return next;
      });
    }
  };

  return (
    <>
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="type-section-heading">Today's due tasks</span>
            <Chip
              variant="primary"
              size="xs"
              label={`${Math.max(
                0,
                todayDueAssignments.filter((a) => !optimisticCompletedIds.has(a.choreId)).length
              )} left`}
            />
          </div>
          <span className="type-secondary text-[13px] sm:text-[14px]">
            Complete on time to protect streak
          </span>
        </div>

        {todayDueAssignments.length === 0 ? (
          <div className="p-6 rounded-[24px] bg-white border-2 border-[#E6E8EE] shadow-xs text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF9F0] border border-[#BBF7D0] flex items-center justify-center text-[#2CA358]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="type-card-title text-[#1F2430]">All caught up for today!</h4>
              <p className="type-secondary text-[14px]">
                Every due chore for today is finished and your apartment streak is protected.
              </p>
            </div>
            {onSwitchToAllFilter && (
              <div className="pt-1">
                <Button variant="secondary" size="sm" onClick={onSwitchToAllFilter}>
                  View all apartment tasks
                </Button>
              </div>
            )}
          </div>
        ) : (
          todayDueAssignments.map((a) => {
            const chore = chores.find((c) => c.id === a.choreId);
            const assignedUser = roommates.find((r) => r.id === a.userId);
            if (!chore) return null;
            const isMe = a.userId === currentUser.id;
            const isOptimisticDone = optimisticCompletedIds.has(chore.id);
            const isSaving = pendingIds.has(chore.id);

            const scheduleLabel =
              chore.frequency === 'daily'
                ? `Daily at ${a.scheduledTime}`
                : `Weekly • ${a.scheduledDays.join(', ')} at ${a.scheduledTime}`;

            return (
              <ActionCard
                key={chore.id}
                tint={isOptimisticDone ? 'green' : 'teal'}
                className={`transition-all duration-150 ease-out ${
                  isOptimisticDone ? 'opacity-85' : ''
                }`}
                iconTile={
                  <IconTile
                    icon={
                      isOptimisticDone ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <ClipboardCheck className="w-6 h-6" />
                      )
                    }
                    color={isOptimisticDone ? 'green' : 'teal'}
                    size="md"
                  />
                }
                title={
                  <span
                    className={`type-card-title transition-all duration-150 ${
                      isOptimisticDone ? 'line-through text-[#475569]' : 'text-[#1F2430]'
                    }`}
                  >
                    {chore.name}
                  </span>
                }
                subtitle={isOptimisticDone ? 'Just completed by You' : scheduleLabel}
                badge={
                  isOptimisticDone ? (
                    <Chip status="agreed" label="Done" size="xs" />
                  ) : undefined
                }
                detail={
                  <div className="space-y-1.5">
                    <p
                      className={`text-[14px] transition-opacity duration-150 ${
                        isOptimisticDone ? 'line-through opacity-70 text-[#64748B]' : 'text-[#475569]'
                      }`}
                    >
                      {chore.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip effort={chore.effortLevel} size="sm" />
                      {isOptimisticDone ? (
                        <span className="text-[14px] font-bold text-[#2CA358] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> +
                          {getEffortPoints(chore.effortLevel)} pts awarded
                        </span>
                      ) : (
                        <span className="type-secondary text-[14px]">
                          Assigned to:{' '}
                          <strong className="text-[#1F2430]">
                            {isMe ? 'You' : assignedUser?.name}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                }
                actions={
                  isMe ? (
                    <div className="flex flex-wrap items-center gap-2.5 w-full">
                      {onQuickCompleteChore && !isOptimisticDone && (
                        <Button
                          variant="teal"
                          size="md"
                          loading={isSaving}
                          onClick={() => handleQuickComplete(chore)}
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          className="flex-1"
                        >
                          {isSaving ? 'Completing...' : 'Mark done'}
                        </Button>
                      )}
                      {!isOptimisticDone && (
                        <Button
                          variant={onQuickCompleteChore ? 'secondary' : 'teal'}
                          size="md"
                          onClick={() => onSelectDoneChore(chore)}
                          icon={
                            onQuickCompleteChore ? (
                              <Camera className="w-4 h-4 text-[#475569]" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )
                          }
                          className={onQuickCompleteChore ? '' : 'flex-1'}
                        >
                          {onQuickCompleteChore ? 'With photo' : 'Done'}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={isSaving}
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
                title={
                  <span className="type-card-title line-through text-[#475569]">
                    {chore.name}
                  </span>
                }
                subtitle={`Completed by ${isMe ? 'You' : assignedUser?.name}`}
                detail={
                  <div className="space-y-1.5">
                    <p className="text-[14px] text-[#475569] opacity-80">{chore.description}</p>
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
