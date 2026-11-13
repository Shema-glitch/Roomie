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

const formatEffortLabel = (level: 'light' | 'medium' | 'heavy'): string => {
  if (level === 'heavy') return 'Heavy';
  if (level === 'medium') return 'Medium';
  return 'Light';
};

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

  const remainingDueCount = Math.max(
    0,
    todayDueAssignments.filter((a) => !optimisticCompletedIds.has(a.choreId)).length
  );

  return (
    <>
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <span className="type-section-heading">
            Today's due tasks ({remainingDueCount})
          </span>
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

            const freqLabel =
              chore.frequency === 'daily'
                ? 'Daily'
                : `Weekly (${a.scheduledDays.join(', ')})`;
            const effortLabel = formatEffortLabel(chore.effortLevel);
            const assigneeLabel = isMe ? 'You' : assignedUser?.name.split(' ')[0] || 'Roomie';

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
                    className={`type-card-title font-semibold transition-all duration-150 ${
                      isOptimisticDone ? 'line-through text-[#475569]' : 'text-[#1F2430]'
                    }`}
                  >
                    {chore.name}
                  </span>
                }
                subtitle={
                  isOptimisticDone
                    ? `Completed by You · +${getEffortPoints(chore.effortLevel)} pts`
                    : `${freqLabel} · ${effortLabel} · ${a.scheduledTime} · Assigned to ${assigneeLabel}`
                }
                badge={
                  <Chip
                    status={isOptimisticDone ? 'agreed' : 'pending'}
                    label={isOptimisticDone ? 'Done' : 'Due Today'}
                    size="xs"
                  />
                }
                detail={
                  <p
                    className={`text-[14px] transition-opacity duration-150 ${
                      isOptimisticDone ? 'line-through opacity-70 text-[#64748B]' : 'text-[#475569]'
                    }`}
                  >
                    {chore.description}
                  </p>
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
                      <span className="type-secondary text-[14px] font-medium">
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
            <span className="type-section-heading text-[#2CA358]">
              Completed today ({todayCompletedAssignments.length})
            </span>
            <span className="type-secondary text-[13px] sm:text-[14px]">Streaks updated</span>
          </div>

          {todayCompletedAssignments.map((a) => {
            const chore = chores.find((c) => c.id === a.choreId);
            const assignedUser = roommates.find((r) => r.id === a.userId);
            if (!chore) return null;
            const isMe = a.userId === currentUser.id;
            const effortLabel = formatEffortLabel(chore.effortLevel);

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
                  <span className="type-card-title font-semibold line-through text-[#475569]">
                    {chore.name}
                  </span>
                }
                subtitle={`Completed by ${isMe ? 'You' : assignedUser?.name} · ${effortLabel} · +${getEffortPoints(chore.effortLevel)} pts`}
                detail={
                  <p className="text-[14px] text-[#475569] opacity-80">{chore.description}</p>
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
                      <span className="text-[14px] font-semibold text-[#2CA358]">
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
                  <div className="pt-2.5 border-t border-black/5 flex flex-wrap gap-2 items-center text-[13px] text-[#475569]">
                    <span className="font-semibold text-[#1F2430]">Roomie kudos:</span>
                    <span>
                      {a.kudos
                        .map((k) => {
                          const sender =
                            roommates.find((r) => r.id === k.fromUser)?.name.split(' ')[0] ||
                            'Roomie';
                          return k.note ? `${sender} ("${k.note}")` : sender;
                        })
                        .join(' · ')}
                    </span>
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
