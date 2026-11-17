/**
 * Roomie Flat Utilities & Landlord Hub API (Phase 3 Real-Life Flat Tools)
 * - Windowed queries with explicit projections for bills, snapshots, landlord & maintenance
 * - Local-first offline-capable mutations queued via Outbox + synced to localCache
 * - Privacy guardrails strictly blocking identity documents (passports, national IDs, SSNs)
 */

import {
  RecurringBill,
  RecurringBillCategory,
  RecurringBillSplitRule,
  CustomBillSplit,
  MoveInSnapshot,
  LandlordProfile,
  MaintenanceIssue,
  MaintenanceIssueStatus,
  Expense,
  ExpenseCategory,
  ExpenseShare,
} from '../../types';
import {
  AppStore,
  makeEntityId,
  isUuid,
  createDomainLogger,
  dispatchRemoteMutation,
} from './shared';
import { OutboxActionType, outbox } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import { supabase } from '../supabase';
import { assertNoIdentityDocument } from '../../utils/privacyGuards';
import { Json } from '../../types/database.types';

const logger = createDomainLogger('FlatUtilitiesAPI', 'expenses');

function toDbExpenseCategory(cat: RecurringBillCategory): 'groceries' | 'household' | 'other' | 'rent' | 'utilities' {
  if (cat === 'wifi' || cat === 'utilities') return 'utilities';
  if (cat === 'rent') return 'rent';
  return 'other';
}

export interface FlatUtilitiesContext {
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

export class FlatUtilitiesApi {
  private getStoreFn: () => AppStore;
  private ctx?: FlatUtilitiesContext;

