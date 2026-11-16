/**
 * Roomie Instant Local-First Snapshot Cache
 * - Saves per-household snapshots (`roomie_snapshot_${householdId}`) in localStorage + IndexedDB
 * - Hydrates initial app state synchronously on boot in 0ms (zero loading spinner when cached)
 * - Updates the snapshot immediately on every optimistic mutation (chore done, expense added,
 *   vibe check submitted, token swap resolved) while background sync runs silently.
 */

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
  DutySchedule,
  UserSettings,
  WeeklyAward,
  HouseholdVibeSummary,
  ChoreSwapRequest,
  CulturalDinner,
} from '../types';
import { NetBalance, calculateBalances } from '../utils/balances';
import { evaluateWeeklyAwards } from '../utils/awards';
import { calculateHouseholdVibe, getCurrentWeekKey } from '../utils/vibe';
import { INITIAL_FAVOR_TOKENS, MAX_FAVOR_TOKENS } from '../utils/tokens';
import { AppStore } from './api/shared';

export const SNAPSHOT_KEY_PREFIX = 'roomie_snapshot_';
export const ACTIVE_SNAPSHOT_HOUSEHOLD_KEY = 'roomie_active_snapshot_household_id';
const IDB_NAME = 'roomie_snapshots_db';
const IDB_STORE = 'snapshots';

export interface HouseholdSnapshot {
  householdId: string;
  updatedAt: string;
  currentUser: User;
  households: Household[];
  activeHousehold: Household;
  members: { user: User; membership: Membership }[];
  chores: Chore[];
  draftRound: DraftRound;
  expenses: Expense[];
  settlements: Settlement[];
  messages: ChatMessage[];
  topics: MeetingTopic[];
  agreements: HouseAgreement[];
  notifications: InAppNotification[];
  joinRequests: JoinRequest[];
  dutySchedule: DutySchedule | null;
  settings: UserSettings;
  balances: {
    userSummaries: Record<string, number>;
    simplifiedDebts: NetBalance[];
  };
  weeklyAwards: WeeklyAward[];
  vibeSummary: HouseholdVibeSummary;
  pendingSwaps: ChoreSwapRequest[];
  culturalDinners?: CulturalDinner[];
}

class LocalSnapshotCacheService {
  private memoryCache = new Map<string, HouseholdSnapshot>();

  public getStorageKey(householdId: string): string {
    return `${SNAPSHOT_KEY_PREFIX}${householdId}`;
  }

  /**
   * Synchronously reads a household snapshot from memory or localStorage in 0ms.
   */
  public getSnapshot(householdId?: string | null): HouseholdSnapshot | null {
    const targetId = householdId || this.getActiveHouseholdId();
    if (!targetId) return null;

    const inMem = this.memoryCache.get(targetId);
    if (inMem) return inMem;

    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.getStorageKey(targetId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as HouseholdSnapshot;
      if (parsed && parsed.householdId === targetId && parsed.activeHousehold && parsed.currentUser) {
        this.memoryCache.set(targetId, parsed);
        return parsed;
      }
    } catch {
      // Corrupt or unavailable storage -> ignore
    }
    return null;
  }

