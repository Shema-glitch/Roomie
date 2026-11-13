import React from 'react';
import { SyncStatusPanel, SyncStatusType } from './SyncStatusPanel';
import { api } from '../../services/api';
import { useToast } from './Toast';
import {
  User,
  Household,
  Membership,
  Chore,
  DraftRound,
  InAppNotification,
  JoinRequest,
  UserSettings,
  DutySchedule,
} from '../../types';
import { AppTab } from './AppHeaderAndNav';

const OnboardingModal = React.lazy(() =>
  import('../../features/auth/OnboardingModal').then((m) => ({ default: m.OnboardingModal }))
);
const AppShowcase = React.lazy(() =>
  import('../../features/auth/AppShowcase').then((m) => ({ default: m.AppShowcase }))
);
const HouseholdSwitcherModal = React.lazy(() =>
  import('../../features/household/HouseholdSwitcherModal').then((m) => ({
    default: m.HouseholdSwitcherModal,
  }))
);
const CreateHouseholdFlowModal = React.lazy(() =>
  import('../../features/household/CreateHouseholdFlowModal').then((m) => ({
    default: m.CreateHouseholdFlowModal,
  }))
);
const JoinHouseholdFlowModal = React.lazy(() =>
  import('../../features/household/JoinHouseholdFlowModal').then((m) => ({
    default: m.JoinHouseholdFlowModal,
  }))
);
const JoinRequestReviewModal = React.lazy(() =>
  import('../../features/household/JoinRequestReviewModal').then((m) => ({
    default: m.JoinRequestReviewModal,
  }))
);
const ShowQRModal = React.lazy(() =>
  import('../../features/household/ShowQRModal').then((m) => ({ default: m.ShowQRModal }))
);
const NotificationsModal = React.lazy(() =>
  import('../../features/notifications/NotificationsModal').then((m) => ({
    default: m.NotificationsModal,
  }))
);
const ProfileSettingsModal = React.lazy(() =>
  import('../../features/profile/ProfileSettingsModal').then((m) => ({
    default: m.ProfileSettingsModal,
  }))
);
const FeedbackModal = React.lazy(() =>
  import('../../features/profile/FeedbackModal').then((m) => ({ default: m.FeedbackModal }))
);
const DebugInspectorModal = React.lazy(() =>
  import('./DebugInspectorModal').then((m) => ({
    default: m.DebugInspectorModal,
  }))
);
const DutyTimetableModal = React.lazy(() =>
  import('../../features/chores/DutyTimetableModal').then((m) => ({
    default: m.DutyTimetableModal,
  }))
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

interface AppModalsProps {
  activeHousehold: Household;
  households: Household[];
  currentUser: User;
  members: { user: User; membership: Membership }[];
  chores: Chore[];
  draftRound: DraftRound;
  notifications: InAppNotification[];
  settings: UserSettings;
  dutySchedule: DutySchedule | null;
  pendingInviteCode: string | null;
  isDemoMode: boolean;
  syncStatus: SyncStatusType;
  lastSyncedTime: string;
  showOnboarding: boolean;
  showShowcase: boolean;
  householdSwitcherOpen: boolean;
  createHouseholdOpen: boolean;
  joinHouseholdOpen: boolean;
  reviewJoinRequest: JoinRequest | null;
  showQROpen: boolean;
  notificationsOpen: boolean;
  profileSettingsOpen: boolean;
  feedbackOpen: boolean;
  syncPanelOpen: boolean;
  debugInspectorOpen: boolean;
  dutyTimetableOpen: boolean;
  setShowOnboarding: (open: boolean) => void;
  setShowShowcase: (open: boolean) => void;
  setHouseholdSwitcherOpen: (open: boolean) => void;
  setCreateHouseholdOpen: (open: boolean) => void;
  setJoinHouseholdOpen: (open: boolean) => void;
  setReviewJoinRequest: (req: JoinRequest | null) => void;
  setShowQROpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setProfileSettingsOpen: (open: boolean) => void;
  setFeedbackOpen: (open: boolean) => void;
  setSyncPanelOpen: (open: boolean) => void;
  setDebugInspectorOpen: (open: boolean) => void;
  setDutyTimetableOpen: (open: boolean) => void;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setDutySchedule: React.Dispatch<React.SetStateAction<DutySchedule | null>>;
  setSyncStatus: (status: SyncStatusType) => void;
  setIsOffline: (offline: boolean) => void;
  setNeedsHouseholdSetup: (needs: boolean) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setSelectedExpenseId: (id: string | null) => void;
  setActiveTab: (tab: AppTab) => void;
  setDraftFlowState: (state: 'none' | 'picking' | 'waiting' | 'reveal') => void;
  updatePendingInviteCode: (code: string | null) => void;
  refreshSavedAccounts: () => void;
  handleManualSync: () => void;
  loadData: () => Promise<void>;
}

export const AppModals: React.FC<AppModalsProps> = ({
  activeHousehold,
  households,
  currentUser,
  members,
  chores,
  draftRound,
  notifications,
  settings,
  dutySchedule,
  pendingInviteCode,
  isDemoMode,
  syncStatus,
  lastSyncedTime,
  showOnboarding,
  showShowcase,
  householdSwitcherOpen,
  createHouseholdOpen,
  joinHouseholdOpen,
  reviewJoinRequest,
  showQROpen,
  notificationsOpen,
  profileSettingsOpen,
  feedbackOpen,
  syncPanelOpen,
  debugInspectorOpen,
  dutyTimetableOpen,
  setShowOnboarding,
  setShowShowcase,
  setHouseholdSwitcherOpen,
  setCreateHouseholdOpen,
  setJoinHouseholdOpen,
  setReviewJoinRequest,
  setShowQROpen,
  setNotificationsOpen,
  setProfileSettingsOpen,
  setFeedbackOpen,
  setSyncPanelOpen,
  setDebugInspectorOpen,
  setDutyTimetableOpen,
  setSettings,
  setCurrentUser,
  setDutySchedule,
  setSyncStatus,
  setIsOffline,
  setNeedsHouseholdSetup,
  setIsAuthenticated,
  setSelectedExpenseId,
  setActiveTab,
  setDraftFlowState,
  updatePendingInviteCode,
  refreshSavedAccounts,
  handleManualSync,
  loadData,
}) => {
  const { showToast } = useToast();
  const roommatesList = members.map((m) => m.user);
  const currentMembership =
    members.find((m) => m.user.id === currentUser.id)?.membership || null;

  return (
    <React.Suspense fallback={<ModalSkeleton />}>
      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onComplete={() => setShowOnboarding(false)}
          currency={activeHousehold.currency}
        />
      )}

      {showShowcase && (
        <AppShowcase
          isActive={showShowcase}
          onComplete={() => setShowShowcase(false)}
          onSkip={() => setShowShowcase(false)}
          onSignIn={() => setShowShowcase(false)}
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
          onCreate={async (name, currency, options) => {
            const newH = await api.createHousehold(name, currency, options);
            await loadData();
            return newH;
          }}
        />
      )}

      {joinHouseholdOpen && (
        <JoinHouseholdFlowModal
          isOpen={joinHouseholdOpen}
          initialCode={pendingInviteCode}
          onClose={() => setJoinHouseholdOpen(false)}
          onJoin={async (code) => {
            const res = await api.joinHousehold(code);
            await loadData();
            return res;
          }}
          onCompleted={() => {
            updatePendingInviteCode(null);
          }}
        />
      )}

      {Boolean(reviewJoinRequest) && (
        <JoinRequestReviewModal
          isOpen={Boolean(reviewJoinRequest)}
          onClose={() => setReviewJoinRequest(null)}
          joinRequest={reviewJoinRequest}
          currentUser={currentUser}
          currentMembership={currentMembership}
          roommates={roommatesList}
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
            a.download = `roomie-data-${activeHousehold.name
              .toLowerCase()
              .replace(/\s+/g, '-')}.json`;
            a.click();
            showToast('Household data exported!', 'success');
          }}
          onDeleteAccount={() => {
            api.resetData();
            loadData();
            showToast('Account data reset to fresh demo state.', 'info');
          }}
          isLoginSaved={api.isCurrentUserLoginSaved()}
          onToggleSaveLogin={
            isDemoMode
              ? undefined
              : async (save) => {
                  const saved = await api.setCurrentUserLoginSaved(save);
                  refreshSavedAccounts();
                  return saved;
                }
          }
          onSignOut={async (options) => {
            await api.signOut(options);
            refreshSavedAccounts();
            setNeedsHouseholdSetup(false);
            setIsAuthenticated(false);
            showToast('Signed out of Roomie', 'info');
          }}
          onOpenFeedback={() => setFeedbackOpen(true)}
          onOpenHowItWorks={() => setShowOnboarding(true)}
          onOpenShowcase={() => setShowShowcase(true)}
          onOpenHouseholdSetup={() => {
            api.markHouseholdSetupPending();
            setNeedsHouseholdSetup(true);
          }}
          onOpenDebugInspector={() => setDebugInspectorOpen(true)}
        />
      )}

      {feedbackOpen && (
        <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      )}

      {syncPanelOpen && (
        <SyncStatusPanel
          isOpen={syncPanelOpen}
          onClose={() => setSyncPanelOpen(false)}
          status={syncStatus}
          onSetStatus={(next) => {
            setSyncStatus(next);
            setIsOffline(next === 'offline');
          }}
          lastSyncedTime={lastSyncedTime}
          onTriggerSync={handleManualSync}
          householdName={activeHousehold.name}
          onOpenDebugInspector={() => setDebugInspectorOpen(true)}
        />
      )}

      {debugInspectorOpen && (
        <DebugInspectorModal
          isOpen={debugInspectorOpen}
          onClose={() => setDebugInspectorOpen(false)}
        />
      )}

      {dutyTimetableOpen && (
        <DutyTimetableModal
          isOpen={dutyTimetableOpen}
          onClose={() => setDutyTimetableOpen(false)}
          dutySchedule={dutySchedule}
          roommates={roommatesList}
          chores={chores}
          currentUser={currentUser}
          currentMembership={currentMembership}
          onReassignDay={async (day, userId) => {
            const updated = await api.reassignDutyDay(day, userId);
            setDutySchedule(updated);
          }}
          onSwapDays={async (day1, day2) => {
            const updated = await api.swapDutyDays(day1, day2);
            setDutySchedule(updated);
          }}
          onCompleteTodayDuty={async (day) => {
            await api.completeDutyDay(day);
            if (activeHousehold) {
              const refreshed = await api.getDutySchedule(activeHousehold.id);
              setDutySchedule(refreshed);
            }
            await loadData();
          }}
        />
      )}
    </React.Suspense>
  );
};
