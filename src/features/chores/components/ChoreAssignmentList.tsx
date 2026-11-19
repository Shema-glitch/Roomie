import React, { useState, useMemo, useCallback } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { Chore, ChoreAssignment, User } from '../../../types';
import { CHORE_REWARD_POINTS, UnifiedDraftState } from '../../../utils/stateTable';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import {
  CheckCircle,
  ArrowsLeftRight,
  Heart,
  Camera,
  PlusCircle,
  ArrowsClockwise,
  Clock,
} from '@phosphor-icons/react';
import { Icon } from '@iconify/react';

const formatEffortLabel = (level: 'light' | 'medium' | 'heavy'): string => {
  if (level === 'heavy') return 'Heavy';
  if (level === 'medium') return 'Medium';
  return 'Light';
};

const getEffortPoints = (level: 'light' | 'medium' | 'heavy'): number =>
  CHORE_REWARD_POINTS[level] || 20;

interface DueChoreRowProps {
  assignment: ChoreAssignment;
  chore: Chore;
  assignedUser: User | undefined;
  isMe: boolean;
  isOptimisticDone: boolean;
  isSaving: boolean;
  hasQuickComplete: boolean;
  staggerIndex: number;
  onQuickComplete: (chore: Chore) => void;
  onSelectDoneChore: (chore: Chore) => void;
  onSelectSwapChore: (chore: Chore) => void;
}

const DueChoreRow: React.FC<DueChoreRowProps> = React.memo(
  ({
    assignment: a,
    chore,
    assignedUser,
    isMe,
    isOptimisticDone,
    isSaving,
    hasQuickComplete,
    staggerIndex,
    onQuickComplete,
    onSelectDoneChore,
    onSelectSwapChore,
  }) => {
    const freqLabel =
      chore.frequency === 'daily'
        ? 'Daily'
        : `Weekly (${a.scheduledDays.join(', ')})`;
    const effortLabel = formatEffortLabel(chore.effortLevel);
    const assigneeLabel = isMe ? 'You' : assignedUser?.name.split(' ')[0] || 'Roomie';
    const points = getEffortPoints(chore.effortLevel);

    return (
      <div
        className="relative stagger-item"
        style={{ '--stagger-index': staggerIndex } as React.CSSProperties}
      >
        {isOptimisticDone && (
          <div
            aria-hidden="true"
            className="animate-float-badge pointer-events-none absolute -top-2.5 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2CA358] text-white text-xs font-extrabold shadow-md border border-white/40"
          >
            <Icon icon="fluent-emoji-flat:fire" className="w-3.5 h-3.5 shrink-0" />
            <span>+1 Streak · +{points} pts</span>
          </div>
        )}
        <ActionCard
          tint={isOptimisticDone ? 'green' : 'teal'}
          className={`contain-content transition-[transform,opacity] duration-200 ease-spring ${
            isOptimisticDone
              ? 'ring-2 ring-[#3DBE6D]/60 bg-[#EBF9F0] scale-[1.005]'
              : ''
          }`}
          iconTile={
            <IconTile
              icon={
                isOptimisticDone ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 text-[#2CA358]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" className="animate-check-draw" />
                  </svg>
                ) : (
                  <Icon icon="fluent-emoji-flat:broom" className="w-6 h-6" />
                )
              }
              color={isOptimisticDone ? 'green' : 'teal'}
              size="md"
            />
          }
          title={
            <span
              className={`type-card-title font-semibold transition-colors duration-150 ${
                isOptimisticDone ? 'line-through text-[#475569]' : 'text-[#1F2430]'
              }`}
            >
              {chore.name}
            </span>
          }
          subtitle={
            isOptimisticDone
              ? `Completed by You · +${points} pts`
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
                {hasQuickComplete && !isOptimisticDone && (
                  <Button
                    variant="teal"
                    size="md"
                    loading={isSaving}
                    onClick={() => onQuickComplete(chore)}
                    icon={<CheckCircle className="w-4 h-4" weight="fill" />}
                    className="flex-1"
                  >
                    {isSaving ? 'Completing...' : 'Mark done'}
                  </Button>
                )}
                {!isOptimisticDone && (
                  <Button
                    variant={hasQuickComplete ? 'secondary' : 'teal'}
                    size="md"
                    onClick={() => onSelectDoneChore(chore)}
                    icon={
                      hasQuickComplete ? (
                        <Camera className="w-4 h-4 text-[#475569]" />
                      ) : (
                        <CheckCircle className="w-4 h-4" weight="fill" />
                      )
                    }
                    className={hasQuickComplete ? '' : 'flex-1'}
                  >
                    {hasQuickComplete ? 'With photo' : 'Done'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="md"
                  disabled={isSaving}
                  onClick={() => onSelectSwapChore(chore)}
                  icon={<ArrowsLeftRight className="w-4 h-4 text-[#475569]" />}
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
      </div>
    );
  }
);
DueChoreRow.displayName = 'DueChoreRow';

interface CompletedChoreRowProps {
  assignment: ChoreAssignment;
  chore: Chore;
  assignedUser: User | undefined;
  roommates: User[];
  isMe: boolean;
  onSelectKudos: (data: { chore: Chore; target: User }) => void;
  onSelectSwapChore: (chore: Chore) => void;
}

const CompletedChoreRow: React.FC<CompletedChoreRowProps> = React.memo(
  ({
    assignment: a,
    chore,
    assignedUser,
    roommates,
    isMe,
    onSelectKudos,
    onSelectSwapChore,
  }) => {
    const effortLabel = formatEffortLabel(chore.effortLevel);

    return (
      <ActionCard
        tint="green"
        className="contain-content"
        iconTile={
          <IconTile
            icon={<CheckCircle className="w-6 h-6" weight="fill" />}
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
                onClick={() => assignedUser && onSelectKudos({ chore, target: assignedUser })}
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
                    roommates.find((r) => r.id === k.fromUser)?.name.split(' ')[0] || 'Roomie';
                  return k.note ? `${sender} ("${k.note}")` : sender;
                })
                .join(' · ')}
            </span>
          </div>
        )}
      </ActionCard>
    );
  }
);
CompletedChoreRow.displayName = 'CompletedChoreRow';

