/**
 * Roomie - Mobile-first PWA Prototype for Roomie Harmony & Chores
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { IconContext } from '@phosphor-icons/react';
import { ToastProvider, useToast } from './components/common/Toast';
import { OfflineBanner } from './components/common/OfflineBanner';
import { DemoModeBanner } from './components/common/DemoModeBanner';
import { MascotView } from './components/common/MascotView';
import { SplashScreen } from './components/common/SplashScreen';
import { AppHeader, AppBottomNav, AppTab } from './components/common/AppHeaderAndNav';
import { AppTabRouter } from './components/common/AppTabRouter';
import { AppModals } from './components/common/AppModals';
import { ScreenSkeleton, AppBootstrapSkeleton } from './components/common/PageSkeletons';
import { api } from './services/api';
import { sound } from './services/sound';
import { initCapacitorNativeBridge, useBackHandler } from './utils/useBackHandler';
import { useRoomieAppState } from './hooks/useRoomieAppState';
import { WelcomeScreen } from './features/auth/WelcomeScreen';
import { DraftPick, JoinRequest } from './types';

const HouseholdSetupScreen = React.lazy(() =>
  import('./features/auth/HouseholdSetupScreen').then((m) => ({ default: m.HouseholdSetupScreen }))
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

function MainApp() {
  const { showToast } = useToast();
  const [joinHouseholdOpen, setJoinHouseholdOpen] = useState(false);

  const {
    isAuthenticated,
    setIsAuthenticated,
    needsHouseholdSetup,
    setNeedsHouseholdSetup,
    isDemoMode,
    setIsDemoMode,
    savedAccounts,
    setSavedAccounts,
    refreshSavedAccounts,
    pendingInviteCode,
    updatePendingInviteCode,
    isOffline,
    setIsOffline,
    syncStatus,
    setSyncStatus,
    lastSyncedTime,
    loadError,
    currentUser,
    setCurrentUser,
    households,
    activeHousehold,
    members,
    chores,
    draftRound,
    expenses,
    settlements,
    messages,
    topics,
    agreements,
    notifications,
    joinRequests,
    dutySchedule,
    setDutySchedule,
    settings,
    setSettings,
    balances,
    loadData,
    handleManualSync,
  } = useRoomieAppState(() => setJoinHouseholdOpen(true));

  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [navState, setNavState] = useState<{ current: AppTab; history: AppTab[] }>({
    current: 'feed',
    history: ['feed'],
  });
  const activeTab = navState.current;
  const tabHistory = navState.history;

  const setActiveTab = (nextTab: AppTab) => {
    setNavState((prev) => {
      if (prev.current === nextTab) return prev;
      const nextHist: AppTab[] =
        nextTab === 'feed' ? ['feed'] : [...prev.history.slice(-9), nextTab];
      return { current: nextTab, history: nextHist };
    });
  };

  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedExpenseAction, setSelectedExpenseAction] = useState<
    'add' | 'settle' | 'confirm' | null
  >(null);
  const [showShowcase, setShowShowcase] = useState<boolean>(false);
  const [syncPanelOpen, setSyncPanelOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('roomie_splash_seen');
    }
    return false;
  });

  const [householdSwitcherOpen, setHouseholdSwitcherOpen] = useState(false);
  const [createHouseholdOpen, setCreateHouseholdOpen] = useState(false);
  const [reviewJoinRequest, setReviewJoinRequest] = useState<JoinRequest | null>(null);
  const [showQROpen, setShowQROpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [debugInspectorOpen, setDebugInspectorOpen] = useState(false);
  const [dutyTimetableOpen, setDutyTimetableOpen] = useState(false);
  const [draftFlowState, setDraftFlowState] = useState<'none' | 'picking' | 'waiting' | 'reveal'>(
    'none'
  );

  useEffect(() => {
    return initCapacitorNativeBridge();
  }, []);

  useBackHandler(showShowcase, 60, () => {
    setShowShowcase(false);
  });

  useBackHandler(
    isAuthenticated &&
      !needsHouseholdSetup &&
      Boolean(activeHousehold) &&
      draftFlowState === 'none' &&
      !showShowcase &&
      (tabHistory.length > 1 || activeTab !== 'feed'),
    10,
    () => {
      sound.playTap();
      setNavState((prev) => {
        if (prev.history.length > 1) {
          const nextHist = prev.history.slice(0, -1);
          return {
            current: nextHist[nextHist.length - 1] || 'feed',
            history: nextHist,
          };
        }
        return { current: 'feed', history: ['feed'] };
      });
    }
  );

  const renderScreen = () => {
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

    if (!isAuthenticated) {
      return (
        <WelcomeScreen
          isRevealed={!showSplash}
          pendingInviteCode={pendingInviteCode}
          savedAccounts={savedAccounts}
          onDismissInvite={() => updatePendingInviteCode(null)}
          onSignIn={async (email, password, rememberMe) => {
            const res = await api.signInWithSupabase(email, password, { rememberMe });
            refreshSavedAccounts();
            if (res.success) {
              const shouldSetup = api.needsHouseholdSetup();
              setIsDemoMode(false);
              setNeedsHouseholdSetup(shouldSetup);
              setIsAuthenticated(true);
              await loadData();
            }
            return res;
          }}
          onSignUp={async (name, email, password, rememberMe) => {
            const res = await api.signUpWithSupabase(email, password, name, { rememberMe });
            refreshSavedAccounts();
            if (res.success && !res.requiresEmailVerification) {
              setIsDemoMode(false);
              setNeedsHouseholdSetup(true);
              setIsAuthenticated(true);
              setShowOnboarding(false);
              await loadData();
            }
            return res;
          }}
          onQuickSignIn={async (email) => {
            const res = await api.quickSignInSavedAccount(email);
            refreshSavedAccounts();
            if (res.success) {
              const shouldSetup = api.needsHouseholdSetup();
              setIsDemoMode(false);
              setNeedsHouseholdSetup(shouldSetup);
              setIsAuthenticated(true);
              await loadData();
              showToast(res.message || 'Welcome back!', 'success');
            }
            return res;
          }}
          onRemoveSavedAccount={(email) => {
            setSavedAccounts(api.removeSavedLoginAccount(email));
            showToast('Removed saved login from this device', 'info');
          }}
          onQuickStart={() => {
            api.markDemoMode(true);
            setIsDemoMode(true);
            setNeedsHouseholdSetup(false);
            setIsAuthenticated(true);
            loadData();
          }}
        />
      );
    }

    if (needsHouseholdSetup) {
      return (
        <React.Suspense fallback={<ScreenSkeleton />}>
          <HouseholdSetupScreen
            currentUser={currentUser}
            pendingInviteCode={pendingInviteCode}
            onClearPendingInvite={() => updatePendingInviteCode(null)}
            onCreateHousehold={async (name, currency, options) => {
              const newH = await api.createHousehold(name, currency, options);
              await loadData();
              return newH;
            }}
            onJoinHousehold={async (code) => {
              const res = await api.joinHousehold(code);
              await loadData();
              return res;
            }}
            onSetupComplete={() => {
              api.markHouseholdConfigured();
              setIsDemoMode(false);
              setNeedsHouseholdSetup(false);
              setNavState({ current: 'feed', history: ['feed'] });
              loadData();
            }}
            onExploreDemo={() => {
              api.markDemoMode(false);
              setIsDemoMode(true);
              setNeedsHouseholdSetup(false);
              setNavState({ current: 'feed', history: ['feed'] });
              loadData();
            }}
            onBackToWelcome={async () => {
              await api.signOut();
              refreshSavedAccounts();
              setNeedsHouseholdSetup(false);
              setIsAuthenticated(false);
            }}
          />
        </React.Suspense>
      );
    }

    if (!currentUser || !activeHousehold || !draftRound) {
      return <AppBootstrapSkeleton />;
    }

    const roommatesList = members.map((m) => m.user);

    if (draftFlowState === 'reveal') {
      return (
        <React.Suspense fallback={<ScreenSkeleton />}>
          <ChoreRevealScreen
            assignments={draftRound.assignments}
            chores={chores}
            users={roommatesList}
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

    if (draftFlowState === 'picking') {
      return (
        <React.Suspense fallback={<ScreenSkeleton />}>
          <SecretDraftScreen
            chores={chores}
            roommates={roommatesList}
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

    if (draftFlowState === 'waiting') {
      return (
        <React.Suspense fallback={<ScreenSkeleton />}>
          <WaitingDraftScreen
            draftRound={draftRound}
            roommates={roommatesList}
            onStartReveal={() => setDraftFlowState('reveal')}
            onEditPicks={() => setDraftFlowState('picking')}
            onClose={() => setDraftFlowState('none')}
          />
        </React.Suspense>
      );
    }

    const unreadNotifsCount = notifications.filter((n) => !n.read).length;

    return (
      <div
        className={`min-h-[100dvh] bg-[#F7F8FB] flex flex-col justify-between w-full relative ${
          activeTab === 'chat' ? 'h-[100dvh] overflow-hidden' : ''
        } ${settings.reducedMotion ? 'motion-reduce' : ''}`}
      >
        {isOffline || syncStatus === 'offline' ? (
          <OfflineBanner isOffline={true} onToggle={handleManualSync} />
        ) : isDemoMode ? (
          <DemoModeBanner
            householdName={activeHousehold.name}
            onSetupRealFlat={() => {
              api.markHouseholdSetupPending();
              setIsDemoMode(false);
              setNeedsHouseholdSetup(true);
            }}
          />
        ) : null}

        <AppHeader
          activeHousehold={activeHousehold}
          currentUser={currentUser}
          activeTab={activeTab}
          syncStatus={syncStatus}
          isOffline={isOffline}
          isDemoMode={isDemoMode}
          unreadNotifsCount={unreadNotifsCount}
          onSelectTab={setActiveTab}
          onOpenHouseholdSwitcher={() => setHouseholdSwitcherOpen(true)}
          onOpenShowQR={() => setShowQROpen(true)}
          onOpenSyncPanel={() => setSyncPanelOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenProfileSettings={() => setProfileSettingsOpen(true)}
        />

        <main
          className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${
            activeTab === 'chat'
              ? 'pt-3 pb-[calc(5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] md:py-6 min-h-0 overflow-hidden flex flex-col'
              : 'pt-5 pb-24 md:py-8 overflow-y-auto'
          }`}
        >
          <React.Suspense fallback={<ScreenSkeleton tab={activeTab} />}>
            <AppTabRouter
              activeTab={activeTab}
              currentUser={currentUser}
              activeHousehold={activeHousehold}
              members={members}
              chores={chores}
              draftRound={draftRound}
              expenses={expenses}
              settlements={settlements}
              messages={messages}
              topics={topics}
              agreements={agreements}
              joinRequests={joinRequests}
              dutySchedule={dutySchedule}
              balances={balances}
              selectedExpenseId={selectedExpenseId}
              selectedExpenseAction={selectedExpenseAction}
              setActiveTab={setActiveTab}
              setDraftFlowState={setDraftFlowState}
              setDutyTimetableOpen={setDutyTimetableOpen}
              setSelectedExpenseId={setSelectedExpenseId}
              setSelectedExpenseAction={setSelectedExpenseAction}
              setReviewJoinRequest={setReviewJoinRequest}
              setCurrentUser={setCurrentUser}
              setShowQROpen={setShowQROpen}
              setHouseholdSwitcherOpen={setHouseholdSwitcherOpen}
              setShowOnboarding={setShowOnboarding}
              loadData={loadData}
            />
          </React.Suspense>
        </main>

        <AppBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

        <AppModals
          activeHousehold={activeHousehold}
          households={households}
          currentUser={currentUser}
          members={members}
          chores={chores}
          draftRound={draftRound}
          notifications={notifications}
          settings={settings}
          dutySchedule={dutySchedule}
          pendingInviteCode={pendingInviteCode}
          isDemoMode={isDemoMode}
          syncStatus={syncStatus}
          lastSyncedTime={lastSyncedTime}
          showOnboarding={showOnboarding}
          showShowcase={showShowcase}
          householdSwitcherOpen={householdSwitcherOpen}
          createHouseholdOpen={createHouseholdOpen}
          joinHouseholdOpen={joinHouseholdOpen}
          reviewJoinRequest={reviewJoinRequest}
          showQROpen={showQROpen}
          notificationsOpen={notificationsOpen}
          profileSettingsOpen={profileSettingsOpen}
          feedbackOpen={feedbackOpen}
          syncPanelOpen={syncPanelOpen}
          debugInspectorOpen={debugInspectorOpen}
          dutyTimetableOpen={dutyTimetableOpen}
          setShowOnboarding={setShowOnboarding}
          setShowShowcase={setShowShowcase}
          setHouseholdSwitcherOpen={setHouseholdSwitcherOpen}
          setCreateHouseholdOpen={setCreateHouseholdOpen}
          setJoinHouseholdOpen={setJoinHouseholdOpen}
          setReviewJoinRequest={setReviewJoinRequest}
          setShowQROpen={setShowQROpen}
          setNotificationsOpen={setNotificationsOpen}
          setProfileSettingsOpen={setProfileSettingsOpen}
          setFeedbackOpen={setFeedbackOpen}
          setSyncPanelOpen={setSyncPanelOpen}
          setDebugInspectorOpen={setDebugInspectorOpen}
          setDutyTimetableOpen={setDutyTimetableOpen}
          setSettings={setSettings}
          setCurrentUser={setCurrentUser}
          setDutySchedule={setDutySchedule}
          setSyncStatus={setSyncStatus}
          setIsOffline={setIsOffline}
          setNeedsHouseholdSetup={setNeedsHouseholdSetup}
          setIsAuthenticated={setIsAuthenticated}
          setSelectedExpenseId={setSelectedExpenseId}
          setActiveTab={setActiveTab}
          setDraftFlowState={setDraftFlowState}
          updatePendingInviteCode={updatePendingInviteCode}
          refreshSavedAccounts={refreshSavedAccounts}
          handleManualSync={handleManualSync}
          loadData={loadData}
        />
      </div>
    );
  };

  return (
    <>
      {showSplash && (
        <SplashScreen
          onFinish={() => {
            setShowSplash(false);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('roomie_splash_seen', '1');
            }
          }}
        />
      )}
      {renderScreen()}
    </>
  );
}

export default function App() {
  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </IconContext.Provider>
  );
}
