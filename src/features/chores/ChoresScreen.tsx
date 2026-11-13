import React, { useState } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Chip } from '../../components/common/Chip';
import { DoneFlowModal } from './DoneFlowModal';
import { KudosModal } from './KudosModal';
import { ChoreSwapModal } from './ChoreSwapModal';
import { AwayModeModal } from './AwayModeModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Chore, ChoreAssignment, DraftRound, User, KudosType, DutySchedule, DayOfWeek } from '../../types';
import { DutyTodayBanner } from './DutyTodayBanner';
import { getChoreDraftState, isAssignmentDueToday } from '../../utils/stateTable';
import { sound } from '../../services/sound';
import { Sparkles, Plus, Shuffle } from 'lucide-react';
import { ChoreAssignmentList } from './components/ChoreAssignmentList';
import { ChoresSidebar } from './components/ChoresSidebar';
import { NewChoreModal } from './components/NewChoreModal';

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
  onSwapChore: (choreId: string, toUserId: string) => Promise<void>;
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
  const [scheduleFilter, setScheduleFilter] = useState<'my' | 'all'>('my');

  const [doneModalChore, setDoneModalChore] = useState<Chore | null>(null);
  const [kudosModalData, setKudosModalData] = useState<{ chore: Chore; target: User } | null>(null);
  const [swapModalChore, setSwapModalChore] = useState<Chore | null>(null);
  const [awayModalOpen, setAwayModalOpen] = useState(false);
  const [newChoreModalOpen, setNewChoreModalOpen] = useState(false);

  const myAssignments = assignments.filter((a) => a.userId === currentUser.id);
  const filteredAssignments = scheduleFilter === 'my' ? myAssignments : assignments;

  const todayDueAssignments = filteredAssignments.filter(
    (a) => isAssignmentDueToday(a) && !a.completedToday
  );
  const todayCompletedAssignments = filteredAssignments.filter(
    (a) => isAssignmentDueToday(a) && a.completedToday
  );

  const draftState = getChoreDraftState(draftRound, currentUser.id);

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
                    <Sparkles className="w-6 h-6" />
                  ) : (
                    <Shuffle className="w-6 h-6" />
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
                    icon={<Sparkles className="w-4 h-4" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                ) : draftState.state === 'reveal_done' ? (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={onOpenReveal}
                    icon={<Sparkles className="w-4 h-4 text-[#19B5A5]" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                ) : (
                  <Button
                    variant="teal"
                    size="md"
                    fullWidth
                    onClick={onOpenDraftPicks}
                    icon={<Shuffle className="w-4 h-4" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                )}
              </div>
            }
          />

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <SectionTitle
                title="Chores schedule"
                subtitle="Equitably distributed across your apartment"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewChoreModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                New chore
              </Button>
            </div>

            <div className="flex gap-2 p-1.5 rounded-2xl bg-[#E6E8EE]/70 max-w-md">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setScheduleFilter('my');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-[13px] sm:text-[14px] font-heading font-black whitespace-nowrap transition-all cursor-pointer ${
                  scheduleFilter === 'my'
                    ? 'bg-white text-[#1F2430] shadow-sm'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                My tasks ({myAssignments.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setScheduleFilter('all');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-[13px] sm:text-[14px] font-heading font-black whitespace-nowrap transition-all cursor-pointer ${
                  scheduleFilter === 'all'
                    ? 'bg-white text-[#1F2430] shadow-sm'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                All chores ({assignments.length})
              </button>
            </div>
          </div>

          {chores.length === 0 && (
            <EmptyState
              title="No chores in rotation"
              description="Add household chores like kitchen cleaning, bathroom, or trash to start the rotation."
              mascotState="calm"
              bubbleText="Add your first chore!"
              actionLabel="Add chore"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={() => setNewChoreModalOpen(true)}
            />
          )}

          <ChoreAssignmentList
            todayDueAssignments={todayDueAssignments}
            todayCompletedAssignments={todayCompletedAssignments}
            chores={chores}
            roommates={roommates}
            currentUser={currentUser}
            onSelectDoneChore={setDoneModalChore}
            onSelectSwapChore={setSwapModalChore}
            onSelectKudos={setKudosModalData}
          />
        </div>

        <div className="w-full lg:col-span-5 self-start h-fit mt-6 lg:mt-0 lg:sticky lg:top-0">
          <ChoresSidebar
            roommates={roommates}
            currentUser={currentUser}
            chores={chores}
            onSelectKudos={setKudosModalData}
            onOpenAwayModal={() => setAwayModalOpen(true)}
          />
        </div>
      </div>

      <NewChoreModal
        isOpen={newChoreModalOpen}
        onClose={() => setNewChoreModalOpen(false)}
        onAddChore={onAddChore}
      />

      <DoneFlowModal
        isOpen={Boolean(doneModalChore)}
        onClose={() => setDoneModalChore(null)}
        chore={doneModalChore}
        currentUser={currentUser}
        onComplete={onCompleteChore}
      />

      <KudosModal
        isOpen={Boolean(kudosModalData)}
        onClose={() => setKudosModalData(null)}
        chore={kudosModalData?.chore || null}
        targetUser={kudosModalData?.target || null}
        onGiveKudos={onGiveKudos}
      />

      <ChoreSwapModal
        isOpen={Boolean(swapModalChore)}
        onClose={() => setSwapModalChore(null)}
        chore={swapModalChore}
        roommates={roommates.filter((r) => r.id !== currentUser.id)}
        onSwap={onSwapChore}
      />

      <AwayModeModal
        isOpen={awayModalOpen}
        onClose={() => setAwayModalOpen(false)}
        isAway={Boolean(currentUser.awayUntil)}
        onSetAway={onSetAway}
      />
    </div>
  );
};
