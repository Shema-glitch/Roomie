import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { useToast } from '../components/common/Toast';
import { SyncStatusType } from '../components/common/SyncStatusPanel';
import {
  captureInviteCodeFromLocation,
  setPendingInviteCode,
  subscribeToAppDeepLinks,
} from '../utils/inviteLink';
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
  InAppNotification,
  JoinRequest,
  UserSettings,
  DutySchedule,
} from '../types';
import { NetBalance } from '../utils/balances';

export function useRoomieAppState(onOpenJoinHousehold: () => void) {
  const { showToast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => api.hasLocalSession());
  const [needsHouseholdSetup, setNeedsHouseholdSetup] = useState<boolean>(() =>
    api.hasLocalSession() ? api.needsHouseholdSetup() : false
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => api.isDemoMode());
  const [savedAccounts, setSavedAccounts] = useState(() => api.getSavedLoginAccounts());
  const refreshSavedAccounts = () => setSavedAccounts(api.getSavedLoginAccounts());

  const [pendingInviteCode, setPendingInviteCodeState] = useState<string | null>(() =>
    captureInviteCodeFromLocation()
  );
  const authGateRef = useRef({ isAuthenticated: false, needsHouseholdSetup: false });
  authGateRef.current = { isAuthenticated, needsHouseholdSetup };

  const updatePendingInviteCode = (code: string | null) => {
    setPendingInviteCode(code);
    setPendingInviteCodeState(code);
  };

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const [dutySchedule, setDutySchedule] = useState<DutySchedule | null>(null);
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

  const loadData = async () => {
    setLoadError(null);
    try {
      const u = await api.getCurrentUser();
      const hList = await api.getHouseholds();
      const activeH = await api.getActiveHousehold();
      const notifList = await api.getNotifications();
      const setts = await api.getSettings();
      const demoActive = api.isDemoMode();

      setCurrentUser(u);
      setHouseholds(hList);
      setActiveHousehold(activeH);
      setNotifications(notifList);
      setSettings(setts);
      setIsDemoMode(demoActive);
      sound.setEnabled(setts.soundEnabled);

      if (!activeH) {
        setMembers([]);
        setChores([]);
        setDraftRound(null);
        setExpenses([]);
        setSettlements([]);
        setMessages([]);
        setTopics([]);
        setAgreements([]);
        setJoinRequests([]);
        setBalances({ userSummaries: {}, simplifiedDebts: [] });
        setNeedsHouseholdSetup(true);
        return;
      }

      const memList = await api.getHouseholdMembers(activeH.id);
      const chList = await api.getChores(activeH.id);
      const dRound = await api.getDraftRound(activeH.id);
      const expList = await api.getExpenses(activeH.id);
      const setList = await api.getSettlements(activeH.id);
      const msgList = await api.getMessages(activeH.id);
      const topList = await api.getMeetingTopics(activeH.id);
      const agrList = await api.getAgreements(activeH.id);
      const jrList = await api.getJoinRequests(activeH.id);
      const balOverview = await api.getBalancesOverview(activeH.id);
      const dSchedule = await api.getDutySchedule(activeH.id);

      setMembers(memList);
      setChores(chList);
      setDraftRound(dRound);
      setExpenses(expList);
      setSettlements(setList);
      setMessages(msgList);
      setTopics(topList);
      setAgreements(agrList);
      setJoinRequests(jrList);
      setBalances(balOverview);
      setDutySchedule(dSchedule);

      await api.checkDutyDayReminder();
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load apartment data.');
    }
  };

  const handleManualSync = () => {
    sound.playTap();
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      setIsOffline(false);
      setLastSyncedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      showToast('Synced with apartment database', 'info');
      loadData();
    }, 1000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('demo') === '1') {
        setIsAuthenticated(true);
        loadData();
        return;
      }
    }

    api
      .getSession()
      .then(async (session) => {
        if (session) {
          setIsAuthenticated(true);
          const hList = await api.getHouseholds();
          const needsSetup = hList.length === 0 || api.needsHouseholdSetup();
          setNeedsHouseholdSetup(needsSetup);
          if (!needsSetup && pendingInviteCode) {
            onOpenJoinHousehold();
          }
        } else if (api.hasLocalSession()) {
          setIsAuthenticated(true);
          const needsSetup = api.needsHouseholdSetup();
          setNeedsHouseholdSetup(needsSetup);
          if (!needsSetup && pendingInviteCode) {
            onOpenJoinHousehold();
          }
        } else {
          setIsAuthenticated(false);
          setNeedsHouseholdSetup(false);
        }
        loadData();
      })
      .catch(() => {
        if (api.hasLocalSession()) {
          setIsAuthenticated(true);
          setNeedsHouseholdSetup(api.needsHouseholdSetup());
        }
        loadData();
      });

    const unsubLinks = subscribeToAppDeepLinks((code) => {
      setPendingInviteCodeState(code);
      if (authGateRef.current.isAuthenticated && !authGateRef.current.needsHouseholdSetup) {
        onOpenJoinHousehold();
      }
    });

    const unsubAuth = api.onAuthStateChange(async (event, hasSession) => {
      if (api.isDemoMode()) return;
      if (hasSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setIsDemoMode(false);
        setIsAuthenticated(true);
        if (event === 'SIGNED_IN') {
          const hList = await api.getHouseholds();
          const needsSetup = hList.length === 0 || api.needsHouseholdSetup();
          setNeedsHouseholdSetup(needsSetup);
          await loadData();
        }
      } else if (!hasSession && event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setNeedsHouseholdSetup(false);
      }
    });

    return () => {
      unsubLinks();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!activeHousehold?.id) return;
    const unsubscribe = api.subscribeToHousehold(activeHousehold.id, () => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [activeHousehold?.id]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (settings.language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', settings.language || 'en');
    }
  }, [settings.language]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.reducedMotion]);

  return {
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
  };
}
