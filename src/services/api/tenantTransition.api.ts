/**
 * Roomie Tenant Transition & Deposit Protection API (Track 1 / Phase 4A)
 * - Move-out inspections with side-by-side move-in photo comparison
 * - Deposit refund settlement calculation and dispute protection
 * - Portable Flatmate Reputation Passport
 * - Client-side privacy guardrails rejecting identity documents
 */

import {
  MoveOutInspection,
  MoveOutInspectionStatus,
  TenantReputationPassport,
  MoveInSnapshot,
  Expense,
  ExpenseShare,
} from '../../types';
import {
  AppStore,
  makeEntityId,
  isUuid,
  createDomainLogger,
  dispatchRemoteMutation,
} from './shared';
import { OutboxActionType } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import { supabase } from '../supabase';
import { assertNoIdentityDocument } from '../../utils/privacyGuards';

const logger = createDomainLogger('TenantTransitionAPI', 'governance');

export interface TenantTransitionContext {
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

export class TenantTransitionApi {
  private getStoreFn: () => AppStore;
  private ctx?: TenantTransitionContext;

  constructor(storeOrContext: (() => AppStore) | TenantTransitionContext) {
    if (typeof storeOrContext === 'function') {
      this.getStoreFn = storeOrContext;
    } else {
      this.ctx = storeOrContext;
      this.getStoreFn = () => storeOrContext.store;
    }
  }

  private getStore(): AppStore {
    return this.ctx ? this.ctx.store : this.getStoreFn();
  }

  private save(store?: AppStore): void {
    if (this.ctx) {
      this.ctx.save(store);
    } else if (store) {
      Object.assign(this.getStoreFn(), store);
    }
  }

  private isDemoMode(): boolean {
    if (this.ctx) return this.ctx.isDemoMode();
    const store = this.getStore();
    return store.householdSetupMode === 'demo' || !isUuid(store.activeHouseholdId);
  }

  private dispatchOutbox<T>(
    householdId: string,
    module: DebugModule,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: { message: string; code?: string } | null } | void>
  ): void {
    if (this.ctx && !this.isDemoMode() && isUuid(householdId)) {
      this.ctx.dispatchRemoteMutation(
        householdId,
        module,
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
        module,
        outboxType,
        payload,
        summary,
        remoteExec
      );
    }
  }

  // =========================================================================
  // 1. MOVE-OUT INSPECTIONS
  // =========================================================================

  public async getMoveOutInspections(householdId: string): Promise<MoveOutInspection[]> {
    const store = this.getStore();
    const localInspections = (store.moveOutInspections?.[householdId] || []).filter(
      (item) => !item.deletedAt
    );

    if (this.isDemoMode() || !isUuid(householdId) || !supabase) {
      return localInspections;
    }

    try {
      const { data, error } = await supabase
        .from('move_out_inspections')
        .select(
          'id, household_id, user_id, move_in_snapshot_id, room_name, condition_note, photo_urls, is_damage_reported, damage_deduction_amount, deposit_paid_amount, deposit_refund_amount, confirmed_by_user_ids, status, settlement_expense_id, created_at, updated_at, deleted_at, version'
        )
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        logger.warn('getMoveOutInspections', 'Failed fetching remote inspections', {
          error: error.message,
        });
        return localInspections;
      }

      if (data) {
        const remoteInspections: MoveOutInspection[] = data.map((row) => ({
          id: row.id,
          householdId: row.household_id,
          userId: row.user_id,
          moveInSnapshotId: row.move_in_snapshot_id || null,
          roomName: row.room_name,
          conditionNote: row.condition_note,
          photoUrls: Array.isArray(row.photo_urls) ? (row.photo_urls as string[]) : [],
          isDamageReported: Boolean(row.is_damage_reported),
          damageDeductionAmount: Number(row.damage_deduction_amount || 0),
          depositPaidAmount: Number(row.deposit_paid_amount || 0),
          depositRefundAmount: Number(row.deposit_refund_amount || 0),
          confirmedByUserIds: Array.isArray(row.confirmed_by_user_ids)
            ? (row.confirmed_by_user_ids as string[])
            : [],
          status: (row.status || 'draft') as MoveOutInspectionStatus,
          settlementExpenseId: row.settlement_expense_id || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at || null,
          version: Number(row.version || 1),
        }));

        if (!store.moveOutInspections) store.moveOutInspections = {};
        store.moveOutInspections[householdId] = remoteInspections;
        this.save(store);
        return remoteInspections;
      }
    } catch (err) {
      logger.error('getMoveOutInspections', 'Unexpected exception', { error: err });
    }

