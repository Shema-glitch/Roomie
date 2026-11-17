/**
 * Roomie Social API: Weekly Honors, Anonymous Vibe Pulse & Favor Token Swaps
 * Wired into the idempotent offline outbox queue (`src/services/outbox.ts`)
 * and tracked under the `'social'` module in `src/utils/debugLog.ts`.
 */

import {
  User,
  WeeklyAward,
  WeeklyVibeCheck,
  HouseholdVibeSummary,
  VibeRating,
  ChoreSwapRequest,
  CulturalDinner,
  DietaryTag,
} from '../../types';
import {
  AppStore,
  saveStore,
  makeEntityId,
  isUuid,
  createDomainLogger,
  dispatchRemoteMutation,
} from './shared';
import { OutboxActionType, outbox } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import { supabase } from '../supabase';
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
  awardFavorTokensWithCap,
  INITIAL_FAVOR_TOKENS,
  MAX_FAVOR_TOKENS,
  DEFAULT_SWAP_COST,
} from '../../utils/tokens';

const logger = createDomainLogger('SocialAPI', 'social');

export interface SocialContext {
  store: AppStore;
  save: (s?: AppStore) => void;
  isDemoMode: () => boolean;
  dispatchRemoteMutation: <T>(
    householdId: string,
    module: DebugModule,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: { message: string; code?: string } | null } | void>
  ) => void;
}

export interface ProposeChoreSwapParams {
  targetUserId: string;
  requesterChoreName: string;
  targetChoreName: string;
  tokenCost?: number;
  note?: string;
}

export class SocialApi {
  private getStoreFn: () => AppStore;
  private ctx?: SocialContext;

  constructor(storeOrContext: (() => AppStore) | SocialContext) {
    if (typeof storeOrContext === 'function') {
      this.getStoreFn = storeOrContext;
    } else {
      this.ctx = storeOrContext;
      this.getStoreFn = () => storeOrContext.store;
    }
  }

  private getStore(): AppStore {
    return this.getStoreFn();
  }

  private save(store: AppStore): void {
    if (this.ctx) {
      this.ctx.save(store);
    } else {
      saveStore(store);
    }
  }

  private isDemoMode(): boolean {
    if (this.ctx) return this.ctx.isDemoMode();
    const store = this.getStore();
    return store.householdSetupMode === 'demo' || !isUuid(store.activeHouseholdId);
  }

