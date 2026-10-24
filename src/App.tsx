/**
 * Roomie - Mobile-first PWA Prototype for Flatmate Harmony & Chores
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { OfflineBanner } from './components/common/OfflineBanner';
import { WelcomeScreen } from './features/auth/WelcomeScreen';
import { OnboardingModal } from './features/auth/OnboardingModal';
import { HomeScreen } from './features/feed/HomeScreen';
import { ChoresScreen } from './features/chores/ChoresScreen';
import { SecretDraftScreen } from './features/chores/SecretDraftScreen';
import { WaitingDraftScreen } from './features/chores/WaitingDraftScreen';
import { ChoreRevealScreen } from './features/chores/ChoreRevealScreen';
import { ExpensesScreen } from './features/expenses/ExpensesScreen';
import { ChatScreen } from './features/chat/ChatScreen';
import { MeetingsScreen } from './features/meetings/MeetingsScreen';
import { MembersScreen } from './features/members/MembersScreen';
import { HouseholdSwitcherModal } from './features/household/HouseholdSwitcherModal';
import { CreateHouseholdFlowModal } from './features/household/CreateHouseholdFlowModal';
import { JoinHouseholdFlowModal } from './features/household/JoinHouseholdFlowModal';
import { JoinRequestReviewModal } from './features/household/JoinRequestReviewModal';
import { ShowQRModal } from './features/household/ShowQRModal';
import { NotificationsModal } from './features/notifications/NotificationsModal';
import { ProfileSettingsModal } from './features/profile/ProfileSettingsModal';
import { FeedbackModal } from './features/profile/FeedbackModal';
import { Avatar } from './components/common/Avatar';
import { MascotView } from './components/common/MascotView';
import { api } from './services/api';
import { sound } from './services/sound';
import { THEME } from './theme/tokens';
import {
  User,
  Household,
  Membership,
  Chore,
  ChoreAssignment,
  DraftRound,
  DraftPick,
  Expense,
  Settlement,
  ChatMessage,
  MeetingTopic,
  HouseAgreement,
  InAppNotification,
  JoinRequest,
  UserSettings,
} from './types';
import { NetBalance } from './utils/balances';
import {
  Home,
  Sparkles,
  Receipt,
  MessageSquare,
  Users,
  Bell,
  ChevronDown,
  Wifi,
  WifiOff,
  Settings,
} from 'lucide-react';

type Tab = 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment';

function MainApp() {
  const { showToast } = useToast();

  // App lifecycle & auth states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Core domain data loaded from api layer
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<{ user: User; membership: Membership }[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [draftRound, setDraftRound] = useState<DraftRound | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  const [agreements, setAgreements] = useState<HouseAgreement[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    language: 'en',
    soundEnabled: false,
    reducedMotion: false,
    pushNotifications: true,
    reminderEarly30Min: true,
  });
  const [balances, setBalances] = useState<{
    userSummaries: Record<string, number>;
    simplifiedDebts: NetBalance[];
  }>({ userSummaries: {}, simplifiedDebts: [] });

  // Modal controls
  const [householdSwitcherOpen, setHouseholdSwitcherOpen] = useState(false);
  const [createHouseholdOpen, setCreateHouseholdOpen] = useState(false);
  const [joinHouseholdOpen, setJoinHouseholdOpen] = useState(false);
  const [reviewJoinRequest, setReviewJoinRequest] = useState<JoinRequest | null>(null);
  const [showQROpen, setShowQROpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Full-screen flows for Chore draft & reveal
  const [draftFlowState, setDraftFlowState] = useState<'none' | 'picking' | 'waiting' | 'reveal'>('none');

  // Load initial data
  const loadData = async () => {
    try {
      const u = await api.getCurrentUser();
      const hList = await api.getHouseholds();
      const activeH = await api.getActiveHousehold();
      const memList = await api.getHouseholdMembers(activeH.id);
      const chList = await api.getChores(activeH.id);
      const dRound = await api.getDraftRound(activeH.id);
      const expList = await api.getExpenses(activeH.id);
      const setList = await api.getSettlements(activeH.id);
      const msgList = await api.getMessages(activeH.id);
      const topList = await api.getMeetingTopics(activeH.id);
      const agrList = await api.getAgreements(activeH.id);
      const notifList = await api.getNotifications();
      const jrList = await api.getJoinRequests(activeH.id);
      const setts = await api.getSettings();
      const balOverview = await api.getBalancesOverview(activeH.id);

      setCurrentUser(u);
      setHouseholds(hList);
      setActiveHousehold(activeH);
      setMembers(memList);
      setChores(chList);
      setDraftRound(dRound);
      setExpenses(expList);
      setSettlements(setList);
      setMessages(msgList);
      setTopics(topList);
      setAgreements(agrList);
      setNotifications(notifList);
      setJoinRequests(jrList);
      setSettings(setts);
      setBalances(balOverview);

      // sync sound setting
      sound.setEnabled(setts.soundEnabled);
    } catch {
      // error loading data
    }
  };

  useEffect(() => {
    // Check url param for autostart
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setIsAuthenticated(true);
        setShowOnboarding(false);
      }
    }
    loadData();
  }, []);

  if (!currentUser || !activeHousehold || !draftRound) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex flex-col items-center justify-center p-6 text-center">
        <MascotView state="thinking" size="lg" bubbleText="Waking up Roomie..." />
        <h2 className="text-xl font-heading font-black text-[#1F2430] mt-4">
          Loading Apartment 4B...
        </h2>
      </div>
    );
  }

  // Not signed in
  if (!isAuthenticated) {
    return (
      <WelcomeScreen
        onSignIn={(email) => {
          setIsAuthenticated(true);
          setShowOnboarding(true);
        }}
        onSignUp={(name, email) => {
          api.updateCurrentUser({ name, email });
          setCurrentUser((prev) => (prev ? { ...prev, name, email } : null));
          setIsAuthenticated(true);
          setShowOnboarding(true);
        }}
        onQuickStart={() => {
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Full-screen Chore Reveal
  if (draftFlowState === 'reveal') {
    return (
      <ChoreRevealScreen
        assignments={draftRound.assignments}
        chores={chores}
        users={members.map((m) => m.user)}
        reducedMotion={settings.reducedMotion}
        onFinish={async () => {
          await api.markDraftRevealed();
          await loadData();
          setDraftFlowState('none');
          setActiveTab('chores');
        }}
      />
    );
  }

  // Full-screen Secret Draft Picks
  if (draftFlowState === 'picking') {
    return (
      <SecretDraftScreen
        chores={chores}
        roommates={members.map((m) => m.user)}
        currentUser={currentUser}
        onSubmitPicks={async (picks: DraftPick[]) => {
          await api.submitDraftPicks(picks);
          await loadData();
          setDraftFlowState('waiting');
        }}
        onCancel={() => setDraftFlowState('none')}
      />
    );
  }

  // Full-screen Waiting for draft picks
  if (draftFlowState === 'waiting') {
    return (
      <WaitingDraftScreen
        draftRound={draftRound}
        roommates={members.map((m) => m.user)}
        onStartReveal={() => setDraftFlowState('reveal')}
        onEditPicks={() => setDraftFlowState('picking')}
      />
    );
  }

  const roommatesList = members.map((m) => m.user);
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const myNetBalance = balances.userSummaries[currentUser.id] || 0;

  return (
    <div
      className={`min-h-screen bg-[#F7F8FB] flex flex-col justify-between max-w-md mx-auto shadow-2xl relative border-x border-[#E6E8EE] ${
        settings.reducedMotion ? 'motion-reduce' : ''
      }`}
    >
      {/* Offline banner simulation */}
      <OfflineBanner
        isOffline={isOffline}
        onToggle={() => {
          setIsOffline(false);
          showToast('Back online! Syncing state.', 'success');
        }}
      />

      {/* TOP APP BAR */}
      <header className="sticky top-0 z-30 bg-[#F7F8FB]/90 backdrop-blur-md px-4 pt-3 pb-2 border-b border-[#E6E8EE] flex items-center justify-between">
        {/* Household Switcher dropdown button */}
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setHouseholdSwitcherOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-[#E6E8EE] shadow-2xs hover:border-[#CBD5E1] transition-all cursor-pointer"
        >
          <span className="font-heading font-black text-sm text-[#1F2430] max-w-[150px] truncate">
            {activeHousehold.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
        </button>

        {/* Right Header Icons */}
        <div className="flex items-center gap-2">
          {/* Offline Toggle Simulation */}
          <button
            onClick={() => {
              setIsOffline(!isOffline);
              showToast(isOffline ? 'Online mode' : 'Simulating offline mode', 'info');
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#1F2430] hover:bg-white cursor-pointer"
            title="Toggle offline state simulation"
            aria-label="Toggle offline mode simulation"
          >
            {isOffline ? (
              <WifiOff className="w-4 h-4 text-[#FFC93C]" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
          </button>

          {/* Notifications button with badge */}
          <button
            onClick={() => {
              sound.playTap();
              setNotificationsOpen(true);
            }}
            className="w-9 h-9 rounded-full bg-white border border-[#E6E8EE] flex items-center justify-center relative text-[#1F2430] hover:border-[#FF6B4A] shadow-2xs transition-all cursor-pointer"
            aria-label="Open notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B4A] text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-white">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Profile / Settings avatar trigger */}
          <button
            onClick={() => {
              sound.playTap();
              setProfileSettingsOpen(true);
            }}
            className="rounded-full ring-2 ring-transparent hover:ring-[#FF6B4A] transition-all cursor-pointer"
            aria-label="Open profile settings"
          >
            <Avatar
              src={currentUser.avatar}
              name={currentUser.name}
              flag={currentUser.flag}
              size="sm"
            />
          </button>
        </div>
      </header>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'feed' && (
          <HomeScreen
            currentUser={currentUser}
            household={activeHousehold}
            roommates={roommatesList}
            chores={chores}
            assignments={draftRound.assignments}
            expenses={expenses}
            activityMessages={messages}
            pendingJoinRequests={joinRequests}
            netBalance={myNetBalance}
            onNavigateTab={(t) => setActiveTab(t as Tab)}
            onOpenChoreReveal={() => setDraftFlowState('reveal')}
            onOpenDraftPicks={() => setDraftFlowState('picking')}
            onSelectExpense={(id) => {
              setActiveTab('expenses');
            }}
            onSelectJoinRequest={(req) => setReviewJoinRequest(req)}
            onToggleHomeStatus={async () => {
              const next = await api.toggleHomeStatus();
              setCurrentUser((prev) => (prev ? { ...prev, isHome: next } : null));
              showToast(next ? "Marked as at home 🏠" : "Marked as out 🏃‍♂️", 'info');
            }}
          />
        )}

        {activeTab === 'chores' && (
          <ChoresScreen
            chores={chores}
            assignments={draftRound.assignments}
            draftRound={draftRound}
            roommates={roommatesList}
            currentUser={currentUser}
            onOpenDraftPicks={() => setDraftFlowState('picking')}
            onOpenReveal={() => setDraftFlowState('reveal')}
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
        )}

        {activeTab === 'expenses' && (
          <ExpensesScreen
            expenses={expenses}
            settlements={settlements}
            roommates={roommatesList}
            currentUser={currentUser}
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
        )}

        {activeTab === 'chat' && (
          <ChatScreen
            messages={messages}
            roommates={roommatesList}
            currentUser={currentUser}
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
              if (target.screen === 'expenses') setActiveTab('expenses');
              if (target.screen === 'chores') setActiveTab('chores');
              if (target.screen === 'chore-reveal') setDraftFlowState('reveal');
              if (target.screen === 'members') setActiveTab('apartment');
            }}
          />
        )}

        {activeTab === 'apartment' && (
          <div className="space-y-4">
            {/* Top toggle for Members vs Meetings */}
            <div className="space-y-3">
              <MembersScreen
                household={activeHousehold}
                members={members}
                currentUser={currentUser}
                netBalance={myNetBalance}
                onShowQR={() => setShowQROpen(true)}
                onHandoverAdmin={async (toUserId) => {
                  await api.handoverAdmin(toUserId);
                  await loadData();
                }}
                onLeaveHousehold={async () => {
                  await api.leaveHousehold(activeHousehold.id);
                  await loadData();
                }}
              />

              {/* House Meetings & Rules */}
              <MeetingsScreen
                topics={topics}
                agreements={agreements}
                roommates={roommatesList}
                currentUser={currentUser}
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
              />
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Main Navigation"
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#E6E8EE] px-2 py-2 flex items-center justify-around z-30 shadow-lg"
      >
        {[
          { id: 'feed', label: 'Home', icon: <Home className="w-5 h-5" /> },
          { id: 'chores', label: 'Chores', icon: <Sparkles className="w-5 h-5" /> },
          { id: 'expenses', label: 'Money', icon: <Receipt className="w-5 h-5" /> },
          { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
          { id: 'apartment', label: 'Flat', icon: <Users className="w-5 h-5" /> },
        ].map((tabItem) => {
          const isActive = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => {
                sound.playTap();
                setActiveTab(tabItem.id as Tab);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl min-h-[44px] min-w-[56px] transition-all cursor-pointer ${
                isActive
                  ? 'text-[#FF6B4A] font-extrabold scale-105'
                  : 'text-[#6B7280] hover:text-[#1F2430]'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-[#FFF0ED]' : ''
                }`}
              >
                {tabItem.icon}
              </div>
              <span className="text-[10px] mt-0.5 leading-none">{tabItem.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MODALS */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      <HouseholdSwitcherModal
        isOpen={householdSwitcherOpen}
        onClose={() => setHouseholdSwitcherOpen(false)}
        households={households}
        activeHouseholdId={activeHousehold.id}
        onSelectHousehold={async (hId) => {
          await api.setActiveHousehold(hId);
          await loadData();
          showToast('Switched household!', 'info');
        }}
        onCreateNew={() => setCreateHouseholdOpen(true)}
        onJoinWithCode={() => setJoinHouseholdOpen(true)}
      />

      <CreateHouseholdFlowModal
        isOpen={createHouseholdOpen}
        onClose={() => setCreateHouseholdOpen(false)}
        onCreate={async (name, currency) => {
          const newH = await api.createHousehold(name, currency);
          await loadData();
          return newH;
        }}
      />

      <JoinHouseholdFlowModal
        isOpen={joinHouseholdOpen}
        onClose={() => setJoinHouseholdOpen(false)}
        onJoin={async (code) => {
          const res = await api.joinHousehold(code);
          await loadData();
          return res;
        }}
      />

      <JoinRequestReviewModal
        isOpen={Boolean(reviewJoinRequest)}
        onClose={() => setReviewJoinRequest(null)}
        joinRequest={reviewJoinRequest}
        currentUser={currentUser}
        currentMembership={members.find((m) => m.user.id === currentUser.id)?.membership || null}
        onVote={async (reqId, vote) => {
          await api.voteJoinRequest(reqId, vote);
          await loadData();
        }}
        onDecide={async (reqId, approve) => {
          await api.decideJoinRequest(reqId, approve);
          await loadData();
        }}
      />

      <ShowQRModal
        isOpen={showQROpen}
        onClose={() => setShowQROpen(false)}
        household={activeHousehold}
      />

      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={async (id) => {
          await api.markNotificationRead(id);
          await loadData();
        }}
        onMarkAllRead={async () => {
          await api.markAllNotificationsRead();
          await loadData();
        }}
        onActionClick={(target) => {
          if (target.screen === 'expenses') setActiveTab('expenses');
          if (target.screen === 'chores') setActiveTab('chores');
          if (target.screen === 'chore-reveal') setDraftFlowState('reveal');
          if (target.screen === 'members') setActiveTab('apartment');
        }}
      />

      <ProfileSettingsModal
        isOpen={profileSettingsOpen}
        onClose={() => setProfileSettingsOpen(false)}
        currentUser={currentUser}
        settings={settings}
        onUpdateSettings={async (updates) => {
          const s = await api.updateSettings(updates);
          setSettings(s);
          return s;
        }}
        onExportData={() => {
          const data = api.exportData();
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `roomie-data-${activeHousehold.name.toLowerCase().replace(/\s+/g, '-')}.json`;
          a.click();
          showToast('Household data exported!', 'success');
        }}
        onDeleteAccount={() => {
          api.resetData();
          loadData();
          showToast('Account data reset to fresh demo state.', 'info');
        }}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />

      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
