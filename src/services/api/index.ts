/**
 * Roomie Unified API Architecture Barrel & Facade
 * Composes domain-specific APIs into a backwards-compatible ApiService singleton.
 */

import {
  User,
  Household,
  Membership,
  JoinRequest,
  Expense,
  Settlement,
  Chore,
  DraftRound,
  DraftPick,
  ChoreAssignment,
  ChatMessage,
  MeetingTopic,
  HouseAgreement,
  InAppNotification,
  UserSettings,
  DutySchedule,
  DayOfWeek,
} from '../../types';
import { UnifiedDraftState } from '../../utils/stateTable';
import { SavedLoginAccount } from '../../utils/savedAccounts';
import { outbox, OutboxActionType } from '../outbox';
import { debugLog, DebugModule } from '../../utils/debugLog';
import { supabase } from '../supabase';
import {
  AppStore,
  loadStore,
  saveStore,
  getInitialStore,
  isUuid,
  toDraftPickRow,
  toChoreAssignmentRow,
  dispatchRemoteMutation,
  getDebugModuleForOutboxType,
  STORAGE_KEY,
} from './shared';
import { AuthApi } from './auth.api';
import { HouseholdsApi } from './households.api';
import { ExpensesApi } from './expenses.api';
import { ChoresApi } from './chores.api';
import { ChatApi } from './chat.api';
import { GovernanceApi } from './governance.api';
import { NotificationsApi } from './notifications.api';
import { SystemApi } from './system.api';

export class ApiService {
  private _store: AppStore;

  public auth: AuthApi;
  public households: HouseholdsApi;
  public expenses: ExpensesApi;
  public chores: ChoresApi;
  public chat: ChatApi;
  public governance: GovernanceApi;
  public notifications: NotificationsApi;
  public system: SystemApi;

  constructor() {
    this._store = loadStore();

    // Context passed to domain modules
    const self = this;

    const baseContext = {
      get store() {
        return self._store;
      },
      save: (s?: AppStore) => {
        if (s) self._store = s;
        saveStore(self._store);
      },
      isDemoMode: () => self.auth.isDemoMode(),
      dispatchRemoteMutation: <T>(
        householdId: string,
        module: DebugModule,
        outboxType: OutboxActionType,
        payload: T,
        summary: string,
        remoteExec: () => Promise<{ error: any } | void>
      ) => {
        dispatchRemoteMutation(
          self.auth.isDemoMode(),
          householdId,
          module,
          outboxType,
          payload,
          summary,
          remoteExec
        );
      },
      addMessage: (
        householdId: string,
        senderId: string | null,
        type: 'text' | 'activity',
        body: string,
        linkTarget?: { screen: string; id?: string }
      ) => self.chat.addMessage(householdId, senderId, type, body, linkTarget),
      getHouseholdMembers: (householdId?: string) => self.households.getHouseholdMembers(householdId),
    };

    this.auth = new AuthApi({
      ...baseContext,
      getHouseholds: () => self.households.getHouseholds(),
    });

    this.households = new HouseholdsApi({
      ...baseContext,
      getScopedLocalHouseholds: () => self.auth.getScopedLocalHouseholds(),
      syncAccountSetupMode: (mode) => (self.auth as any).syncAccountSetupMode(mode),
    });

    this.expenses = new ExpensesApi(baseContext);
    this.chores = new ChoresApi(baseContext);
    this.chat = new ChatApi(baseContext);
    this.governance = new GovernanceApi(baseContext);
    this.notifications = new NotificationsApi(baseContext);
    this.system = new SystemApi({
      store: this._store,
      setStore: (s: AppStore) => {
        this._store = s;
      },
      save: () => saveStore(this._store),
      isDemoMode: () => self.auth.isDemoMode(),
    });

    outbox.setSyncHandler(this.processOutboxItem.bind(this));
    outbox.initAutoFlush();
  }

  /**
   * Backwards-compatible in-memory store accessor
   */
  public get store(): AppStore {
    return this._store;
  }

  public set store(val: AppStore) {
    this._store = val;
  }

