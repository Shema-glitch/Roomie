import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api, isUuid } from '../services/api';
import { supabase } from '../services/supabase';
import { localCache } from '../services/localCache';
import { sound } from '../services/sound';
import { haptics } from '../utils/haptics';
import { setLocale } from '../i18n';
import {
  initDeviceNotificationChannel,
  requestDeviceNotificationPermission,
  showDeviceNotification,
} from '../utils/deviceNotifications';
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
  const onOpenJoinHouseholdRef = useRef(onOpenJoinHousehold);
  onOpenJoinHouseholdRef.current = onOpenJoinHousehold;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => api.hasLocalSession());
  const [needsHouseholdSetup, setNeedsHouseholdSetup] = useState<boolean>(() =>
    api.hasLocalSession() ? api.needsHouseholdSetup() : false
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => api.isDemoMode());
  const [savedAccounts, setSavedAccounts] = useState(() => api.getSavedLoginAccounts());
  const refreshSavedAccounts = useCallback(() => {
    setSavedAccounts(api.getSavedLoginAccounts());
  }, []);

  const [pendingInviteCode, setPendingInviteCodeState] = useState<string | null>(() =>
    captureInviteCodeFromLocation()
  );
  const authGateRef = useRef({ isAuthenticated: false, needsHouseholdSetup: false });
  authGateRef.current = { isAuthenticated, needsHouseholdSetup };

  const updatePendingInviteCode = useCallback((code: string | null) => {
    setPendingInviteCode(code);
    setPendingInviteCodeState(code);
  }, []);

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Synchronous 0ms hydration from cached household snapshot
  const initialSnapshot = useMemo(() => localCache.hydrateOnBoot(api.store), []);

  const [currentUser, setCurrentUser] = useState<User | null>(
    () => initialSnapshot?.currentUser || null
  );
  const [households, setHouseholds] = useState<Household[]>(
    () => initialSnapshot?.households || []
  );
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(
    () => initialSnapshot?.activeHousehold || null
  );
  const [members, setMembers] = useState<{ user: User; membership: Membership }[]>(
    () => initialSnapshot?.members || []
  );
  const [chores, setChores] = useState<Chore[]>(() => initialSnapshot?.chores || []);
  const [draftRound, setDraftRound] = useState<DraftRound | null>(
    () => initialSnapshot?.draftRound || null
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => initialSnapshot?.expenses || []);
  const [settlements, setSettlements] = useState<Settlement[]>(
    () => initialSnapshot?.settlements || []
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialSnapshot?.messages || []);
  const [topics, setTopics] = useState<MeetingTopic[]>(() => initialSnapshot?.topics || []);
  const [agreements, setAgreements] = useState<HouseAgreement[]>(
    () => initialSnapshot?.agreements || []
  );
  const [notifications, setNotifications] = useState<InAppNotification[]>(
    () => initialSnapshot?.notifications || []
  );
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(
    () => initialSnapshot?.joinRequests || []
  );
  const [dutySchedule, setDutySchedule] = useState<DutySchedule | null>(
    () => initialSnapshot?.dutySchedule || null
  );
  const [settings, setSettings] = useState<UserSettings>(
    () =>
      initialSnapshot?.settings || {
        language: 'en',
        soundEnabled: false,
        reducedMotion: false,
        pushNotifications: true,
        reminderEarly30Min: true,
      }
  );
  const [balances, setBalances] = useState<{
    userSummaries: Record<string, number>;
    simplifiedDebts: NetBalance[];
  }>(() => initialSnapshot?.balances || { userSummaries: {}, simplifiedDebts: [] });

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [u, hList, activeH, notifList, setts] = await Promise.all([
        api.getCurrentUser(),
        api.getHouseholds(),
        api.getActiveHousehold(),
        api.getNotifications(),
        api.getSettings(),
      ]);
      const demoActive = api.isDemoMode();

      setCurrentUser(u);
      setHouseholds(hList);
      setActiveHousehold(activeH);
      setNotifications(notifList);
      setSettings(setts);
      setIsDemoMode(demoActive);
      sound.setEnabled(setts.soundEnabled);
      if (setts.hapticsEnabled !== undefined) {
        haptics.setEnabled(setts.hapticsEnabled);
      }

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

      // If switching to another household that already has a cached snapshot, hydrate it immediately
      const cachedForTarget = localCache.getSnapshot(activeH.id);
      if (cachedForTarget) {
        setMembers(cachedForTarget.members);
        setChores(cachedForTarget.chores);
        setDraftRound(cachedForTarget.draftRound);
        setExpenses(cachedForTarget.expenses);
        setSettlements(cachedForTarget.settlements);
        setMessages(cachedForTarget.messages);
        setTopics(cachedForTarget.topics);
        setAgreements(cachedForTarget.agreements);
        setJoinRequests(cachedForTarget.joinRequests);
        setBalances(cachedForTarget.balances);
        setDutySchedule(cachedForTarget.dutySchedule);
      }

      const [
        memList,
        chList,
        dRound,
        expList,
        setList,
        msgList,
        topList,
        agrList,
        jrList,
        balOverview,
        dSchedule,
      ] = await Promise.all([
        api.getHouseholdMembers(activeH.id),
        api.getChores(activeH.id),
        api.getDraftRound(activeH.id),
        api.getExpenses(activeH.id),
        api.getSettlements(activeH.id),
        api.getMessages(activeH.id),
        api.getMeetingTopics(activeH.id),
        api.getAgreements(activeH.id),
        api.getJoinRequests(activeH.id),
        api.getBalancesOverview(activeH.id),
        api.getDutySchedule(activeH.id),
      ]);

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

      localCache.syncSnapshotFromStore(api.store, activeH.id);
      await api.checkDutyDayReminder();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load apartment data.';
      setLoadError(msg);
    }
  }, []);

  const handleManualSync = useCallback(() => {
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
  }, [loadData, showToast]);

  const roommatesList = useMemo(() => members.map((m) => m.user), [members]);
  const unreadNotifsCount = useMemo(() => {
    const pendingIds = new Set(joinRequests.map((r) => r.id));
    return notifications.reduce((count, n) => {
      if (n.read) return count;
      const titleLower = n.title.toLowerCase();
      const isActionableJoin =
        n.type === 'household' &&
        titleLower.includes('join request') &&
        !titleLower.includes('update');
      if (isActionableJoin) {
        if (joinRequests.length === 0) return count;
        const linkId = n.linkTarget?.id || (n.linkTarget as { requestId?: string } | undefined)?.requestId;
        if (linkId && !pendingIds.has(linkId)) return count;
      }
      return count + 1;
    }, 0);
  }, [notifications, joinRequests]);

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

    let lastRefreshMs = Date.now();
    const handleForegroundRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastRefreshMs < 3000) return;
      lastRefreshMs = now;
      loadData();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleForegroundRefresh);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleForegroundRefresh);
    }

    return () => {
      unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleForegroundRefresh);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleForegroundRefresh);
      }
    };
  }, [activeHousehold?.id, loadData]);

  // Native Android/Web Device Notifications via Supabase Realtime on public.notifications
  useEffect(() => {
    const uid = currentUser?.id;
    if (!isAuthenticated || isDemoMode || !uid || !isUuid(uid) || !supabase) return;
    const sb = supabase;

    initDeviceNotificationChannel();
    if (settings.pushNotifications !== false) {
      requestDeviceNotificationPermission().catch(() => {});
    }

    const channel = sb
      .channel(`user_notifications_${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            title?: string;
            body?: string;
            link_target?: Record<string, unknown>;
          };
          if (row?.title && row?.body) {
            showDeviceNotification({
              id: row.id,
              title: row.title,
              body: row.body,
              linkTarget: row.link_target,
            });
          }
          loadData();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [isAuthenticated, isDemoMode, currentUser?.id, settings.pushNotifications, loadData]);

  useEffect(() => {
    void setLocale(settings.language || 'en');
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
    roommatesList,
    unreadNotifsCount,
    loadData,
    handleManualSync,
  };
}
