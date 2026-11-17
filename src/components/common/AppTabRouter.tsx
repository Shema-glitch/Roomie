import React, { useMemo, useCallback, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from './Toast';
import { AppTab } from './AppHeaderAndNav';
import {
  User,
  Household,
  Membership,
  Chore,
  DraftRound,
  Expense,
  Settlement,
  ChatMessage,
  MeetingTopic,
  HouseAgreement,
  JoinRequest,
  DutySchedule,
  DayOfWeek,
  KudosType,
  ExpenseCategory,
} from '../../types';
import { NetBalance } from '../../utils/balances';
import { ScreenSkeleton } from './PageSkeletons';
import { HomeScreen } from '../../features/feed/HomeScreen';

const loadChoresScreen = () =>
  import('../../features/chores/ChoresScreen').then((m) => ({ default: m.ChoresScreen }));
const loadExpensesScreen = () =>
  import('../../features/expenses/ExpensesScreen').then((m) => ({ default: m.ExpensesScreen }));
const loadChatScreen = () =>
  import('../../features/chat/ChatScreen').then((m) => ({ default: m.ChatScreen }));
const loadApartmentScreen = () =>
  import('../../features/members/ApartmentScreen').then((m) => ({ default: m.ApartmentScreen }));

const ChoresScreen = React.lazy(loadChoresScreen);
const ExpensesScreen = React.lazy(loadExpensesScreen);
const ChatScreen = React.lazy(loadChatScreen);
const ApartmentScreen = React.lazy(loadApartmentScreen);

/**
 * Prefetches secondary tab chunks during browser idle time (`requestIdleCallback`
 * with a 1000ms `setTimeout` fallback) after HomeScreen mounts so tab switches
 * complete in a single frame (<16ms).
 */
export function prefetchSecondaryTabChunks(): () => void {
  if (typeof window === 'undefined') return () => {};
  const runPrefetch = () => {
    void loadChoresScreen();
    void loadExpensesScreen();
    void loadApartmentScreen();
    void loadChatScreen();
  };

  if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(runPrefetch, { timeout: 1500 });
    return () => {
      if ('cancelIdleCallback' in window && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
    };
  }

  const timerId = window.setTimeout(runPrefetch, 1000);
  return () => window.clearTimeout(timerId);
}

interface AppTabRouterProps {
  activeTab: AppTab;
  currentUser: User;
  activeHousehold: Household;
  members: { user: User; membership: Membership }[];
  chores: Chore[];
  draftRound: DraftRound;
  expenses: Expense[];
  settlements: Settlement[];
  messages: ChatMessage[];
  topics: MeetingTopic[];
  agreements: HouseAgreement[];
  joinRequests: JoinRequest[];
  dutySchedule: DutySchedule | null;
  balances: {
    userSummaries: Record<string, number>;
    simplifiedDebts: NetBalance[];
  };
  selectedExpenseId: string | null;
  selectedExpenseAction: 'add' | 'settle' | 'confirm' | null;
  setActiveTab: (tab: AppTab) => void;
  setDraftFlowState: (state: 'none' | 'picking' | 'waiting' | 'reveal') => void;
  setDutyTimetableOpen: (open: boolean) => void;
  setSelectedExpenseId: (id: string | null) => void;
  setSelectedExpenseAction: (action: 'add' | 'settle' | 'confirm' | null) => void;
  setReviewJoinRequest: (req: JoinRequest | null) => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setShowQROpen: (open: boolean) => void;
  setHouseholdSwitcherOpen: (open: boolean) => void;
  setShowOnboarding: (open: boolean) => void;
  loadData: () => Promise<void>;
}

export const AppTabRouter: React.FC<AppTabRouterProps> = React.memo(
  ({
    activeTab,
    currentUser,
    activeHousehold,
    members,
    chores,
    draftRound,
    expenses,
    settlements,
    messages,
    topics,
    agreements,
    joinRequests,
    dutySchedule,
    balances,
    selectedExpenseId,
    selectedExpenseAction,
    setActiveTab,
    setDraftFlowState,
    setDutyTimetableOpen,
    setSelectedExpenseId,
    setSelectedExpenseAction,
    setReviewJoinRequest,
    setCurrentUser,
    setShowQROpen,
    setHouseholdSwitcherOpen,
    setShowOnboarding,
    loadData,
  }) => {
    const { showToast } = useToast();
    const roommatesList = useMemo(() => members.map((m) => m.user), [members]);

    useEffect(() => {
      return prefetchSecondaryTabChunks();
    }, []);
    const pendingJoinRequests = useMemo(
      () => joinRequests.filter((r) => r.status === 'pending'),
      [joinRequests]
    );
    const myNetBalance = balances.userSummaries[currentUser.id] || 0;

    const handleOpenChoreReveal = useCallback(() => setDraftFlowState('reveal'), [setDraftFlowState]);
    const handleOpenDraftPicks = useCallback(() => setDraftFlowState('picking'), [setDraftFlowState]);
    const handleOpenTimetable = useCallback(() => setDutyTimetableOpen(true), [setDutyTimetableOpen]);
    const handleCompleteTodayDuty = useCallback(
      async (day: DayOfWeek) => {
        await api.completeDutyDay(day);
        await loadData();
      },
      [loadData]
    );
    const handleCompleteChore = useCallback(
      async (choreId: string, photoUrl?: string) => {
        await api.completeChore(choreId, photoUrl);
        await loadData();
      },
      [loadData]
    );
    const handleGiveKudos = useCallback(
      async (choreId: string, targetUserId: string, type: KudosType, note?: string) => {
        await api.giveKudos(choreId, targetUserId, type, note);
        await loadData();
      },
      [loadData]
    );
    const handleSwapChore = useCallback(
      async (choreId: string, toUserId: string, tokenCost?: number, note?: string) => {
        const choreObj = chores.find((c) => c.id === choreId);
        if (choreObj) {
          await api.createSwapRequest({
            targetUserId: toUserId,
            requesterChoreName: choreObj.name,
            targetChoreName: 'Chore Duty',
            tokenCost: tokenCost ?? 1,
            note,
          });
        }
        await loadData();
      },
      [chores, loadData]
    );
    const handleSetAway = useCallback(
      async (days: number | null) => {
        await api.setAwayMode(days);
        await loadData();
      },
      [loadData]
    );
    const handleAddChore = useCallback(
      async (
        name: string,
        frequency: 'daily' | 'weekly',
        effort: 'light' | 'medium' | 'heavy',
        desc: string
      ) => {
        const c = await api.addChore(name, frequency, effort, desc);
        await loadData();
        return c;
      },
      [loadData]
    );

    const handleAddExpense = useCallback(
      async (
        title: string,
        amount: number,
        cat: ExpenseCategory,
        participants: string[],
        receiptUrl?: string
      ) => {
        const exp = await api.addExpense(title, amount, cat, participants, receiptUrl);
        await loadData();
        return exp;
      },
      [loadData]
    );
    const handleRespondExpense = useCallback(
      async (expId: string, resp: 'agreed' | 'disputed', reason?: string) => {
        await api.respondToExpense(expId, resp, reason);
        await loadData();
      },
      [loadData]
    );
    const handleEditSplit = useCallback(
      async (expId: string, shares: { userId: string; shareAmount: number }[]) => {
        const exp = await api.editExpenseSplit(expId, shares);
        await loadData();
        return exp;
      },
      [loadData]
    );
    const handleCancelExpense = useCallback(
      async (expId: string) => {
        await api.cancelExpense(expId);
        await loadData();
      },
      [loadData]
    );
    const handleRemindRoomies = useCallback(
      async (msg?: string) => {
        await api.remindRoomies(msg);
        await loadData();
      },
      [loadData]
    );
    const handleMarkPaid = useCallback(
      async (toUserId: string, amount: number) => {
        const s = await api.markSettlementPaid(toUserId, amount);
        await loadData();
        return s;
      },
      [loadData]
    );
    const handleConfirmSettlement = useCallback(
      async (settlementId: string) => {
        const s = await api.confirmSettlement(settlementId);
        await loadData();
        return s;
      },
      [loadData]
    );
    const handleOpenChat = useCallback(() => setActiveTab('chat'), [setActiveTab]);
    const handleClearInitialExpense = useCallback(
      () => setSelectedExpenseId(null),
      [setSelectedExpenseId]
    );
    const handleClearInitialAction = useCallback(
      () => setSelectedExpenseAction(null),
      [setSelectedExpenseAction]
    );

    const renderActiveTabContent = () => {
      if (activeTab === 'feed') {
        return (
          <HomeScreen
            currentUser={currentUser}
            household={activeHousehold}
            roommates={roommatesList}
            chores={chores}
            assignments={draftRound.assignments}
            draftRound={draftRound}
            expenses={expenses}
            activityMessages={messages}
            pendingJoinRequests={pendingJoinRequests}
            netBalance={myNetBalance}
            dutySchedule={dutySchedule}
            onNavigateTab={setActiveTab}
            onOpenChoreReveal={handleOpenChoreReveal}
            onOpenDraftPicks={handleOpenDraftPicks}
            onOpenTimetable={handleOpenTimetable}
            onCompleteTodayDuty={handleCompleteTodayDuty}
            onSelectExpense={(id) => {
              setSelectedExpenseId(id);
              setActiveTab('expenses');
            }}
            onSelectJoinRequest={setReviewJoinRequest}
            onToggleHomeStatus={async () => {
              const next = await api.toggleHomeStatus();
              setCurrentUser((prev) => (prev ? { ...prev, isHome: next } : null));
              showToast(next ? 'Marked as at home' : 'Marked as out', 'info');
            }}
            onCompleteChore={handleCompleteChore}
            onGiveKudos={handleGiveKudos}
            onOpenExpensesAction={(action) => {
              setSelectedExpenseAction(action);
              setActiveTab('expenses');
            }}
            onRemindRoomies={async () => {
              await api.remindRoomies(
                'Gentle reminder to settle apartment balances when you have a moment'
              );
              await loadData();
            }}
          />
        );
      }

      if (activeTab === 'chores') {
        return (
          <ChoresScreen
            chores={chores}
            assignments={draftRound.assignments}
            draftRound={draftRound}
            roommates={roommatesList}
            currentUser={currentUser}
            dutySchedule={dutySchedule}
            onOpenDraftPicks={handleOpenDraftPicks}
            onOpenReveal={handleOpenChoreReveal}
            onOpenTimetable={handleOpenTimetable}
            onCompleteTodayDuty={handleCompleteTodayDuty}
            onCompleteChore={handleCompleteChore}
            onGiveKudos={handleGiveKudos}
            onSwapChore={handleSwapChore}
            onSetAway={handleSetAway}
            onAddChore={handleAddChore}
          />
        );
      }

      if (activeTab === 'expenses') {
        return (
          <ExpensesScreen
            expenses={expenses}
            settlements={settlements}
            roommates={roommatesList}
            currentUser={currentUser}
            householdId={activeHousehold.id}
            currency={activeHousehold.currency}
            initialExpenseId={selectedExpenseId}
            onClearInitialExpense={handleClearInitialExpense}
            initialAction={selectedExpenseAction}
            onClearInitialAction={handleClearInitialAction}
            balances={balances}
            onAddExpense={handleAddExpense}
            onRespondExpense={handleRespondExpense}
            onEditSplit={handleEditSplit}
            onCancelExpense={handleCancelExpense}
            onRemindRoomies={handleRemindRoomies}
            onMarkPaid={handleMarkPaid}
            onConfirmSettlement={handleConfirmSettlement}
            onOpenChat={handleOpenChat}
          />
        );
      }

      if (activeTab === 'chat') {
        return (
          <ChatScreen
            messages={messages}
            roommates={roommatesList}
            currentUser={currentUser}
            draftRound={draftRound}
            householdName={activeHousehold.name}
            onSendMessage={async (text) => {
              const m = await api.sendMessage(text);
              await loadData();
              return m;
            }}
            onAddReaction={async (msgId, emoji) => {
              await api.addReaction(msgId, emoji);
              await loadData();
            }}
            onNavigateAction={(target) => {
              if (target.screen === 'expenses') {
                if (target.id) setSelectedExpenseId(target.id);
                setActiveTab('expenses');
              }
              if (target.screen === 'chores') setActiveTab('chores');
              if (target.screen === 'chore-reveal') setDraftFlowState('reveal');
              if (target.screen === 'chore-draft') setDraftFlowState('picking');
              if (target.screen === 'chore-waiting') setDraftFlowState('waiting');
              if (target.screen === 'members' || target.screen === 'apartment') {
                setActiveTab('apartment');
              }
            }}
          />
        );
      }

      return (
        <ApartmentScreen
          household={activeHousehold}
          members={members}
          currentUser={currentUser}
          netBalance={myNetBalance}
          topics={topics}
          agreements={agreements}
          roommates={roommatesList}
          joinRequests={joinRequests}
          onReviewJoinRequest={setReviewJoinRequest}
          onRefreshRequests={async () => {
            const fresh = await api.getJoinRequests(activeHousehold.id);
            await loadData();
            if (fresh.length > 0) {
              showToast(
                `${fresh.length} pending join ${fresh.length === 1 ? 'request' : 'requests'} found!`,
                'info'
              );
            } else {
              showToast('No pending join requests right now.', 'info');
            }
          }}
          onShowQR={() => setShowQROpen(true)}
          onHandoverAdmin={async (toUserId) => {
            await api.handoverAdmin(toUserId);
            await loadData();
          }}
          onRemoveMember={async (userId) => {
            await api.removeHouseholdMember(activeHousehold.id, userId);
            await loadData();
          }}
          onLeaveHousehold={async () => {
            await api.leaveHousehold(activeHousehold.id);
            await loadData();
          }}
          onCreateTopic={async (title, desc) => {
            const t = await api.createMeetingTopic(title, desc);
            await loadData();
            return t;
          }}
          onVoteTopic={async (topicId, vote) => {
            await api.voteTopic(topicId, vote);
            await loadData();
          }}
          onAddComment={async (topicId, text) => {
            await api.addCommentToTopic(topicId, text);
            await loadData();
          }}
          onAddAgreement={async (text, cat) => {
            const a = await api.addAgreement(text, cat);
            await loadData();
            return a;
          }}
          onOpenHouseholdSwitcher={() => setHouseholdSwitcherOpen(true)}
          onOpenHowItWorks={() => setShowOnboarding(true)}
        />
      );
    };

    return <React.Suspense fallback={<ScreenSkeleton />}>{renderActiveTabContent()}</React.Suspense>;
  }
);
AppTabRouter.displayName = 'AppTabRouter';