  public getActiveHouseholdId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(ACTIVE_SNAPSHOT_HOUSEHOLD_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Saves a household snapshot synchronously to memory + localStorage
   * and mirrors it asynchronously to IndexedDB when available.
   */
  public saveSnapshot(householdId: string, snapshot: HouseholdSnapshot): HouseholdSnapshot {
    this.memoryCache.set(householdId, snapshot);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_SNAPSHOT_HOUSEHOLD_KEY, householdId);
        localStorage.setItem(this.getStorageKey(householdId), JSON.stringify(snapshot));
      } catch {
        // Quota exceeded or private browsing restriction
      }
      this.writeToIndexedDB(householdId, snapshot);
    }

    return snapshot;
  }

  /**
   * Applies an immediate optimistic mutation patch to a cached household snapshot.
   */
  public patchSnapshot(
    householdId: string,
    updater: (prev: HouseholdSnapshot) => HouseholdSnapshot
  ): HouseholdSnapshot | null {
    const existing = this.getSnapshot(householdId);
    if (!existing) return null;
    const next: HouseholdSnapshot = {
      ...updater(existing),
      updatedAt: new Date().toISOString(),
    };
    return this.saveSnapshot(householdId, next);
  }

  /**
   * Builds and persists a complete HouseholdSnapshot directly from the local AppStore.
   * Called on boot fallback and immediately after every optimistic mutation.
   */
  public syncSnapshotFromStore(store: AppStore, householdId?: string): HouseholdSnapshot | null {
    const hId = householdId || store.activeHouseholdId;
    if (!hId) return null;

    const activeHousehold =
      store.households.find((h) => h.id === hId) || store.households[0] || null;
    if (!activeHousehold) return null;

    const memberships = (store.memberships || []).filter(
      (m) => m.householdId === hId && m.status === 'active'
    );
    const members = memberships
      .map((m) => {
        const user = store.users.find((u) => u.id === m.userId);
        return user ? { user, membership: m } : null;
      })
      .filter((item): item is { user: User; membership: Membership } => item !== null);

    const memberUsers = members.length > 0 ? members.map((m) => m.user) : store.users;
    const chores = (store.chores || []).filter((c) => c.householdId === hId && c.active);
    const draftRound: DraftRound = store.draftRounds?.[hId] || {
      id: `dr_${hId}`,
      householdId: hId,
      status: 'revealed',
      picks: [],
      assignments: [],
    };
    const expenses = (store.expenses || []).filter((e) => e.householdId === hId);
    const settlements = (store.settlements || []).filter((s) => s.householdId === hId);
    const messages = store.messages?.[hId] || [];
    const topics = store.meetingTopics?.[hId] || [];
    const agreements = store.agreements?.[hId] || [];
    const notifications = (store.notifications || [])
      .filter((n) => n.userId === store.currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const joinRequests = (store.joinRequests || []).filter((r) => r.householdId === hId);
    const dutySchedule = store.dutySchedules?.[hId] || null;

    const userIds = memberUsers.map((u) => u.id);
    const balances = calculateBalances(expenses, settlements, userIds);

    const tokenBalance = Math.min(
      MAX_FAVOR_TOKENS,
      Math.max(0, store.favorTokens?.[store.currentUser.id] ?? store.currentUser.favorTokens ?? INITIAL_FAVOR_TOKENS)
    );
    const currentUser: User = {
      ...store.currentUser,
      favorTokens: tokenBalance,
    };

    const weeklyAwards =
      store.weeklyAwards?.[hId] && store.weeklyAwards[hId].length > 0
        ? store.weeklyAwards[hId]
        : evaluateWeeklyAwards({
            householdId: hId,
            weekLabel: 'Weekly Honors',
            users: memberUsers,
            assignments: draftRound.assignments,
            kudos: draftRound.assignments.flatMap((a) => a.kudos || []),
            expenses,
          });

    const weekKey = getCurrentWeekKey();
    const vibeChecks = store.vibeChecks?.[hId] || [];
    const vibeSummary = calculateHouseholdVibe(hId, weekKey, vibeChecks, 3);

    const allSwaps = store.swapRequests?.[hId] || [];
    const pendingSwaps = allSwaps.filter(
      (r) => r.targetUserId === currentUser.id && r.status === 'pending'
    );

    const snapshot: HouseholdSnapshot = {
      householdId: hId,
      updatedAt: new Date().toISOString(),
      currentUser,
      households: store.households,
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
      settings: store.settings,
      balances,
      weeklyAwards,
      vibeSummary,
      pendingSwaps,
      culturalDinners: store.culturalDinners?.[hId] || [],
    };

    return this.saveSnapshot(hId, snapshot);
  }

  /**
   * Hydrates the initial snapshot synchronously on boot:
   * returns existing `roomie_snapshot_${householdId}` if present, otherwise builds and caches
   * one synchronously from the local store so HomeScreen renders with real data in 0ms.
   */
  public hydrateOnBoot(store: AppStore): HouseholdSnapshot | null {
    const hId = store.activeHouseholdId || this.getActiveHouseholdId();
    if (!hId) return null;
    const cached = this.getSnapshot(hId);
    if (cached) return cached;
    return this.syncSnapshotFromStore(store, hId);
  }

  public clearSnapshot(householdId: string): void {
    this.memoryCache.delete(householdId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.getStorageKey(householdId));
      } catch {
        // Ignore storage errors
      }
    }
  }

  private writeToIndexedDB(householdId: string, snapshot: HouseholdSnapshot): void {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
      const openReq = window.indexedDB.open(IDB_NAME, 1);
      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'householdId' });
        }
      };
      openReq.onsuccess = () => {
        try {
          const db = openReq.result;
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(snapshot);
          tx.oncomplete = () => db.close();
        } catch {
          // IndexedDB write fallback
        }
      };
    } catch {
      // IndexedDB unavailable in environment
    }
  }
}

export const localCache = new LocalSnapshotCacheService();
export { LocalSnapshotCacheService };
