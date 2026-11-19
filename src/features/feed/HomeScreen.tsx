import React, { useState, useEffect, useMemo } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { MascotView } from '../../components/common/MascotView';
import { Chip } from '../../components/common/Chip';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
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
  MascotState,
  CulturalDinner,
  DietaryTag,
  ShoppingItem,
  ShoppingItemCategory,
  ShoppingItemStatus,
} from '../../types';
import { DutyTodayBanner } from '../chores/DutyTodayBanner';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { useToast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { localCache } from '../../services/localCache';
import { Icon } from '@iconify/react';
import {
  CheckCircle,
  UserPlus,
  ArrowsClockwise,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { isAssignmentDueToday, getChoreDraftState, getCurrencySymbol } from '../../utils/stateTable';
import { evaluateWeeklyAwards } from '../../utils/awards';
import { ActivityTimelineSection } from './components/ActivityTimelineSection';
import { HomeSidebar } from './components/HomeSidebar';
import { WeeklyAwardsSection } from './components/WeeklyAwardsSection';
import { ApartmentPulseGrid } from './components/ApartmentPulseGrid';
import { useFeatureFlag } from '../../config/featureFlags';
import { useI18n } from '../../i18n/I18nProvider';
import { getLocalizedGreeting, localizeChoreDraftState } from '../../i18n/helpers';

const DoneFlowModal = React.lazy(() =>
  import('../chores/DoneFlowModal').then((m) => ({ default: m.DoneFlowModal }))
);
const VibeCheckModal = React.lazy(() =>
  import('./components/VibeCheckModal').then((m) => ({ default: m.VibeCheckModal }))
);
const RoomieWrappedModal = React.lazy(() =>
  import('./components/RoomieWrappedModal').then((m) => ({ default: m.RoomieWrappedModal }))
);
const CulturalDinnerModal = React.lazy(() =>
  import('./components/CulturalDinnerModal').then((m) => ({ default: m.CulturalDinnerModal }))
);
const ShoppingListModal = React.lazy(() =>
  import('../shopping/ShoppingListModal').then((m) => ({ default: m.ShoppingListModal }))
);

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
  expenses = [],
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
  const { t } = useI18n();
  const [doneChoreModalTarget, setDoneChoreModalTarget] = useState<Chore | null>(null);
  const [vibeSummary, setVibeSummary] = useState<HouseholdVibeSummary | undefined>(
    () => localCache.getSnapshot(household?.id)?.vibeSummary
  );
  const awards: WeeklyAward[] = useMemo(() => {
    const activeUsers = roommates.length > 0 ? roommates : [currentUser];
    const assignments = draftRound?.assignments || [];
    const kudos = assignments.flatMap((a) => a.kudos || []);
    return evaluateWeeklyAwards({
      householdId: household?.id || '',
      weekLabel: 'Weekly Honors',
      users: activeUsers,
      assignments,
      kudos,
      expenses: expenses || [],
    });
  }, [household?.id, roommates, currentUser, draftRound?.assignments, expenses]);
  const [pendingSwaps, setPendingSwaps] = useState<ChoreSwapRequest[]>(
    () => localCache.getSnapshot(household?.id)?.pendingSwaps || []
  );
  const [culturalDinners, setCulturalDinners] = useState<CulturalDinner[]>(
    () => localCache.getSnapshot(household?.id)?.culturalDinners || []
  );
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(
    () => localCache.getSnapshot(household?.id)?.shoppingItems || []
  );
  const [isVibeModalOpen, setIsVibeModalOpen] = useState(false);
  const [isWrappedModalOpen, setIsWrappedModalOpen] = useState(false);
  const [isDinnerModalOpen, setIsDinnerModalOpen] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const isCulturalDinnersEnabled = useFeatureFlag('culturalDinnersBeta');
  const isRoomieWrappedEnabled = useFeatureFlag('roomieWrappedBeta');
  const [mascotReaction, setMascotReaction] = useState<{
    state: MascotState;
    bubbleText: string;
  } | null>(null);

  const triggerMascotReaction = (state: MascotState, bubbleText: string) => {
    setMascotReaction({ state, bubbleText });
  };

  useEffect(() => {
    if (!mascotReaction) return;
    const timer = window.setTimeout(() => {
      setMascotReaction(null);
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [mascotReaction]);

  useEffect(() => {
    if (household?.id) {
      const snap = localCache.getSnapshot(household.id);
      if (snap) {
        setVibeSummary(snap.vibeSummary);
        setPendingSwaps(snap.pendingSwaps);
        if (snap.culturalDinners) {
          setCulturalDinners(snap.culturalDinners);
        }
        if (snap.shoppingItems) {
          setShoppingItems(snap.shoppingItems);
        }
      }
      api.getVibeSummary(household.id).then(setVibeSummary).catch(() => {});
      api.social.getCulturalDinners(household.id).then(setCulturalDinners).catch(() => {});
      api.shopping.getShoppingItems(household.id).then(setShoppingItems).catch(() => {});
      api.getSwapRequests(household.id).then((reqs) => {
        const incoming = reqs.filter(
          (r) => r.targetUserId === currentUser.id && r.status === 'pending'
        );
        setPendingSwaps(incoming);
      }).catch(() => {});
    }
  }, [household?.id, currentUser.id]);

  const handleVibeSubmit = async (rating: VibeRating) => {
    if (rating === 'stressed' || rating === 'down') {
      triggerMascotReaction('calm', 'Taking it easy today — we got you!');
    } else if (rating === 'fire' || rating === 'chill') {
      triggerMascotReaction('celebrating', 'Love that energy! Vibe recorded!');
    } else {
      triggerMascotReaction('cheering', 'Thanks for checking in with the flat!');
    }
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

  const handleToggleDinnerRsvp = async (dinnerId: string) => {
    try {
      const res = await api.social.toggleDinnerRsvp(dinnerId, household.id);
      if (res.success) {
        setCulturalDinners((prev) =>
          prev.map((d) => (d.id === dinnerId ? { ...d, rsvpUserIds: res.rsvpUserIds } : d))
        );
        triggerMascotReaction('cheering', res.isAttending ? "You're in for dinner!" : 'RSVP updated!');
        showToast(res.isAttending ? "You're attending dinner!" : 'RSVP updated', 'success');
      }
    } catch {
      showToast('Failed to update dinner RSVP', 'error');
    }
  };

  const handleScheduleDinner = async (params: {
    dishTitle: string;
    cuisineTag: string;
    scheduledDate: string;
    dietaryTags: DietaryTag[];
  }) => {
    const res = await api.social.scheduleCulturalDinner({
      ...params,
      householdId: household.id,
    });
    if (res.success && res.dinner) {
      setCulturalDinners((prev) => [res.dinner!, ...prev]);
      triggerMascotReaction('celebrating', 'Dinner announced! Smells delicious!');
      showToast(`Cultural dinner scheduled: ${res.dinner.dishTitle}!`, 'success');
    } else {
      showToast(res.error || 'Failed to schedule dinner', 'error');
    }
  };

  const handleUpdateDietaryPreferences = async (tags: DietaryTag[]) => {
    await api.social.updateUserDietaryPreferences(tags);
    triggerMascotReaction('calm', 'Dietary preferences updated!');
    showToast('Dietary preferences updated!', 'success');
  };

  const handleAddShoppingItem = async (params: {
    title: string;
    category: ShoppingItemCategory;
    quantityLabel?: string;
    isLow?: boolean;
  }) => {
    try {
      const res = await api.shopping.addShoppingItem({
        ...params,
        householdId: household.id,
      });
      if (res.success && res.item) {
        setShoppingItems((prev) => [res.item!, ...prev]);
        sound.tokenClink();
        haptics.tokenClink();
        triggerMascotReaction('cheering', `Added ${params.title} to the shopping list!`);
        showToast(`Added ${params.title} to list`, 'success');
      } else {
        showToast(res.error || 'Failed to add item', 'error');
      }
    } catch {
      showToast('Failed to add shopping item', 'error');
    }
  };

  const handleToggleShoppingStatus = async (
    itemId: string,
    newStatus: ShoppingItemStatus
  ) => {
    try {
      const res = await api.shopping.toggleShoppingItemStatus(itemId, newStatus, household.id);
      if (res.success && res.item) {
        setShoppingItems((prev) =>
          prev.map((i) => (i.id === itemId ? res.item! : i))
        );
        sound.playTap();
        haptics.light();
      }
    } catch {
      showToast('Failed to update item status', 'error');
    }
  };

  const handleDeleteShoppingItem = async (itemId: string) => {
    try {
      const res = await api.shopping.deleteShoppingItem(itemId, household.id);
      if (res.success) {
        setShoppingItems((prev) => prev.filter((i) => i.id !== itemId));
        sound.softReject();
        showToast('Shopping item removed', 'info');
      }
    } catch {
      showToast('Failed to delete item', 'error');
    }
  };

  const handleTriggerSupermarketPing = async () => {
    try {
      const res = await api.shopping.triggerSupermarketPing(household.id);
      if (res.success) {
        sound.playSuccess();
        haptics.swapAccept();
        triggerMascotReaction('celebrating', 'Supermarket ping sent to roomies!');
        showToast('Pinged roomies! Let them know to add items.', 'success');
      }
    } catch {
      showToast('Failed to send supermarket ping', 'error');
    }
  };

  const handleConvertCartToExpense = async (cartItems: ShoppingItem[]) => {
    try {
      const res = await api.shopping.convertCartToExpense(
        cartItems.map((i) => i.id),
        household.id
      );
      if (res.success) {
        setShoppingItems((prev) =>
          prev.map((i) =>
            cartItems.some((c) => c.id === i.id) ? { ...i, status: 'bought' as ShoppingItemStatus } : i
          )
        );
        sound.swapAccept();
        haptics.swapAccept();
        setIsShoppingModalOpen(false);
        if (onOpenExpensesAction) {
          onOpenExpensesAction('add');
        }
        showToast(`Converted ${cartItems.length} items to pending expense!`, 'reward');
      }
    } catch {
      showToast('Failed to convert cart to expense', 'error');
    }
  };

  const sym = getCurrencySymbol(household?.currency);
  const rawChoreDraftState = getChoreDraftState(draftRound, currentUser.id);
  const choreDraftState = localizeChoreDraftState(rawChoreDraftState, t);
  const homeCount = roommates.filter((r) => r.isHome).length;
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const myTodayAssignment = assignments.find(
    (a) => a.userId === currentUser.id && isAssignmentDueToday(a) && !a.completedToday
  );
  const myTodayChore = myTodayAssignment
    ? chores.find((c) => c.id === myTodayAssignment.choreId)
    : null;

  return (
    <div className="w-full select-none pb-28 md:pb-8">
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <div className="w-full lg:col-span-8 self-start space-y-5">
          {/* ZONE 1 — Hero & Inline Roomie Presence */}
          <InfoCard
            tint="coral"
            padding="lg"
            className="bg-linear-to-br from-[#FFF5F2] via-[#FFFFFF] to-[#FFF8E6] border-2 border-[#FFD3C9]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-heading font-black text-[#1F2430] leading-snug">
                    {getLocalizedGreeting(
                      new Date().getHours(),
                      currentUser.name.split(' ')[0],
                      t
                    )}
                  </h2>
                  <p className="text-sm sm:text-base font-semibold text-[#475569]">
                    {t('home.flatAtAGlance')}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-[#64748B]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#1F2430] whitespace-nowrap">
                      <Icon icon="fluent-emoji-flat:fire" className="w-4 h-4 shrink-0" />
                      <AnimatedNumber value={currentUser.streakDays} />{' '}
                      <span>{t('home.dayStreak', { count: '' }).trim()}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium whitespace-nowrap">
                      <AnimatedNumber value={currentUser.points} />{' '}
                      <span>{t('home.pts', { count: '' }).trim()}</span>
                    </span>
                    {/* 1-Tap Quick Presence Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        sound.playPop();
                        onToggleHomeStatus();
                        triggerMascotReaction(
                          currentUser.isHome ? 'calm' : 'cheering',
                          currentUser.isHome ? t('home.away') : t('home.imHome')
                        );
                        showToast(currentUser.isHome ? t('home.away') : t('home.imHome'), 'info');
                      }}
                      className={`btn-tactile ease-spring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer border-2 ${
                        currentUser.isHome
                          ? 'bg-[#E6FAF8] text-[#138E82] border-[#19B5A5]/40 shadow-2xs'
                          : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${currentUser.isHome ? 'bg-[#19B5A5] animate-pulse' : 'bg-[#94A3B8]'}`} />
                      <span>{currentUser.isHome ? t('home.imHome') : t('home.away')}</span>
                    </button>
                  </div>
                </div>

                <div className="shrink-0 pt-2 self-center flex items-center justify-center">
                  <MascotView
                    state={mascotReaction?.state || 'idle'}
                    size="md"
                    bubbleText={mascotReaction?.bubbleText || 'Good day, roomie!'}
                  />
                </div>
              </div>

              {/* Inline Roommate Presence Footer */}
              <div className="pt-3 border-t border-[#FFD3C9]/70 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {roommates.map((r) => (
                      <span
                        key={r.id}
                        title={`${r.name} (${r.isHome ? 'Home' : 'Away'})`}
                        className={`relative inline-block w-6 h-6 rounded-full border-2 border-white ring-1 transition-all ${
                          r.isHome ? 'ring-[#19B5A5] z-10' : 'ring-[#CBD5E1] opacity-50'
                        }`}
                      >
                        <img
                          src={r.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.name}`}
                          alt={r.name}
                          className="w-full h-full rounded-full object-cover bg-white"
                        />
                        {r.isHome && (
                          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-[#19B5A5] ring-1 ring-white" />
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#475569]">
                    {t('home.atHomeCount', { home: homeCount, total: roommates.length })}
                  </span>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* ZONE 2 — Single Contextual Action Spotlight */}
          {pendingSwaps.length > 0 && (
            <ActionCard
              tint="amber"
              iconTile={<IconTile icon={<ArrowsLeftRight className="w-6 h-6" />} color="amber" size="md" />}
              title={`${
                roommates.find((r) => r.id === pendingSwaps[0].requesterUserId)?.name.split(' ')[0] || 'Roommate'
              } offered a chore swap!`}
              subtitle={
                <span className="inline-flex items-center gap-1">
                  <span>Wants to trade &quot;{pendingSwaps[0].requesterChoreName}&quot; (+{pendingSwaps[0].tokenCost}</span>
                  <Icon icon="fluent-emoji-flat:coin" className="w-3.5 h-3.5 inline shrink-0" />
                  <span>)</span>
                </span>
              }
              detail={
                pendingSwaps[0].note ? (
                  <span className="text-xs text-[#854D0E] italic font-medium">&quot;{pendingSwaps[0].note}&quot;</span>
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
                          triggerMascotReaction('cheering', 'Teamwork makes the flat shine!');
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
                      haptics.tokenClink();
                      onSelectJoinRequest(pendingJoinRequests[0]);
                    }}
                    icon={<UserPlus className="w-4 h-4" />}
                  >
                    Review & Approve Request
                  </Button>
                </div>
              }
            />
          )}

          {choreDraftState.state !== 'reveal_done' ? (
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
              badge={
                <Chip
                  status="pending"
                  label={choreDraftState.badgeLabel}
                  size="sm"
                />
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
          ) : dutySchedule ? (
            <DutyTodayBanner
              dutySchedule={dutySchedule}
              roommates={roommates}
              currentUser={currentUser}
              onOpenTimetable={onOpenTimetable || (() => onNavigateTab('chores'))}
              onCompleteTodayDuty={onCompleteTodayDuty}
            />
          ) : myTodayChore ? (
            <ActionCard
              tint="teal"
              className="contain-content"
              iconTile={
                <IconTile icon={<Icon icon="fluent-emoji-flat:broom" className="w-6 h-6" />} color="teal" size="md" />
              }
              title={myTodayChore.name}
              subtitle={`${myTodayChore.frequency === 'daily' ? 'Daily' : 'Weekly'} · ${
                myTodayChore.effortLevel.charAt(0).toUpperCase() + myTodayChore.effortLevel.slice(1)
              } · ${myTodayAssignment?.scheduledTime || 'Today'}`}
              detail={
                <span className="type-secondary text-[#19B5A5] font-bold text-[14px]">
                  Earn +{((myTodayChore.effortLevel === 'heavy' ? 3 : myTodayChore.effortLevel === 'medium' ? 2 : 1) * 10)} streak points
                </span>
              }
              actions={
                <div className="w-full flex gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    onClick={() => onNavigateTab('chores')}
                  >
                    {t('draft.doneAction')}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={() => {
                      sound.playTap();
                      setDoneChoreModalTarget(myTodayChore);
                    }}
                    icon={<CheckCircle weight="fill" className="w-4 h-4" />}
                  >
                    {t('chores.markDone')}
                  </Button>
                </div>
              }
            />
          ) : (
            <ActionCard
              tint="teal"
              className="contain-content"
              iconTile={
                <IconTile icon={<Icon icon="fluent-emoji-flat:trophy" className="w-6 h-6" />} color="teal" size="md" />
              }
              title="All chores done"
              subtitle="Kitchen and living area are clean"
              detail={
                <span className="type-secondary text-[#19B5A5] font-bold text-[14px]">
                  Streak protected for today
                </span>
              }
              actions={
                <div className="w-full">
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => onNavigateTab('chores')}
                  >
                    View chore schedule
                  </Button>
                </div>
              }
            />
          )}

          {/* ZONE 3 — 2x2 "Apartment Pulse" Bento Grid */}
          <ApartmentPulseGrid
            netBalance={netBalance}
            currencySymbol={sym}
            onNavigateMoney={() => onNavigateTab('expenses')}
            shoppingItems={shoppingItems}
            onOpenShoppingList={() => setIsShoppingModalOpen(true)}
            onTriggerSupermarketPing={handleTriggerSupermarketPing}
            vibeSummary={vibeSummary}
            totalRoommates={roommates.length}
            onOpenVibeCheck={() => setIsVibeModalOpen(true)}
            isCulturalDinnersEnabled={isCulturalDinnersEnabled}
            culturalDinner={culturalDinners[0] || null}
            onOpenCulturalDinner={() => setIsDinnerModalOpen(true)}
          />

          {/* ZONE 4 — Compact Flat Celebrations */}
          <WeeklyAwardsSection
            awards={awards}
            currentUserId={currentUser.id}
            isRoomieWrappedEnabled={isRoomieWrappedEnabled}
            onOpenWrapped={() => setIsWrappedModalOpen(true)}
            reducedMotion={reducedMotion}
          />

          {/* ZONE 5 — Lightweight Recent Activity */}
          <ActivityTimelineSection
            activityMessages={activityMessages}
            householdName={household?.name}
            onNavigateTab={onNavigateTab}
            onOpenChoreReveal={onOpenChoreReveal}
            onSelectExpense={onSelectExpense}
          />
        </div>

        {/* Desktop Sidebar (hidden on mobile to eliminate redundant Presence card) */}
        <div className="hidden lg:block w-full lg:col-span-4 self-start h-fit mt-6 lg:mt-0 lg:sticky lg:top-24">
          <HomeSidebar
            roommates={roommates}
            currentUser={currentUser}
            choreDraftState={choreDraftState}
            onToggleHomeStatus={onToggleHomeStatus}
            onNavigateTab={onNavigateTab}
            onOpenExpensesAction={onOpenExpensesAction}
            onOpenShoppingList={() => setIsShoppingModalOpen(true)}
            onOpenChoreReveal={onOpenChoreReveal}
            onOpenDraftPicks={onOpenDraftPicks}
          />
        </div>
      </div>

      <React.Suspense fallback={null}>
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
              triggerMascotReaction('celebrating', 'Sparkling clean! Streak +1!');
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
            memberCount={roommates.length}
          />
        )}

        {isCulturalDinnersEnabled && isDinnerModalOpen && (
          <CulturalDinnerModal
            isOpen={isDinnerModalOpen}
            onClose={() => setIsDinnerModalOpen(false)}
            currentUser={currentUser}
            roommates={roommates}
            onScheduleDinner={handleScheduleDinner}
            onUpdateDietaryPreferences={handleUpdateDietaryPreferences}
          />
        )}

        {isRoomieWrappedEnabled && isWrappedModalOpen && (
          <RoomieWrappedModal
            isOpen={isWrappedModalOpen}
            onClose={() => setIsWrappedModalOpen(false)}
            householdName={household?.name}
            semesterLabel="Fall Semester 2026"
            roommates={roommates}
            assignments={assignments}
            chores={chores}
            expenses={expenses}
            awards={awards}
            culturalDinners={culturalDinners}
            vibeSummary={vibeSummary}
          />
        )}

        {isShoppingModalOpen && (
          <ShoppingListModal
            isOpen={isShoppingModalOpen}
            onClose={() => setIsShoppingModalOpen(false)}
            items={shoppingItems}
            onAddItem={async (params) => {
              await handleAddShoppingItem(params);
            }}
            onToggleItemStatus={handleToggleShoppingStatus}
            onDeleteItem={handleDeleteShoppingItem}
            onConvertCartToExpense={handleConvertCartToExpense}
          />
        )}
      </React.Suspense>
    </div>
  );
};