  constructor(storeOrContext: (() => AppStore) | FlatUtilitiesContext) {
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
  // 1. RECURRING RENT & BILLS
  // =========================================================================

  public async getRecurringBills(householdId: string): Promise<RecurringBill[]> {
    const store = this.getStore();
    const localBills = (store.recurringBills?.[householdId] || []).filter((b) => !b.deletedAt);

    if (this.isDemoMode() || !isUuid(householdId) || !supabase) {
      return localBills;
    }

    try {
      const { data, error } = await supabase
        .from('recurring_bills')
        .select(
          'id, household_id, title, category, amount, currency, due_day, split_rule, custom_splits, paid_by_user_id, active, last_generated_cycle, created_at, updated_at, deleted_at, version'
        )
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('due_day', { ascending: true });

      if (error) {
        logger.warn('getRecurringBills', 'Failed fetching recurring bills', { error: error.message });
        return localBills;
      }

      if (data) {
        const remoteBills: RecurringBill[] = data.map((row) => ({
          id: row.id,
          householdId: row.household_id,
          title: row.title,
          category: row.category as RecurringBillCategory,
          amount: Number(row.amount),
          currency: row.currency || 'TRY',
          dueDay: Number(row.due_day),
          splitRule: (row.split_rule || 'equal') as RecurringBillSplitRule,
          customSplits: Array.isArray(row.custom_splits)
            ? (row.custom_splits as unknown as CustomBillSplit[])
            : undefined,
          paidByUserId: row.paid_by_user_id || '',
          active: row.active ?? true,
          lastGeneratedCycle: row.last_generated_cycle || null,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
          deletedAt: row.deleted_at || null,
          version: Number(row.version || 1),
        }));

        if (!store.recurringBills) store.recurringBills = {};
        store.recurringBills[householdId] = remoteBills;
        this.save();
        return remoteBills;
      }
    } catch (err) {
      logger.error('getRecurringBills', 'Network error fetching recurring bills', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return localBills;
  }

  public async addRecurringBill(params: {
    householdId: string;
    title: string;
    category: RecurringBillCategory;
    amount: number;
    currency?: string;
    dueDay: number;
    splitRule?: RecurringBillSplitRule;
    customSplits?: CustomBillSplit[];
    paidByUserId: string;
  }): Promise<RecurringBill> {
    const trimmedTitle = params.title.trim();
    if (!trimmedTitle) throw new Error('Bill title is required.');
    if (trimmedTitle.length > 80) throw new Error('Bill title must be 80 characters or fewer.');
    if (params.amount <= 0) throw new Error('Bill amount must be greater than zero.');
    if (params.dueDay < 1 || params.dueDay > 31) throw new Error('Due day must be between 1 and 31.');

    const store = this.getStore();
    const id = makeEntityId('rec_bill', isUuid(params.householdId));
    const now = new Date().toISOString();

    const newBill: RecurringBill = {
      id,
      householdId: params.householdId,
      title: trimmedTitle,
      category: params.category,
      amount: Math.round(params.amount * 100) / 100,
      currency: params.currency || 'TRY',
      dueDay: params.dueDay,
      splitRule: params.splitRule || 'equal',
      customSplits: params.customSplits,
      paidByUserId: params.paidByUserId,
      active: true,
      lastGeneratedCycle: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    if (!store.recurringBills) store.recurringBills = {};
    if (!store.recurringBills[params.householdId]) store.recurringBills[params.householdId] = [];
    store.recurringBills[params.householdId].push(newBill);
    this.save();

    this.dispatchOutbox(
      params.householdId,
      'expenses',
      'add_recurring_bill',
      newBill,
      `Add recurring bill: ${newBill.title}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('recurring_bills').insert({
          id: newBill.id,
          household_id: newBill.householdId,
          title: newBill.title,
          category: toDbExpenseCategory(newBill.category),
          amount: newBill.amount,
          currency: newBill.currency,
          due_day: newBill.dueDay,
          split_rule: newBill.splitRule,
          custom_splits: (newBill.customSplits as unknown as Json) || null,
          paid_by_user_id: newBill.paidByUserId,
          active: newBill.active,
          version: newBill.version,
          created_at: newBill.createdAt,
          updated_at: newBill.updatedAt,
        });
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return newBill;
  }

  public async updateRecurringBill(
    id: string,
    updates: Partial<RecurringBill>
  ): Promise<RecurringBill | null> {
    const store = this.getStore();
    let foundBill: RecurringBill | null = null;
    let billHouseholdId = '';

    for (const [hId, bills] of Object.entries(store.recurringBills || {})) {
      const idx = bills.findIndex((b) => b.id === id);
      if (idx !== -1) {
        foundBill = bills[idx];
        billHouseholdId = hId;
        break;
      }
    }

    if (!foundBill) return null;

    if (updates.title !== undefined) {
      const trimmed = updates.title.trim();
      if (!trimmed) throw new Error('Bill title cannot be empty.');
      if (trimmed.length > 80) throw new Error('Bill title must be 80 characters or fewer.');
      foundBill.title = trimmed;
    }
    if (updates.category !== undefined) foundBill.category = updates.category;
    if (updates.amount !== undefined) {
      if (updates.amount <= 0) throw new Error('Bill amount must be greater than zero.');
      foundBill.amount = Math.round(updates.amount * 100) / 100;
    }
    if (updates.currency !== undefined) foundBill.currency = updates.currency;
    if (updates.dueDay !== undefined) {
      if (updates.dueDay < 1 || updates.dueDay > 31) throw new Error('Due day must be between 1 and 31.');
      foundBill.dueDay = updates.dueDay;
    }
    if (updates.splitRule !== undefined) foundBill.splitRule = updates.splitRule;
    if (updates.customSplits !== undefined) foundBill.customSplits = updates.customSplits;
    if (updates.paidByUserId !== undefined) foundBill.paidByUserId = updates.paidByUserId;
    if (updates.active !== undefined) foundBill.active = updates.active;
    if (updates.lastGeneratedCycle !== undefined) foundBill.lastGeneratedCycle = updates.lastGeneratedCycle;

    foundBill.updatedAt = new Date().toISOString();
    foundBill.version = (foundBill.version || 0) + 1;
    this.save();

    const updated = { ...foundBill };
    this.dispatchOutbox(
      billHouseholdId,
      'expenses',
      'update_recurring_bill',
      updated,
      `Update recurring bill: ${updated.title}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('recurring_bills')
          .update({
            title: updated.title,
            category: toDbExpenseCategory(updated.category),
            amount: updated.amount,
            currency: updated.currency,
            due_day: updated.dueDay,
            split_rule: updated.splitRule,
            custom_splits: (updated.customSplits as unknown as Json) || null,
            paid_by_user_id: updated.paidByUserId,
            active: updated.active,
            last_generated_cycle: updated.lastGeneratedCycle,
            version: updated.version,
            updated_at: updated.updatedAt,
          })
          .eq('id', updated.id);
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return updated;
  }

  public async deleteRecurringBill(id: string): Promise<boolean> {
    const store = this.getStore();
    let billHouseholdId = '';
    let found = false;

    for (const [hId, bills] of Object.entries(store.recurringBills || {})) {
      const idx = bills.findIndex((b) => b.id === id);
      if (idx !== -1) {
        bills[idx].deletedAt = new Date().toISOString();
        billHouseholdId = hId;
        found = true;
        break;
      }
    }

    if (!found) return false;
    this.save();

    this.dispatchOutbox(
      billHouseholdId,
      'expenses',
      'delete_recurring_bill',
      { id },
      `Delete recurring bill ${id}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('recurring_bills')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return true;
  }

  /**
   * 1-Tap "Log This Month's Bill": converts recurring template into an active expense
   * and marks the template's cycle as generated.
   */
  public async logRecurringBillExpense(
    billId: string,
    options?: { note?: string }
  ): Promise<Expense | null> {
    const store = this.getStore();
    let targetBill: RecurringBill | null = null;
    let householdId = store.activeHouseholdId;

    for (const [hId, bills] of Object.entries(store.recurringBills || {})) {
      const b = bills.find((item) => item.id === billId);
      if (b) {
        targetBill = b;
        householdId = hId;
        break;
      }
    }

    if (!targetBill) return null;

    const now = new Date();
    const currentCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    // Determine flatmates to split with
    const memberIds = store.memberships
      .filter((m) => m.householdId === householdId)
      .map((m) => m.userId);
    const activeMemberIds = memberIds.length > 0 ? memberIds : store.users.map((u) => u.id);

    let shares: ExpenseShare[] = [];
    if (
      targetBill.splitRule === 'custom' &&
      targetBill.customSplits &&
      targetBill.customSplits.length > 0
    ) {
      shares = targetBill.customSplits.map((cs) => ({
        userId: cs.userId,
        shareAmount: Math.round((cs.amount || 0) * 100) / 100,
        response: cs.userId === targetBill?.paidByUserId ? 'agreed' : 'pending',
      }));
    } else {
      // Equal split
      const count = Math.max(1, activeMemberIds.length);
      const splitAmt = Math.round((targetBill.amount / count) * 100) / 100;
      shares = activeMemberIds.map((uId) => ({
        userId: uId,
        shareAmount: splitAmt,
        response: uId === targetBill?.paidByUserId ? 'agreed' : 'pending',
      }));
    }

    const expenseCategory: ExpenseCategory =
      targetBill.category === 'rent'
        ? 'rent'
        : targetBill.category === 'utilities' || targetBill.category === 'wifi'
        ? 'utilities'
        : 'household';

    const expenseId = makeEntityId('exp', isUuid(householdId));
    const titleWithCycle = `${targetBill.title} (${currentCycle})`;

    const newExpense: Expense = {
      id: expenseId,
      householdId,
      paidBy: targetBill.paidByUserId,
      title: titleWithCycle,
      amount: targetBill.amount,
      category: expenseCategory,
      date: todayStr,
      status: 'pending',
      shares,
      createdAt: now.toISOString(),
    };

    // 1. Add to store expenses
    if (!store.expenses) store.expenses = [];
    store.expenses.unshift(newExpense);

    // 2. Update recurring bill cycle
    targetBill.lastGeneratedCycle = currentCycle;
    targetBill.updatedAt = now.toISOString();
    targetBill.version = (targetBill.version || 0) + 1;

    this.save();

    // 3. Dispatch outbox actions
    this.dispatchOutbox(
      householdId,
      'expenses',
      'log_recurring_bill_expense',
      { billId: targetBill.id, expenseId: newExpense.id, cycle: currentCycle, note: options?.note },
      `Log recurring bill ${targetBill.title} for cycle ${currentCycle}`,
      async () => {
        if (!supabase) return;
        // Update bill cycle
        await supabase
          .from('recurring_bills')
          .update({
            last_generated_cycle: currentCycle,
            updated_at: targetBill?.updatedAt,
            version: targetBill?.version,
          })
          .eq('id', targetBill?.id);

        // Insert new expense
        const { error } = await supabase.from('expenses').insert({
          id: newExpense.id,
          household_id: newExpense.householdId,
          paid_by: newExpense.paidBy,
          title: newExpense.title,
          amount: newExpense.amount,
          category: newExpense.category,
          date: newExpense.date,
          status: newExpense.status,
          created_at: newExpense.createdAt,
        });
        if (error) return { error: { message: error.message, code: error.code } };

        if (newExpense.shares && newExpense.shares.length > 0) {
          const shareRows = newExpense.shares.map((s) => ({
            expense_id: newExpense.id,
            user_id: s.userId,
            share_amount: s.shareAmount,
            response: s.response,
          }));
          await supabase.from('expense_shares').insert(shareRows);
        }
      }
    );

    return newExpense;
  }

  // =========================================================================
  // 2. MOVE-IN CONDITION SNAPSHOT
  // =========================================================================

  public async getMoveInSnapshots(householdId: string): Promise<MoveInSnapshot[]> {
    const store = this.getStore();
    const localSnapshots = (store.moveInSnapshots?.[householdId] || []).filter((s) => !s.deletedAt);

    if (this.isDemoMode() || !isUuid(householdId) || !supabase) {
      return localSnapshots;
    }

    try {
      const { data, error } = await supabase
        .from('move_in_snapshots')
        .select(
          'id, household_id, room_name, condition_note, photo_urls, created_by, confirmed_by_user_ids, created_at, updated_at, deleted_at, version'
        )
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        logger.warn('getMoveInSnapshots', 'Failed fetching move-in snapshots', { error: error.message });
        return localSnapshots;
      }

      if (data) {
        const remoteSnapshots: MoveInSnapshot[] = data.map((row) => ({
          id: row.id,
          householdId: row.household_id,
          roomName: row.room_name,
          conditionNote: row.condition_note,
          photoUrls: Array.isArray(row.photo_urls) ? (row.photo_urls as string[]) : [],
          createdBy: row.created_by,
          confirmedByUserIds: Array.isArray(row.confirmed_by_user_ids)
            ? (row.confirmed_by_user_ids as string[])
            : [],
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
          deletedAt: row.deleted_at || null,
          version: Number(row.version || 1),
        }));

        if (!store.moveInSnapshots) store.moveInSnapshots = {};
        store.moveInSnapshots[householdId] = remoteSnapshots;
        this.save();
        return remoteSnapshots;
      }
    } catch (err) {
      logger.error('getMoveInSnapshots', 'Network error fetching snapshots', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return localSnapshots;
  }

  public async addMoveInSnapshot(params: {
    householdId: string;
    roomName: string;
    conditionNote: string;
    photoUrls?: string[];
    createdBy?: string;
  }): Promise<MoveInSnapshot> {
    const trimmedRoom = params.roomName.trim();
    const trimmedNote = params.conditionNote.trim();

    if (!trimmedRoom) throw new Error('Room name is required.');
    if (trimmedRoom.length > 60) throw new Error('Room name must be 60 characters or fewer.');
    if (!trimmedNote) throw new Error('Condition note is required.');
    if (trimmedNote.length > 400) throw new Error('Condition note must be 400 characters or fewer.');

    // Privacy guardrail: reject identity documents
    assertNoIdentityDocument(trimmedRoom, 'Room name');
    assertNoIdentityDocument(trimmedNote, 'Condition note');

    const store = this.getStore();
    const creatorId = params.createdBy || store.currentUser.id;
    const id = makeEntityId('snap', isUuid(params.householdId));
    const now = new Date().toISOString();

    const snapshot: MoveInSnapshot = {
      id,
      householdId: params.householdId,
      roomName: trimmedRoom,
      conditionNote: trimmedNote,
      photoUrls: params.photoUrls || [],
      createdBy: creatorId,
      confirmedByUserIds: [creatorId],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    if (!store.moveInSnapshots) store.moveInSnapshots = {};
    if (!store.moveInSnapshots[params.householdId]) store.moveInSnapshots[params.householdId] = [];
    store.moveInSnapshots[params.householdId].unshift(snapshot);
    this.save();

    this.dispatchOutbox(
      params.householdId,
      'governance',
      'add_move_in_snapshot',
      snapshot,
      `Add move-in snapshot for ${snapshot.roomName}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('move_in_snapshots').insert({
          id: snapshot.id,
          household_id: snapshot.householdId,
          room_name: snapshot.roomName,
          condition_note: snapshot.conditionNote,
          photo_urls: snapshot.photoUrls,
          created_by: snapshot.createdBy,
          confirmed_by_user_ids: snapshot.confirmedByUserIds,
          created_at: snapshot.createdAt,
          updated_at: snapshot.updatedAt,
          version: snapshot.version,
        });
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return snapshot;
  }

  public async confirmMoveInSnapshot(
    snapshotId: string,
    userId: string
  ): Promise<MoveInSnapshot | null> {
    const store = this.getStore();
    let foundSnapshot: MoveInSnapshot | null = null;
    let householdId = '';

    for (const [hId, snapshots] of Object.entries(store.moveInSnapshots || {})) {
      const item = snapshots.find((s) => s.id === snapshotId);
      if (item) {
        foundSnapshot = item;
        householdId = hId;
        break;
      }
    }

    if (!foundSnapshot) return null;

    if (!foundSnapshot.confirmedByUserIds.includes(userId)) {
      foundSnapshot.confirmedByUserIds.push(userId);
      foundSnapshot.updatedAt = new Date().toISOString();
      foundSnapshot.version = (foundSnapshot.version || 0) + 1;
      this.save();
    }

    const updated = { ...foundSnapshot };
    this.dispatchOutbox(
      householdId,
      'governance',
      'confirm_move_in_snapshot',
      { snapshotId, userId },
      `Confirm move-in snapshot ${snapshotId} by user ${userId}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('move_in_snapshots')
          .update({
            confirmed_by_user_ids: updated.confirmedByUserIds,
            updated_at: updated.updatedAt,
            version: updated.version,
          })
          .eq('id', snapshotId);
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return updated;
  }

  // =========================================================================
  // 3. LANDLORD & MAINTENANCE HUB
  // =========================================================================

  public async getLandlordProfile(householdId: string): Promise<LandlordProfile | null> {
    const store = this.getStore();
    const localProfile = store.landlordProfiles?.[householdId] || null;

    if (this.isDemoMode() || !isUuid(householdId) || !supabase) {
      return localProfile;
    }

    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .select('household_id, landlord_name, role_label, phone_or_whatsapp, emergency_note, updated_by, updated_at, version')
        .eq('household_id', householdId)
        .maybeSingle();

      if (error) {
        logger.warn('getLandlordProfile', 'Failed fetching landlord profile', { error: error.message });
        return localProfile;
      }

      if (data) {
        const remoteProfile: LandlordProfile = {
          householdId: data.household_id,
          landlordName: data.landlord_name,
          roleLabel: data.role_label,
          phoneOrWhatsapp: data.phone_or_whatsapp,
          emergencyNote: data.emergency_note || undefined,
          updatedBy: data.updated_by || undefined,
          updatedAt: data.updated_at || new Date().toISOString(),
          version: Number(data.version || 1),
        };

        if (!store.landlordProfiles) store.landlordProfiles = {};
        store.landlordProfiles[householdId] = remoteProfile;
        this.save();
        return remoteProfile;
      }
    } catch (err) {
      logger.error('getLandlordProfile', 'Network error fetching landlord profile', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return localProfile;
  }

  public async updateLandlordProfile(params: {
    householdId: string;
    landlordName: string;
    roleLabel: string;
    phoneOrWhatsapp: string;
    emergencyNote?: string;
    updatedBy?: string;
  }): Promise<LandlordProfile> {
    const trimmedName = params.landlordName.trim();
    const trimmedRole = params.roleLabel.trim();
    const trimmedPhone = params.phoneOrWhatsapp.trim();
    const trimmedNote = params.emergencyNote?.trim();

    if (!trimmedName) throw new Error('Landlord or agent name is required.');
    if (trimmedName.length > 80) throw new Error('Landlord name must be 80 characters or fewer.');
    if (!trimmedRole) throw new Error('Role label is required.');
    if (trimmedRole.length > 40) throw new Error('Role label must be 40 characters or fewer.');
    if (!trimmedPhone) throw new Error('Phone or WhatsApp contact is required.');
    if (trimmedPhone.length > 50) throw new Error('Contact phone must be 50 characters or fewer.');
    if (trimmedNote && trimmedNote.length > 300) {
      throw new Error('Emergency instructions must be 300 characters or fewer.');
    }

    // Privacy guardrail: reject identity documents
    assertNoIdentityDocument(trimmedName, 'Landlord name');
    assertNoIdentityDocument(trimmedRole, 'Role label');
    assertNoIdentityDocument(trimmedPhone, 'Contact info');
    assertNoIdentityDocument(trimmedNote, 'Emergency note');

    const store = this.getStore();
    const existing = store.landlordProfiles?.[params.householdId];
    const now = new Date().toISOString();

    const profile: LandlordProfile = {
      householdId: params.householdId,
      landlordName: trimmedName,
      roleLabel: trimmedRole,
      phoneOrWhatsapp: trimmedPhone,
      emergencyNote: trimmedNote,
      updatedBy: params.updatedBy || store.currentUser.id,
      updatedAt: now,
      version: (existing?.version || 0) + 1,
    };

    if (!store.landlordProfiles) store.landlordProfiles = {};
    store.landlordProfiles[params.householdId] = profile;
    this.save();

    this.dispatchOutbox(
      params.householdId,
      'auth',
      'update_landlord_profile',
      profile,
      `Update landlord profile: ${profile.landlordName}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('landlord_profiles').upsert({
          household_id: profile.householdId,
          landlord_name: profile.landlordName,
          role_label: profile.roleLabel,
          phone_or_whatsapp: profile.phoneOrWhatsapp,
          emergency_note: profile.emergencyNote || '',
          updated_by: profile.updatedBy || null,
          updated_at: profile.updatedAt,
          version: profile.version,
        });
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return profile;
  }

  public async getMaintenanceIssues(householdId: string): Promise<MaintenanceIssue[]> {
    const store = this.getStore();
    const localIssues = (store.maintenanceIssues?.[householdId] || []).filter((i) => !i.deletedAt);

    if (this.isDemoMode() || !isUuid(householdId) || !supabase) {
      return localIssues;
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_issues')
        .select('id, household_id, title, description, status, photo_urls, reported_by, created_at, updated_at, deleted_at, version')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) {
        logger.warn('getMaintenanceIssues', 'Failed fetching maintenance issues', { error: error.message });
        return localIssues;
      }

      if (data) {
        const remoteIssues: MaintenanceIssue[] = data.map((row) => ({
          id: row.id,
          householdId: row.household_id,
          title: row.title,
          description: row.description || '',
          status: row.status as MaintenanceIssueStatus,
          photoUrls: Array.isArray(row.photo_urls) ? (row.photo_urls as string[]) : [],
          reportedBy: row.reported_by,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
          deletedAt: row.deleted_at || null,
          version: Number(row.version || 1),
        }));

        if (!store.maintenanceIssues) store.maintenanceIssues = {};
        store.maintenanceIssues[householdId] = remoteIssues;
        this.save();
        return remoteIssues;
      }
    } catch (err) {
      logger.error('getMaintenanceIssues', 'Network error fetching maintenance issues', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return localIssues;
  }

  public async reportMaintenanceIssue(params: {
    householdId: string;
    title: string;
    description: string;
    photoUrls?: string[];
    reportedBy?: string;
  }): Promise<MaintenanceIssue> {
    const trimmedTitle = params.title.trim();
    const trimmedDesc = params.description.trim();

    if (!trimmedTitle) throw new Error('Issue title is required.');
    if (trimmedTitle.length > 100) throw new Error('Issue title must be 100 characters or fewer.');
    if (!trimmedDesc) throw new Error('Issue description is required.');
    if (trimmedDesc.length > 500) throw new Error('Issue description must be 500 characters or fewer.');

    // Privacy guardrail: reject identity documents
    assertNoIdentityDocument(trimmedTitle, 'Issue title');
    assertNoIdentityDocument(trimmedDesc, 'Issue description');

    const store = this.getStore();
    const reporterId = params.reportedBy || store.currentUser.id;
    const id = makeEntityId('maint', isUuid(params.householdId));
    const now = new Date().toISOString();

    const issue: MaintenanceIssue = {
      id,
      householdId: params.householdId,
      title: trimmedTitle,
      description: trimmedDesc,
      status: 'reported',
      photoUrls: params.photoUrls || [],
      reportedBy: reporterId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    if (!store.maintenanceIssues) store.maintenanceIssues = {};
    if (!store.maintenanceIssues[params.householdId]) store.maintenanceIssues[params.householdId] = [];
    store.maintenanceIssues[params.householdId].unshift(issue);
    this.save();

    this.dispatchOutbox(
      params.householdId,
      'auth',
      'report_maintenance_issue',
      issue,
      `Report maintenance issue: ${issue.title}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('maintenance_issues').insert({
          id: issue.id,
          household_id: issue.householdId,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          photo_urls: issue.photoUrls,
          reported_by: issue.reportedBy,
          created_at: issue.createdAt,
          updated_at: issue.updatedAt,
          version: issue.version,
        });
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return issue;
  }

  public async updateMaintenanceIssueStatus(
    issueId: string,
    status: MaintenanceIssueStatus
  ): Promise<MaintenanceIssue | null> {
    const store = this.getStore();
    let foundIssue: MaintenanceIssue | null = null;
    let householdId = '';

    for (const [hId, issues] of Object.entries(store.maintenanceIssues || {})) {
      const item = issues.find((i) => i.id === issueId);
      if (item) {
        foundIssue = item;
        householdId = hId;
        break;
      }
    }

    if (!foundIssue) return null;

    foundIssue.status = status;
    foundIssue.updatedAt = new Date().toISOString();
    foundIssue.version = (foundIssue.version || 0) + 1;
    this.save();

    const updated = { ...foundIssue };
    this.dispatchOutbox(
      householdId,
      'auth',
      'update_maintenance_issue_status',
      { issueId, status },
      `Update maintenance issue status: ${issueId} -> ${status}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('maintenance_issues')
          .update({
            status: updated.status,
            updated_at: updated.updatedAt,
            version: updated.version,
          })
          .eq('id', issueId);
        if (error) return { error: { message: error.message, code: error.code } };
      }
    );

    return updated;
  }
}
