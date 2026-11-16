/**
 * House Governance, Meetings & Flat Agreements Domain API
 */

import { MeetingTopic, HouseAgreement, User, Membership } from '../../types';
import { supabase } from '../supabase';
import { OutboxActionType } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import {
  AppStore,
  createDomainLogger,
  isUuid,
  makeEntityId,
  mapMeetingTopic,
  mapAgreement,
} from './shared';

const logger = createDomainLogger('GovernanceAPI', 'governance');

export interface GovernanceContext {
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

export class GovernanceApi {
  constructor(private ctx: GovernanceContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  private isDemoMode(): boolean {
    return this.ctx.isDemoMode();
  }

  public async getMeetingTopics(householdId?: string): Promise<MeetingTopic[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: rows, error } = await supabase
          .from('meeting_topics')
          .select('*')
          .eq('household_id', hid)
          .order('created_at', { ascending: false });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.warn('fetch_topics', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(rows)) {
          const liveTopics = rows.map(mapMeetingTopic);
          this.store.meetingTopics[hid] = liveTopics;
          logger.info('fetch_topics', `Loaded ${liveTopics.length} topic(s)`, { householdId: hid, count: liveTopics.length }, durationMs);
          return liveTopics;
        }
      } catch (err: any) {
        logger.error('fetch_topics', err?.message || 'Supabase getMeetingTopics fallback', { householdId: hid });
      }
    }
    return this.store.meetingTopics[hid] || [];
  }

  public async createMeetingTopic(title: string, description: string): Promise<MeetingTopic> {
    const hid = this.store.activeHouseholdId;
    if (!this.store.meetingTopics[hid]) this.store.meetingTopics[hid] = [];
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const topic: MeetingTopic = {
      id: makeEntityId('mt', useUuid),
      householdId: hid,
      proposedBy: this.store.currentUser.id,
      title,
      description,
      status: 'open',
      votes: [{ userId: this.store.currentUser.id, vote: 'agree' }],
      comments: [],
    };
    this.store.meetingTopics[hid].unshift(topic);

    this.ctx.dispatchRemoteMutation(
      hid,
      'governance',
      'create_topic',
      { topic },
      `Proposed topic "${title}"`,
      async () =>
        supabase!.from('meeting_topics').upsert(
          {
            ...(isUuid(topic.id) ? { id: topic.id } : {}),
            household_id: hid,
            proposed_by: topic.proposedBy,
            title: topic.title,
            description: topic.description,
            status: topic.status,
            votes: topic.votes as any,
            comments: [],
          },
          { onConflict: 'id' }
        )
    );

    this.ctx.addMessage(hid, null, 'activity', `${this.store.currentUser.name} proposed a house topic: "${title}"`, {
      screen: 'meetings',
      id: topic.id,
    });
    this.ctx.save();
    return topic;
  }

  public async voteMeetingTopic(topicId: string, vote: 'agree' | 'disagree' | 'neutral'): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const topic = (this.store.meetingTopics[hid] || []).find(t => t.id === topicId);
    if (topic) {
      const existing = topic.votes.find(v => v.userId === this.store.currentUser.id);
      if (existing) {
        existing.vote = vote;
      } else {
        topic.votes.push({ userId: this.store.currentUser.id, vote });
      }
      const members = await this.ctx.getHouseholdMembers(hid);
      const agreeCount = topic.votes.filter(v => v.vote === 'agree').length;
      const becameAgreed = topic.status !== 'agreed' && members.length > 0 && agreeCount >= Math.ceil(members.length * 0.75);
      if (becameAgreed) {
        topic.status = 'agreed';
        await this.addAgreement(topic.title, 'Agreed in House Meeting');
      }

      this.ctx.dispatchRemoteMutation(
        hid,
        'governance',
        'vote_topic',
        { topicId, votes: topic.votes, status: topic.status },
        `Voted "${vote}" on "${topic.title}" -> status ${topic.status}`,
        async () =>
          supabase!
            .from('meeting_topics')
            .update({ votes: topic.votes as any, status: topic.status })
            .eq('id', topicId)
      );

      this.ctx.save();
    }
  }

  public async voteTopic(topicId: string, vote: 'agree' | 'disagree' | 'neutral'): Promise<void> {
    return this.voteMeetingTopic(topicId, vote);
  }

  public async addCommentToTopic(topicId: string, text: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const topic = (this.store.meetingTopics[hid] || []).find(t => t.id === topicId);
    if (topic) {
      topic.comments.push({
        id: makeEntityId('c', !this.isDemoMode() && isUuid(hid)),
        userId: this.store.currentUser.id,
        text,
        createdAt: new Date().toISOString(),
      });

      this.ctx.dispatchRemoteMutation(
        hid,
        'governance',
        'add_comment',
        { topicId, comments: topic.comments },
        `Added comment on "${topic.title}"`,
        async () =>
          supabase!.from('meeting_topics').update({ comments: topic.comments as any }).eq('id', topicId)
      );

      this.ctx.save();
    }
  }

  public async getAgreements(householdId?: string): Promise<HouseAgreement[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: rows, error } = await supabase
          .from('house_agreements')
          .select('*')
          .eq('household_id', hid)
          .order('agreed_at', { ascending: false });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.warn('fetch_agreements', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(rows)) {
          const liveAgreements = rows.map(mapAgreement);
          this.store.agreements[hid] = liveAgreements;
          logger.info('fetch_agreements', `Loaded ${liveAgreements.length} agreement(s)`, { householdId: hid, count: liveAgreements.length }, durationMs);
          return liveAgreements;
        }
      } catch (err: any) {
        logger.error('fetch_agreements', err?.message || 'Supabase getAgreements fallback', { householdId: hid });
      }
    }
    return this.store.agreements[hid] || [];
  }

  public async addAgreement(text: string, category: string): Promise<HouseAgreement> {
    const hid = this.store.activeHouseholdId;
    if (!this.store.agreements[hid]) this.store.agreements[hid] = [];
    const useUuid = !this.isDemoMode() && isUuid(hid);
    const agr: HouseAgreement = {
      id: makeEntityId('agr', useUuid),
      householdId: hid,
      text,
      category,
      agreedAt: new Date().toISOString(),
    };
    this.store.agreements[hid].push(agr);

    this.ctx.dispatchRemoteMutation(
      hid,
      'governance',
      'add_agreement',
      { agreement: agr },
      `Recorded agreement "${text.slice(0, 48)}"`,
      async () =>
        supabase!.from('house_agreements').upsert(
          {
            ...(isUuid(agr.id) ? { id: agr.id } : {}),
            household_id: hid,
            text: agr.text,
            category: agr.category,
            agreed_at: agr.agreedAt,
          },
          { onConflict: 'id' }
        )
    );

    this.ctx.save();
    return agr;
  }
}
