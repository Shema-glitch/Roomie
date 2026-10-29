/**
 * Roomie - Mobile-first PWA Prototype for Roomie Harmony & Chores
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { OfflineBanner } from './components/common/OfflineBanner';
import { SyncStatusPanel, SyncStatusType } from './components/common/SyncStatusPanel';
import { Avatar } from './components/common/Avatar';
import { MascotView } from './components/common/MascotView';
import { api } from './services/api';
import { sound } from './services/sound';

import { WelcomeScreen } from './features/auth/WelcomeScreen';

// Lazy-loaded Screens & Modals with skeleton fallbacks
const OnboardingModal = React.lazy(() =>
  import('./features/auth/OnboardingModal').then((m) => ({ default: m.OnboardingModal }))
);
const HomeScreen = React.lazy(() =>
  import('./features/feed/HomeScreen').then((m) => ({ default: m.HomeScreen }))
);
const ChoresScreen = React.lazy(() =>
  import('./features/chores/ChoresScreen').then((m) => ({ default: m.ChoresScreen }))
);
const SecretDraftScreen = React.lazy(() =>
  import('./features/chores/SecretDraftScreen').then((m) => ({ default: m.SecretDraftScreen }))
);
const WaitingDraftScreen = React.lazy(() =>
  import('./features/chores/WaitingDraftScreen').then((m) => ({ default: m.WaitingDraftScreen }))
);
const ChoreRevealScreen = React.lazy(() =>
  import('./features/chores/ChoreRevealScreen').then((m) => ({ default: m.ChoreRevealScreen }))
);
const ExpensesScreen = React.lazy(() =>
  import('./features/expenses/ExpensesScreen').then((m) => ({ default: m.ExpensesScreen }))
);
const ChatScreen = React.lazy(() =>
  import('./features/chat/ChatScreen').then((m) => ({ default: m.ChatScreen }))
);
const ApartmentScreen = React.lazy(() =>
  import('./features/members/ApartmentScreen').then((m) => ({ default: m.ApartmentScreen }))
);
const HouseholdSwitcherModal = React.lazy(() =>
  import('./features/household/HouseholdSwitcherModal').then((m) => ({
    default: m.HouseholdSwitcherModal,
  }))
);
const CreateHouseholdFlowModal = React.lazy(() =>
  import('./features/household/CreateHouseholdFlowModal').then((m) => ({
    default: m.CreateHouseholdFlowModal,
  }))
);
const JoinHouseholdFlowModal = React.lazy(() =>
  import('./features/household/JoinHouseholdFlowModal').then((m) => ({
    default: m.JoinHouseholdFlowModal,
  }))
);
const JoinRequestReviewModal = React.lazy(() =>
  import('./features/household/JoinRequestReviewModal').then((m) => ({
    default: m.JoinRequestReviewModal,
  }))
);
const ShowQRModal = React.lazy(() =>
  import('./features/household/ShowQRModal').then((m) => ({ default: m.ShowQRModal }))
);
const NotificationsModal = React.lazy(() =>
  import('./features/notifications/NotificationsModal').then((m) => ({
    default: m.NotificationsModal,
  }))
);
const ProfileSettingsModal = React.lazy(() =>
  import('./features/profile/ProfileSettingsModal').then((m) => ({
    default: m.ProfileSettingsModal,
  }))
);
const FeedbackModal = React.lazy(() =>
  import('./features/profile/FeedbackModal').then((m) => ({ default: m.FeedbackModal }))
);

// Fallback Skeletons
const ScreenSkeleton: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 animate-pulse">
    <div className="h-28 bg-[#E6E8EE]/70 rounded-3xl w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-44 bg-[#E6E8EE]/70 rounded-3xl" />
      <div className="h-44 bg-[#E6E8EE]/70 rounded-3xl" />
    </div>
    <div className="h-64 bg-[#E6E8EE]/70 rounded-3xl w-full" />
  </div>
);

const ModalSkeleton: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-xs">
    <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 animate-pulse">
      <div className="h-6 bg-[#E6E8EE] rounded-xl w-1/2" />
      <div className="h-20 bg-[#E6E8EE]/60 rounded-2xl" />
      <div className="h-10 bg-[#E6E8EE] rounded-xl w-full" />
    </div>
  </div>
);
import { SplashScreen } from './components/common/SplashScreen';
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
  Receipt,
  MessageSquare,
  Bell,
  ChevronDown,
  CloudCheck,
  CloudOff,
  RefreshCw,
  ClipboardCheck,
  Building,
  AlertCircle,
} from 'lucide-react';

type Tab = 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment';

function MainApp() {
  const { showToast } = useToast();

  // App lifecycle & auth states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('synced');
  const [syncPanelOpen, setSyncPanelOpen] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = sessionStorage.getItem('roomie_splash_seen');
      return !hasSeen;
    }
    return false;
  });
  const [splashRevealed, setSplashRevealed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!sessionStorage.getItem('roomie_splash_seen');
    }
    return true;
  });

  const handleManualSync = () => {
    sound.playTap();
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      setIsOffline(false);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Synced with apartment database', 'info');
      loadData();
    }, 1000);
  };

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
    setLoadError(null);
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
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load apartment data.');
    }
  };

  useEffect(() => {
    // Check if user has an active Supabase session or demo url param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('demo') === '1') {
        setIsAuthenticated(true);
        loadData();
        return;
      }
    }

    api.getSession().then((session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      loadData();
    }).catch(() => {
      loadData();
    });
  }, []);

  // Supabase Realtime subscription scoped to active household
  useEffect(() => {
    if (!activeHousehold?.id) return;
    const unsubscribe = api.subscribeToHousehold(activeHousehold.id, () => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [activeHousehold?.id]);

  // Sync HTML dir & lang for Arabic and other languages
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (settings.language === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', settings.language || 'en');
      }
    }
  }, [settings.language]);

  // Sync reduced motion class with setting or device
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (settings.reducedMotion) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    }
  }, [settings.reducedMotion]);

  if (loadError && (!currentUser || !activeHousehold || !draftRound)) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <MascotView state="thinking" size="lg" bubbleText="Something went wrong" />
        <div className="space-y-1 max-w-sm">
          <h2 className="type-title">Connection error</h2>
          <p className="type-secondary">{loadError}</p>
        </div>
        <button
          onClick={loadData}
          className="px-6 py-2.5 rounded-2xl bg-[#FF6B4A] text-white font-bold text-sm cursor-pointer hover:bg-[#E55A3A] transition-all"
        >
          Try again
        </button>
      </div>
    );
  }

  // Not signed in
  if (!isAuthenticated) {
    return (
      <>
        {showSplash && (
          <SplashScreen
            onRevealStart={() => setSplashRevealed(true)}
            onFinish={() => {
              setSplashRevealed(true);
              setShowSplash(false);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('roomie_splash_seen', '1');
              }
            }}
          />
        )}
        <WelcomeScreen
          isRevealed={splashRevealed}
          onSignIn={async (email, password) => {
            const res = await api.signInWithSupabase(email, password);
            if (res.success) {
              setIsAuthenticated(true);
              await loadData();
            }
            return res;
          }}
          onSignUp={async (name, email, password) => {
            const res = await api.signUpWithSupabase(email, password, name);
            if (res.success) {
              setIsAuthenticated(true);
              setShowOnboarding(true);
              await loadData();
            }
            return res;
          }}
          onQuickStart={() => {
            setIsAuthenticated(true);
            loadData();
          }}
        />
      </>
    );
  }

  if (!currentUser || !activeHousehold || !draftRound) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex flex-col items-center justify-center p-6 text-center">
        <MascotView state="thinking" size="lg" bubbleText="Getting your flat ready..." />
        <h2 className="type-title mt-4">
          Loading your apartment...
        </h2>
      </div>
    );
  }

  // Full-screen Chore Reveal
  if (draftFlowState === 'reveal') {
    return (
      <React.Suspense fallback={<ScreenSkeleton />}>
        <ChoreRevealScreen
          assignments={draftRound.assignments}
          chores={chores}
          users={members.map((m) => m.user)}
          reducedMotion={settings.reducedMotion}
          onFinish={async (updatedAssignments) => {
            if (updatedAssignments) {
              await api.updateAssignments(updatedAssignments);
            }
            await api.markDraftRevealed();
            await loadData();
            setDraftFlowState('none');
            setActiveTab('chores');
          }}
        />
      </React.Suspense>
    );
  }

  // Full-screen Secret Draft Picks
  if (draftFlowState === 'picking') {
    return (
      <React.Suspense fallback={<ScreenSkeleton />}>
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
      </React.Suspense>
    );
  }

  // Full-screen Waiting for draft picks
  if (draftFlowState === 'waiting') {
    return (
      <React.Suspense fallback={<ScreenSkeleton />}>
        <WaitingDraftScreen
          draftRound={draftRound}
          roommates={members.map((m) => m.user)}
          onStartReveal={() => setDraftFlowState('reveal')}
          onEditPicks={() => setDraftFlowState('picking')}
        />
      </React.Suspense>
    );
  }

  const roommatesList = members.map((m) => m.user);
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const myNetBalance = balances.userSummaries[currentUser.id] || 0;

  return (
    <div
      className={`min-h-screen bg-[#F7F8FB] flex flex-col justify-between w-full relative ${
        settings.reducedMotion ? 'motion-reduce' : ''
      }`}
    >
      {showSplash && (
        <SplashScreen
          onRevealStart={() => setSplashRevealed(true)}
          onFinish={() => {
            setSplashRevealed(true);
            setShowSplash(false);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('roomie_splash_seen', '1');
            }
          }}
        />
      )}

      {/* Offline banner simulation */}
      <OfflineBanner
        isOffline={isOffline || syncStatus === 'offline'}
        onToggle={handleManualSync}
      />

      {/* TOP APP BAR - Responsive Header with Desktop Tabs */}
      <header className="sticky top-0 z-30 bg-[#F7F8FB]/95 backdrop-blur-md border-b border-[#E6E8EE] w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          {/* Left: Apartment Switcher dropdown & Invite code chip */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setHouseholdSwitcherOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white border border-[#E6E8EE] shadow-2xs hover:border-[#CBD5E1] transition-all cursor-pointer"
            >
              <span className="type-section-heading max-w-[140px] sm:max-w-[200px] md:max-w-none whitespace-nowrap">
                {activeHousehold.name}
              </span>
              <ChevronDown className="w-4 h-4 text-[#475569] shrink-0" />
            </button>

            {/* Quick Apartment Code Pill - Only on wide desktop (xl:), NEVER on tablet */}
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setShowQROpen(true);
              }}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5F2] border border-[#FFD3C9] text-[14px] font-bold text-[#FF6B4A] hover:bg-[#FFEAE4] transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Click to view apartment invite code and QR"
            >
              <span className="font-mono tracking-wide font-black">{activeHousehold.inviteCode}</span>
            </button>
          </div>

          {/* Center: Desktop Navigation Tabs (Visible on md+ screens) */}
          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-0.5 lg:gap-1 p-1 bg-[#EEF0F6] rounded-2xl border border-[#E2E5EC] shrink min-w-0"
          >
            {[
              { id: 'feed', label: 'Home', icon: <Home className="w-4 h-4 shrink-0" /> },
              { id: 'chores', label: 'Chores', icon: <ClipboardCheck className="w-4 h-4 shrink-0" /> },
              { id: 'expenses', label: 'Money', icon: <Receipt className="w-4 h-4 shrink-0" /> },
              { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4 shrink-0" /> },
              { id: 'apartment', label: 'Apartment', icon: <Building className="w-4 h-4 shrink-0" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setActiveTab(tab.id as Tab);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-xl text-[14px] font-heading font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-[#1F2430] shadow-xs border border-[#E2E5EC]'
                      : 'text-[#475569] hover:text-[#1F2430] hover:bg-white/60'
                  }`}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  <span className={isActive ? 'text-[#FF6B4A]' : 'text-[#94A3B8]'}>
                    {tab.icon}
                  </span>
                  <span className={isActive ? 'inline' : 'hidden lg:inline'}>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Controls - always shrink-0 */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Sync Status Button with text label and taps open sync panel */}
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSyncPanelOpen(true);
              }}
              className={`min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-2xl border flex items-center gap-1.5 sm:gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 transition-all ${
                syncStatus === 'syncing'
                  ? 'bg-[#EEF0FD] border-[#D3D5F9] text-[#5B5BD6]'
                  : syncStatus === 'offline'
                  ? 'bg-[#FFF0ED] border-[#FFD7CF] text-[#E5484D]'
                  : syncStatus === 'needs_attention'
                  ? 'bg-[#FFF8E6] border-[#FFE8A3] text-[#8A6200]'
                  : 'bg-white border-[#E6E8EE] text-[#19B5A5] hover:border-[#19B5A5]'
              }`}
              title={`Sync status: ${
                syncStatus === 'syncing'
                  ? 'Syncing'
                  : syncStatus === 'offline'
                  ? 'Offline'
                  : syncStatus === 'needs_attention'
                  ? 'Needs attention'
                  : 'Synced'
              }. Tap to open sync details.`}
              aria-label="Apartment sync status"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#5B5BD6]" />
              ) : syncStatus === 'offline' ? (
                <CloudOff className="w-4 h-4 text-[#E5484D]" />
              ) : syncStatus === 'needs_attention' ? (
                <AlertCircle className="w-4 h-4 text-[#8A6200]" />
              ) : (
                <CloudCheck className="w-4 h-4 text-[#19B5A5]" />
              )}
              <span
                className={`type-secondary font-bold text-[14px] ${
                  syncStatus === 'syncing'
                    ? 'text-[#5B5BD6]'
                    : syncStatus === 'offline'
                    ? 'text-[#E5484D]'
                    : syncStatus === 'needs_attention'
                    ? 'text-[#8A6200]'
                    : 'text-[#19B5A5]'
                }`}
              >
                {syncStatus === 'syncing'
                  ? 'Syncing'
                  : syncStatus === 'offline'
                  ? 'Offline'
                  : syncStatus === 'needs_attention'
                  ? 'Needs attention'
                  : 'Synced'}
              </span>
            </button>

            {/* Notifications button with badge */}
            <button
              onClick={() => {
                sound.playTap();
                setNotificationsOpen(true);
              }}
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-white border border-[#E6E8EE] flex items-center justify-center relative text-[#1F2430] hover:border-[#FF6B4A] shadow-2xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute 1 top-1 right-1 w-5 h-5 bg-[#FF6B4A] text-white rounded-full text-[14px] font-bold flex items-center justify-center border-2 border-white">
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
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:ring-2 hover:ring-[#FF6B4A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 transition-all cursor-pointer"
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
        </div>
      </header>

      {/* MAIN VIEW CONTENT - Fluid Responsive Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 overflow-y-auto">
        <React.Suspense fallback={<ScreenSkeleton />}>
          {activeTab === 'feed' && (
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
            onCompleteChore={async (choreId, photoUrl) => {
              await api.completeChore(choreId, photoUrl);
              await loadData();
            }}
            onGiveKudos={async (choreId, targetUserId, type, note) => {
              await api.giveKudos(choreId, targetUserId, type, note);
              await loadData();
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
        )}

        {activeTab === 'chat' && (
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
              if (target.screen === 'expenses') setActiveTab('expenses');
              if (target.screen === 'chores') setActiveTab('chores');
              if (target.screen === 'chore-reveal') setDraftFlowState('reveal');
              if (target.screen === 'chore-draft') setDraftFlowState('picking');
              if (target.screen === 'chore-waiting') setDraftFlowState('waiting');
              if (target.screen === 'members') setActiveTab('apartment');
            }}
          />
        )}

        {activeTab === 'apartment' && (
          <ApartmentScreen
            household={activeHousehold}
            members={members}
            currentUser={currentUser}
            netBalance={myNetBalance}
            topics={topics}
            agreements={agreements}
            roommates={roommatesList}
            joinRequests={joinRequests}
            onReviewJoinRequest={(req) => setReviewJoinRequest(req)}
            onShowQR={() => setShowQROpen(true)}
            onHandoverAdmin={async (toUserId) => {
              await api.handoverAdmin(toUserId);
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
          />
        )}
        </React.Suspense>
      </main>

      {/* BOTTOM NAVIGATION BAR - Mobile only */}
      <nav
        aria-label="Main Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#E6E8EE] px-2 py-2 flex items-center justify-around z-30 shadow-lg"
      >
        {[
          { id: 'feed', label: 'Home', icon: <Home className="w-5 h-5" /> },
          { id: 'chores', label: 'Chores', icon: <ClipboardCheck className="w-5 h-5" /> },
          { id: 'expenses', label: 'Money', icon: <Receipt className="w-5 h-5" /> },
          { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
          { id: 'apartment', label: 'Apartment', icon: <Building className="w-5 h-5" /> },
        ].map((tabItem) => {
          const isActive = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => {
                sound.playTap();
                setActiveTab(tabItem.id as Tab);
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl min-h-[48px] min-w-[58px] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 ${
                isActive
                  ? 'text-[#FF6B4A] font-extrabold scale-105'
                  : 'text-[#475569] hover:text-[#1F2430]'
              }`}
              aria-label={tabItem.label}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-[#FFF0ED]' : ''
                }`}
              >
                {tabItem.icon}
              </div>
              <span className="text-[14px] font-bold mt-0.5 leading-none">{tabItem.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MODALS */}
      <React.Suspense fallback={<ModalSkeleton />}>
        {showOnboarding && (
          <OnboardingModal
            isOpen={showOnboarding}
            onComplete={() => setShowOnboarding(false)}
          />
        )}

        {householdSwitcherOpen && (
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
        )}

        {createHouseholdOpen && (
          <CreateHouseholdFlowModal
            isOpen={createHouseholdOpen}
            onClose={() => setCreateHouseholdOpen(false)}
            onCreate={async (name, currency) => {
              const newH = await api.createHousehold(name, currency);
              await loadData();
              return newH;
            }}
          />
        )}

        {joinHouseholdOpen && (
          <JoinHouseholdFlowModal
            isOpen={joinHouseholdOpen}
            onClose={() => setJoinHouseholdOpen(false)}
            onJoin={async (code) => {
              const res = await api.joinHousehold(code);
              await loadData();
              return res;
            }}
          />
        )}

        {Boolean(reviewJoinRequest) && (
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
        )}

        {showQROpen && (
          <ShowQRModal
            isOpen={showQROpen}
            onClose={() => setShowQROpen(false)}
            household={activeHousehold}
            onRefreshCode={async () => {
              const newCode = await api.refreshInviteCode(activeHousehold.id);
              await loadData();
              return newCode;
            }}
            onToggleInvites={async () => {
              const active = await api.toggleInvites(activeHousehold.id);
              await loadData();
              return active;
            }}
          />
        )}

        {notificationsOpen && (
          <NotificationsModal
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            notifications={notifications}
            draftRound={draftRound}
            currentUser={currentUser}
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
              if (target.screen === 'chore-draft') setDraftFlowState('picking');
              if (target.screen === 'chore-waiting') setDraftFlowState('waiting');
              if (target.screen === 'members' || target.screen === 'apartment') setActiveTab('apartment');
            }}
          />
        )}

        {profileSettingsOpen && (
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
            onUpdateProfile={async (updates) => {
              const u = await api.updateUserProfile(updates);
              setCurrentUser(u);
              await loadData();
              return u;
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
            onSignOut={async () => {
              await api.signOut();
              setIsAuthenticated(false);
              showToast('Signed out of Roomie', 'info');
            }}
            onOpenFeedback={() => setFeedbackOpen(true)}
          />
        )}

        {feedbackOpen && (
          <FeedbackModal
            isOpen={feedbackOpen}
            onClose={() => setFeedbackOpen(false)}
          />
        )}
      </React.Suspense>
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
