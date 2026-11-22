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
  CulturalDinner,
  ShoppingItem,
  HouseholdInfoCard,
} from '../../types';
import { UnifiedDraftState } from '../../utils/stateTable';
import { SavedLoginAccount } from '../../utils/savedAccounts';
import { outbox, OutboxActionType, OutboxItem } from '../outbox';
import { debugLog, DebugModule } from '../../utils/debugLog';
import { supabase } from '../supabase';
import { Json } from '../../types/database.types';
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
  RemoteMutationError,
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
import { SocialApi } from './social.api';
import { ShoppingApi } from './shopping.api';
import { FlatUtilitiesApi } from './flatUtilities.api';
import { TenantTransitionApi } from './tenantTransition.api';

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
  public social: SocialApi;
  public shopping: ShoppingApi;
  public flatUtilities: FlatUtilitiesApi;
  public tenantTransition: TenantTransitionApi;

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
        remoteExec: () => Promise<{ error: RemoteMutationError } | void>
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
      get store() {
        return self._store;
      },
      save: baseContext.save,
      getHouseholds: () => self.households.getHouseholds(),
    });

    this.households = new HouseholdsApi({
      get store() {
        return self._store;
      },
      save: baseContext.save,
      isDemoMode: baseContext.isDemoMode,
      addMessage: baseContext.addMessage,
      getScopedLocalHouseholds: () => self.auth.getScopedLocalHouseholds(),
      syncAccountSetupMode: (mode) => self.auth.syncAccountSetupMode(mode),
    });

    this.expenses = new ExpensesApi(baseContext);
    this.chores = new ChoresApi(baseContext);
    this.chat = new ChatApi(baseContext);
    this.governance = new GovernanceApi(baseContext);
    this.notifications = new NotificationsApi(baseContext);
    this.social = new SocialApi(baseContext);
    this.shopping = new ShoppingApi(baseContext);
    this.flatUtilities = new FlatUtilitiesApi(baseContext);
    this.tenantTransition = new TenantTransitionApi(baseContext);
    this.system = new SystemApi({
      get store() {
        return self._store;
      },
      setStore: (s: AppStore) => {
        self._store = s;
      },
      save: () => saveStore(self._store),
      isDemoMode: () => self.auth.isDemoMode(),
      leaveHousehold: (householdId: string) => self.households.leaveHousehold(householdId),
      dispatchRemoteMutation: baseContext.dispatchRemoteMutation,
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

  private async processOutboxItem(item: OutboxItem): Promise<boolean> {
    if (!supabase) return false;
    const sb = supabase;
    const mod = getDebugModuleForOutboxType(item.type);
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      let error: RemoteMutationError = null;
      const p = (item.payload || {}) as Record<string, unknown>;

      switch (item.type as OutboxActionType) {
        case 'create_expense': {
          const exp = p.expense as Expense;
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
          const expenseId = String(p.expenseId || '');
          const userId = p.userId ? String(p.userId) : '';
          const response = p.response as 'pending' | 'agreed' | 'disputed';
          const disputeReason = p.disputeReason ? String(p.disputeReason) : null;
          const nextStatus = p.nextStatus as Expense['status'] | undefined;
          let shareQuery = sb
            .from('expense_shares')
            .update({ response, dispute_reason: disputeReason })
            .eq('expense_id', expenseId);
          if (userId) shareQuery = shareQuery.eq('user_id', userId);
          const res1 = await shareQuery;
          error = res1.error;
          if (!error && nextStatus) {
            const res2 = await sb
              .from('expenses')
              .update({
                status: nextStatus,
                dispute_reason: response === 'disputed' ? disputeReason : null,
              })
              .eq('id', expenseId);
            error = res2.error;
          }
          break;
        }
        case 'edit_expense_split': {
          const expenseId = String(p.expenseId || '');
          const shares = (Array.isArray(p.shares) ? p.shares : []) as Array<{
            userId: string;
            shareAmount: number;
          }>;
          const res1 = await sb
            .from('expense_shares')
            .upsert(
              shares.map((s) => ({
                expense_id: expenseId,
                user_id: s.userId,
                share_amount: s.shareAmount,
                response: 'agreed' as const,
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
          const res = await sb.from('expenses').update({ status: 'cancelled' }).eq('id', String(p.expenseId || ''));
          error = res.error;
          break;
        }
        case 'create_settlement': {
          const s = p.settlement as Settlement;
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
            .update({
              status: 'confirmed',
              confirmed_at: p.confirmedAt ? String(p.confirmedAt) : new Date().toISOString(),
            })
            .eq('id', String(p.settlementId || ''));
          error = res.error;
          break;
        }
        case 'open_draft_round': {
          const roundId = p.roundId ? String(p.roundId) : undefined;
          const res = await sb.from('draft_rounds').upsert(
            {
              ...(isUuid(roundId) ? { id: roundId } : {}),
              household_id: String(p.householdId || ''),
              status: 'collecting',
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'submit_draft_picks': {
          const roundId = String(p.roundId || '');
          const userId = String(p.userId || '');
          const picks = (Array.isArray(p.picks) ? p.picks : []) as DraftPick[];
          const status = p.status as string | undefined;
          const assignments = (Array.isArray(p.assignments) ? p.assignments : []) as ChoreAssignment[];
          if (isUuid(roundId) && picks.length > 0) {
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
          if (!error && status === 'ready_to_reveal' && assignments.length > 0 && isUuid(roundId)) {
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
          const roundId = String(p.roundId || '');
          const assignments = (Array.isArray(p.assignments) ? p.assignments : []) as ChoreAssignment[];
          if (isUuid(roundId) && assignments.length > 0) {
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
            .update({
              status: 'revealed',
              revealed_at: p.revealedAt ? String(p.revealedAt) : new Date().toISOString(),
            })
            .eq('id', String(p.roundId || ''));
          error = res.error;
          break;
        }
        case 'complete_chore': {
          const roundId = p.roundId ? String(p.roundId) : undefined;
          const householdId = String(p.householdId || '');
          const choreId = String(p.choreId || '');
          const userId = String(p.userId || '');
          const photoUrl = p.photoUrl ? String(p.photoUrl) : null;
          const logId = p.logId ? String(p.logId) : undefined;
          let q = sb
            .from('chore_assignments')
            .update({ completed_today: true, last_photo_url: photoUrl })
            .eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId!);
          const res1 = await q;
          error = res1.error;
          if (!error && isUuid(householdId) && isUuid(choreId) && isUuid(userId)) {
            const res2 = await sb.from('chore_logs').upsert(
              {
                ...(isUuid(logId) ? { id: logId } : {}),
                household_id: householdId,
                chore_id: choreId,
                user_id: userId,
                photo_url: photoUrl,
              },
              { onConflict: 'id' }
            );
            error = res2.error;
          }
          break;
        }
        case 'give_kudos': {
          const roundId = p.roundId ? String(p.roundId) : undefined;
          const choreId = String(p.choreId || '');
          const kudos = (p.kudos || []) as unknown as Json;
          let q = sb.from('chore_assignments').update({ kudos }).eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId!);
          const res = await q;
          error = res.error;
          break;
        }
        case 'swap_chore': {
          const roundId = p.roundId ? String(p.roundId) : undefined;
          const choreId = String(p.choreId || '');
          const toUserId = String(p.toUserId || '');
          let q = sb.from('chore_assignments').update({ user_id: toUserId }).eq('chore_id', choreId);
          if (isUuid(roundId)) q = q.eq('round_id', roundId!);
          const res = await q;
          error = res.error;
          break;
        }
        case 'send_message': {
          const msg = p.message as ChatMessage;
          const res = await sb.from('chat_messages').upsert(
            {
              ...(isUuid(msg.id) ? { id: msg.id } : {}),
              household_id: msg.householdId,
              sender_id: msg.senderId,
              type: msg.type,
              body: msg.body,
              link_target: (msg.linkTarget || null) as unknown as Json,
              reactions: (msg.reactions || []) as unknown as Json,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'add_reaction': {
          const res = await sb
            .from('chat_messages')
            .update({ reactions: (p.reactions || []) as unknown as Json })
            .eq('id', String(p.messageId || ''));
          error = res.error;
          break;
        }
        case 'create_topic': {
          const t = p.topic as MeetingTopic;
          const res = await sb.from('meeting_topics').upsert(
            {
              ...(isUuid(t.id) ? { id: t.id } : {}),
              household_id: t.householdId,
              proposed_by: t.proposedBy,
              title: t.title,
              description: t.description,
              status: t.status,
              votes: t.votes as unknown as Json,
              comments: t.comments as unknown as Json,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'vote_topic': {
          const res = await sb
            .from('meeting_topics')
            .update({
              votes: (p.votes || []) as unknown as Json,
              status: (p.status as MeetingTopic['status']) || 'open',
            })
            .eq('id', String(p.topicId || ''));
          error = res.error;
          break;
        }
        case 'add_comment': {
          const res = await sb
            .from('meeting_topics')
            .update({ comments: (p.comments || []) as unknown as Json })
            .eq('id', String(p.topicId || ''));
          error = res.error;
          break;
        }
        case 'add_agreement': {
          const a = p.agreement as HouseAgreement;
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
          const res = await sb.from('notifications').update({ read: true }).eq('id', String(p.id || ''));
          error = res.error;
          break;
        }
        case 'mark_all_notifications_read': {
          if (Array.isArray(p.ids) && p.ids.length > 0) {
            const res = await sb
              .from('notifications')
              .update({ read: true })
              .in('id', p.ids as string[]);
            error = res.error;
          }
          break;
        }
        case 'submit_vibe_pulse': {
          const res = await sb.rpc('submit_anonymous_vibe', {
            p_household_id: String(p.householdId || ''),
            p_week_key: String(p.weekKey || ''),
            p_rating: String(p.rating || 'chill'),
          });
          error = res.error;
          break;
        }
        case 'propose_chore_swap': {
          const req = p.request as import('../../types').ChoreSwapRequest | undefined;
          if (req) {
            const res = await sb.from('chore_swap_requests').upsert(
              {
                ...(isUuid(req.id) ? { id: req.id } : {}),
                household_id: req.householdId,
                requester_user_id: req.requesterUserId,
                target_user_id: req.targetUserId,
                requester_chore_name: req.requesterChoreName,
                target_chore_name: req.targetChoreName,
                token_cost: req.tokenCost,
                status: req.status,
                note: req.note || null,
              },
              { onConflict: 'id' }
            );
            error = res.error;
          }
          break;
        }
        case 'resolve_chore_swap': {
          const res = await sb.rpc('resolve_chore_swap', {
            p_request_id: String(p.requestId || ''),
            p_action: String(p.action || 'decline'),
          });
          error = res.error;
          break;
        }
        case 'add_recurring_bill': {
          const b = p as unknown as import('../../types').RecurringBill;
          const res = await sb.from('recurring_bills').upsert(
            {
              ...(isUuid(b.id) ? { id: b.id } : {}),
              household_id: b.householdId,
              title: b.title,
              category: (b.category === 'wifi' || b.category === 'utilities' ? 'utilities' : b.category === 'rent' ? 'rent' : 'other'),
              amount: b.amount,
              currency: b.currency,
              due_day: b.dueDay,
              split_rule: b.splitRule,
              custom_splits: (b.customSplits as unknown as Json) || null,
              paid_by_user_id: b.paidByUserId,
              active: b.active,
              version: b.version,
              created_at: b.createdAt,
              updated_at: b.updatedAt,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'update_recurring_bill': {
          const b = p as unknown as import('../../types').RecurringBill;
          const res = await sb
            .from('recurring_bills')
            .update({
              title: b.title,
              category: (b.category === 'wifi' || b.category === 'utilities' ? 'utilities' : b.category === 'rent' ? 'rent' : 'other'),
              amount: b.amount,
              currency: b.currency,
              due_day: b.dueDay,
              split_rule: b.splitRule,
              custom_splits: (b.customSplits as unknown as Json) || null,
              paid_by_user_id: b.paidByUserId,
              active: b.active,
              last_generated_cycle: b.lastGeneratedCycle,
              version: b.version,
              updated_at: b.updatedAt,
            })
            .eq('id', b.id);
          error = res.error;
          break;
        }
        case 'delete_recurring_bill': {
          const res = await sb
            .from('recurring_bills')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', String(p.id || ''));
          error = res.error;
          break;
        }
        case 'log_recurring_bill_expense': {
          const billId = String(p.billId || '');
          const cycle = String(p.cycle || '');
          if (billId && cycle) {
            const res = await sb
              .from('recurring_bills')
              .update({
                last_generated_cycle: cycle,
                updated_at: new Date().toISOString(),
              })
              .eq('id', billId);
            error = res.error;
          }
          break;
        }
        case 'add_move_in_snapshot': {
          const snap = p as unknown as import('../../types').MoveInSnapshot;
          const res = await sb.from('move_in_snapshots').upsert(
            {
              ...(isUuid(snap.id) ? { id: snap.id } : {}),
              household_id: snap.householdId,
              room_name: snap.roomName,
              condition_note: snap.conditionNote,
              photo_urls: snap.photoUrls,
              created_by: snap.createdBy,
              confirmed_by_user_ids: snap.confirmedByUserIds,
              created_at: snap.createdAt,
              updated_at: snap.updatedAt,
              version: snap.version,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'confirm_move_in_snapshot': {
          const snapshotId = String(p.snapshotId || '');
          const userId = String(p.userId || '');
          if (snapshotId && userId) {
            const { data: cur } = await sb
              .from('move_in_snapshots')
              .select('confirmed_by_user_ids')
              .eq('id', snapshotId)
              .maybeSingle();
            const existing = Array.isArray(cur?.confirmed_by_user_ids)
              ? (cur.confirmed_by_user_ids as string[])
              : [];
            if (!existing.includes(userId)) {
              existing.push(userId);
              const res = await sb
                .from('move_in_snapshots')
                .update({ confirmed_by_user_ids: existing, updated_at: new Date().toISOString() })
                .eq('id', snapshotId);
              error = res.error;
            }
          }
          break;
        }
        case 'update_landlord_profile': {
          const prof = p as unknown as import('../../types').LandlordProfile;
          const res = await sb.from('landlord_profiles').upsert(
            {
              household_id: prof.householdId,
              landlord_name: prof.landlordName,
              role_label: prof.roleLabel,
              phone_or_whatsapp: prof.phoneOrWhatsapp,
              emergency_note: prof.emergencyNote || '',
              updated_by: prof.updatedBy || null,
              updated_at: prof.updatedAt,
              version: prof.version,
            },
            { onConflict: 'household_id' }
          );
          error = res.error;
          break;
        }
        case 'report_maintenance_issue': {
          const issue = p as unknown as import('../../types').MaintenanceIssue;
          const res = await sb.from('maintenance_issues').upsert(
            {
              ...(isUuid(issue.id) ? { id: issue.id } : {}),
              household_id: issue.householdId,
              title: issue.title,
              description: issue.description,
              status: issue.status,
              photo_urls: issue.photoUrls,
              reported_by: issue.reportedBy,
              created_at: issue.createdAt,
              updated_at: issue.updatedAt,
              version: issue.version,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'update_maintenance_issue_status': {
          const issueId = String(p.issueId || '');
          const status = String(p.status || 'reported');
          const res = await sb
            .from('maintenance_issues')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', issueId);
          error = res.error;
          break;
        }
        case 'add_move_out_inspection': {
          const row = p as unknown as Record<string, unknown>;
          const res = await sb.from('move_out_inspections').upsert({
            ...(isUuid(String(row.id || '')) ? { id: String(row.id) } : {}),
            household_id: String(row.householdId || ''),
            user_id: String(row.userId || ''),
            move_in_snapshot_id: isUuid(String(row.moveInSnapshotId || ''))
              ? String(row.moveInSnapshotId)
              : null,
            room_name: String(row.roomName || ''),
            condition_note: String(row.conditionNote || ''),
            photo_urls: Array.isArray(row.photoUrls) ? (row.photoUrls as string[]) : [],
            is_damage_reported: Boolean(row.isDamageReported),
            damage_deduction_amount: Number(row.damageDeductionAmount || 0),
            deposit_paid_amount: Number(row.depositPaidAmount || 0),
            deposit_refund_amount: Number(row.depositRefundAmount || 0),
            confirmed_by_user_ids: Array.isArray(row.confirmedByUserIds)
              ? (row.confirmedByUserIds as string[])
              : [],
            status: String(row.status || 'pending_review'),
            created_at: String(row.createdAt || new Date().toISOString()),
            updated_at: String(row.updatedAt || new Date().toISOString()),
            version: Number(row.version || 1),
          });
          error = res.error;
          break;
        }
        case 'confirm_move_out_inspection': {
          const inspectionId = String(p.inspectionId || '');
          const res = await sb.rpc('confirm_move_out_inspection', {
            p_inspection_id: inspectionId,
          });
          error = res.error;
          break;
        }
        case 'settle_deposit_refund': {
          const inspectionId = String(p.inspectionId || '');
          const expenseId = p.expenseId ? String(p.expenseId) : null;
          const res = await sb
            .from('move_out_inspections')
            .update({
              status: 'settled',
              settlement_expense_id: isUuid(expenseId || '') ? expenseId : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', inspectionId);
          error = res.error;
          break;
        }
        case 'schedule_cultural_dinner': {
          const d = p as unknown as CulturalDinner;
          const res = await sb.from('cultural_dinners').upsert(
            {
              ...(isUuid(d.id) ? { id: d.id } : {}),
              household_id: d.householdId,
              host_user_id: d.hostUserId,
              dish_title: d.dishTitle,
              cuisine_tag: d.cuisineTag,
              scheduled_date: d.scheduledDate,
              dietary_tags: Array.isArray(d.dietaryTags) ? d.dietaryTags : [],
              rsvp_user_ids: Array.isArray(d.rsvpUserIds) ? d.rsvpUserIds : [],
              status: d.status || 'scheduled',
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'toggle_dinner_rsvp': {
          const dinnerId = String(p.dinnerId || '');
          const householdId = String(p.householdId || item.householdId || '');
          if (isUuid(dinnerId) && isUuid(householdId)) {
            const res = await sb.rpc('toggle_cultural_dinner_rsvp', {
              p_dinner_id: dinnerId,
              p_household_id: householdId,
            });
            error = res.error;
          }
          break;
        }
        case 'update_dietary_preferences': {
          const userId = String(p.userId || '');
          const dietaryTags = Array.isArray(p.dietaryTags) ? (p.dietaryTags as string[]) : [];
          if (isUuid(userId)) {
            const res = await sb
              .from('profiles')
              .update({ dietary_tags: dietaryTags })
              .eq('id', userId);
            error = res.error;
          }
          break;
        }
        case 'add_shopping_item': {
          const sItem = p as unknown as ShoppingItem;
          const rawStatus = String(sItem.status || 'needed');
          const status =
            rawStatus === 'in_cart' ? 'in_cart' : rawStatus === 'purchased' || rawStatus === 'bought' ? 'purchased' : 'needed';
          const res = await sb.from('shopping_items').upsert(
            {
              ...(isUuid(sItem.id) ? { id: sItem.id } : {}),
              household_id: sItem.householdId || item.householdId,
              title: sItem.title,
              category: sItem.category || 'groceries',
              quantity_label: sItem.quantityLabel || '',
              is_low: Boolean(sItem.isLow),
              status,
              added_by: sItem.addedBy,
            },
            { onConflict: 'id' }
          );
          error = res.error;
          break;
        }
        case 'toggle_shopping_item': {
          const rawStatus = String(p.newStatus || p.status || 'needed');
          const status =
            rawStatus === 'in_cart' ? 'in_cart' : rawStatus === 'purchased' || rawStatus === 'bought' ? 'purchased' : 'needed';
          if (Array.isArray(p.itemIds) && p.itemIds.length > 0) {
            const res = await sb
              .from('shopping_items')
              .update({ status, updated_at: new Date().toISOString() })
              .in('id', p.itemIds as string[]);
            error = res.error;
          } else if (p.itemId) {
            const claimedBy = p.claimedBy ? String(p.claimedBy) : null;
            const res = await sb
              .from('shopping_items')
              .update({
                status,
                claimed_by: isUuid(claimedBy || '') ? claimedBy : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', String(p.itemId));
            error = res.error;
          }
          break;
        }
        case 'delete_shopping_item': {
          const itemId = String(p.itemId || '');
          if (itemId) {
            const res = await sb
              .from('shopping_items')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', itemId);
            error = res.error;
          }
          break;
        }
        case 'trigger_supermarket_ping': {
          const hid = String(p.householdId || item.householdId || '');
          const messageId = p.messageId ? String(p.messageId) : '';
          const body = String(
            p.body ||
              'A flatmate is heading to the supermarket. Tap to add any last-minute items to the flat shopping list.'
          );
          const linkTarget = (p.linkTarget || { screen: 'feed' }) as unknown as Json;
          if (isUuid(hid)) {
            const msgRes = await sb.from('chat_messages').upsert(
              {
                ...(isUuid(messageId) ? { id: messageId } : {}),
                household_id: hid,
                sender_id: null,
                type: 'activity',
                body,
                link_target: linkTarget,
                reactions: [],
              },
              { onConflict: 'id' }
            );
            error = msgRes.error;
            if (!error) {
              const notifRes = await sb.rpc('notify_household_reminder', {
                p_household_id: hid,
                p_title: String(p.notificationTitle || 'Supermarket Run'),
                p_body: String(p.notificationBody || body),
                p_link_target: linkTarget,
              });
              error = notifRes.error;
            }
          }
          break;
        }
        case 'update_apartment_info': {
          const card = p as unknown as HouseholdInfoCard;
          const hid = card.householdId || item.householdId;
          if (isUuid(hid)) {
            const res = await sb.from('household_info_cards').upsert(
              {
                household_id: hid,
                wifi_ssid: card.wifiSsid || '',
                wifi_password: card.wifiPassword || '',
                trash_schedule: card.trashSchedule || '',
                delivery_address: card.deliveryAddress || '',
                emergency_note: card.emergencyNote || '',
                updated_by: isUuid(card.updatedBy || '') ? card.updatedBy : null,
                updated_at: card.updatedAt || new Date().toISOString(),
              },
              { onConflict: 'household_id' }
            );
            error = res.error;
          }
          break;
        }
        case 'save_duty_schedule': {
          const schedule = p as unknown as DutySchedule;
          const hid = schedule.householdId || item.householdId;
          if (isUuid(hid) && schedule.weekStartDate) {
            const res = await sb.from('duty_schedules').upsert(
              {
                household_id: hid,
                week_start_date: schedule.weekStartDate,
                entries: (schedule.entries || []) as unknown as Json,
              },
              { onConflict: 'household_id,week_start_date' }
            );
            error = res.error;
          }
          break;
        }
        case 'award_favor_tokens': {
          const hid = String(p.householdId || item.householdId || '');
          const targetUserId = String(p.targetUserId || '');
          const amount = Number(p.amount || 0);
          if (isUuid(hid) && isUuid(targetUserId) && amount > 0) {
            const res = await sb.rpc('award_favor_tokens', {
              p_household_id: hid,
              p_target_user_id: targetUserId,
              p_amount: amount,
              p_reason: String(p.reason || 'streak_milestone'),
              p_note: p.note ? String(p.note) : null,
            });
            error = res.error;
          }
          break;
        }
        case 'send_expense_reminder': {
          const hid = String(p.householdId || item.householdId || '');
          const title = String(p.title || 'Expense Reminder');
          const body = String(p.body || 'Please review pending apartment shares.');
          const linkTarget = (p.linkTarget || { screen: 'expenses' }) as unknown as Json;
          if (isUuid(hid) && body.trim()) {
            const res = await sb.rpc('notify_household_reminder', {
              p_household_id: hid,
              p_title: title,
              p_body: body,
              p_link_target: linkTarget,
            });
            error = res.error;
          }
          break;
        }
        case 'submit_feedback': {
          const userId = String(p.userId || '');
          const householdId = p.householdId ? String(p.householdId) : null;
          const category = String(p.category || 'rate');
          const rating = typeof p.rating === 'number' ? p.rating : null;
          const message = String(p.message || '').trim();
          if (isUuid(userId) && message) {
            const res = await sb.from('app_feedback').insert({
              user_id: userId,
              household_id: isUuid(householdId || '') ? householdId : null,
              category,
              rating,
              message,
              app_version: String(p.appVersion || ''),
              platform: String(p.platform || 'web'),
            });
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
    } catch (err: unknown) {
      const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
      const msg = err instanceof Error ? err.message : 'Outbox replay exception';
      debugLog.error(mod, `outbox_replay_${item.type}`, msg, { actionId: item.id }, durationMs);
      return false;
    }
  }

  // --- Auth & Session Facade ---
  public resetData = () => this.system.resetData();
  public deleteAccount = () => this.system.deleteAccount();
  public submitFeedback = (params: Parameters<SystemApi['submitFeedback']>[0]) =>
    this.system.submitFeedback(params);
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
  public uncompleteDutyDay = (day: DayOfWeek, householdId?: string) =>
    this.chores.uncompleteDutyDay(day, householdId);
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

  // --- Social & Rituals Facade (Awards, Vibe Checks, Favor Tokens) ---
  public getWeeklyAwards = (householdId?: string) => this.social.getWeeklyAwards(householdId);
  public refreshWeeklyAwards = (householdId?: string) => this.social.refreshWeeklyAwards(householdId);
  public getVibeSummary = (householdId?: string, weekKey?: string) => this.social.getVibeSummary(householdId, weekKey);
  public submitVibePulse = (rating: import('../../types').VibeRating, householdId?: string) =>
    this.social.submitVibePulse(rating, householdId);
  public submitVibeCheck = (rating: import('../../types').VibeRating, householdId?: string) =>
    this.social.submitVibePulse(rating, householdId);
  public getFavorTokenBalance = (userId?: string) => this.social.getFavorTokenBalance(userId);
  public awardFavorTokens = (
    userId: string,
    amount: number,
    reason?: 'streak_milestone' | 'weekly_award' | 'roommate_favor',
    note?: string
  ) => this.social.awardFavorTokens(userId, amount, reason, note);
  public getSwapRequests = (householdId?: string) => this.social.getSwapRequests(householdId);
  public proposeChoreSwap = (params: {
    targetUserId: string;
    requesterChoreName: string;
    targetChoreName: string;
    tokenCost?: number;
    note?: string;
  }) => this.social.proposeChoreSwap(params);
  public createSwapRequest = (params: {
    targetUserId: string;
    requesterChoreName: string;
    targetChoreName: string;
    tokenCost?: number;
    note?: string;
  }) => this.social.proposeChoreSwap(params);
  public resolveChoreSwap = (requestId: string, action: 'accept' | 'decline') =>
    this.social.resolveChoreSwap(requestId, action);
  public resolveSwapRequest = (requestId: string, action: 'accept' | 'decline') =>
    this.social.resolveChoreSwap(requestId, action);

  // --- Flat Utilities Facade (Recurring Bills, Move-In Snapshots, Landlord Hub) ---
  public getRecurringBills = (householdId: string) => this.flatUtilities.getRecurringBills(householdId);
  public addRecurringBill = (params: Parameters<FlatUtilitiesApi['addRecurringBill']>[0]) =>
    this.flatUtilities.addRecurringBill(params);
  public updateRecurringBill = (id: string, updates: Parameters<FlatUtilitiesApi['updateRecurringBill']>[1]) =>
    this.flatUtilities.updateRecurringBill(id, updates);
  public deleteRecurringBill = (id: string) => this.flatUtilities.deleteRecurringBill(id);
  public logRecurringBillExpense = (billId: string, options?: { note?: string }) =>
    this.flatUtilities.logRecurringBillExpense(billId, options);

  public getMoveInSnapshots = (householdId: string) => this.flatUtilities.getMoveInSnapshots(householdId);
  public addMoveInSnapshot = (params: Parameters<FlatUtilitiesApi['addMoveInSnapshot']>[0]) =>
    this.flatUtilities.addMoveInSnapshot(params);
  public confirmMoveInSnapshot = (snapshotId: string, userId: string) =>
    this.flatUtilities.confirmMoveInSnapshot(snapshotId, userId);

  public getLandlordProfile = (householdId: string) => this.flatUtilities.getLandlordProfile(householdId);
  public updateLandlordProfile = (params: Parameters<FlatUtilitiesApi['updateLandlordProfile']>[0]) =>
    this.flatUtilities.updateLandlordProfile(params);
  public getMaintenanceIssues = (householdId: string) => this.flatUtilities.getMaintenanceIssues(householdId);
  public reportMaintenanceIssue = (params: Parameters<FlatUtilitiesApi['reportMaintenanceIssue']>[0]) =>
    this.flatUtilities.reportMaintenanceIssue(params);
  public updateMaintenanceIssueStatus = (issueId: string, status: Parameters<FlatUtilitiesApi['updateMaintenanceIssueStatus']>[1]) =>
    this.flatUtilities.updateMaintenanceIssueStatus(issueId, status);

  // --- Tenant Transition & Deposit Return Facade (Track 1 / Phase 4A) ---
  public getMoveOutInspections = (householdId: string) => this.tenantTransition.getMoveOutInspections(householdId);
  public addMoveOutInspection = (params: Parameters<TenantTransitionApi['addMoveOutInspection']>[0]) =>
    this.tenantTransition.addMoveOutInspection(params);
  public confirmMoveOutInspection = (inspectionId: string, userId?: string) =>
    this.tenantTransition.confirmMoveOutInspection(inspectionId, userId);
  public settleDepositRefund = (inspectionId: string, adminPayerUserId?: string) =>
    this.tenantTransition.settleDepositRefund(inspectionId, adminPayerUserId);
  public getTenantPassport = (userId: string) => this.tenantTransition.getTenantPassport(userId);

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
export * from './social.api';
export * from './shopping.api';
export * from './flatUtilities.api';
export * from './tenantTransition.api';
