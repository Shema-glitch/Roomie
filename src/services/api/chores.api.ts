/**
 * Chores, Secret Draft & Duty Timetable Domain API
 */

import {
  Chore,
  DraftRound,
  DraftPick,
  ChoreAssignment,
  DutySchedule,
  DayOfWeek,
  InAppNotification,
  User,
  Membership,
} from '../../types';
import {
  generateDutySchedule,
  reassignDutyDay as reassignDutyDayUtil,
  swapDutyDays as swapDutyDaysUtil,
  getTodayDuty,
  getMondayOfWeek,
} from '../../utils/dutyRotation';
import { matchChores } from '../../utils/matching';
import { getChoreStateEvent, UnifiedDraftState } from '../../utils/stateTable';
import { supabase } from '../supabase';
import { OutboxActionType } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import {
  AppStore,
  createDomainLogger,
  isUuid,
  makeEntityId,
  mapChore,
  toDraftPickRow,
  toChoreAssignmentRow,
} from './shared';

const logger = createDomainLogger('ChoresAPI', 'chores_draft');

export interface ChoresContext {
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

export class ChoresApi {
  constructor(private ctx: ChoresContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  private isDemoMode(): boolean {
    return this.ctx.isDemoMode();
  }

  public async getChores(householdId?: string): Promise<Chore[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: choreRows, error } = await supabase
          .from('chores')
          .select('*')
          .eq('household_id', hid)
          .eq('active', true);

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.warn('fetch_chores', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(choreRows)) {
          const liveChores = choreRows.map(mapChore);
          this.store.chores = [
            ...this.store.chores.filter((c) => c.householdId !== hid),
            ...liveChores,
          ];
          logger.info('fetch_chores', `Loaded ${liveChores.length} chore(s)`, { householdId: hid, count: liveChores.length }, durationMs);
          return liveChores;
        }
      } catch (err: any) {
        logger.error('fetch_chores', err?.message || 'Supabase getChores fallback', { householdId: hid });
      }
    }
    return this.store.chores.filter(c => c.householdId === hid);
  }

  public async addChore(name: string, frequency: 'daily' | 'weekly', effortLevel: 'light' | 'medium' | 'heavy', description: string): Promise<Chore> {
    const hid = this.store.activeHouseholdId;
    const iconName = effortLevel === 'heavy' ? 'Bath' : effortLevel === 'medium' ? 'Sparkles' : 'Trash2';
    let newChore: Chore = {
      id: makeEntityId('ch', !this.isDemoMode() && isUuid(hid)),
      householdId: hid,
      name,
      frequency,
      effortLevel,
      active: true,
      description,
      iconName,
    };

    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: inserted, error } = await supabase
          .from('chores')
          .insert({
            ...(isUuid(newChore.id) ? { id: newChore.id } : {}),
            household_id: hid,
            name,
            frequency,
            effort_level: effortLevel,
            active: true,
            description,
            icon_name: iconName,
          })
          .select('*')
          .single();
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.warn('add_chore', error.message, { householdId: hid, name }, durationMs);
        } else if (inserted) {
          newChore = mapChore(inserted);
          logger.info('add_chore', `Added chore "${name}"`, { householdId: hid, choreId: newChore.id }, durationMs);
        }
      } catch (err: any) {
        logger.error('add_chore', err?.message || 'Supabase addChore fallback', { householdId: hid });
      }
    }

    this.store.chores.push(newChore);
    this.ctx.save();
    return newChore;
  }

  public async getDraftRound(householdId?: string): Promise<DraftRound> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('draft_rounds')
          .select('*, draft_picks(*), chore_assignments(*)')
          .eq('household_id', hid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let roundRow: any = existing;
        if (!fetchErr && !roundRow) {
          const { data: created, error: createErr } = await supabase
            .from('draft_rounds')
            .insert({ household_id: hid, status: 'collecting' })
            .select('*, draft_picks(*), chore_assignments(*)')
            .single();
          if (createErr) {
            logger.warn('create_draft_round', createErr.message, { householdId: hid });
          }
          roundRow = created;
        }

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (fetchErr) {
          logger.warn('fetch_draft_round', fetchErr.message, { householdId: hid }, durationMs);
        } else if (roundRow) {
          const liveRound: DraftRound = {
            id: roundRow.id,
            householdId: roundRow.household_id,
            status: roundRow.status,
            createdAt: roundRow.created_at || new Date().toISOString(),
            revealedAt: roundRow.revealed_at || undefined,
            picks: (roundRow.draft_picks || []).map((p: any) => ({
              userId: p.user_id,
              choreId: p.chore_id,
              pickType: p.pick_type,
              targetUserId: p.target_user_id || undefined,
            })),
            assignments: (roundRow.chore_assignments || []).map((a: any) => ({
              choreId: a.chore_id,
              userId: a.user_id,
              scheduledDays: a.scheduled_days || ['Daily'],
              scheduledTime: a.scheduled_time || '18:00',
              completedToday: Boolean(a.completed_today),
              lastPhotoUrl: a.last_photo_url || undefined,
              kudos: Array.isArray(a.kudos) ? a.kudos : [],
            })),
          };
          this.store.draftRounds[hid] = liveRound;
          this.ctx.save();
          logger.info(
            'fetch_draft_round',
            `Round ${liveRound.id.slice(0, 8)} (${liveRound.status}): ${liveRound.picks.length} picks, ${liveRound.assignments.length} assignments`,
            { householdId: hid, roundId: liveRound.id, status: liveRound.status },
            durationMs
          );
          return liveRound;
        }
      } catch (err: any) {
        logger.error('fetch_draft_round', err?.message || 'Supabase getDraftRound fallback', { householdId: hid });
      }
    }

    if (!this.store.draftRounds[hid]) {
      this.store.draftRounds[hid] = {
        id: makeEntityId('dr', !this.isDemoMode() && isUuid(hid)),
        householdId: hid,
        status: 'collecting',
        createdAt: new Date().toISOString(),
        picks: [],
        assignments: [],
      };
      this.ctx.save();
    }
    return this.store.draftRounds[hid];
  }

  public emitChoreDraftTransition(hid: string, state: UnifiedDraftState) {
    const event = getChoreStateEvent(state);
    this.ctx.addMessage(hid, null, 'activity', event.activityMessage, event.linkTarget);

    const useUuid = !this.isDemoMode() && isUuid(hid);
    const members = this.store.memberships.filter(m => m.householdId === hid && m.status === 'active');
    for (const m of members) {
      this.store.notifications = this.store.notifications.filter(
        n => !(n.userId === m.userId && n.type === 'chore' && n.linkTarget?.screen.startsWith('chore-'))
      );
      const notif: InAppNotification = {
        id: makeEntityId('notif_chore', useUuid),
        userId: m.userId,
        type: 'chore',
        title: event.title,
        body: event.body,
        read: false,
        createdAt: new Date().toISOString(),
        linkTarget: event.linkTarget,
      };
      this.store.notifications.unshift(notif);

      if (useUuid && supabase && m.userId === this.store.currentUser.id && isUuid(notif.id)) {
        Promise.resolve(
          supabase.from('notifications').upsert(
            {
              id: notif.id,
              user_id: notif.userId,
              type: notif.type,
              title: notif.title,
              body: notif.body,
              read: false,
              link_target: (notif.linkTarget as any) || null,
            },
            { onConflict: 'id' }
          )
        ).catch(() => {});
      }
    }
  }

  public async openNewDraftRound(householdId?: string): Promise<DraftRound> {
    const hid = householdId || this.store.activeHouseholdId;
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const newRound: DraftRound = {
      id: makeEntityId('dr', useUuid),
      householdId: hid,
      status: 'collecting',
      createdAt: new Date().toISOString(),
      picks: [],
      assignments: [],
    };
    this.store.draftRounds[hid] = newRound;

    this.ctx.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'open_draft_round',
      { roundId: newRound.id, householdId: hid },
      `Opened new draft round ${newRound.id.slice(0, 8)}`,
      async () =>
        supabase!.from('draft_rounds').upsert(
          {
            ...(isUuid(newRound.id) ? { id: newRound.id } : {}),
            household_id: hid,
            status: 'collecting',
          },
          { onConflict: 'id' }
        )
    );

    this.emitChoreDraftTransition(hid, 'draft_open');
    this.ctx.save();
    return newRound;
  }

  public async submitDraftPicks(picks: DraftPick[]): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const currentUserId = this.store.currentUser.id;
    round.picks = round.picks.filter(p => p.userId !== currentUserId);
    round.picks.push(...picks);

    const members = await this.ctx.getHouseholdMembers(hid);
    const activeMemberIds = members.map(m => m.user.id);
    const usersWithPicks = new Set(round.picks.map(p => p.userId));
    const allPicksIn = activeMemberIds.length > 0 && activeMemberIds.every(id => usersWithPicks.has(id));

    if (allPicksIn) {
      const chores = await this.getChores(hid);
      const { assignments } = matchChores(chores, round.picks, activeMemberIds);
      round.assignments = assignments;
      round.status = 'ready_to_reveal';
      this.emitChoreDraftTransition(hid, 'reveal_ready');
    } else {
      this.emitChoreDraftTransition(hid, 'waiting_others');
    }

    this.ctx.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'submit_draft_picks',
      {
        roundId: round.id,
        userId: currentUserId,
        picks,
        status: round.status,
        assignments: round.status === 'ready_to_reveal' ? round.assignments : undefined,
      },
      `Submitted ${picks.length} pick(s) -> round ${round.status}`,
      async () => {
        const sb = supabase!;
        const { error: delErr } = await sb.from('draft_picks').delete().eq('round_id', round.id).eq('user_id', currentUserId);
        if (delErr) return { error: delErr };

        if (picks.length > 0) {
          const { error: pickErr } = await sb.from('draft_picks').upsert(
            picks.map((pk) => toDraftPickRow(round.id, pk)),
            { onConflict: 'round_id,user_id,chore_id' }
          );
          if (pickErr) return { error: pickErr };
        }

        if (round.status === 'ready_to_reveal' && round.assignments.length > 0) {
          const { error: assignErr } = await sb.from('chore_assignments').upsert(
            round.assignments.map((a) => toChoreAssignmentRow(round.id, a)),
            { onConflict: 'round_id,chore_id' }
          );
          if (assignErr) return { error: assignErr };
          return sb.from('draft_rounds').update({ status: 'ready_to_reveal' }).eq('id', round.id);
        }

        return { error: null };
      }
    );

    this.ctx.save();
    return round;
  }

  public async updateAssignments(assignments: ChoreAssignment[]): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    round.assignments = assignments;

    this.ctx.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'update_assignments',
      { roundId: round.id, assignments },
      `Updated ${assignments.length} chore assignment schedule(s)`,
      async () =>
        supabase!.from('chore_assignments').upsert(
          assignments.map((a) => toChoreAssignmentRow(round.id, a)),
          { onConflict: 'round_id,chore_id' }
        )
    );

    this.ctx.save();
    return round;
  }

  public async markDraftRevealed(): Promise<DraftRound> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const revealedAt = new Date().toISOString();
    round.status = 'revealed';
    round.revealedAt = revealedAt;

    this.ctx.dispatchRemoteMutation(
      hid,
      'chores_draft',
      'reveal_draft',
      { roundId: round.id, revealedAt },
      `Revealed draft round ${round.id.slice(0, 8)}`,
      async () =>
        supabase!.from('draft_rounds').update({ status: 'revealed', revealed_at: revealedAt }).eq('id', round.id)
    );

    this.emitChoreDraftTransition(hid, 'reveal_done');
    this.ctx.save();
    return round;
  }

  public async completeChore(choreId: string, photoUrl?: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const assign = round.assignments.find(a => a.choreId === choreId && a.userId === this.store.currentUser.id);
    if (assign) {
      assign.completedToday = true;
      if (photoUrl) assign.lastPhotoUrl = photoUrl;
      this.store.currentUser.streakDays += 1;
      this.store.currentUser.points += 20;
      const chore = this.store.chores.find(c => c.id === choreId);
      const useUuid = !this.isDemoMode() && isUuid(hid);
      const logId = makeEntityId('clog', useUuid);

      this.ctx.dispatchRemoteMutation(
        hid,
        'chores_draft',
        'complete_chore',
        { roundId: round.id, householdId: hid, choreId, userId: this.store.currentUser.id, photoUrl, logId },
        `Completed "${chore?.name || choreId}"${photoUrl ? ' with photo proof' : ''}`,
        async () => {
          const sb = supabase!;
          let q = sb
            .from('chore_assignments')
            .update({ completed_today: true, last_photo_url: photoUrl || null })
            .eq('chore_id', choreId);
          if (isUuid(round.id)) q = q.eq('round_id', round.id);
          const { error: assignErr } = await q;
          if (assignErr) return { error: assignErr };

          if (isUuid(choreId) && isUuid(this.store.currentUser.id)) {
            return sb.from('chore_logs').upsert(
              {
                ...(isUuid(logId) ? { id: logId } : {}),
                household_id: hid,
                chore_id: choreId,
                user_id: this.store.currentUser.id,
                photo_url: photoUrl || null,
              },
              { onConflict: 'id' }
            );
          }
          return { error: null };
        }
      );

      this.ctx.addMessage(hid, null, 'activity', `${this.store.currentUser.name} completed ${chore?.name || 'chore'}. Send kudos?`, {
        screen: 'chores',
        id: choreId,
      });
      this.ctx.save();
    }
  }

  public async giveKudos(choreId: string, targetUserId: string, type: 'thanks' | 'great_job' | 'needs_look', note?: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const assign = round.assignments.find(a => a.choreId === choreId && a.userId === targetUserId);
    if (assign) {
      assign.kudos.push({
        id: makeEntityId('k', !this.isDemoMode() && isUuid(hid)),
        fromUser: this.store.currentUser.id,
        type,
        note,
        createdAt: new Date().toISOString(),
      });
      if (type !== 'needs_look') {
        const target = this.store.users.find(u => u.id === targetUserId);
        if (target) target.points += 10;
      }

      this.ctx.dispatchRemoteMutation(
        hid,
        'chores_draft',
        'give_kudos',
        { roundId: round.id, choreId, kudos: assign.kudos },
        `Sent "${type}" kudos for chore ${choreId.slice(0, 8)}`,
        async () => {
          let q = supabase!.from('chore_assignments').update({ kudos: assign.kudos as any }).eq('chore_id', choreId);
          if (isUuid(round.id)) q = q.eq('round_id', round.id);
          return q;
        }
      );

      this.ctx.save();
    }
  }

  public async swapChore(choreId: string, toUserId: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const round = await this.getDraftRound(hid);
    const assign = round.assignments.find(a => a.choreId === choreId && a.userId === this.store.currentUser.id);
    if (assign) {
      assign.userId = toUserId;
      const toUser = this.store.users.find(u => u.id === toUserId);
      const chore = this.store.chores.find(c => c.id === choreId);

      this.ctx.dispatchRemoteMutation(
        hid,
        'chores_draft',
        'swap_chore',
        { roundId: round.id, choreId, toUserId },
        `Swapped "${chore?.name || choreId}" -> ${toUser?.name || toUserId.slice(0, 8)}`,
        async () => {
          let q = supabase!.from('chore_assignments').update({ user_id: toUserId }).eq('chore_id', choreId);
          if (isUuid(round.id)) q = q.eq('round_id', round.id);
          return q;
        }
      );

      this.ctx.addMessage(hid, null, 'activity', `${this.store.currentUser.name} swapped "${chore?.name}" with ${toUser?.name}.`);
      this.ctx.save();
    }
  }

  public async getDutySchedule(householdId?: string): Promise<DutySchedule> {
    const hid = householdId || this.store.activeHouseholdId;
    if (!this.store.dutySchedules) {
      this.store.dutySchedules = {};
    }

    const currentMonday = getMondayOfWeek();
    let schedule = this.store.dutySchedules[hid];

    if (!schedule || schedule.weekStartDate !== currentMonday) {
      const activeMembers = await this.ctx.getHouseholdMembers(hid);
      const roommates = activeMembers.map((m) => m.user);
      const chores = await this.getChores(hid);
      schedule = generateDutySchedule(hid, roommates, chores, currentMonday);
      this.store.dutySchedules[hid] = schedule;
      this.ctx.save();
    }

    return schedule;
  }

  public async reassignDutyDay(day: DayOfWeek, userId: string, householdId?: string): Promise<DutySchedule> {
    const hid = householdId || this.store.activeHouseholdId;
    const schedule = await this.getDutySchedule(hid);
    const updated = reassignDutyDayUtil(schedule, day, userId);
    this.store.dutySchedules![hid] = updated;

    const assignedUser = this.store.users.find((u) => u.id === userId);
    this.ctx.addMessage(
      hid,
      null,
      'activity',
      `📅 Duty schedule updated: ${assignedUser?.name || 'A flatmate'} is now assigned to ${day}.`,
      { screen: 'chores' }
    );

    this.ctx.save();
    return updated;
  }

  public async swapDutyDays(day1: DayOfWeek, day2: DayOfWeek, householdId?: string): Promise<DutySchedule> {
    const hid = householdId || this.store.activeHouseholdId;
    const schedule = await this.getDutySchedule(hid);
    const updated = swapDutyDaysUtil(schedule, day1, day2);
    this.store.dutySchedules![hid] = updated;

    this.ctx.addMessage(
      hid,
      null,
      'activity',
      `🔄 Duty days swapped between ${day1} and ${day2}.`,
      { screen: 'chores' }
    );

    this.ctx.save();
    return updated;
  }

  public async completeDutyDay(day: DayOfWeek, householdId?: string): Promise<void> {
    const hid = householdId || this.store.activeHouseholdId;
    const schedule = await this.getDutySchedule(hid);
    const entry = schedule.entries.find((e) => e.day === day);
    if (entry) {
      entry.completed = true;
      this.ctx.addMessage(
        hid,
        null,
        'activity',
        `✨ ${this.store.currentUser.name} completed today's apartment duty!`,
        { screen: 'chores' }
      );
      this.ctx.save();
    }
  }

  public async checkDutyDayReminder(): Promise<void> {
    const hid = this.store.activeHouseholdId;
    if (!hid) return;
    try {
      const schedule = await this.getDutySchedule(hid);
      const activeMembers = await this.ctx.getHouseholdMembers(hid);
      const roommates = activeMembers.map((m) => m.user);
      const todayDuty = getTodayDuty(schedule, roommates, this.store.currentUser.id);

      if (todayDuty && todayDuty.isMe && !todayDuty.entry.completed) {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const alreadyNotified = this.store.notifications.some(
          (n) => n.userId === this.store.currentUser.id && n.title.includes('Duty Day') && n.createdAt.startsWith(todayDateStr)
        );

        if (!alreadyNotified) {
          const flat = this.store.households.find((h) => h.id === hid);
          this.store.notifications.unshift({
            id: 'notif_duty_' + Date.now(),
            userId: this.store.currentUser.id,
            type: 'chore',
            title: "☀️ Today is your Flat Duty Day!",
            body: `You are on duty today at ${flat?.name || 'the apartment'}. Tap to review and complete today's tasks.`,
            read: false,
            createdAt: new Date().toISOString(),
            linkTarget: { screen: 'chores' },
          });
          this.ctx.save();
        }
      }
    } catch (err: any) {
      logger.warn('check_duty_reminder_error', err?.message || 'Error checking duty reminder');
    }
  }
}
