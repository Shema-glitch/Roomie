/**
 * Expenses, Balances & Settlements Domain API
 */

import { Expense, Settlement, User, Membership } from '../../types';
import { calculateBalances } from '../../utils/balances';
import { supabase } from '../supabase';
import { OutboxActionType } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import {
  AppStore,
  createDomainLogger,
  isUuid,
  makeEntityId,
  mapExpense,
  mapSettlement,
} from './shared';

const logger = createDomainLogger('ExpensesAPI', 'expenses');
const settlementLogger = createDomainLogger('SettlementsAPI', 'settlements');

export interface ExpensesContext {
  store: AppStore;
  save: () => void;
  isDemoMode: () => boolean;
  dispatchRemoteMutation: <T>(
    householdId: string,
    module: DebugModule,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: any } | void>
  ) => void;
  addMessage: (
    householdId: string,
    senderId: string | null,
    type: 'text' | 'activity',
    body: string,
    linkTarget?: { screen: string; id?: string }
  ) => void;
  getHouseholdMembers: (householdId?: string) => Promise<{ user: User; membership: Membership }[]>;
}

export class ExpensesApi {
  constructor(private ctx: ExpensesContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  private isDemoMode(): boolean {
    return this.ctx.isDemoMode();
  }

  public async getExpenses(householdId?: string): Promise<Expense[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: expRows, error } = await supabase
          .from('expenses')
          .select('*, expense_shares(*)')
          .eq('household_id', hid)
          .order('created_at', { ascending: false });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.warn('fetch_expenses', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(expRows)) {
          const liveExpenses = expRows.map((e: any) => mapExpense(e, e.expense_shares || []));
          this.store.expenses = [
            ...this.store.expenses.filter((e) => e.householdId !== hid),
            ...liveExpenses,
          ];
          logger.info('fetch_expenses', `Loaded ${liveExpenses.length} expense(s)`, { householdId: hid, count: liveExpenses.length }, durationMs);
          return liveExpenses;
        }
      } catch (err: any) {
        logger.error('fetch_expenses', err?.message || 'Supabase getExpenses fallback', { householdId: hid });
      }
    }
    return this.store.expenses
      .filter(e => e.householdId === hid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async addExpense(
    title: string,
    amount: number,
    category: Expense['category'],
    participantUserIds: string[],
    receiptUrl?: string
  ): Promise<Expense> {
    const hid = this.store.activeHouseholdId;
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const shareEach = Math.round((amount / participantUserIds.length) * 100) / 100;
    const newExpense: Expense = {
      id: makeEntityId('exp', useUuid),
      householdId: hid,
      paidBy: this.store.currentUser.id,
      title,
      amount,
      category,
      receiptUrl,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      shares: participantUserIds.map(uid => ({
        userId: uid,
        shareAmount: shareEach,
        response: uid === this.store.currentUser.id ? 'agreed' : 'pending',
      })),
      createdAt: new Date().toISOString(),
    };
    this.store.expenses.unshift(newExpense);

    this.ctx.dispatchRemoteMutation(
      hid,
      'expenses',
      'create_expense',
      { expense: newExpense },
      `Created expense "${title}" (₺${amount.toFixed(2)}) with ${participantUserIds.length} share(s)`,
      async () => {
        const sb = supabase!;
        const { error: expErr } = await sb.from('expenses').upsert(
          {
            ...(isUuid(newExpense.id) ? { id: newExpense.id } : {}),
            household_id: hid,
            paid_by: newExpense.paidBy,
            title: newExpense.title,
            amount: newExpense.amount,
            category: newExpense.category,
            receipt_url: newExpense.receiptUrl || null,
            date: newExpense.date,
            status: newExpense.status,
          },
          { onConflict: 'id' }
        );
        if (expErr) return { error: expErr };

        if (isUuid(newExpense.id) && newExpense.shares.length > 0) {
          const shareRows = newExpense.shares.map((s) => ({
            expense_id: newExpense.id,
            user_id: s.userId,
            share_amount: s.shareAmount,
            response: s.response,
          }));
          const { error: shareErr } = await sb.from('expense_shares').upsert(shareRows, {
            onConflict: 'expense_id,user_id',
          });
          return { error: shareErr };
        }
        return { error: null };
      }
    );

    this.ctx.addMessage(hid, null, 'activity', `${this.store.currentUser.name} logged an expense: ${title} (₺${amount.toFixed(2)})`, {
      screen: 'expenses',
      id: newExpense.id,
    });
    this.ctx.save();
    return newExpense;
  }

  public async respondToExpense(expenseId: string, response: 'agreed' | 'disputed', disputeReason?: string): Promise<Expense> {
    const exp = this.store.expenses.find(e => e.id === expenseId);
    if (!exp) throw new Error('Expense not found');
    const currentUserId = this.store.currentUser.id;
    const share = exp.shares.find(s => s.userId === currentUserId);
    if (share) {
      share.response = response;
      if (disputeReason) share.disputeReason = disputeReason;
    }

    if (exp.shares.some(s => s.response === 'disputed')) {
      exp.status = 'disputed';
    } else if (exp.shares.every(s => s.response === 'agreed')) {
      exp.status = 'agreed';
    } else {
      exp.status = 'pending';
    }

    this.ctx.dispatchRemoteMutation(
      exp.householdId,
      'expenses',
      response === 'agreed' ? 'agree_expense' : 'dispute_expense',
      { expenseId, userId: currentUserId, response, disputeReason, nextStatus: exp.status },
      `Responded "${response}" on "${exp.title}" -> status ${exp.status}`,
      async () => {
        const sb = supabase!;
        const { error: shareErr } = await sb
          .from('expense_shares')
          .update({ response, dispute_reason: disputeReason || null })
          .eq('expense_id', expenseId)
          .eq('user_id', currentUserId);
        if (shareErr) return { error: shareErr };

        const { error: expErr } = await sb
          .from('expenses')
          .update({
            status: exp.status,
            dispute_reason: response === 'disputed' ? disputeReason || null : null,
          })
          .eq('id', expenseId);
        return { error: expErr };
      }
    );

    this.ctx.save();
    return exp;
  }

  public async editExpenseSplit(
    expenseId: string,
    adjustedShares: { userId: string; shareAmount: number }[]
  ): Promise<Expense> {
    const exp = this.store.expenses.find((e) => e.id === expenseId);
    if (!exp) throw new Error('Expense not found');
    exp.shares = adjustedShares.map((s) => ({
      userId: s.userId,
      shareAmount: s.shareAmount,
      response: 'agreed',
    }));
    exp.status = 'agreed';

    this.ctx.dispatchRemoteMutation(
      exp.householdId,
      'expenses',
      'edit_expense_split',
      { expenseId, shares: adjustedShares },
      `Adjusted split for "${exp.title}" (${adjustedShares.length} shares)`,
      async () => {
        const sb = supabase!;
        const { error: shareErr } = await sb.from('expense_shares').upsert(
          adjustedShares.map((s) => ({
            expense_id: expenseId,
            user_id: s.userId,
            share_amount: s.shareAmount,
            response: 'agreed' as const,
            dispute_reason: null,
          })),
          { onConflict: 'expense_id,user_id' }
        );
        if (shareErr) return { error: shareErr };
        return sb.from('expenses').update({ status: 'agreed', dispute_reason: null }).eq('id', expenseId);
      }
    );

    this.ctx.addMessage(
      exp.householdId,
      null,
      'activity',
      `Split adjusted for "${exp.title}". All shares resolved and agreed! 🤝`,
      { screen: 'expenses', id: exp.id }
    );
    this.ctx.save();
    return exp;
  }

  public async cancelExpense(expenseId: string): Promise<void> {
    const exp = this.store.expenses.find((e) => e.id === expenseId);
    if (exp) {
      exp.status = 'cancelled';
      this.ctx.dispatchRemoteMutation(
        exp.householdId,
        'expenses',
        'cancel_expense',
        { expenseId },
        `Cancelled expense "${exp.title}"`,
        async () => supabase!.from('expenses').update({ status: 'cancelled' }).eq('id', expenseId)
      );
      this.ctx.addMessage(
        exp.householdId,
        null,
        'activity',
        `Disputed purchase "${exp.title}" was cancelled by mutual agreement.`
      );
      this.ctx.save();
    }
  }

  public async remindRoomies(messageText?: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    this.ctx.addMessage(
      hid,
      null,
      'activity',
      messageText || `${this.store.currentUser.name} sent a friendly reminder to settle pending apartment shares.`,
      { screen: 'expenses' }
    );
    this.ctx.save();
  }

  public async getBalancesOverview(householdId?: string) {
    const hid = householdId || this.store.activeHouseholdId;
    const [expenses, settlements, members] = await Promise.all([
      this.getExpenses(hid),
      this.getSettlements(hid),
      this.ctx.getHouseholdMembers(hid),
    ]);
    const userIds = members.map(m => m.user.id);
    return calculateBalances(expenses, settlements, userIds);
  }

  public async markSettlementPaid(toUserId: string, amount: number): Promise<Settlement> {
    const hid = this.store.activeHouseholdId;
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const newSettlement: Settlement = {
      id: makeEntityId('set', useUuid),
      householdId: hid,
      fromUser: this.store.currentUser.id,
      toUser: toUserId,
      amount,
      status: 'marked_paid',
      createdAt: new Date().toISOString(),
    };
    this.store.settlements.push(newSettlement);

    this.ctx.dispatchRemoteMutation(
      hid,
      'settlements',
      'create_settlement',
      { settlement: newSettlement },
      `Marked ₺${amount.toFixed(2)} paid to ${toUserId.slice(0, 8)}`,
      async () =>
        supabase!.from('settlements').upsert(
          {
            ...(isUuid(newSettlement.id) ? { id: newSettlement.id } : {}),
            household_id: hid,
            from_user: newSettlement.fromUser,
            to_user: newSettlement.toUser,
            amount: newSettlement.amount,
            status: 'marked_paid',
          },
          { onConflict: 'id' }
        )
    );

    const toUser = this.store.users.find(u => u.id === toUserId);
    this.ctx.addMessage(hid, null, 'activity', `${this.store.currentUser.name} marked ₺${amount.toFixed(2)} as paid to ${toUser?.name || 'roomie'}. Waiting for confirmation.`);
    this.ctx.save();
    settlementLogger.info('mark_paid', `Settlement marked paid ₺${amount.toFixed(2)} to ${toUser?.name || toUserId}`);
    return newSettlement;
  }

  public async confirmSettlement(settlementId: string): Promise<Settlement> {
    const set = this.store.settlements.find(s => s.id === settlementId);
    if (!set) throw new Error('Settlement not found');
    const confirmedAt = new Date().toISOString();
    set.status = 'confirmed';
    set.confirmedAt = confirmedAt;

    this.ctx.dispatchRemoteMutation(
      set.householdId,
      'settlements',
      'confirm_settlement',
      { settlementId, confirmedAt },
      `Confirmed settlement ₺${set.amount.toFixed(2)}`,
      async () =>
        supabase!.from('settlements').update({ status: 'confirmed', confirmed_at: confirmedAt }).eq('id', settlementId)
    );

    const fromUser = this.store.users.find(u => u.id === set.fromUser);
    this.ctx.addMessage(set.householdId, null, 'activity', `Payment of ₺${set.amount.toFixed(2)} from ${fromUser?.name || 'roomie'} confirmed settled.`);
    this.ctx.save();
    settlementLogger.info('confirm_settlement', `Settlement ${settlementId} confirmed`);
    return set;
  }

  public async getSettlements(householdId?: string): Promise<Settlement[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: setRows, error } = await supabase
          .from('settlements')
          .select('*')
          .eq('household_id', hid);

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          settlementLogger.warn('fetch_settlements', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(setRows)) {
          const liveSets = setRows.map(mapSettlement);
          this.store.settlements = [
            ...this.store.settlements.filter((s) => s.householdId !== hid),
            ...liveSets,
          ];
          settlementLogger.info('fetch_settlements', `Loaded ${liveSets.length} settlement(s)`, { householdId: hid, count: liveSets.length }, durationMs);
          return liveSets;
        }
      } catch (err: any) {
        settlementLogger.error('fetch_settlements', err?.message || 'Supabase getSettlements fallback', { householdId: hid });
      }
    }
    return this.store.settlements.filter(s => s.householdId === hid);
  }
}
