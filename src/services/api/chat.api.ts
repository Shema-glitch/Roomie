/**
 * House Chat & Realtime Messaging Domain API
 */

import { ChatMessage } from '../../types';
import { supabase } from '../supabase';
import { OutboxActionType } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import {
  AppStore,
  createDomainLogger,
  isUuid,
  makeEntityId,
  mapChatMessage,
} from './shared';

const logger = createDomainLogger('ChatAPI', 'chat');

export interface ChatContext {
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
}

export class ChatApi {
  constructor(private ctx: ChatContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  private isDemoMode(): boolean {
    return this.ctx.isDemoMode();
  }

  public async getMessages(householdId?: string): Promise<ChatMessage[]> {
    const hid = householdId || this.store.activeHouseholdId;
    if (supabase && !this.isDemoMode() && isUuid(hid)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: msgRows, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('household_id', hid)
          .order('created_at', { ascending: true });

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.warn('fetch_messages', error.message, { householdId: hid, code: error.code }, durationMs);
        } else if (Array.isArray(msgRows)) {
          const liveMsgs = msgRows.map(mapChatMessage);
          this.store.messages[hid] = liveMsgs;
          logger.info('fetch_messages', `Loaded ${liveMsgs.length} message(s)`, { householdId: hid, count: liveMsgs.length }, durationMs);
          return liveMsgs;
        }
      } catch (err: any) {
        logger.error('fetch_messages', err?.message || 'Supabase getMessages fallback', { householdId: hid });
      }
    }
    return this.store.messages[hid] || [];
  }

  public async sendMessage(body: string): Promise<ChatMessage> {
    const hid = this.store.activeHouseholdId;
    const msg = this.addMessage(hid, this.store.currentUser.id, 'text', body);
    this.ctx.save();

    this.ctx.dispatchRemoteMutation(
      hid,
      'chat',
      'send_message',
      { message: msg },
      `Sent message (${body.length} chars)`,
      async () =>
        supabase!.from('chat_messages').upsert(
          {
            ...(isUuid(msg.id) ? { id: msg.id } : {}),
            household_id: hid,
            sender_id: msg.senderId,
            type: msg.type,
            body: msg.body,
            link_target: (msg.linkTarget as any) || null,
            reactions: [],
          },
          { onConflict: 'id' }
        )
    );

    return msg;
  }

  public subscribeToHousehold(householdId: string, onUpdate: () => void): () => void {
    if (!supabase || this.isDemoMode() || !isUuid(householdId)) {
      logger.info('subscribe_skipped', this.isDemoMode() ? 'Demo mode isolated from Realtime' : 'Realtime inactive');
      return () => {};
    }
    const sb = supabase;
    try {
      const channel = sb
        .channel(`household_live_${householdId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', filter: `household_id=eq.${householdId}` },
          (payload: any) => {
            logger.info('pg_change', `${payload?.table || 'public'} ${payload?.eventType || '*'}`, {
              householdId,
              table: payload?.table,
              eventType: payload?.eventType,
            });
            onUpdate();
          }
        )
        .subscribe((status) => {
          const level = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'warn' : 'info';
          if (level === 'warn') {
            logger.warn('channel_status', `Household channel -> ${status}`, { householdId, status });
          } else {
            logger.info('channel_status', `Household channel -> ${status}`, { householdId, status });
          }
        });

      return () => {
        logger.info('unsubscribe', `Unsubscribed household ${householdId.slice(0, 8)}`);
        sb.removeChannel(channel);
      };
    } catch (err: any) {
      logger.error('subscribe_error', err?.message || 'Realtime subscription error', { householdId });
      return () => {};
    }
  }

  public addMessage(
    householdId: string,
    senderId: string | null,
    type: 'text' | 'activity',
    body: string,
    linkTarget?: { screen: string; id?: string }
  ): ChatMessage {
    if (!this.store.messages[householdId]) {
      this.store.messages[householdId] = [];
    }
    const useUuid = !this.isDemoMode() && isUuid(householdId);
    const msg: ChatMessage = {
      id: makeEntityId('msg', useUuid),
      householdId,
      senderId,
      type,
      body,
      linkTarget,
      createdAt: new Date().toISOString(),
      reactions: [],
    };
    this.store.messages[householdId].push(msg);

    if (type === 'activity') {
      this.ctx.dispatchRemoteMutation(
        householdId,
        'chat',
        'send_message',
        { message: msg },
        `Posted activity: ${body.slice(0, 48)}`,
        async () =>
          supabase!.from('chat_messages').upsert(
            {
              ...(isUuid(msg.id) ? { id: msg.id } : {}),
              household_id: householdId,
              sender_id: null,
              type: 'activity',
              body: msg.body,
              link_target: (msg.linkTarget as any) || null,
              reactions: [],
            },
            { onConflict: 'id' }
          )
      );
    }
    return msg;
  }

  public async addReaction(messageId: string, emoji: string): Promise<void> {
    const hid = this.store.activeHouseholdId;
    const msgs = this.store.messages[hid] || [];
    const msg = msgs.find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      const existing = msg.reactions.find(r => r.emoji === emoji);
      const myId = this.store.currentUser.id;
      if (existing) {
        if (existing.userIds.includes(myId)) {
          existing.userIds = existing.userIds.filter(id => id !== myId);
        } else {
          existing.userIds.push(myId);
        }
      } else {
        msg.reactions.push({ emoji, userIds: [myId] });
      }

      this.ctx.dispatchRemoteMutation(
        hid,
        'chat',
        'add_reaction',
        { messageId, reactions: msg.reactions },
        `Toggled reaction ${emoji} on message ${messageId.slice(0, 8)}`,
        async () =>
          supabase!.from('chat_messages').update({ reactions: msg.reactions as any }).eq('id', messageId)
      );

      this.ctx.save();
    }
  }
}
