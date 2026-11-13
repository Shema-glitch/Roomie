import React from 'react';
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
} from '../../types';
import { NetBalance } from '../../utils/balances';

const HomeScreen = React.lazy(() =>
  import('../../features/feed/HomeScreen').then((m) => ({ default: m.HomeScreen }))
);
const ChoresScreen = React.lazy(() =>
  import('../../features/chores/ChoresScreen').then((m) => ({ default: m.ChoresScreen }))
);
const ExpensesScreen = React.lazy(() =>
  import('../../features/expenses/ExpensesScreen').then((m) => ({ default: m.ExpensesScreen }))
);
const ChatScreen = React.lazy(() =>
  import('../../features/chat/ChatScreen').then((m) => ({ default: m.ChatScreen }))
);
const ApartmentScreen = React.lazy(() =>
  import('../../features/members/ApartmentScreen').then((m) => ({ default: m.ApartmentScreen }))
);

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

export const AppTabRouter: React.FC<AppTabRouterProps> = ({
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
  const roommatesList = members.map((m) => m.user);
  const myNetBalance = balances.userSummaries[currentUser.id] || 0;

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
        pendingJoinRequests={joinRequests.filter((r) => r.status === 'pending')}
        netBalance={myNetBalance}
        dutySchedule={dutySchedule}
        onNavigateTab={setActiveTab}
        onOpenChoreReveal={() => setDraftFlowState('reveal')}
        onOpenDraftPicks={() => setDraftFlowState('picking')}
        onOpenTimetable={() => setDutyTimetableOpen(true)}
        onCompleteTodayDuty={async (day) => {
          await api.completeDutyDay(day);
          await loadData();
        }}
        onSelectExpense={(id) => {
          setSelectedExpenseId(id);
          setActiveTab('expenses');
        }}
        onSelectJoinRequest={setReviewJoinRequest}
        onToggleHomeStatus={async () => {
          const next = await api.toggleHomeStatus();
          setCurrentUser((prev) => (prev ? { ...prev, isHome: next } : null));
          showToast(next ? 'Marked as at home 🏠' : 'Marked as out 🏃‍♂️', 'info');
        }}
        onCompleteChore={async (choreId, photoUrl) => {
          await api.completeChore(choreId, photoUrl);
          await loadData();
        }}
        onGiveKudos={async (choreId, targetUserId, type, note) => {
          await api.giveKudos(choreId, targetUserId, type, note);
          await loadData();
        }}
        onOpenExpensesAction={(action) => {
          setSelectedExpenseAction(action);
          setActiveTab('expenses');
        }}
        onRemindRoomies={async () => {
          await api.remindRoomies(
            'Gentle reminder to settle apartment balances when you have a moment 🙏'
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
        onOpenDraftPicks={() => setDraftFlowState('picking')}
        onOpenReveal={() => setDraftFlowState('reveal')}
        onOpenTimetable={() => setDutyTimetableOpen(true)}
        onCompleteTodayDuty={async (day) => {
          await api.completeDutyDay(day);
          await loadData();
        }}
        onCompleteChore={async (choreId, photoUrl) => {
          await api.completeChore(choreId, photoUrl);
          await loadData();
        }}
        onGiveKudos={async (choreId, targetUserId, type, note) => {
          await api.giveKudos(choreId, targetUserId, type, note);
          await loadData();
        }}
        onSwapChore={async (choreId, toUserId) => {
          await api.swapChore(choreId, toUserId);
          await loadData();
        }}
        onSetAway={async (days) => {
          await api.setAwayMode(days);
          await loadData();
        }}
        onAddChore={async (name, frequency, effort, desc) => {
          const c = await api.addChore(name, frequency, effort, desc);
          await loadData();
          return c;
        }}
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
        currency={activeHousehold.currency}
        initialExpenseId={selectedExpenseId}
        onClearInitialExpense={() => setSelectedExpenseId(null)}
        initialAction={selectedExpenseAction}
        onClearInitialAction={() => setSelectedExpenseAction(null)}
        balances={balances}
        onAddExpense={async (title, amount, cat, participants, receiptUrl) => {
          const exp = await api.addExpense(title, amount, cat, participants, receiptUrl);
          await loadData();
          return exp;
        }}
        onRespondExpense={async (expId, resp, reason) => {
          await api.respondToExpense(expId, resp, reason);
          await loadData();
        }}
        onEditSplit={async (expId, shares) => {
          const exp = await api.editExpenseSplit(expId, shares);
          await loadData();
          return exp;
        }}
        onCancelExpense={async (expId) => {
          await api.cancelExpense(expId);
          await loadData();
        }}
        onRemindRoomies={async (msg) => {
          await api.remindRoomies(msg);
          await loadData();
        }}
        onMarkPaid={async (toUserId, amount) => {
          const s = await api.markSettlementPaid(toUserId, amount);
          await loadData();
          return s;
        }}
        onConfirmSettlement={async (settlementId) => {
          const s = await api.confirmSettlement(settlementId);
          await loadData();
          return s;
        }}
        onOpenChat={() => setActiveTab('chat')}
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