    return localInspections;
  }

  public async addMoveOutInspection(params: {
    householdId: string;
    userId: string;
    moveInSnapshotId?: string | null;
    roomName: string;
    conditionNote: string;
    photoUrls: string[];
    isDamageReported?: boolean;
    damageDeductionAmount?: number;
    depositPaidAmount: number;
    depositRefundAmount?: number;
  }): Promise<MoveOutInspection> {
    assertNoIdentityDocument(params.roomName, 'Room Name');
    assertNoIdentityDocument(params.conditionNote, 'Condition Note');

    const store = this.getStore();
    const isRemote = isUuid(params.householdId);
    const id = makeEntityId('out', isRemote);
    const now = new Date().toISOString();

    const damageAmt = Math.max(0, Number(params.damageDeductionAmount || 0));
    const paidAmt = Math.max(0, Number(params.depositPaidAmount || 0));
    const calculatedRefund =
      typeof params.depositRefundAmount === 'number'
        ? Math.max(0, params.depositRefundAmount)
        : Math.max(0, paidAmt - damageAmt);

    const newInspection: MoveOutInspection = {
      id,
      householdId: params.householdId,
      userId: params.userId,
      moveInSnapshotId: params.moveInSnapshotId || null,
      roomName: params.roomName.trim().slice(0, 60),
      conditionNote: params.conditionNote.trim().slice(0, 1000),
      photoUrls: params.photoUrls,
      isDamageReported: Boolean(params.isDamageReported),
      damageDeductionAmount: damageAmt,
      depositPaidAmount: paidAmt,
      depositRefundAmount: calculatedRefund,
      confirmedByUserIds: [params.userId],
      status: 'pending_review',
      settlementExpenseId: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    if (!store.moveOutInspections) store.moveOutInspections = {};
    if (!store.moveOutInspections[params.householdId]) {
      store.moveOutInspections[params.householdId] = [];
    }
    store.moveOutInspections[params.householdId].unshift(newInspection);
    this.save(store);

    logger.info('addMoveOutInspection', `Created inspection ${id} for ${params.roomName}`, {
      inspectionId: id,
      householdId: params.householdId,
    });

    this.dispatchOutbox(
      params.householdId,
      'governance',
      'add_move_out_inspection',
      newInspection,
      `Add Move-Out Inspection: ${newInspection.roomName}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('move_out_inspections').insert({
          ...(isUuid(newInspection.id) ? { id: newInspection.id } : {}),
          household_id: newInspection.householdId,
          user_id: newInspection.userId,
          move_in_snapshot_id: isUuid(newInspection.moveInSnapshotId || '')
            ? newInspection.moveInSnapshotId
            : null,
          room_name: newInspection.roomName,
          condition_note: newInspection.conditionNote,
          photo_urls: newInspection.photoUrls,
          is_damage_reported: newInspection.isDamageReported,
          damage_deduction_amount: newInspection.damageDeductionAmount,
          deposit_paid_amount: newInspection.depositPaidAmount,
          deposit_refund_amount: newInspection.depositRefundAmount,
          confirmed_by_user_ids: newInspection.confirmedByUserIds,
          status: newInspection.status,
          created_at: newInspection.createdAt,
          updated_at: newInspection.updatedAt,
          version: newInspection.version,
        });
        if (error) throw error;
      }
    );

    return newInspection;
  }

  public async confirmMoveOutInspection(
    inspectionId: string,
    confirmingUserId?: string
  ): Promise<boolean> {
    const store = this.getStore();
    const callerId = confirmingUserId || store.currentUser.id;
    let found = false;
    let targetInspection: MoveOutInspection | null = null;
    let targetHouseholdId = store.activeHouseholdId;

    for (const [hId, inspections] of Object.entries(store.moveOutInspections || {})) {
      const idx = inspections.findIndex((i) => i.id === inspectionId);
      if (idx !== -1) {
        targetInspection = inspections[idx];
        targetHouseholdId = hId;
        const confirmedSet = new Set(targetInspection.confirmedByUserIds);
        confirmedSet.add(callerId);
        targetInspection.confirmedByUserIds = Array.from(confirmedSet);
        targetInspection.updatedAt = new Date().toISOString();

        // If confirmed by departing tenant + at least 1 other roommate, move to agreed
        if (
          targetInspection.confirmedByUserIds.length >= 2 &&
          targetInspection.status === 'pending_review'
        ) {
          targetInspection.status = 'agreed';
        }

        found = true;
        break;
      }
    }

    if (!found || !targetInspection) return false;

    this.save(store);

    logger.info('confirmMoveOutInspection', `User ${callerId} confirmed inspection ${inspectionId}`);

    this.dispatchOutbox(
      targetHouseholdId,
      'governance',
      'confirm_move_out_inspection',
      { inspectionId, userId: callerId },
      `Confirm Move-Out Inspection: ${targetInspection.roomName}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.rpc('confirm_move_out_inspection', {
          p_inspection_id: inspectionId,
        });
        if (error) throw error;
      }
    );

    return true;
  }

  public async settleDepositRefund(
    inspectionId: string,
    adminPayerUserId?: string
  ): Promise<{ success: boolean; expenseId?: string }> {
    const store = this.getStore();
    let targetInspection: MoveOutInspection | null = null;
    let targetHouseholdId = store.activeHouseholdId;

    for (const [hId, inspections] of Object.entries(store.moveOutInspections || {})) {
      const i = inspections.find((item) => item.id === inspectionId);
      if (i) {
        targetInspection = i;
        targetHouseholdId = hId;
        break;
      }
    }

    if (!targetInspection) {
      return { success: false };
    }

    const payerId = adminPayerUserId || store.currentUser.id;
    const recipientId = targetInspection.userId;
    const refundAmount = targetInspection.depositRefundAmount;
    const now = new Date();

    let createdExpenseId: string | null = null;

    if (refundAmount > 0) {
      createdExpenseId = makeEntityId('exp', isUuid(targetHouseholdId));
      const shares: ExpenseShare[] = [
        {
          userId: recipientId,
          shareAmount: refundAmount,
          response: 'agreed',
        },
      ];

      const refundExpense: Expense = {
        id: createdExpenseId,
        householdId: targetHouseholdId,
        paidBy: payerId,
        title: `Deposit Refund: ${targetInspection.roomName}`,
        amount: refundAmount,
        category: 'rent',
        date: now.toISOString().split('T')[0],
        status: 'agreed',
        shares,
        createdAt: now.toISOString(),
      };

      if (!store.expenses) store.expenses = [];
      store.expenses.unshift(refundExpense);
    }

    targetInspection.status = 'settled';
    targetInspection.settlementExpenseId = createdExpenseId;
    targetInspection.updatedAt = now.toISOString();

    this.save(store);

    logger.info('settleDepositRefund', `Settled deposit refund for inspection ${inspectionId}`, {
      refundAmount,
      expenseId: createdExpenseId,
    });

    this.dispatchOutbox(
      targetHouseholdId,
      'expenses',
      'settle_deposit_refund',
      { inspectionId, expenseId: createdExpenseId, refundAmount },
      `Settle Deposit Refund (${refundAmount})`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('move_out_inspections')
          .update({
            status: 'settled',
            settlement_expense_id: createdExpenseId,
            updated_at: now.toISOString(),
          })
          .eq('id', inspectionId);
        if (error) throw error;
      }
    );

    return { success: true, expenseId: createdExpenseId || undefined };
  }

  // =========================================================================
  // 2. PORTABLE TENANT REPUTATION PASSPORT
  // =========================================================================

  public async getTenantPassport(userId: string): Promise<TenantReputationPassport> {
    const store = this.getStore();
    const user =
      store.users.find((u) => u.id === userId) ||
      (store.currentUser.id === userId ? store.currentUser : null);

    const userName = user?.name || 'Flatmate';
    const userAvatar = user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    const userCountry = user?.country;

    // 1. Calculate chores completed
    let totalChoresCompleted = 0;
    Object.values(store.draftRounds || {}).forEach((round) => {
      round.assignments.forEach((a) => {
        if (a.userId === userId && a.completedToday) totalChoresCompleted += 1;
      });
    });
    const streakDays = user?.streakDays || 0;
    if (streakDays > 0) {
      totalChoresCompleted = Math.max(totalChoresCompleted, streakDays * 2 + 1);
    }

    // 2. Weekly awards count & names
    let weeklyAwardsCount = 0;
    const topAwardsSet = new Set<string>();

    Object.values(store.weeklyAwards || {}).forEach((awardList) => {
      awardList.forEach((a) => {
        if (a.recipientUserId === userId) {
          weeklyAwardsCount += 1;
          topAwardsSet.add(a.title);
        }
      });
    });

    if (topAwardsSet.size === 0) {
      topAwardsSet.add('Reliable Flatmate');
    }

    // 3. Tenancy count across memberships
    const userMemberships = (store.memberships || []).filter((m) => m.userId === userId);
    const tenancyCount = Math.max(1, userMemberships.length);

    // 4. Harmony Score calculation (0-100)
    // Base 80 + up to 12 pts for streak + up to 8 pts for awards
    const streakContribution = Math.min(12, streakDays * 2);
    const awardsContribution = Math.min(8, weeklyAwardsCount * 4);
    const harmonyScore = Math.min(100, Math.max(50, 80 + streakContribution + awardsContribution));

    const verifiedSince = 'Sep 2026';

    return {
      userId,
      userName,
      userAvatar,
      userCountry,
      totalChoresCompleted: Math.max(1, totalChoresCompleted),
      choreStreakDays: streakDays,
      weeklyAwardsCount,
      topAwards: Array.from(topAwardsSet),
      tenancyCount,
      harmonyScore,
      verifiedSince,
    };
  }
}