  private dispatchSocialOutbox<T>(
    householdId: string,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: { message: string; code?: string } | null } | void>
  ): void {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (this.ctx && !this.isDemoMode() && isUuid(householdId)) {
      this.ctx.dispatchRemoteMutation(
        householdId,
        'social',
        outboxType,
        payload,
        summary,
        remoteExec
      );
      return;
    }

    if (!this.isDemoMode() && isUuid(householdId)) {
      dispatchRemoteMutation(
        false,
        householdId,
        'social',
        outboxType,
        payload,
        summary,
        remoteExec
      );
      return;
    }

    if (isOffline) {
      outbox.enqueue(householdId, outboxType, payload);
    }
  }

  // -------------------------------------------------------------
  // 1. Weekly Awards (Everyone Wins)
  // -------------------------------------------------------------

  public async getWeeklyAwards(householdId?: string): Promise<WeeklyAward[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    return this.refreshWeeklyAwards(hId);
  }

  public async refreshWeeklyAwards(householdId?: string): Promise<WeeklyAward[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const activeMemberIds = new Set(
      (store.memberships || [])
        .filter((m) => m.householdId === hId && m.status === 'active')
        .map((m) => m.userId)
    );
    const householdMembers =
      activeMemberIds.size > 0
        ? store.users.filter((u) => activeMemberIds.has(u.id))
        : store.currentUser
        ? [store.currentUser]
        : [];
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
    this.save(store);
    logger.info('refresh_weekly_awards', `Evaluated ${awards.length} weekly honor badge(s)`, {
      householdId: hId,
      count: awards.length,
    });
    return awards;
  }

  // -------------------------------------------------------------
  // 2. Anonymous Vibe Check (k-anonymity >= 3)
  // -------------------------------------------------------------

  public async getVibeSummary(
    householdId?: string,
    weekKey?: string
  ): Promise<HouseholdVibeSummary> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const wKey = weekKey || getCurrentWeekKey();
    if (!store.vibeChecks) store.vibeChecks = {};
    const submissions = store.vibeChecks[hId] || [];
    return calculateHouseholdVibe(hId, wKey, submissions, 3);
  }

  public async submitVibePulse(
    rating: VibeRating,
    householdId?: string
  ): Promise<HouseholdVibeSummary> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const wKey = getCurrentWeekKey();
    if (!store.vibeChecks) store.vibeChecks = {};
    if (!store.vibeChecks[hId]) store.vibeChecks[hId] = [];

    const newVibe = createAnonymousVibeCheck(hId, wKey, rating);
    store.vibeChecks[hId].push(newVibe);

    const summary = calculateHouseholdVibe(hId, wKey, store.vibeChecks[hId], 3);
    if (summary.revealed && summary.submissionCount === 3 && store.notifications) {
      store.users.forEach((u) => {
        store.notifications.unshift({
          id: `notif_vibe_${Date.now()}_${u.id}`,
          userId: u.id,
          type: 'household',
          title: 'Apartment Vibe Pulse Unlocked!',
          body: '3 roommates have checked in anonymously this week. Tap to see how the flat is feeling.',
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'feed' },
        });
      });
    }

    this.save(store);
    logger.info('submit_vibe_pulse', `Submitted anonymous vibe check (${wKey})`, {
      householdId: hId,
      weekKey: wKey,
      submissionCount: summary.submissionCount,
      revealed: summary.revealed,
    });

    this.dispatchSocialOutbox(
      hId,
      'submit_vibe_pulse',
      { id: newVibe.id, householdId: hId, weekKey: wKey, rating, score: newVibe.score },
      `Anonymous vibe pulse (${wKey})`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('submit_anonymous_vibe', {
          p_household_id: hId,
          p_week_key: wKey,
          p_rating: rating,
        });
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return summary;
  }

  public async submitVibeCheck(
    rating: VibeRating,
    householdId?: string
  ): Promise<HouseholdVibeSummary> {
    return this.submitVibePulse(rating, householdId);
  }

  // -------------------------------------------------------------
  // 3. Favor Tokens & Chore Swaps (with MAX_FAVOR_TOKENS = 10 cap)
  // -------------------------------------------------------------

  public async getFavorTokenBalance(userId?: string): Promise<number> {
    const store = this.getStore();
    const uId = userId || store.currentUser.id;
    if (!store.favorTokens) store.favorTokens = {};
    if (store.favorTokens[uId] === undefined) {
      store.favorTokens[uId] = INITIAL_FAVOR_TOKENS;
      this.save(store);
    }
    return Math.min(MAX_FAVOR_TOKENS, Math.max(0, store.favorTokens[uId]));
  }

  public async awardFavorTokens(
    userId: string,
    amount: number,
    reason: 'streak_milestone' | 'weekly_award' | 'roommate_favor' = 'streak_milestone',
    note?: string
  ): Promise<{ newBalance: number; overflowConvertedToKudos: number }> {
    const store = this.getStore();
    const hId = store.activeHouseholdId;
    const currentBalance = await this.getFavorTokenBalance(userId);

    const outcome = awardFavorTokensWithCap({
      currentBalance,
      amount,
      householdId: hId,
      userId,
      reason,
      fromUserId: store.currentUser.id,
      note,
    });

    if (!store.favorTokens) store.favorTokens = {};
    store.favorTokens[userId] = outcome.newBalance;
    if (store.currentUser.id === userId) {
      store.currentUser.favorTokens = outcome.newBalance;
    }

    if (outcome.transaction) {
      if (!store.favorTransactions) store.favorTransactions = {};
      if (!store.favorTransactions[hId]) store.favorTransactions[hId] = [];
      store.favorTransactions[hId].push(outcome.transaction);
    }

    if (outcome.celebratoryKudos.length > 0 && store.draftRounds?.[hId]?.assignments) {
      const targetAssignment = store.draftRounds[hId].assignments.find((a) => a.userId === userId);
      if (targetAssignment) {
        targetAssignment.kudos.push(...outcome.celebratoryKudos);
      }
    }

    this.save(store);
    logger.info(
      'award_favor_tokens',
      `Awarded +${outcome.tokensAdded} token(s) to ${userId} (overflow kudos: ${outcome.overflowConvertedToKudos})`,
      {
        userId,
        newBalance: outcome.newBalance,
        overflowConvertedToKudos: outcome.overflowConvertedToKudos,
      }
    );

    return {
      newBalance: outcome.newBalance,
      overflowConvertedToKudos: outcome.overflowConvertedToKudos,
    };
  }

  public async proposeChoreSwap(
    params: ProposeChoreSwapParams
  ): Promise<{ success: boolean; request?: ChoreSwapRequest; error?: string }> {
    const store = this.getStore();
    const hId = store.activeHouseholdId;
    const requesterId = store.currentUser.id;
    const cost = params.tokenCost ?? DEFAULT_SWAP_COST;

    const currentBalance = await this.getFavorTokenBalance(requesterId);
    if (!canAffordSwap(currentBalance, cost)) {
      logger.warn('propose_chore_swap', 'Insufficient favor tokens for swap offer', {
        currentBalance,
        cost,
      });
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
    if (!this.isDemoMode() && isUuid(hId)) {
      swapRequest.id = makeEntityId('swap', true);
    }

    if (!store.swapRequests) store.swapRequests = {};
    if (!store.swapRequests[hId]) store.swapRequests[hId] = [];
    store.swapRequests[hId].unshift(swapRequest);

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

    this.save(store);
    logger.info(
      'propose_chore_swap',
      `Proposed swap "${params.requesterChoreName}" (+${cost} token)`,
      {
        swapId: swapRequest.id,
        targetUserId: params.targetUserId,
        tokenCost: cost,
      }
    );

    this.dispatchSocialOutbox(
      hId,
      'propose_chore_swap',
      { request: swapRequest },
      `Proposed chore swap "${params.requesterChoreName}"`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('chore_swap_requests').upsert(
          {
            ...(isUuid(swapRequest.id) ? { id: swapRequest.id } : {}),
            household_id: swapRequest.householdId,
            requester_user_id: swapRequest.requesterUserId,
            target_user_id: swapRequest.targetUserId,
            requester_chore_name: swapRequest.requesterChoreName,
            target_chore_name: swapRequest.targetChoreName,
            token_cost: swapRequest.tokenCost,
            status: swapRequest.status,
            note: swapRequest.note || null,
          },
          { onConflict: 'id' }
        );
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, request: swapRequest };
  }

  public async createSwapRequest(
    params: ProposeChoreSwapParams
  ): Promise<{ success: boolean; request?: ChoreSwapRequest; error?: string }> {
    return this.proposeChoreSwap(params);
  }

  public async getSwapRequests(householdId?: string): Promise<ChoreSwapRequest[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hId)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: rows, error } = await supabase
          .from('chore_swap_requests')
          .select('id, household_id, requester_user_id, target_user_id, requester_chore_name, target_chore_name, token_cost, status, note, created_at, updated_at, deleted_at, version')
          .eq('household_id', hId)
          .order('created_at', { ascending: false })
          .limit(30);

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (!error && Array.isArray(rows)) {
          const liveSwaps: ChoreSwapRequest[] = rows.map((r: any) => ({
            id: r.id,
            householdId: r.household_id,
            requesterUserId: r.requester_user_id,
            targetUserId: r.target_user_id,
            requesterChoreName: r.requester_chore_name,
            targetChoreName: r.target_chore_name,
            tokenCost: r.token_cost,
            status: r.status,
            note: r.note || undefined,
            createdAt: r.created_at,
          }));

          if (!store.swapRequests) store.swapRequests = {};
          const existing = store.swapRequests[hId] || [];
          const map = new Map(existing.map((s) => [s.id, s]));
          liveSwaps.forEach((s) => map.set(s.id, s));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          store.swapRequests[hId] = merged;
          this.save(store);
          logger.info('fetch_swap_requests', `Loaded ${liveSwaps.length} swap(s) [windowed 30, cached: ${merged.length}]`, { householdId: hId }, durationMs);
          return merged;
        }
      } catch (err: any) {
        logger.error('fetch_swap_requests', err?.message || 'Supabase getSwapRequests fallback', { householdId: hId });
      }
    }
    return store.swapRequests?.[hId] || [];
  }

  public async resolveChoreSwap(
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
    if (originalReq.status !== 'pending') {
      return { success: false, request: originalReq };
    }

    if (!store.favorTokens) store.favorTokens = {};
    const reqBalance = store.favorTokens[originalReq.requesterUserId] ?? INITIAL_FAVOR_TOKENS;
    const targetBalance = store.favorTokens[originalReq.targetUserId] ?? INITIAL_FAVOR_TOKENS;

    if (action === 'accept' && reqBalance < originalReq.tokenCost) {
      logger.warn('resolve_chore_swap', 'Requester balance insufficient at resolution time', {
        requestId,
        reqBalance,
        tokenCost: originalReq.tokenCost,
      });
      return { success: false, request: originalReq };
    }

    const resolution = resolveChoreSwapRequest(originalReq, action, targetBalance);
    store.swapRequests[hId][reqIdx] = resolution.updatedRequest;

    if (resolution.transferred && resolution.transactions.length > 0) {
      if (!store.favorTransactions) store.favorTransactions = {};
      if (!store.favorTransactions[hId]) store.favorTransactions[hId] = [];
      store.favorTransactions[hId].push(...resolution.transactions);

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

      if (store.currentUser.id === originalReq.requesterUserId) {
        store.currentUser.favorTokens = newReqBalance;
      } else if (store.currentUser.id === originalReq.targetUserId) {
        store.currentUser.favorTokens = newTargetBalance;
      }

      if (store.draftRounds?.[hId]?.assignments) {
        const choreObj = (store.chores || []).find(
          (c) => c.name === originalReq.requesterChoreName
        );
        const choreId = choreObj?.id;
        const assignment = store.draftRounds[hId].assignments.find(
          (a) => a.userId === originalReq.requesterUserId && (!choreId || a.choreId === choreId)
        );
        if (assignment) {
          assignment.userId = originalReq.targetUserId;
          if (resolution.celebratoryKudos.length > 0) {
            assignment.kudos.push(...resolution.celebratoryKudos);
          }
        }
      }

      const requester = store.users.find((u) => u.id === originalReq.requesterUserId);
      const target = store.users.find((u) => u.id === originalReq.targetUserId);
      if (store.messages && store.messages[hId]) {
        const capSuffix =
          resolution.celebratoryKudos.length > 0
            ? ` (max ${MAX_FAVOR_TOKENS} token cap reached — converted excess to celebratory kudos!)`
            : '';
        store.messages[hId].push({
          id: `msg_swap_${Date.now()}`,
          householdId: hId,
          senderId: null,
          type: 'activity',
          body: `${target?.name.split(' ')[0] || 'Roommate'} accepted a chore swap with ${requester?.name.split(' ')[0] || 'roomie'} (+${originalReq.tokenCost} Favor Token${originalReq.tokenCost > 1 ? 's' : ''})${capSuffix}!`,
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

    this.save(store);
    logger.info('resolve_chore_swap', `Resolved chore swap ${requestId} (${action})`, {
      requestId,
      action,
      transferred: resolution.transferred,
      celebratoryKudosCount: resolution.celebratoryKudos.length,
    });

    this.dispatchSocialOutbox(
      hId,
      'resolve_chore_swap',
      { requestId, action },
      `Resolved chore swap (${action})`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('resolve_chore_swap', {
          p_request_id: requestId,
          p_action: action,
        });
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, request: resolution.updatedRequest };
  }

  public async resolveSwapRequest(
    requestId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; request?: ChoreSwapRequest }> {
    return this.resolveChoreSwap(requestId, action);
  }

  // ---------------------------------------------------------------------------
  // Cultural Dinners & Dietary Profile Sync (Phase 2B Beta)
  // ---------------------------------------------------------------------------

  public async getCulturalDinners(householdId?: string): Promise<CulturalDinner[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    if (!store.culturalDinners) store.culturalDinners = {};
    const localList = store.culturalDinners[hId] || [];

    if (this.isDemoMode() || !supabase || !isUuid(hId)) {
      return localList;
    }

    try {
      const { data, error } = await supabase
        .from('cultural_dinners')
        .select(
          'id, household_id, host_user_id, dish_title, cuisine_tag, scheduled_date, dietary_tags, rsvp_user_ids, status, created_at, updated_at'
        )
        .eq('household_id', hId)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false })
        .limit(15);

      if (error) {
        logger.warn('get_cultural_dinners', `Failed remote fetch: ${error.message}`, { error });
        return localList;
      }

      if (data && data.length > 0) {
        const remoteMapped: CulturalDinner[] = data.map((d) => ({
          id: d.id,
          householdId: d.household_id,
          hostUserId: d.host_user_id,
          dishTitle: d.dish_title,
          cuisineTag: d.cuisine_tag,
          scheduledDate: d.scheduled_date,
          dietaryTags: (d.dietary_tags as DietaryTag[]) || [],
          rsvpUserIds: (d.rsvp_user_ids as string[]) || [],
          status: d.status as CulturalDinner['status'],
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const remoteIds = new Set(remoteMapped.map((r) => r.id));
        const pendingOptimistic = localList.filter((l) => !remoteIds.has(l.id));
        const merged = [...pendingOptimistic, ...remoteMapped];
        store.culturalDinners[hId] = merged;
        this.save(store);
        return merged;
      }
    } catch (err: unknown) {
      logger.warn('get_cultural_dinners', 'Exception fetching dinners', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return localList;
  }

  public async scheduleCulturalDinner(params: {
    dishTitle: string;
    cuisineTag: string;
    scheduledDate: string;
    dietaryTags?: DietaryTag[];
    householdId?: string;
  }): Promise<{ success: boolean; dinner?: CulturalDinner; error?: string }> {
    const store = this.getStore();
    const hId = params.householdId || store.activeHouseholdId;
    const hostId = store.currentUser.id;

    const trimmedDish = params.dishTitle.trim();
    const trimmedCuisine = params.cuisineTag.trim();
    if (!trimmedDish) {
      return { success: false, error: 'Dish title cannot be empty.' };
    }
    if (trimmedDish.length > 100) {
      return { success: false, error: 'Dish title cannot exceed 100 characters.' };
    }
    if (trimmedCuisine.length > 40) {
      return { success: false, error: 'Cuisine tag cannot exceed 40 characters.' };
    }

    const dinner: CulturalDinner = {
      id: !this.isDemoMode() && isUuid(hId) ? makeEntityId('dinner', true) : `dinner_${Date.now()}`,
      householdId: hId,
      hostUserId: hostId,
      dishTitle: trimmedDish,
      cuisineTag: trimmedCuisine || 'Home-cooked',
      scheduledDate: params.scheduledDate,
      dietaryTags: params.dietaryTags || [],
      rsvpUserIds: [hostId],
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!store.culturalDinners) store.culturalDinners = {};
    if (!store.culturalDinners[hId]) store.culturalDinners[hId] = [];
    store.culturalDinners[hId].unshift(dinner);

    if (store.messages && store.messages[hId]) {
      const hostName = store.currentUser.name.split(' ')[0] || 'Roomie';
      store.messages[hId].push({
        id: `msg_dinner_${Date.now()}`,
        householdId: hId,
        senderId: null,
        type: 'activity',
        body: `${hostName} scheduled a Cultural Dinner: ${dinner.dishTitle} (${dinner.cuisineTag}) on ${dinner.scheduledDate}! 🍲 Tap to RSVP.`,
        createdAt: new Date().toISOString(),
      });
    }

    this.save(store);
    logger.info('schedule_cultural_dinner', `Scheduled dinner: ${dinner.dishTitle}`, {
      dinnerId: dinner.id,
      cuisine: dinner.cuisineTag,
      scheduledDate: dinner.scheduledDate,
    });

    this.dispatchSocialOutbox(
      hId,
      'schedule_cultural_dinner',
      dinner,
      `Scheduled Cultural Dinner: ${dinner.dishTitle}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('cultural_dinners').insert({
          id: dinner.id,
          household_id: dinner.householdId,
          host_user_id: dinner.hostUserId,
          dish_title: dinner.dishTitle,
          cuisine_tag: dinner.cuisineTag,
          scheduled_date: dinner.scheduledDate,
          dietary_tags: dinner.dietaryTags,
          rsvp_user_ids: dinner.rsvpUserIds,
          status: dinner.status,
        });
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, dinner };
  }

  public async toggleDinnerRsvp(
    dinnerId: string,
    householdId?: string
  ): Promise<{ success: boolean; isAttending: boolean; rsvpUserIds: string[] }> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const userId = store.currentUser.id;

    if (!store.culturalDinners) store.culturalDinners = {};
    if (!store.culturalDinners[hId]) store.culturalDinners[hId] = [];

    const targetDinner = store.culturalDinners[hId].find((d) => d.id === dinnerId);
    if (!targetDinner) {
      return { success: false, isAttending: false, rsvpUserIds: [] };
    }

    const currentRsvps = targetDinner.rsvpUserIds || [];
    const isCurrentlyAttending = currentRsvps.includes(userId);
    let nextRsvps: string[];
    let nextAttending: boolean;

    if (isCurrentlyAttending) {
      nextRsvps = currentRsvps.filter((id) => id !== userId);
      nextAttending = false;
    } else {
      nextRsvps = [...currentRsvps, userId];
      nextAttending = true;
    }

    targetDinner.rsvpUserIds = nextRsvps;
    targetDinner.updatedAt = new Date().toISOString();
    this.save(store);

    logger.info('toggle_dinner_rsvp', `Toggled RSVP for dinner ${dinnerId}`, {
      dinnerId,
      userId,
      isAttending: nextAttending,
      rsvpCount: nextRsvps.length,
    });

    this.dispatchSocialOutbox(
      hId,
      'toggle_dinner_rsvp',
      { dinnerId, householdId: hId, userId, isAttending: nextAttending },
      `Toggled dinner RSVP (${nextAttending ? 'attending' : 'declined'})`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('toggle_cultural_dinner_rsvp', {
          p_dinner_id: dinnerId,
          p_household_id: hId,
        });
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, isAttending: nextAttending, rsvpUserIds: nextRsvps };
  }

  public async updateUserDietaryPreferences(dietaryTags: DietaryTag[]): Promise<User> {
    const store = this.getStore();
    const hId = store.activeHouseholdId;
    const user = store.currentUser;

    user.dietaryTags = dietaryTags;
    const foundInList = store.users.find((u) => u.id === user.id);
    if (foundInList) {
      foundInList.dietaryTags = dietaryTags;
    }

    this.save(store);
    logger.info('update_dietary_preferences', `Updated dietary preferences for ${user.id}`, {
      userId: user.id,
      dietaryTags,
    });

    this.dispatchSocialOutbox(
      hId,
      'update_dietary_preferences',
      { userId: user.id, dietaryTags },
      'Updated dietary preferences',
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('profiles')
          .update({ dietary_tags: dietaryTags })
          .eq('id', user.id);
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return user;
  }
}
