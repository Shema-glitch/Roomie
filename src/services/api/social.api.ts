/**
 * Roomie Social API: Phase 2 Features (Awards, Vibe Checks, Favor Tokens)
 */

import {
  WeeklyAward,
  WeeklyVibeCheck,
  HouseholdVibeSummary,
  VibeRating,
  ChoreSwapRequest,
  FavorTokenTransaction,
} from '../../types';
import { AppStore, saveStore, makeEntityId, isUuid } from './shared';
import { evaluateWeeklyAwards } from '../../utils/awards';
import {
  calculateHouseholdVibe,
  createAnonymousVibeCheck,
  getCurrentWeekKey,
} from '../../utils/vibe';
import {
  canAffordSwap,
  createChoreSwapRequest,
  resolveChoreSwapRequest,
  applyTokenTransactions,
  INITIAL_FAVOR_TOKENS,
  DEFAULT_SWAP_COST,
} from '../../utils/tokens';

export class SocialApi {
  constructor(private getStore: () => AppStore) {}

  // -------------------------------------------------------------
  // 1. Weekly Awards (Everyone Wins)
  // -------------------------------------------------------------

  async getWeeklyAwards(householdId?: string): Promise<WeeklyAward[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    if (!store.weeklyAwards) store.weeklyAwards = {};
    if (!store.weeklyAwards[hId] || store.weeklyAwards[hId].length === 0) {
      return this.refreshWeeklyAwards(hId);
    }
    return store.weeklyAwards[hId];
  }

  async refreshWeeklyAwards(householdId?: string): Promise<WeeklyAward[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const householdMembers = store.users;
    const assignments = store.draftRounds?.[hId]?.assignments || [];
    const kudos = assignments.flatMap((a) => a.kudos || []);
    const expenses = (store.expenses || []).filter((e) => e.householdId === hId);

    const awards = evaluateWeeklyAwards({
      householdId: hId,
      weekLabel: 'Weekly Honors',
      users: householdMembers,
      assignments,
      kudos,
      expenses,
    });

    if (!store.weeklyAwards) store.weeklyAwards = {};
    store.weeklyAwards[hId] = awards;
    saveStore(store);
    return awards;
  }

  // -------------------------------------------------------------
  // 2. Anonymous Vibe Check
  // -------------------------------------------------------------

  async getVibeSummary(householdId?: string, weekKey?: string): Promise<HouseholdVibeSummary> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const wKey = weekKey || getCurrentWeekKey();
    if (!store.vibeChecks) store.vibeChecks = {};
    const submissions = store.vibeChecks[hId] || [];
    return calculateHouseholdVibe(hId, wKey, submissions, 3);
  }

  async submitVibeCheck(rating: VibeRating, householdId?: string): Promise<HouseholdVibeSummary> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const wKey = getCurrentWeekKey();
    if (!store.vibeChecks) store.vibeChecks = {};
    if (!store.vibeChecks[hId]) store.vibeChecks[hId] = [];

    const newVibe = createAnonymousVibeCheck(hId, wKey, rating);
    store.vibeChecks[hId].push(newVibe);
    saveStore(store);

    return calculateHouseholdVibe(hId, wKey, store.vibeChecks[hId], 3);
  }

  // -------------------------------------------------------------
  // 3. Favor Tokens & Chore Swaps
  // -------------------------------------------------------------

  async getFavorTokenBalance(userId?: string): Promise<number> {
    const store = this.getStore();
    const uId = userId || store.currentUser.id;
    if (!store.favorTokens) store.favorTokens = {};
    if (store.favorTokens[uId] === undefined) {
      store.favorTokens[uId] = INITIAL_FAVOR_TOKENS;
      saveStore(store);
    }
    return store.favorTokens[uId];
  }

  async getSwapRequests(householdId?: string): Promise<ChoreSwapRequest[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    if (!store.swapRequests) store.swapRequests = {};
    return store.swapRequests[hId] || [];
  }

  async createSwapRequest(params: {
    targetUserId: string;
    requesterChoreName: string;
    targetChoreName: string;
    tokenCost?: number;
    note?: string;
  }): Promise<{ success: boolean; request?: ChoreSwapRequest; error?: string }> {
    const store = this.getStore();
    const hId = store.activeHouseholdId;
    const requesterId = store.currentUser.id;
    const cost = params.tokenCost ?? DEFAULT_SWAP_COST;

    const currentBalance = await this.getFavorTokenBalance(requesterId);
    if (!canAffordSwap(currentBalance, cost)) {
      return { success: false, error: 'Not enough favor tokens for this swap offer.' };
    }

    const swapRequest = createChoreSwapRequest({
      householdId: hId,
      requesterUserId: requesterId,
      targetUserId: params.targetUserId,
      requesterChoreName: params.requesterChoreName,
      targetChoreName: params.targetChoreName,
      tokenCost: cost,
      note: params.note,
    });

    if (!store.swapRequests) store.swapRequests = {};
    if (!store.swapRequests[hId]) store.swapRequests[hId] = [];
    store.swapRequests[hId].unshift(swapRequest);
    saveStore(store);

    return { success: true, request: swapRequest };
  }

  async resolveSwapRequest(
    requestId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; request?: ChoreSwapRequest }> {
    const store = this.getStore();
    const hId = store.activeHouseholdId;
    if (!store.swapRequests || !store.swapRequests[hId]) {
      return { success: false };
    }

    const reqIdx = store.swapRequests[hId].findIndex((r) => r.id === requestId);
    if (reqIdx === -1) return { success: false };

    const originalReq = store.swapRequests[hId][reqIdx];
    const resolution = resolveChoreSwapRequest(originalReq, action);
    store.swapRequests[hId][reqIdx] = resolution.updatedRequest;

    if (resolution.transferred && resolution.transactions.length > 0) {
      if (!store.favorTokens) store.favorTokens = {};
      if (!store.favorTransactions) store.favorTransactions = {};
      if (!store.favorTransactions[hId]) store.favorTransactions[hId] = [];

      store.favorTransactions[hId].push(...resolution.transactions);

      // Update balances
      const reqBalance = store.favorTokens[originalReq.requesterUserId] ?? INITIAL_FAVOR_TOKENS;
      const targetBalance = store.favorTokens[originalReq.targetUserId] ?? INITIAL_FAVOR_TOKENS;

      store.favorTokens[originalReq.requesterUserId] = applyTokenTransactions(
        reqBalance,
        resolution.transactions,
        originalReq.requesterUserId
      );
      store.favorTokens[originalReq.targetUserId] = applyTokenTransactions(
        targetBalance,
        resolution.transactions,
        originalReq.targetUserId
      );
    }

    saveStore(store);
    return { success: true, request: resolution.updatedRequest };
  }
}
