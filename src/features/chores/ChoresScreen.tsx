import React, { useState, useMemo, startTransition } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Chip } from '../../components/common/Chip';
import { EmptyState } from '../../components/common/EmptyState';
import { Chore, ChoreAssignment, DraftRound, User, KudosType, DutySchedule, DayOfWeek } from '../../types';
import { DutyTodayBanner } from './DutyTodayBanner';
import { getChoreDraftState, isAssignmentDueToday } from '../../utils/stateTable';
import { getTodayDuty } from '../../utils/dutyRotation';
import { sound } from '../../services/sound';
import { ArrowsClockwise, PlusCircle, CheckCircle, AirplaneTilt } from '@phosphor-icons/react';
import { ChoreAssignmentList } from './components/ChoreAssignmentList';
import { ChoresSidebar } from './components/ChoresSidebar';
import { useI18n } from '../../i18n/I18nProvider';
import { localizeChoreDraftState } from '../../i18n/helpers';

const DoneFlowModal = React.lazy(() =>
  import('./DoneFlowModal').then((m) => ({ default: m.DoneFlowModal }))
);
const KudosModal = React.lazy(() =>
  import('./KudosModal').then((m) => ({ default: m.KudosModal }))
);
const ChoreSwapModal = React.lazy(() =>
  import('./ChoreSwapModal').then((m) => ({ default: m.ChoreSwapModal }))
);
const AwayModeModal = React.lazy(() =>
  import('./AwayModeModal').then((m) => ({ default: m.AwayModeModal }))
);
const NewChoreModal = React.lazy(() =>
  import('./components/NewChoreModal').then((m) => ({ default: m.NewChoreModal }))
);

interface ChoresScreenProps {
  chores: Chore[];
  assignments: ChoreAssignment[];
  draftRound: DraftRound;
  roommates: User[];
  currentUser: User;
  dutySchedule?: DutySchedule | null;
  onOpenDraftPicks: () => void;
  onOpenReveal: () => void;
  onOpenTimetable?: () => void;
  onCompleteTodayDuty?: (day: DayOfWeek) => Promise<void>;
  onCompleteChore: (choreId: string, photoUrl?: string) => Promise<void>;
  onGiveKudos: (
    choreId: string,
    targetUserId: string,
    type: KudosType,
    note?: string
  ) => Promise<void>;
  onSwapChore: (
    choreId: string,
    toUserId: string,
    tokenCost?: number,
    note?: string
  ) => Promise<void>;
  onSetAway: (days: number | null) => Promise<void>;
  onAddChore: (
    name: string,
    frequency: 'daily' | 'weekly',
    effort: 'light' | 'medium' | 'heavy',
    desc: string
  ) => Promise<Chore>;
}

