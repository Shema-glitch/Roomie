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

    const summary = calculateHouseholdVibe(hId, wKey, store.vibeChecks[hId], 3);
    // Notify household members when the 3-vote k-anonymity threshold unlocks the weekly pulse
    if (summary.revealed && summary.submissionCount === 3 && store.notifications) {
      store.users.forEach((u) => {
        store.notifications.unshift({
          id: `notif_vibe_${Date.now()}_${u.id}`,
          userId: u.id,
          type: 'household',
          title: 'Apartment Vibe Pulse Unlocked!',
          body: `3 roommates have checked in anonymously this week. Tap to see how the flat is feeling.`,
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'feed' },
        });
      });
    }

    saveStore(store);
    return summary;
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

    // Emit in-app notification for the target roommate
    if (store.notifications) {
      const requester = store.users.find((u) => u.id === requesterId);
      store.notifications.unshift({
        id: `notif_swap_offer_${Date.now()}`,
        userId: params.targetUserId,
        type: 'chore',
        title: `Chore Swap Offer (+${cost} Favor Token${cost > 1 ? 's' : ''})`,
        body: `${requester?.name.split(' ')[0] || 'A roommate'} offered ${cost} Favor Token${cost > 1 ? 's' : ''} if you take "${params.requesterChoreName}"${params.note ? ` — "${params.note}"` : ''}.`,
        read: false,
        createdAt: new Date().toISOString(),
        linkTarget: { screen: 'chores', id: swapRequest.id },
      });
    }

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
    // Guard against repeated resolutions / double spend
    if (originalReq.status !== 'pending') {
      return { success: false, request: originalReq };
    }

    if (action === 'accept') {
      if (!store.favorTokens) store.favorTokens = {};
      const reqBalance = store.favorTokens[originalReq.requesterUserId] ?? INITIAL_FAVOR_TOKENS;
      if (reqBalance < originalReq.tokenCost) {
        return { success: false, request: originalReq };
      }
    }

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

      const newReqBalance = applyTokenTransactions(
        reqBalance,
        resolution.transactions,
        originalReq.requesterUserId
      );
      const newTargetBalance = applyTokenTransactions(
        targetBalance,
        resolution.transactions,
        originalReq.targetUserId
      );

      store.favorTokens[originalReq.requesterUserId] = newReqBalance;
      store.favorTokens[originalReq.targetUserId] = newTargetBalance;

      // Keep currentUser.favorTokens in sync for reactive UI
      if (store.currentUser.id === originalReq.requesterUserId) {
        store.currentUser.favorTokens = newReqBalance;
      } else if (store.currentUser.id === originalReq.targetUserId) {
        store.currentUser.favorTokens = newTargetBalance;
      }

      // Reassign chore upon mutual consent
      if (store.draftRounds?.[hId]?.assignments) {
        const choreObj = (store.chores || []).find((c) => c.name === originalReq.requesterChoreName);
        const choreId = choreObj?.id;
        const assignment = store.draftRounds[hId].assignments.find(
          (a) => a.userId === originalReq.requesterUserId && (!choreId || a.choreId === choreId)
        );
        if (assignment) {
          assignment.userId = originalReq.targetUserId;
        }
      }

      // Warm chat activity announcement
      const requester = store.users.find((u) => u.id === originalReq.requesterUserId);
      const target = store.users.find((u) => u.id === originalReq.targetUserId);
      if (store.messages && store.messages[hId]) {
        store.messages[hId].push({
          id: `msg_swap_${Date.now()}`,
          householdId: hId,
          senderId: null,
          type: 'activity',
          body: `${target?.name.split(' ')[0] || 'Roommate'} accepted a chore swap with ${requester?.name.split(' ')[0] || 'roomie'} (+${originalReq.tokenCost} Favor Token${originalReq.tokenCost > 1 ? 's' : ''})!`,
          createdAt: new Date().toISOString(),
        });
      }

      if (store.notifications) {
        store.notifications.unshift({
          id: `notif_swap_accept_${Date.now()}`,
          userId: originalReq.requesterUserId,
          type: 'chore',
          title: 'Chore Swap Accepted!',
          body: `${target?.name.split(' ')[0] || 'Your roommate'} accepted your swap for "${originalReq.requesterChoreName}" (${originalReq.tokenCost} Favor Token${originalReq.tokenCost > 1 ? 's' : ''} transferred).`,
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'chores', id: originalReq.id },
        });
      }
    } else if (action === 'decline' && store.notifications) {
      const target = store.users.find((u) => u.id === originalReq.targetUserId);
      store.notifications.unshift({
        id: `notif_swap_decline_${Date.now()}`,
        userId: originalReq.requesterUserId,
        type: 'chore',
        title: 'Chore Swap Declined — Tokens Kept',
        body: `${target?.name.split(' ')[0] || 'Your roommate'} couldn't take "${originalReq.requesterChoreName}" right now. Your Favor Tokens were not spent.`,
        read: false,
        createdAt: new Date().toISOString(),
        linkTarget: { screen: 'chores', id: originalReq.id },
      });
    }

    saveStore(store);
    return { success: true, request: resolution.updatedRequest };
  }
}
