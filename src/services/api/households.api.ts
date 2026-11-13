/**
 * Households, Memberships & Invites Domain API
 */

import { Household, Membership, JoinRequest, User, Chore } from '../../types';
import { supabase } from '../supabase';
import {
  AppStore,
  createDomainLogger,
  isUuid,
  mapHousehold,
  mapProfileToUser,
  mapChore,
} from './shared';

const logger = createDomainLogger('HouseholdsAPI', 'auth');

export interface HouseholdsContext {
  store: AppStore;
  save: () => void;
  isDemoMode: () => boolean;
  getScopedLocalHouseholds: () => Household[];
  syncAccountSetupMode: (mode: 'pending' | 'configured' | 'demo') => void;
  addMessage: (
    householdId: string,
    senderId: string | null,
    type: 'text' | 'activity',
    body: string,
    linkTarget?: { screen: string; id?: string }
  ) => void;
}

export class HouseholdsApi {
  constructor(private ctx: HouseholdsContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  private isDemoMode(): boolean {
    return this.ctx.isDemoMode();
  }

  public getActiveHouseholdId(): string {
    return this.store.activeHouseholdId;
  }

  public async getHouseholds(): Promise<Household[]> {
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: memberships, error } = await supabase
            .from('memberships')
            .select('id, household_id, user_id, role, status, joined_at, households(*)')
            .eq('user_id', user.id)
            .eq('status', 'active');

          if (!error && Array.isArray(memberships)) {
            const liveHouseholds = memberships
              .map((m: any) => m.households)
              .filter(Boolean)
              .map(mapHousehold);

            this.store.households = liveHouseholds;
            this.store.memberships = [
              ...this.store.memberships.filter((m) => m.userId !== user.id),
              ...memberships.map((m: any) => ({
                id: m.id,
                userId: m.user_id,
                householdId: m.household_id,
                role: m.role as Membership['role'],
                status: m.status as Membership['status'],
                joinedAt: m.joined_at || new Date().toISOString(),
              })),
            ];

            if (liveHouseholds.length === 0) {
              this.store.activeHouseholdId = '';
              this.ctx.save();
              return [];
            }

            if (!this.store.activeHouseholdId || !liveHouseholds.some(h => h.id === this.store.activeHouseholdId)) {
              this.store.activeHouseholdId = liveHouseholds[0].id;
            }
            if (this.store.householdSetupMode === 'pending') {
              this.store.householdSetupMode = 'configured';
            }
            this.ctx.save();
            return liveHouseholds;
          }
        }
      } catch (err: any) {
        logger.warn('get_households_fallback', err?.message || 'Error fetching remote households');
      }
    }
    return this.ctx.getScopedLocalHouseholds();
  }

  public async getActiveHousehold(): Promise<Household | null> {
    const scoped = this.ctx.getScopedLocalHouseholds();
    const found = scoped.find((h) => h.id === this.store.activeHouseholdId);
    return found || scoped[0] || null;
  }

  public async setActiveHousehold(householdId: string): Promise<Household | null> {
    this.store.activeHouseholdId = householdId;
    this.ctx.save();
    return this.getActiveHousehold();
  }

  private generateInviteCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  public async createHousehold(
    name: string,
    currency: 'TRY' | 'USD' | 'EUR',
    options?: { rotationInterval?: 'weekly' | 'monthly'; starterChores?: string[] }
  ): Promise<Household> {
    const id = 'h_' + Math.random().toString(36).substring(2, 9);
    const code = this.generateInviteCode();
    const rotationInterval = options?.rotationInterval ?? 'weekly';
    const newHousehold: Household = {
      id,
      name,
      currency,
      inviteCode: code,
      invitesEnabled: true,
      createdBy: this.store.currentUser.id,
      settings: {
        rotationInterval,
        rotatingAdmin: false,
        quietHours: '23:00 - 08:00',
      },
      createdAt: new Date().toISOString(),
    };

    const starterPresetMap: Record<string, { frequency: 'daily' | 'weekly'; effortLevel: 'light' | 'medium' | 'heavy'; description: string; iconName: string }> = {
      'Deep Clean Bathroom': { frequency: 'weekly', effortLevel: 'heavy', description: 'Clean shower, sink & toilet', iconName: 'Bath' },
      'Dishwasher & Sink': { frequency: 'daily', effortLevel: 'medium', description: 'Unload dishwasher & wipe sink', iconName: 'Sparkles' },
      'Take Out Trash': { frequency: 'daily', effortLevel: 'light', description: 'Empty kitchen and hall bins', iconName: 'Trash2' },
      'Kitchen Counters': { frequency: 'daily', effortLevel: 'light', description: 'Wipe stove, counters & dining table', iconName: 'Sparkles' },
      'Living Room Sweep & Mop': { frequency: 'weekly', effortLevel: 'medium', description: 'Vacuum rug and mop shared floor', iconName: 'Home' },
      'Cook House Dinner': { frequency: 'weekly', effortLevel: 'heavy', description: 'Shared flat dinner & cleanup', iconName: 'Utensils' },
      'Supermarket Supply Run': { frequency: 'weekly', effortLevel: 'light', description: 'Restock paper goods & cleaning basics', iconName: 'ShoppingBag' },
    };

    const selectedNames = options?.starterChores?.length
      ? options.starterChores
      : ['Deep Clean Bathroom', 'Dishwasher & Sink', 'Take Out Trash'];

    const buildStarterChores = (householdId: string): Chore[] =>
      selectedNames.map((choreName, idx) => {
        const preset = starterPresetMap[choreName] || {
          frequency: 'weekly' as const,
          effortLevel: 'medium' as const,
          description: 'Shared household task',
          iconName: 'Sparkles',
        };
        return {
          id: 'ch_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6),
          householdId,
          name: choreName,
          frequency: preset.frequency,
          effortLevel: preset.effortLevel,
          active: true,
          description: preset.description,
          iconName: preset.iconName,
        };
      });

    let syncedChores = buildStarterChores(newHousehold.id);
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: createdH } = await supabase
            .from('households')
            .insert({
              name,
              currency,
              invite_code: code,
              created_by: user.id,
            })
            .select('*')
            .single();

          if (createdH) {
            newHousehold.id = createdH.id;
            newHousehold.createdBy = user.id;
            this.store.currentUser.id = user.id;
            await supabase.from('memberships').insert({
              household_id: createdH.id,
              user_id: user.id,
              role: 'admin',
              status: 'active',
            });
            const starterPayload = buildStarterChores(createdH.id).map((ch) => ({
              household_id: createdH.id,
              name: ch.name,
              frequency: ch.frequency,
              effort_level: ch.effortLevel,
              active: true,
              description: ch.description,
              icon_name: ch.iconName,
            }));
            const { data: insertedChores } = await supabase
              .from('chores')
              .insert(starterPayload)
              .select('*');
            syncedChores = insertedChores && insertedChores.length > 0
              ? insertedChores.map(mapChore)
              : buildStarterChores(createdH.id);
          }
        }
      } catch (err: any) {
        logger.warn('create_household_fallback', 'Supabase household creation fallback', { err });
      }
    }

    this.store.households.push(newHousehold);
    this.store.activeHouseholdId = newHousehold.id;
    this.store.memberships.push({
      id: 'm_' + Math.random().toString(36).substring(2, 7),
      userId: this.store.currentUser.id,
      householdId: newHousehold.id,
      role: 'admin',
      status: 'active',
      joinedAt: new Date().toISOString(),
    });
    this.store.chores.push(...syncedChores);
    this.store.householdSetupMode = 'configured';
    this.ctx.syncAccountSetupMode('configured');
    this.ctx.save();
    logger.info('create_household', `Created household ${name} (${newHousehold.id})`);
    return newHousehold;
  }

  public async refreshInviteCode(householdId?: string): Promise<string> {
    const hid = householdId || this.store.activeHouseholdId;
    const household = this.store.households.find(h => h.id === hid);
    if (!household) throw new Error('Apartment not found');
    const newCode = this.generateInviteCode();
    household.inviteCode = newCode;
    household.invitesEnabled = true;
    this.ctx.save();

    if (supabase && !this.isDemoMode()) {
      try {
        await supabase.from('households').update({ invite_code: newCode, invites_enabled: true }).eq('id', hid);
      } catch (err: any) {
        logger.warn('refresh_code_error', 'Supabase refresh code error', { err });
      }
    }
    return newCode;
  }

  public async toggleInvites(householdId?: string, enabled?: boolean): Promise<boolean> {
    const hid = householdId || this.store.activeHouseholdId;
    const household = this.store.households.find(h => h.id === hid);
    if (!household) throw new Error('Apartment not found');
    household.invitesEnabled = enabled !== undefined ? enabled : !(household.invitesEnabled ?? true);
    this.ctx.save();

    if (supabase && !this.isDemoMode()) {
      try {
        await supabase.from('households').update({ invites_enabled: household.invitesEnabled }).eq('id', hid);
      } catch (err: any) {
        logger.warn('toggle_invites_error', 'Supabase toggle invites error', { err });
      }
    }
    return household.invitesEnabled;
  }

  public async joinHousehold(code: string): Promise<{ success: boolean; household?: Household; message: string }> {
    const formattedCode = code.trim().toUpperCase();
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: directJoin, error: directJoinErr } = await (supabase.rpc as any)('join_household_by_code', {
          p_code: formattedCode,
        });

        if (!directJoinErr && directJoin && directJoin.success) {
          await this.getHouseholds();
          if (directJoin.household_id) {
            this.store.activeHouseholdId = directJoin.household_id;
          }
          this.store.householdSetupMode = 'configured';

          // Broadcast privacy alert to existing flatmates in store
          const otherMembers = this.store.memberships.filter(
            (m) => m.householdId === directJoin.household_id && m.status === 'active' && m.userId !== this.store.currentUser.id
          );
          otherMembers.forEach((m) => {
            this.store.notifications.unshift({
              id: 'notif_priv_' + Date.now() + '_' + m.userId,
              userId: m.userId,
              type: 'privacy_alert',
              title: '🛡️ Privacy Alert: New Flatmate Joined',
              body: `${this.store.currentUser.name} has joined the apartment. Review the active roster in Apartment settings.`,
              read: false,
              createdAt: new Date().toISOString(),
              linkTarget: { screen: 'apartment' },
            });
          });

          this.ctx.save();
          logger.info('join_household_rpc', `Direct join succeeded to ${directJoin.name}`);
          return {
            success: true,
            message: directJoin.message || `Welcome to ${directJoin.name}!`,
          };
        }

        const { data: targetH } = await (supabase.rpc as any)('lookup_household_by_invite', {
          p_code: formattedCode,
        });

        if (targetH && targetH.length > 0) {
          const flat = targetH[0];
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: reqErr } = await supabase.from('join_requests').insert({
              household_id: flat.id,
              user_id: user.id,
              user_name: this.store.currentUser.name || user.email?.split('@')[0] || 'Roomie',
              user_email: user.email || this.store.currentUser.email,
              user_country: this.store.currentUser.country,
              user_flag: this.store.currentUser.flag,
              user_avatar: this.store.currentUser.avatar,
              status: 'pending',
              votes: [],
            } as any);
            if (!reqErr) {
              logger.info('join_household_request', `Join request submitted for ${flat.name}`);
              return {
                success: true,
                household: mapHousehold(flat),
                message: 'Request submitted! Roomies will review before you enter.',
              };
            }
          }
        }
      } catch (err: any) {
        logger.warn('join_household_error', 'Join household Supabase error', { err });
      }
    }

    const target = this.store.households.find(h => h.inviteCode.toUpperCase() === formattedCode);
    if (!target) {
      return { success: false, message: 'Invite code not found. Check with your roomies.' };
    }
    if (target.invitesEnabled === false) {
      return { success: false, message: 'Invites are currently turned off for this apartment.' };
    }
    const existingReq = this.store.joinRequests.find(r => r.householdId === target.id && r.userEmail === this.store.currentUser.email);
    if (!existingReq) {
      const newReqId = 'jr_' + Date.now();
      this.store.joinRequests.push({
        id: newReqId,
        householdId: target.id,
        userName: this.store.currentUser.name,
        userEmail: this.store.currentUser.email,
        userCountry: this.store.currentUser.country,
        userFlag: this.store.currentUser.flag,
        userAvatar: this.store.currentUser.avatar,
        createdAt: new Date().toISOString(),
        votes: [],
        status: 'pending',
      });

      const flatMembers = this.store.memberships.filter(
        (m) => m.householdId === target.id && m.status === 'active'
      );
      flatMembers.forEach((m) => {
        this.store.notifications.unshift({
          id: 'notif_req_' + Date.now() + '_' + m.userId,
          userId: m.userId,
          type: 'household',
          title: '📋 Join Request: New Applicant',
          body: `${this.store.currentUser.name} wants to join ${target.name}. Cast your vote in Apartment settings.`,
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'apartment', id: newReqId },
        });
      });

      this.ctx.save();
    }
    logger.info('join_household_local', `Local request submitted for ${target.name}`);
    return { success: true, household: target, message: 'Request submitted! Roomies must review before you enter.' };
  }

  public async getHouseholdMembers(householdId?: string): Promise<{ user: User; membership: Membership }[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: members } = await supabase
          .from('memberships')
          .select('id, user_id, household_id, role, status, joined_at, profiles(*)')
          .eq('household_id', hid)
          .eq('status', 'active');

        if (members && members.length > 0) {
          return members.map((m: any) => ({
            user: mapProfileToUser(m.profiles),
            membership: {
              id: m.id,
              userId: m.user_id,
              householdId: m.household_id,
              role: m.role as any,
              status: m.status as any,
              joinedAt: m.joined_at || new Date().toISOString(),
            },
          }));
        }
      } catch (err: any) {
        logger.warn('get_members_fallback', err?.message || 'Error fetching members');
      }
    }
    const members = this.store.memberships.filter(m => m.householdId === hid && m.status === 'active');
    return members.map(m => {
      const u = this.store.users.find(user => user.id === m.userId) || this.store.currentUser;
      return { user: u, membership: m };
    });
  }

  public async getJoinRequests(householdId?: string): Promise<JoinRequest[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: requests } = await supabase
          .from('join_requests')
          .select('*')
          .eq('household_id', hid)
          .eq('status', 'pending');

        if (requests && requests.length > 0) {
          return requests.map((r: any) => ({
            id: r.id,
            householdId: r.household_id,
            userName: r.user_name,
            userEmail: r.user_email,
            userCountry: r.user_country || '',
            userFlag: r.user_flag || '🌍',
            userAvatar: r.user_avatar || '',
            createdAt: r.created_at || new Date().toISOString(),
            votes: (r.votes as any) || [],
            status: r.status as any,
          }));
        }
      } catch (err: any) {
        logger.warn('get_join_requests_fallback', err?.message || 'Error fetching join requests');
      }
    }
    return this.store.joinRequests.filter(r => r.householdId === hid && r.status === 'pending');
  }

  public async voteJoinRequest(requestId: string, vote: 'ok' | 'unsure'): Promise<void> {
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: req } = await supabase.from('join_requests').select('votes').eq('id', requestId).maybeSingle();
        const { data: { user } } = await supabase.auth.getUser();
        if (req && user) {
          const votes: any[] = Array.isArray(req.votes) ? [...(req.votes as any[])] : [];
          const existingIdx = votes.findIndex((v: any) => v && v.userId === user.id);
          if (existingIdx >= 0) {
            votes[existingIdx] = { ...votes[existingIdx], vote };
          } else {
            votes.push({ userId: user.id, vote });
          }
          await supabase.from('join_requests').update({ votes } as any).eq('id', requestId);
        }
      } catch (err: any) {
        logger.warn('vote_join_request_error', 'Supabase voteJoinRequest error', { err });
      }
    }

    const req = this.store.joinRequests.find(r => r.id === requestId);
    if (req) {
      const existingVote = req.votes.find(v => v.userId === this.store.currentUser.id);
      if (existingVote) {
        existingVote.vote = vote;
      } else {
        req.votes.push({ userId: this.store.currentUser.id, vote });
      }
      this.ctx.save();
    }
  }

  public async decideJoinRequest(requestId: string, approve: boolean): Promise<void> {
    if (supabase && !this.isDemoMode()) {
      try {
        if (approve) {
          await (supabase.rpc as any)('approve_join_request', { p_request_id: requestId });
        } else {
          await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId);
        }
      } catch (err: any) {
        logger.warn('decide_join_request_error', 'Supabase decideJoinRequest error', { err });
      }
    }

    const req = this.store.joinRequests.find(r => r.id === requestId);
    if (req) {
      req.status = approve ? 'approved' : 'rejected';
      if (approve) {
        let user = this.store.users.find(u => u.email === req.userEmail);
        if (!user) {
          user = {
            id: 'u_' + Math.random().toString(36).substring(2, 7),
            name: req.userName,
            email: req.userEmail,
            avatar: req.userAvatar,
            country: req.userCountry,
            countryCode: 'XX',
            flag: req.userFlag,
            isHome: true,
            streakDays: 0,
            points: 0,
            awayUntil: null,
          };
          this.store.users.push(user);
        }
        this.store.memberships.push({
          id: 'm_' + Date.now(),
          userId: user.id,
          householdId: req.householdId,
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString(),
        });
        this.store.notifications.forEach((n) => {
          if (n.type === 'household' && n.title.toLowerCase().includes('join request')) {
            n.read = true;
          }
        });
        const flatMembers = this.store.memberships.filter(
          (m) => m.householdId === req.householdId && m.status === 'active' && m.userId !== user.id
        );
        flatMembers.forEach((m) => {
          this.store.notifications.unshift({
            id: 'notif_priv_' + Date.now() + '_' + m.userId,
            userId: m.userId,
            type: 'privacy_alert',
            title: '🛡️ Privacy Alert: New Flatmate Joined',
            body: `${req.userName} has officially joined the apartment roster. Review all active members in Apartment settings.`,
            read: false,
            createdAt: new Date().toISOString(),
            linkTarget: { screen: 'apartment' },
          });
        });

        this.ctx.addMessage(req.householdId, null, 'activity', `🛡️ Privacy Notice: ${req.userName} has joined the apartment roster.`, {
          screen: 'apartment',
        });
      }
      this.ctx.save();
      logger.info('decide_join_request', `Decided request ${requestId}: approved=${approve}`);
    }
  }

  public async handoverAdmin(toUserId: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const curMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === this.store.currentUser.id);
    const targetMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === toUserId);
    if (curMembership && targetMembership) {
      curMembership.role = 'member';
      targetMembership.role = 'admin';
      const targetUser = this.store.users.find(u => u.id === toUserId);

      if (supabase && !this.isDemoMode() && isUuid(hid) && isUuid(toUserId) && isUuid(this.store.currentUser.id)) {
        const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        try {
          const { error: errPromote } = await supabase
            .from('memberships')
            .update({ role: 'admin' })
            .eq('household_id', hid)
            .eq('user_id', toUserId)
            .eq('status', 'active');
          if (errPromote) throw errPromote;

          const { error: errDemote } = await supabase
            .from('memberships')
            .update({ role: 'member' })
            .eq('household_id', hid)
            .eq('user_id', this.store.currentUser.id)
            .eq('status', 'active');
          if (errDemote) throw errDemote;

          const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
          logger.info('handover_admin', `Handed admin role to ${targetUser?.name || toUserId}`, { householdId: hid, toUserId }, durationMs);
        } catch (err: any) {
          const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
          logger.warn('handover_admin_fallback', `Supabase handover fallback: ${err?.message || 'error'}`, { householdId: hid, toUserId }, durationMs);
        }
      }

      this.ctx.addMessage(hid, null, 'activity', `Admin role handed over to ${targetUser?.name || 'roomie'}.`);
      this.ctx.save();
    }
  }

  public async leaveHousehold(householdId: string): Promise<{ success: boolean; message: string }> {
    const m = this.store.memberships.find(mb => mb.householdId === householdId && mb.userId === this.store.currentUser.id);

    if (supabase && !this.isDemoMode() && isUuid(householdId)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data, error } = await (supabase.rpc as any)('leave_household_self', { p_household_id: householdId });
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.error('leave_household', `leave_household_self failed: ${error.message}`, { householdId }, durationMs);
          return { success: false, message: error.message || 'Could not leave household.' };
        }
        if (data && data.success === false) {
          logger.warn('leave_household', data.message || 'Rejected leave', { householdId }, durationMs);
          return { success: false, message: data.message || 'Membership not found.' };
        }
        logger.info('leave_household', `Left household ${householdId}`, { householdId }, durationMs);
      } catch (err: any) {
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        logger.error('leave_household', err?.message || 'Exception leaving household', { householdId }, durationMs);
        return { success: false, message: err?.message || 'Could not leave household.' };
      }
    }

    if (m) {
      m.status = 'left';
      if (m.role === 'admin') {
        const next = this.store.memberships.find(mb => mb.householdId === householdId && mb.userId !== this.store.currentUser.id && mb.status === 'active');
        if (next) next.role = 'admin';
      }

      this.ctx.addMessage(householdId, null, 'activity', `👋 ${this.store.currentUser.name} left the apartment.`);
      const remainingMembers = this.store.memberships.filter(
        (mb) => mb.householdId === householdId && mb.status === 'active' && mb.userId !== this.store.currentUser.id
      );
      remainingMembers.forEach((mb) => {
        this.store.notifications.unshift({
          id: 'notif_left_' + Date.now() + '_' + mb.userId,
          userId: mb.userId,
          type: 'privacy_alert',
          title: '👋 Member Left the Flat',
          body: `${this.store.currentUser.name} has left the apartment.`,
          read: false,
          createdAt: new Date().toISOString(),
          linkTarget: { screen: 'apartment' },
        });
      });

      this.ctx.save();
      return { success: true, message: 'You have left the household.' };
    }
    if (!this.isDemoMode() && isUuid(householdId)) {
      return { success: true, message: 'You have left the household.' };
    }
    return { success: false, message: 'Membership not found.' };
  }

  public async removeHouseholdMember(householdId: string, targetUserId: string): Promise<{ success: boolean; message: string }> {
    const hid = householdId || this.store.activeHouseholdId;
    const curMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === this.store.currentUser.id);
    if (curMembership && curMembership.role !== 'admin') {
      return { success: false, message: 'Only flat admins can remove members.' };
    }
    if (targetUserId === this.store.currentUser.id) {
      return { success: false, message: 'Admins cannot remove themselves. Use Leave instead.' };
    }

    if (supabase && !this.isDemoMode() && isUuid(hid) && isUuid(targetUserId)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data, error } = await (supabase.rpc as any)('remove_household_member', {
          p_household_id: hid,
          p_target_user_id: targetUserId,
        });
        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.error('remove_member', `remove_household_member failed: ${error.message}`, { hid, targetUserId }, durationMs);
          return { success: false, message: error.message || 'Could not remove member.' };
        }
        if (data && data.success === false) {
          return { success: false, message: data.message || 'Action rejected.' };
        }
      } catch (err: any) {
        logger.error('remove_member', err?.message || 'Exception removing member', { hid, targetUserId });
        return { success: false, message: err?.message || 'Could not remove member.' };
      }
    }

    const targetUser = this.store.users.find(u => u.id === targetUserId);
    const targetMembership = this.store.memberships.find(m => m.householdId === hid && m.userId === targetUserId);
    if (targetMembership) {
      targetMembership.status = 'removed';
    }

    const adminName = this.store.currentUser.name || 'Admin';
    const targetName = targetUser?.name || 'A flatmate';

    this.ctx.addMessage(hid, null, 'activity', `🚪 ${adminName} removed ${targetName} from the apartment.`);

    const remainingMembers = this.store.memberships.filter(
      (m) => m.householdId === hid && m.status === 'active' && m.userId !== this.store.currentUser.id && m.userId !== targetUserId
    );
    remainingMembers.forEach((m) => {
      this.store.notifications.unshift({
        id: 'notif_rem_' + Date.now() + '_' + m.userId,
        userId: m.userId,
        type: 'privacy_alert',
        title: '🛡️ Member Removed from Flat',
        body: `${adminName} removed ${targetName} from the apartment.`,
        read: false,
        createdAt: new Date().toISOString(),
        linkTarget: { screen: 'apartment' },
      });
    });

    this.store.notifications.unshift({
      id: 'notif_revoked_' + Date.now() + '_' + targetUserId,
      userId: targetUserId,
      type: 'privacy_alert',
      title: '🛡️ Apartment Access Revoked',
      body: `You were removed from the apartment by ${adminName}.`,
      read: false,
      createdAt: new Date().toISOString(),
      linkTarget: { screen: 'setup' },
    });

    this.ctx.save();
    return { success: true, message: `${targetName} has been removed from the apartment.` };
  }
}