  private async processOutboxItem(item: any): Promise<boolean> {
    if (!supabase) return false;
    const sb = supabase;
    const mod = getDebugModuleForOutboxType(item.type);
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      let error: any = null;
      const p = item.payload || {};

      switch (item.type as OutboxActionType) {
        case 'create_expense': {
          const exp: Expense = p.expense;
          const res1 = await sb.from('expenses').upsert(
            {
              ...(isUuid(exp.id) ? { id: exp.id } : {}),
              household_id: exp.householdId,
              paid_by: exp.paidBy,
              title: exp.title,
              amount: exp.amount,
              category: exp.category,
              receipt_url: exp.receiptUrl || null,
              date: exp.date,
              status: exp.status,
            },
            { onConflict: 'id' }
          );
          error = res1.error;
          if (!error && Array.isArray(exp.shares) && exp.shares.length > 0 && isUuid(exp.id)) {
            const shareRows = exp.shares.map((s) => ({
              expense_id: exp.id,
              user_id: s.userId,
              share_amount: s.shareAmount,
              response: s.response,
              dispute_reason: s.disputeReason || null,
            }));
            const res2 = await sb.from('expense_shares').upsert(shareRows, { onConflict: 'expense_id,user_id' });
            error = res2.error;
          }
          break;
        }
        case 'agree_expense':
        case 'dispute_expense': {
          const { expenseId, userId, response, disputeReason, nextStatus } = p;
          let shareQuery = sb
            .from('expense_shares')
            .update({ response, dispute_reason: disputeReason || null })
            .eq('expense_id', expenseId);
          if (userId) shareQuery = shareQuery.eq('user_id', userId);
          const res1 = await shareQuery;
          error = res1.error;
          if (!error && nextStatus) {
            const res2 = await sb
              .from('expenses')
              .update({
                status: nextStatus,
                dispute_reason: response === 'disputed' ? disputeReason || null : null,
              })
              .eq('id', expenseId);
            error = res2.error;
          }
          break;
        }
        case 'edit_expense_split': {
          const { expenseId, shares } = p;
          const res1 = await sb
            .from('expense_shares')
            .upsert(
              (shares || []).map((s: any) => ({
                expense_id: expenseId,
                user_id: s.userId,
                share_amount: s.shareAmount,
                response: 'agreed',
                dispute_reason: null,
              })),
              { onConflict: 'expense_id,user_id' }
            );
          error = res1.error;
          if (!error) {
            const res2 = await sb.from('expenses').update({ status: 'agreed', dispute_reason: null }).eq('id', expenseId);
            error = res2.error;
          }
          break;
        }
        case 'cancel_expense': {
          const res = await sb.from('expenses').update({ status: 'cancelled' }).eq('id', p.expenseId);
          error = res.error;
          break;
        }
        case 'create_settlement': {
          const s: Settlement = p.settlement;
          const res = await sb.from('settlements').upsert(
            {
              ...(isUuid(s.id) ? { id: s.id } : {}),
              household_id: s.householdId,
              from_user: s.fromUser,
              to_user: s.toUser,
              amount: s.amount,
              status: s.status,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'confirm_settlement': {
          const res = await sb
            .from('settlements')
            .update({ status: 'confirmed', confirmed_at: p.confirmedAt || new Date().toISOString() })
            .eq('id', p.settlementId);
          error = res.error;
          break;
        }
        case 'open_draft_round': {
          const res = await sb.from('draft_rounds').upsert(
            {
              ...(isUuid(p.roundId) ? { id: p.roundId } : {}),
              household_id: p.householdId,
              status: 'collecting',
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'submit_draft_picks': {
          const { roundId, userId, picks, status, assignments } = p;
          if (isUuid(roundId) && Array.isArray(picks) && picks.length > 0) {
            const resDel = await sb.from('draft_picks').delete().eq('round_id', roundId).eq('user_id', userId);
            error = resDel.error;
            if (!error) {
              const resIns = await sb.from('draft_picks').upsert(
                picks.map((pk: DraftPick) => toDraftPickRow(roundId, pk)),
                { onConflict: 'round_id,user_id,chore_id' }
              );
              error = resIns.error;
            }
          }
          if (!error && status === 'ready_to_reveal' && Array.isArray(assignments) && assignments.length > 0 && isUuid(roundId)) {
            const resAssign = await sb.from('chore_assignments').upsert(
              assignments.map((a: ChoreAssignment) => toChoreAssignmentRow(roundId, a)),
              { onConflict: 'round_id,chore_id' }
            );
            error = resAssign.error;
            if (!error) {
              const resStatus = await sb.from('draft_rounds').update({ status: 'ready_to_reveal' }).eq('id', roundId);
              error = resStatus.error;
            }
          }
          break;
        }
        case 'update_assignments': {
          const { roundId, assignments } = p;
          if (isUuid(roundId) && Array.isArray(assignments) && assignments.length > 0) {
            const res = await sb.from('chore_assignments').upsert(
              assignments.map((a: ChoreAssignment) => toChoreAssignmentRow(roundId, a)),
              { onConflict: 'round_id,chore_id' }
            );
            error = res.error;
          }
          break;
        }
        case 'reveal_draft': {
          const res = await sb
            .from('draft_rounds')
            .update({ status: 'revealed', revealed_at: p.revealedAt || new Date().toISOString() })
            .eq('id', p.roundId);
          error = res.error;
          break;
        }
        case 'complete_chore': {
          const { roundId, householdId, choreId, userId, photoUrl, logId } = p;
          let q = sb
            .from('chore_assignments')
            .update({ completed_today: true, last_photo_url: photoUrl || null })
            .eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId);
          const res1 = await q;
          error = res1.error;
          if (!error && isUuid(householdId) && isUuid(choreId) && isUuid(userId)) {
            const res2 = await sb.from('chore_logs').upsert(
              {
                ...(isUuid(logId) ? { id: logId } : {}),
                household_id: householdId,
                chore_id: choreId,
                user_id: userId,
                photo_url: photoUrl || null,
              },
              { onConflict: 'id' }
            );
            error = res2.error;
          }
          break;
        }
        case 'give_kudos': {
          const { roundId, choreId, kudos } = p;
          let q = sb.from('chore_assignments').update({ kudos: kudos || [] }).eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId);
          const res = await q;
          error = res.error;
          break;
        }
        case 'swap_chore': {
          const { roundId, choreId, toUserId } = p;
          let q = sb.from('chore_assignments').update({ user_id: toUserId }).eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId);
          const res = await q;
          error = res.error;
          break;
        }
        case 'send_message': {
          const msg: ChatMessage = p.message;
          const res = await sb.from('chat_messages').upsert(
            {
              ...(isUuid(msg.id) ? { id: msg.id } : {}),
              household_id: msg.householdId,
              sender_id: msg.senderId,
              type: msg.type,
              body: msg.body,
              link_target: (msg.linkTarget as any) || null,
              reactions: (msg.reactions as any) || [],
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'add_reaction': {
          const res = await sb
            .from('chat_messages')
            .update({ reactions: p.reactions || [] })
            .eq('id', p.messageId);
          error = res.error;
          break;
        }
        case 'create_topic': {
          const t: MeetingTopic = p.topic;
          const res = await sb.from('meeting_topics').upsert(
            {
              ...(isUuid(t.id) ? { id: t.id } : {}),
              household_id: t.householdId,
              proposed_by: t.proposedBy,
              title: t.title,
              description: t.description,
              status: t.status,
              votes: t.votes as any,
              comments: t.comments as any,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'vote_topic': {
          const res = await sb
            .from('meeting_topics')
            .update({ votes: p.votes || [], status: p.status || 'open' })
            .eq('id', p.topicId);
          error = res.error;
          break;
        }
        case 'add_comment': {
          const res = await sb
            .from('meeting_topics')
            .update({ comments: p.comments || [] })
            .eq('id', p.topicId);
          error = res.error;
          break;
        }
        case 'add_agreement': {
          const a: HouseAgreement = p.agreement;
          const res = await sb.from('house_agreements').upsert(
            {
              ...(isUuid(a.id) ? { id: a.id } : {}),
              household_id: a.householdId,
              text: a.text,
              category: a.category,
              agreed_at: a.agreedAt,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'mark_notification_read': {
          const res = await sb.from('notifications').update({ read: true }).eq('id', p.id);
          error = res.error;
          break;
        }
        case 'mark_all_notifications_read': {
          if (Array.isArray(p.ids) && p.ids.length > 0) {
            const res = await sb.from('notifications').update({ read: true }).in('id', p.ids);
            error = res.error;
          }
          break;
        }
        default:
          return true;
      }

      const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
      if (error) {
        debugLog.warn(mod, `outbox_replay_${item.type}`, error.message, { actionId: item.id, code: error.code }, durationMs);
        return false;
      }
      debugLog.info(mod, `outbox_replay_${item.type}`, `Replayed ${item.type}`, { actionId: item.id }, durationMs);
      return true;
    } catch (err: any) {
      const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
      debugLog.error(mod, `outbox_replay_${item.type}`, err?.message || 'Outbox replay exception', { actionId: item.id }, durationMs);
      return false;
    }
  }

  // --- Auth & Session Facade ---
  public resetData = () => this.system.resetData();
  public hasLocalSession = () => this.auth.hasLocalSession();
  public isDemoMode = () => this.auth.isDemoMode();
  public needsHouseholdSetup = () => this.auth.needsHouseholdSetup();
  public markDemoMode = (useSampleProfile = false) => this.auth.markDemoMode(useSampleProfile);
  public markHouseholdSetupPending = () => this.auth.markHouseholdSetupPending();
  public markHouseholdConfigured = () => this.auth.markHouseholdConfigured();
  public getSession = () => this.auth.getSession();
  public onAuthStateChange = (callback: (event: string, hasSession: boolean) => void) => this.auth.onAuthStateChange(callback);
  public getSavedLoginAccounts = () => this.auth.getSavedLoginAccounts();
  public isCurrentUserLoginSaved = () => this.auth.isCurrentUserLoginSaved();
  public setCurrentUserLoginSaved = (save: boolean) => this.auth.setCurrentUserLoginSaved(save);
  public removeSavedLoginAccount = (userIdOrEmail: string) => this.auth.removeSavedLoginAccount(userIdOrEmail);
  public quickSignInSavedAccount = (userIdOrEmail: string) => this.auth.quickSignInSavedAccount(userIdOrEmail);
  public signUpWithSupabase = (
    email: string,
    password?: string,
    name?: string,
    options?: { rememberMe?: boolean }
  ) => this.auth.signUpWithSupabase(email, password, name, options);
  public signInWithSupabase = (
    email: string,
    password?: string,
    options?: { rememberMe?: boolean }
  ) => this.auth.signInWithSupabase(email, password, options);
  public signOut = (options?: { keepSavedLogin?: boolean }) => this.auth.signOut(options);
  public getCurrentUser = () => this.auth.getCurrentUser();
  public updateCurrentUser = (updates: Partial<User>) => this.auth.updateCurrentUser(updates);
  public updateUserProfile = (updates: Partial<User>) => this.auth.updateUserProfile(updates);
  public toggleHomeStatus = () => this.auth.toggleHomeStatus();
  public setAwayMode = (daysUntil: number | null) => this.auth.setAwayMode(daysUntil);
  public getSettings = () => this.auth.getSettings();
  public updateSettings = (updates: Partial<UserSettings>) => this.auth.updateSettings(updates);

  // --- Households & Memberships Facade ---
  public getHouseholds = () => this.households.getHouseholds();
  public getActiveHousehold = () => this.households.getActiveHousehold();
  public setActiveHousehold = (householdId: string) => this.households.setActiveHousehold(householdId);
  public getActiveHouseholdId = () => this.households.getActiveHouseholdId();
  public createHousehold = (
    name: string,
    currency: 'TRY' | 'USD' | 'EUR',
    options?: { rotationInterval?: 'weekly' | 'monthly'; starterChores?: string[] }
  ) => this.households.createHousehold(name, currency, options);
  public refreshInviteCode = (householdId?: string) => this.households.refreshInviteCode(householdId);
  public toggleInvites = (householdId?: string, enabled?: boolean) => this.households.toggleInvites(householdId, enabled);
  public joinHousehold = (code: string) => this.households.joinHousehold(code);
  public getHouseholdMembers = (householdId?: string) => this.households.getHouseholdMembers(householdId);
  public getJoinRequests = (householdId?: string) => this.households.getJoinRequests(householdId);
  public voteJoinRequest = (requestId: string, vote: 'ok' | 'unsure') => this.households.voteJoinRequest(requestId, vote);
  public decideJoinRequest = (requestId: string, approve: boolean) => this.households.decideJoinRequest(requestId, approve);
  public handoverAdmin = (toUserId: string) => this.households.handoverAdmin(toUserId);
  public leaveHousehold = (householdId: string) => this.households.leaveHousehold(householdId);
  public removeHouseholdMember = (householdId: string, targetUserId: string) =>
    this.households.removeHouseholdMember(householdId, targetUserId);

  // --- Expenses & Settlements Facade ---
  public getExpenses = (householdId?: string) => this.expenses.getExpenses(householdId);
  public addExpense = (
    title: string,
    amount: number,
    category: Expense['category'],
    participantUserIds: string[],
    receiptUrl?: string
  ) => this.expenses.addExpense(title, amount, category, participantUserIds, receiptUrl);
  public respondToExpense = (expenseId: string, response: 'agreed' | 'disputed', disputeReason?: string) =>
    this.expenses.respondToExpense(expenseId, response, disputeReason);
  public editExpenseSplit = (
    expenseId: string,
    adjustedShares: { userId: string; shareAmount: number }[]
  ) => this.expenses.editExpenseSplit(expenseId, adjustedShares);
  public cancelExpense = (expenseId: string) => this.expenses.cancelExpense(expenseId);
  public remindRoomies = (messageText?: string) => this.expenses.remindRoomies(messageText);
  public getBalancesOverview = (householdId?: string) => this.expenses.getBalancesOverview(householdId);
  public markSettlementPaid = (toUserId: string, amount: number) => this.expenses.markSettlementPaid(toUserId, amount);
  public confirmSettlement = (settlementId: string) => this.expenses.confirmSettlement(settlementId);
  public getSettlements = (householdId?: string) => this.expenses.getSettlements(householdId);

  // --- Chores & Duty Schedule Facade ---
  public getChores = (householdId?: string) => this.chores.getChores(householdId);
  public addChore = (
    name: string,
    frequency: 'daily' | 'weekly',
    effortLevel: 'light' | 'medium' | 'heavy',
    description: string
  ) => this.chores.addChore(name, frequency, effortLevel, description);
  public getDraftRound = (householdId?: string) => this.chores.getDraftRound(householdId);
  public emitChoreDraftTransition = (hid: string, state: UnifiedDraftState) =>
    this.chores.emitChoreDraftTransition(hid, state);
  public openNewDraftRound = (householdId?: string) => this.chores.openNewDraftRound(householdId);
  public submitDraftPicks = (picks: DraftPick[]) => this.chores.submitDraftPicks(picks);
  public updateAssignments = (assignments: ChoreAssignment[]) => this.chores.updateAssignments(assignments);
  public markDraftRevealed = () => this.chores.markDraftRevealed();
  public completeChore = (choreId: string, photoUrl?: string) => this.chores.completeChore(choreId, photoUrl);
  public giveKudos = (
    choreId: string,
    targetUserId: string,
    type: 'thanks' | 'great_job' | 'needs_look',
    note?: string
  ) => this.chores.giveKudos(choreId, targetUserId, type, note);
  public swapChore = (choreId: string, toUserId: string) => this.chores.swapChore(choreId, toUserId);
  public getDutySchedule = (householdId?: string) => this.chores.getDutySchedule(householdId);
  public reassignDutyDay = (day: DayOfWeek, userId: string, householdId?: string) =>
    this.chores.reassignDutyDay(day, userId, householdId);
  public swapDutyDays = (day1: DayOfWeek, day2: DayOfWeek, householdId?: string) =>
    this.chores.swapDutyDays(day1, day2, householdId);
  public completeDutyDay = (day: DayOfWeek, householdId?: string) =>
    this.chores.completeDutyDay(day, householdId);
  public checkDutyDayReminder = () => this.chores.checkDutyDayReminder();

  // --- Chat Facade ---
  public getMessages = (householdId?: string) => this.chat.getMessages(householdId);
  public sendMessage = (body: string) => this.chat.sendMessage(body);
  public subscribeToHousehold = (householdId: string, onUpdate: () => void) =>
    this.chat.subscribeToHousehold(householdId, onUpdate);
  public addMessage = (
    householdId: string,
    senderId: string | null,
    type: 'text' | 'activity',
    body: string,
    linkTarget?: { screen: string; id?: string }
  ) => this.chat.addMessage(householdId, senderId, type, body, linkTarget);
  public addReaction = (messageId: string, emoji: string) => this.chat.addReaction(messageId, emoji);

  // --- Governance Facade ---
  public getMeetingTopics = (householdId?: string) => this.governance.getMeetingTopics(householdId);
  public createMeetingTopic = (title: string, description: string) =>
    this.governance.createMeetingTopic(title, description);
  public voteMeetingTopic = (topicId: string, vote: 'agree' | 'disagree' | 'neutral') =>
    this.governance.voteMeetingTopic(topicId, vote);
  public voteTopic = (topicId: string, vote: 'agree' | 'disagree' | 'neutral') =>
    this.governance.voteTopic(topicId, vote);
  public addCommentToTopic = (topicId: string, text: string) =>
    this.governance.addCommentToTopic(topicId, text);
  public getAgreements = (householdId?: string) => this.governance.getAgreements(householdId);
  public addAgreement = (text: string, category: string) =>
    this.governance.addAgreement(text, category);

  // --- Notifications Facade ---
  public getNotifications = () => this.notifications.getNotifications();
  public markNotificationRead = (id: string) => this.notifications.markNotificationRead(id);
  public markAllNotificationsRead = () => this.notifications.markAllNotificationsRead();

  // --- Diagnostics Facade ---
  public pingSupabaseHealth = () => this.system.pingSupabaseHealth();
  public exportData = () => this.system.exportData();
}

export const api = new ApiService();

// Re-exports
export * from './shared';
export * from './auth.api';
export * from './households.api';
export * from './expenses.api';
export * from './chores.api';
export * from './chat.api';
export * from './governance.api';
export * from './notifications.api';
export * from './system.api';