interface ChoreAssignmentListProps {
  todayDueAssignments: ChoreAssignment[];
  todayCompletedAssignments: ChoreAssignment[];
  chores: Chore[];
  totalApartmentAssignments?: number;
  activeChoreCount?: number;
  draftState?: UnifiedDraftState;
  draftActionLabel?: string;
  isDutyPendingToday?: boolean;
  roommates: User[];
  currentUser: User;
  onSelectDoneChore: (chore: Chore) => void;
  onQuickCompleteChore?: (choreId: string) => Promise<void>;
  onSelectSwapChore: (chore: Chore) => void;
  onSelectKudos: (data: { chore: Chore; target: User }) => void;
  onAddFirstChore?: () => void;
  onOpenDraftAction?: () => void;
  onSwitchToAllFilter?: () => void;
}

export const ChoreAssignmentList: React.FC<ChoreAssignmentListProps> = React.memo(
  ({
    todayDueAssignments,
    todayCompletedAssignments,
    chores,
    totalApartmentAssignments = 0,
    activeChoreCount = chores.filter((c) => c.active).length,
    draftState = 'reveal_done',
    draftActionLabel,
    isDutyPendingToday = false,
    roommates,
    currentUser,
    onSelectDoneChore,
    onQuickCompleteChore,
    onSelectSwapChore,
    onSelectKudos,
    onAddFirstChore,
    onOpenDraftAction,
    onSwitchToAllFilter,
  }) => {
    const { showToast } = useToast();
    const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<string>>(new Set());
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    const choreMap = useMemo(() => new Map(chores.map((c) => [c.id, c])), [chores]);
    const roommateMap = useMemo(() => new Map(roommates.map((r) => [r.id, r])), [roommates]);

    const handleQuickComplete = useCallback(
      async (chore: Chore) => {
        if (!onQuickCompleteChore) return;
        sound.playSuccess();
        setOptimisticCompletedIds((prev) => new Set(prev).add(chore.id));
        setPendingIds((prev) => new Set(prev).add(chore.id));

        try {
          await onQuickCompleteChore(chore.id);
          showToast(
            `"${chore.name}" marked done! +${getEffortPoints(chore.effortLevel)} pts`,
            'reward'
          );
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
      },
      [onQuickCompleteChore, showToast]
    );

    const remainingDueCount = useMemo(
      () =>
        Math.max(
          0,
          todayDueAssignments.filter((a) => !optimisticCompletedIds.has(a.choreId)).length
        ),
      [todayDueAssignments, optimisticCompletedIds]
    );

    const isWaitingForWeeklyPicksClose =
      draftState !== 'reveal_done' && totalApartmentAssignments === 0 && activeChoreCount > 0;

    return (
      <>
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
            <span className="type-section-heading">
              {isWaitingForWeeklyPicksClose
                ? `This week's schedule (${totalApartmentAssignments})`
                : `Today's due tasks (${remainingDueCount})`}
            </span>
            <span className="type-secondary text-[13px] sm:text-[14px]">
              {isWaitingForWeeklyPicksClose
                ? 'Populates once weekly picks close'
                : 'Complete on time to protect streak'}
            </span>
          </div>

          {todayDueAssignments.length === 0 ? (
            isWaitingForWeeklyPicksClose ? (
              <div className="p-6 rounded-[24px] bg-white border-2 border-[#E6E8EE] shadow-xs text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF0FD] border border-[#D6D8FB] flex items-center justify-center text-[#5B5BD6]">
                  <ArrowsClockwise className="w-6 h-6" weight="duotone" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="type-card-title text-[#1F2430]">
                    {draftState === 'reveal_ready'
                      ? 'Weekly picks are in — ready to reveal'
                      : 'All chores (0) until weekly picks close'}
                  </h4>
                  <p className="type-secondary text-[14px]">
                    {draftState === 'reveal_ready'
                      ? `${activeChoreCount} flat chores are ready. Reveal assignments above to populate this week's chore schedule.`
                      : draftState === 'waiting_others'
                      ? `Your picks are locked in for ${activeChoreCount} flat chores. Assignments stay at (0) until all roomies finish ranking and weekly picks close.`
                      : `${activeChoreCount} flat chores are queued for this week's draft. All chores stays at (0) until weekly picks close.`}
                  </p>
                </div>
                {onOpenDraftAction && (
                  <div className="pt-1">
                    <Button variant="teal" size="sm" onClick={onOpenDraftAction}>
                      {draftActionLabel || 'Choose My Chores'}
                    </Button>
                  </div>
                )}
              </div>
            ) : isDutyPendingToday ? (
              <div className="p-6 rounded-[24px] bg-white border-2 border-[#E6E8EE] shadow-xs text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF5F2] border border-[#FFD7CF] flex items-center justify-center text-[#FF6B4A]">
                  <Clock className="w-6 h-6" weight="duotone" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="type-card-title text-[#1F2430]">
                    Duty Captain checklist due today
                  </h4>
                  <p className="type-secondary text-[14px]">
                    No extra chores queued — mark Today&apos;s Duty Captain card above finished once your flat tidy is done.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-[24px] bg-white border-2 border-[#E6E8EE] shadow-xs text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF9F0] border border-[#BBF7D0] flex items-center justify-center text-[#2CA358]">
                  <Icon icon="fluent-emoji-flat:trophy" className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="type-card-title text-[#1F2430]">All caught up for today!</h4>
                  <p className="type-secondary text-[14px]">
                    No due chores left—your flat streak is safe.
                  </p>
                </div>
                {chores.length === 0 && totalApartmentAssignments === 0 && onAddFirstChore ? (
                  <div className="pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onAddFirstChore}
                      icon={<PlusCircle className="w-4 h-4" weight="fill" />}
                    >
                      Add First Chore
                    </Button>
                  </div>
                ) : (
                  totalApartmentAssignments > 0 &&
                  onSwitchToAllFilter && (
                    <div className="pt-1">
                      <Button variant="secondary" size="sm" onClick={onSwitchToAllFilter}>
                        View all apartment tasks
                      </Button>
                    </div>
                  )
                )}
              </div>
            )
          ) : (
            todayDueAssignments.map((a, idx) => {
              const chore = choreMap.get(a.choreId);
              if (!chore) return null;
              const assignedUser = roommateMap.get(a.userId);
              return (
                <DueChoreRow
                  key={chore.id}
                  assignment={a}
                  chore={chore}
                  assignedUser={assignedUser}
                  isMe={a.userId === currentUser.id}
                  isOptimisticDone={optimisticCompletedIds.has(chore.id)}
                  isSaving={pendingIds.has(chore.id)}
                  hasQuickComplete={Boolean(onQuickCompleteChore)}
                  staggerIndex={idx}
                  onQuickComplete={handleQuickComplete}
                  onSelectDoneChore={onSelectDoneChore}
                  onSelectSwapChore={onSelectSwapChore}
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
              const chore = choreMap.get(a.choreId);
              if (!chore) return null;
              const assignedUser = roommateMap.get(a.userId);
              return (
                <CompletedChoreRow
                  key={chore.id}
                  assignment={a}
                  chore={chore}
                  assignedUser={assignedUser}
                  roommates={roommates}
                  isMe={a.userId === currentUser.id}
                  onSelectKudos={onSelectKudos}
                  onSelectSwapChore={onSelectSwapChore}
                />
              );
            })}
          </div>
        )}
      </>
    );
  }
);
ChoreAssignmentList.displayName = 'ChoreAssignmentList';