export const ChoresScreen: React.FC<ChoresScreenProps> = ({
  chores,
  assignments,
  draftRound,
  roommates,
  currentUser,
  dutySchedule,
  onOpenDraftPicks,
  onOpenReveal,
  onOpenTimetable,
  onCompleteTodayDuty,
  onCompleteChore,
  onGiveKudos,
  onSwapChore,
  onSetAway,
  onAddChore,
}) => {
  const { t, isRtl } = useI18n();
  const [scheduleFilter, setScheduleFilter] = useState<'my' | 'all'>('my');

  const [doneModalChore, setDoneModalChore] = useState<Chore | null>(null);
  const [kudosModalData, setKudosModalData] = useState<{ chore: Chore; target: User } | null>(null);
  const [swapModalChore, setSwapModalChore] = useState<Chore | null>(null);
  const [awayModalOpen, setAwayModalOpen] = useState(false);
  const [newChoreModalOpen, setNewChoreModalOpen] = useState(false);

  const myAssignments = useMemo(
    () => assignments.filter((a) => a.userId === currentUser.id),
    [assignments, currentUser.id]
  );
  const filteredAssignments = scheduleFilter === 'my' ? myAssignments : assignments;

  const todayDueAssignments = useMemo(
    () => filteredAssignments.filter((a) => isAssignmentDueToday(a) && !a.completedToday),
    [filteredAssignments]
  );
  const todayCompletedAssignments = useMemo(
    () => filteredAssignments.filter((a) => isAssignmentDueToday(a) && a.completedToday),
    [filteredAssignments]
  );

  const draftState = useMemo(
    () => localizeChoreDraftState(getChoreDraftState(draftRound, currentUser.id), t),
    [draftRound, currentUser.id, t]
  );

  const todayDuty = useMemo(
    () => getTodayDuty(dutySchedule, roommates, currentUser.id),
    [dutySchedule, roommates, currentUser.id]
  );
  const isDutyPendingToday = Boolean(todayDuty?.isMe && !todayDuty.entry.completed);
  const activeChoreCount = useMemo(
    () => chores.filter((c) => c.active).length,
    [chores]
  );

  return (
    <div className="w-full select-none pb-28 md:pb-8">
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <div className="w-full lg:col-span-7 self-start space-y-6">
          <DutyTodayBanner
            dutySchedule={dutySchedule || null}
            roommates={roommates}
            currentUser={currentUser}
            onOpenTimetable={onOpenTimetable || (() => {})}
            onCompleteTodayDuty={onCompleteTodayDuty}
          />

          <ActionCard
            tint={
              draftState.state === 'reveal_ready'
                ? 'coral'
                : draftState.state === 'reveal_done'
                ? 'teal'
                : 'indigo'
            }
            iconTile={
              <IconTile
                icon={
                  draftState.state === 'reveal_ready' || draftState.state === 'reveal_done' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <ArrowsClockwise className="w-6 h-6" />
                  )
                }
                color={
                  draftState.state === 'reveal_ready'
                    ? 'coral'
                    : draftState.state === 'reveal_done'
                    ? 'teal'
                    : 'indigo'
                }
                size="md"
              />
            }
            title={draftState.bannerTitle}
            subtitle={draftState.bannerSubtitle}
            badge={
              <Chip
                status={draftState.state === 'reveal_done' ? 'agreed' : 'pending'}
                label={draftState.badgeLabel}
                size="sm"
              />
            }
            actions={
              <div className="w-full flex items-center gap-3">
                {draftState.state === 'reveal_ready' ? (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={onOpenReveal}
                    icon={<CheckCircle className="w-4 h-4" weight="fill" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                ) : draftState.state === 'reveal_done' ? (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={onOpenReveal}
                    icon={<CheckCircle className="w-4 h-4 text-[#19B5A5]" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                ) : (
                  <Button
                    variant="teal"
                    size="md"
                    fullWidth
                    onClick={onOpenDraftPicks}
                    icon={<ArrowsClockwise className="w-4 h-4" weight="bold" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                )}
              </div>
            }
          />

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <SectionTitle
                  title={t('chores.scheduleTitle')}
                  subtitle={t('chores.scheduleSubtitle')}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                className="whitespace-nowrap shrink-0"
                onClick={() => setNewChoreModalOpen(true)}
                icon={<PlusCircle className="w-4 h-4" weight="fill" />}
              >
                {t('chores.newChore')}
              </Button>
            </div>

            <div className="relative grid grid-cols-2 p-1.5 rounded-2xl bg-[#E6E8EE]/70 max-w-md">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1.5 bottom-1.5 start-1.5 w-[calc(50%-6px)] rounded-xl bg-white shadow-sm transition-transform duration-250 ease-spring will-change-transform motion-reduce:transition-none"
                style={{
                  transform:
                    scheduleFilter === 'my'
                      ? 'translate3d(0%, 0, 0)'
                      : `translate3d(${isRtl ? -100 : 100}%, 0, 0)`,
                }}
              />
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  startTransition(() => setScheduleFilter('my'));
                }}
                className={`relative z-10 py-2 px-3 rounded-xl text-[13px] sm:text-[14px] font-heading font-black whitespace-nowrap transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2 ${
                  scheduleFilter === 'my'
                    ? 'text-[#1F2430]'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                {t('chores.myTasksTab', { count: myAssignments.length })}
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  startTransition(() => setScheduleFilter('all'));
                }}
                className={`relative z-10 py-2 px-3 rounded-xl text-[13px] sm:text-[14px] font-heading font-black whitespace-nowrap transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2 ${
                  scheduleFilter === 'all'
                    ? 'text-[#1F2430]'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                {t('chores.allChoresTab', { count: assignments.length })}
              </button>
            </div>
          </div>

          {chores.length === 0 && (
            <EmptyState
              title={t('chores.emptyTitle')}
              description={t('chores.emptyDesc')}
              mascotState="calm"
              bubbleText={t('chores.emptyBubble')}
              actionLabel={t('chores.addChore')}
              actionIcon={<PlusCircle className="w-4 h-4" weight="fill" />}
              onAction={() => setNewChoreModalOpen(true)}
            />
          )}

          <ChoreAssignmentList
            todayDueAssignments={todayDueAssignments}
            todayCompletedAssignments={todayCompletedAssignments}
            chores={chores}
            totalApartmentAssignments={assignments.length}
            activeChoreCount={activeChoreCount}
            draftState={draftState.state}
            draftActionLabel={draftState.actionLabel}
            isDutyPendingToday={isDutyPendingToday}
            roommates={roommates}
            currentUser={currentUser}
            onSelectDoneChore={setDoneModalChore}
            onQuickCompleteChore={(choreId) => onCompleteChore(choreId)}
            onSelectSwapChore={setSwapModalChore}
            onSelectKudos={setKudosModalData}
            onAddFirstChore={() => setNewChoreModalOpen(true)}
            onOpenDraftAction={
              draftState.state === 'reveal_ready' ? onOpenReveal : onOpenDraftPicks
            }
            onSwitchToAllFilter={
              scheduleFilter === 'my' ? () => setScheduleFilter('all') : undefined
            }
          />
        </div>

        <div className="w-full lg:col-span-5 self-start h-fit mt-6 lg:mt-0 lg:sticky lg:top-24 space-y-4">
          <ChoresSidebar
            roommates={roommates}
            currentUser={currentUser}
            chores={chores}
            onSelectKudos={setKudosModalData}
          />

          <div className="rounded-2xl border-2 border-[#E5E9F0] bg-[#F7F8FB] px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AirplaneTilt weight="duotone" className="w-4 h-4 text-[#64748B] shrink-0" />
              <span className="text-xs font-bold text-[#475569] truncate">
                {currentUser.awayUntil
                  ? `Away mode active until ${currentUser.awayUntil}`
                  : 'Going away? Pause chores & keep your streak'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setAwayModalOpen(true);
              }}
              className="tactile-press shrink-0 whitespace-nowrap px-3 py-1 rounded-full bg-white border border-[#E5E9F0] text-xs font-black text-[#1F2430] hover:bg-[#EEF1F6] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2"
            >
              {currentUser.awayUntil ? 'Manage' : 'Set away'}
            </button>
          </div>
        </div>
      </div>

      <React.Suspense fallback={null}>
        {newChoreModalOpen && (
          <NewChoreModal
            isOpen={newChoreModalOpen}
            onClose={() => setNewChoreModalOpen(false)}
            onAddChore={onAddChore}
          />
        )}

        {doneModalChore && (
          <DoneFlowModal
            isOpen={Boolean(doneModalChore)}
            onClose={() => setDoneModalChore(null)}
            chore={doneModalChore}
            currentUser={currentUser}
            onComplete={onCompleteChore}
          />
        )}

        {kudosModalData && (
          <KudosModal
            isOpen={Boolean(kudosModalData)}
            onClose={() => setKudosModalData(null)}
            chore={kudosModalData?.chore || null}
            targetUser={kudosModalData?.target || null}
            onGiveKudos={onGiveKudos}
          />
        )}

        {swapModalChore && (
          <ChoreSwapModal
            isOpen={Boolean(swapModalChore)}
            onClose={() => setSwapModalChore(null)}
            chore={swapModalChore}
            roommates={roommates.filter((r) => r.id !== currentUser.id)}
            onSwap={onSwapChore}
          />
        )}

        {awayModalOpen && (
          <AwayModeModal
            isOpen={awayModalOpen}
            onClose={() => setAwayModalOpen(false)}
            isAway={Boolean(currentUser.awayUntil)}
            onSetAway={onSetAway}
          />
        )}
      </React.Suspense>
    </div>
  );
};
