import React, { useState, useEffect } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { MascotView } from '../../components/common/MascotView';
import { DoneFlowModal } from '../chores/DoneFlowModal';
import {
  User,
  Household,
  Chore,
  ChoreAssignment,
  DraftRound,
  Expense,
  ChatMessage,
  JoinRequest,
  KudosType,
  DutySchedule,
  DayOfWeek,
  WeeklyAward,
  HouseholdVibeSummary,
  VibeRating,
  ChoreSwapRequest,
} from '../../types';
import { DutyTodayBanner } from '../chores/DutyTodayBanner';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { useToast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { Icon } from '@iconify/react';
import {
  CheckCircle,
  UserPlus,
  ArrowsClockwise,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { isAssignmentDueToday, getChoreDraftState, getCurrencySymbol } from '../../utils/stateTable';
import { DailyFocusSection } from './components/DailyFocusSection';
import { ActivityTimelineSection } from './components/ActivityTimelineSection';
import { HomeSidebar } from './components/HomeSidebar';
import { WeeklyAwardsSection } from './components/WeeklyAwardsSection';
import { VibeCheckWidget } from './components/VibeCheckWidget';
import { VibeCheckModal } from './components/VibeCheckModal';

interface HomeScreenProps {
  currentUser: User;
  household: Household;
  roommates: User[];
  chores: Chore[];
  assignments: ChoreAssignment[];
  draftRound?: DraftRound | null;
  expenses: Expense[];
  activityMessages: ChatMessage[];
  pendingJoinRequests: JoinRequest[];
  netBalance: number;
  dutySchedule?: DutySchedule | null;
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onOpenChoreReveal: () => void;
  onOpenDraftPicks: () => void;
  onOpenTimetable?: () => void;
  onCompleteTodayDuty?: (day: DayOfWeek) => Promise<void>;
  onSelectExpense: (expenseId: string) => void;
  onSelectJoinRequest: (req: JoinRequest) => void;
  onToggleHomeStatus: () => void;
  onCompleteChore?: (choreId: string, photoUrl?: string) => Promise<void>;
  onGiveKudos?: (choreId: string, targetUserId: string, type: KudosType, note?: string) => Promise<void>;
  onOpenExpensesAction?: (action: 'add' | 'settle' | 'confirm') => void;
  onRemindRoomies?: () => Promise<void>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  household,
  roommates,
  chores,
  assignments,
  draftRound,
  activityMessages,
  pendingJoinRequests,
  netBalance,
  dutySchedule,
  onNavigateTab,
  onOpenChoreReveal,
  onOpenDraftPicks,
  onOpenTimetable,
  onCompleteTodayDuty,
  onSelectExpense,
  onSelectJoinRequest,
  onToggleHomeStatus,
  onCompleteChore,
  onOpenExpensesAction,
  onRemindRoomies,
}) => {
  const { showToast } = useToast();
  const [doneChoreModalTarget, setDoneChoreModalTarget] = useState<Chore | null>(null);
  const [vibeSummary, setVibeSummary] = useState<HouseholdVibeSummary | undefined>(undefined);
  const [awards, setAwards] = useState<WeeklyAward[]>([]);
  const [pendingSwaps, setPendingSwaps] = useState<ChoreSwapRequest[]>([]);
  const [isVibeModalOpen, setIsVibeModalOpen] = useState(false);

  useEffect(() => {
    if (household?.id) {
      api.getVibeSummary(household.id).then(setVibeSummary).catch(() => {});
      api.getWeeklyAwards(household.id).then(setAwards).catch(() => {});
      api.getSwapRequests(household.id).then((reqs) => {
        const incoming = reqs.filter(
          (r) => r.targetUserId === currentUser.id && r.status === 'pending'
        );
        setPendingSwaps(incoming);
      }).catch(() => {});
    }
  }, [household?.id, currentUser.id]);

  const handleVibeSubmit = async (rating: VibeRating) => {
    try {
      const updated = await api.submitVibeCheck(rating, household.id);
      setVibeSummary(updated);
      showToast(
        updated.revealed
          ? `Vibe pulse unlocked! Flat average: ${updated.averageScore} / 5`
          : 'Vibe check recorded anonymously! Waiting on roomies.',
        'success'
      );
    } catch {
      showToast('Could not record vibe check', 'error');
    }
  };

  const sym = getCurrencySymbol(household?.currency);
  const choreDraftState = getChoreDraftState(draftRound, currentUser.id);

  const myTodayAssignment = assignments.find(
    (a) => a.userId === currentUser.id && isAssignmentDueToday(a) && !a.completedToday
  );
  const myTodayChore = myTodayAssignment
    ? chores.find((c) => c.id === myTodayAssignment.choreId)
    : null;

  return (
    <div className="w-full select-none pb-28 md:pb-8">
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <div className="w-full lg:col-span-8 self-start space-y-6">
          <InfoCard
            tint="coral"
            padding="lg"
            className="bg-linear-to-br from-[#FFF5F2] via-[#FFFFFF] to-[#FFF8E6] border-2 border-[#FFD3C9]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <h2 className="text-2xl sm:text-3xl font-heading font-black text-[#1F2430] leading-snug">
                  Hey, {currentUser.name.split(' ')[0]}!
                </h2>
                <p className="text-base font-semibold text-[#475569]">
                  Keeping your apartment running peacefully today.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-[#64748B]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#1F2430] whitespace-nowrap">
                    <Icon icon="fluent-emoji-flat:fire" className="w-4 h-4 shrink-0" />
                    {currentUser.streakDays} day streak
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium whitespace-nowrap">
                    {currentUser.points} pts
                  </span>
                  <span aria-hidden="true">·</span>
                  {/* 1-Tap Quick Presence Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playPop();
                      onToggleHomeStatus();
                      showToast(currentUser.isHome ? 'Status: Out of the flat' : 'Status: You are Home 🏠', 'info');
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer active:scale-95 border-2 ${
                      currentUser.isHome
                        ? 'bg-[#E6FAF8] text-[#138E82] border-[#19B5A5]/40 shadow-2xs'
                        : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
                    }`}
                    title="Tap to toggle if you are at home or out"
                  >
                    <span className={`w-2 h-2 rounded-full ${currentUser.isHome ? 'bg-[#19B5A5] animate-pulse' : 'bg-[#94A3B8]'}`} />
                    <span>{currentUser.isHome ? 'I\'m Home' : 'Out'}</span>
                  </button>
                </div>
              </div>

              <div className="shrink-0 hidden sm:block">
                <MascotView state="idle" size="lg" bubbleText="Good day, roomie!" />
              </div>
            </div>
          </InfoCard>

          <DutyTodayBanner
            dutySchedule={dutySchedule || null}
            roommates={roommates}
            currentUser={currentUser}
            onOpenTimetable={onOpenTimetable || (() => onNavigateTab('chores'))}
            onCompleteTodayDuty={onCompleteTodayDuty}
          />

          {/* Phase 2: Anonymous Household Vibe Check Widget */}
          <VibeCheckWidget
            summary={vibeSummary}
            totalRoommates={roommates.length}
            onOpenCheckIn={() => setIsVibeModalOpen(true)}
          />

          {/* Phase 2: Inbound Chore Swap Offer Card */}
          {pendingSwaps.length > 0 && (
            <ActionCard
              tint="amber"
              iconTile={<IconTile icon={<ArrowsLeftRight className="w-6 h-6" />} color="amber" size="md" />}
              title={`${
                roommates.find((r) => r.id === pendingSwaps[0].requesterUserId)?.name.split(' ')[0] || 'Roommate'
              } offered a chore swap!`}
              subtitle={
                <span className="inline-flex items-center gap-1">
                  <span>Wants to trade "{pendingSwaps[0].requesterChoreName}" (+{pendingSwaps[0].tokenCost}</span>
                  <Icon icon="fluent-emoji-flat:coin" className="w-3.5 h-3.5 inline shrink-0" />
                  <span>)</span>
                </span>
              }
              detail={
                pendingSwaps[0].note ? (
                  <span className="text-xs text-[#854D0E] italic font-medium">"{pendingSwaps[0].note}"</span>
                ) : undefined
              }
              actions={
                <div className="w-full flex gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    className="flex-1"
                    onClick={async () => {
                      haptics.softReject();
                      sound.softReject();
                      try {
                        const res = await api.resolveSwapRequest(pendingSwaps[0].id, 'decline');
                        if (res.success) {
                          setPendingSwaps((prev) => prev.slice(1));
                          showToast('Chore swap offer declined', 'info');
                        } else {
                          showToast('Failed to decline swap offer', 'error');
                        }
                      } catch {
                        showToast('Failed to decline swap offer', 'error');
                      }
                    }}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="reward"
                    size="md"
                    className="flex-1"
                    onClick={async () => {
                      try {
                        const res = await api.resolveSwapRequest(pendingSwaps[0].id, 'accept');
                        if (res.success) {
                          haptics.swapAccept();
                          sound.swapAccept();
                          setPendingSwaps((prev) => prev.slice(1));
                          showToast(
                            `Chore swap accepted! You earned ${pendingSwaps[0].tokenCost} Favor Token`,
                            'reward'
                          );
                        } else {
                          haptics.softReject();
                          sound.softReject();
                          showToast('Could not accept swap: Requester no longer has enough tokens', 'error');
                        }
                      } catch {
                        showToast('Could not accept swap request', 'error');
                      }
                    }}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <span>Accept (+{pendingSwaps[0].tokenCost}</span>
                      <Icon icon="fluent-emoji-flat:coin" className="w-3.5 h-3.5 inline shrink-0" />
                      <span>)</span>
                    </span>
                  </Button>
                </div>
              }
            />
          )}

          {pendingJoinRequests.length > 0 && (
            <ActionCard
              tint="indigo"
              iconTile={<IconTile icon={<UserPlus className="w-6 h-6" />} color="indigo" size="md" />}
              title={`${pendingJoinRequests[0].userName} wants to join your apartment!`}
              subtitle="Doorkeeper approval needed to confirm access"
              detail={
                <span className="text-sm text-[#5B5BD6] font-bold">
                  Roomies are voting: {pendingJoinRequests[0].votes?.length || 0}{' '}
                  {(pendingJoinRequests[0].votes?.length || 0) === 1 ? 'vote' : 'votes'} recorded
                </span>
              }
              actions={
                <div className="w-full">
                  <Button
                    variant="indigo"
                    size="md"
                    fullWidth
                    onClick={() => {
                      sound.playTap();
                      onSelectJoinRequest(pendingJoinRequests[0]);
                    }}
                    icon={<UserPlus className="w-4 h-4" />}
                  >
                    Review & Decide Request
                  </Button>
                </div>
              }
            />
          )}

          {choreDraftState.state !== 'reveal_done' && (
            <ActionCard
              tint={choreDraftState.state === 'reveal_ready' ? 'amber' : 'indigo'}
              iconTile={
                <IconTile
                  icon={
                    choreDraftState.state === 'reveal_ready' ? (
                      <CheckCircle weight="duotone" className="w-6 h-6" />
                    ) : (
                      <ArrowsClockwise weight="duotone" className="w-6 h-6" />
                    )
                  }
                  color={choreDraftState.state === 'reveal_ready' ? 'amber' : 'indigo'}
                  size="md"
                />
              }
              title={choreDraftState.bannerTitle}
              subtitle={choreDraftState.bannerSubtitle}
              detail={
                <span className="type-secondary font-bold text-[14px] text-[#5B5BD6]">
                  {choreDraftState.badgeLabel}
                </span>
              }
              actions={
                <div className="w-full">
                  <Button
                    variant={choreDraftState.state === 'reveal_ready' ? 'reward' : 'primary'}
                    size="md"
                    fullWidth
                    onClick={() => {
                      sound.playTap();
                      if (choreDraftState.state === 'reveal_ready') {
                        onOpenChoreReveal();
                      } else {
                        onOpenDraftPicks();
                      }
                    }}
                    icon={
                      choreDraftState.state === 'reveal_ready' ? (
                        <CheckCircle weight="fill" className="w-4 h-4" />
                      ) : (
                        <ArrowsClockwise weight="bold" className="w-4 h-4" />
                      )
                    }
                  >
                    {choreDraftState.actionLabel}
                  </Button>
                </div>
              }
            />
          )}

          <DailyFocusSection
            myTodayChore={myTodayChore}
            myTodayAssignment={myTodayAssignment}
            netBalance={netBalance}
            currencySymbol={sym}
            onSelectDoneChore={setDoneChoreModalTarget}
            onNavigateTab={onNavigateTab}
            onRemindRoomies={onRemindRoomies}
            onOpenExpensesAction={onOpenExpensesAction}
          />

          {/* Phase 2: Weekly Awards (Everyone Wins) */}
          <WeeklyAwardsSection
            awards={awards}
            currentUserId={currentUser.id}
            reducedMotion={
              typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
                : false
            }
          />

          <ActivityTimelineSection
            activityMessages={activityMessages}
            onNavigateTab={onNavigateTab}
            onOpenChoreReveal={onOpenChoreReveal}
            onSelectExpense={onSelectExpense}
          />
        </div>

        <div className="w-full lg:col-span-4 self-start h-fit mt-6 lg:mt-0 lg:sticky lg:top-0">
          <HomeSidebar
            roommates={roommates}
            currentUser={currentUser}
            choreDraftState={choreDraftState}
            onToggleHomeStatus={onToggleHomeStatus}
            onNavigateTab={onNavigateTab}
            onOpenExpensesAction={onOpenExpensesAction}
            onOpenChoreReveal={onOpenChoreReveal}
            onOpenDraftPicks={onOpenDraftPicks}
          />
        </div>
      </div>

      {doneChoreModalTarget && (
        <DoneFlowModal
          isOpen={Boolean(doneChoreModalTarget)}
          onClose={() => setDoneChoreModalTarget(null)}
          chore={doneChoreModalTarget}
          currentUser={currentUser}
          onComplete={async (choreId: string, photoUrl?: string) => {
            if (onCompleteChore) {
              await onCompleteChore(choreId, photoUrl);
            }
            setDoneChoreModalTarget(null);
            showToast('Chore marked as complete! Streak updated.', 'success');
          }}
        />
      )}

      {isVibeModalOpen && (
        <VibeCheckModal
          isOpen={isVibeModalOpen}
          onClose={() => setIsVibeModalOpen(false)}
          onSubmit={handleVibeSubmit}
        />
      )}
    </div>
  );
};
