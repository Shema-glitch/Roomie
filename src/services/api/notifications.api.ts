/**
 * Notifications & Inbox Domain API
 */

import { InAppNotification } from '../../types';
import { supabase } from '../supabase';
import { OutboxActionType } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import {
  AppStore,
  createDomainLogger,
  isUuid,
  mapNotification,
} from './shared';

const logger = createDomainLogger('NotificationsAPI', 'notifications');

export interface NotificationsContext {
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

export class NotificationsApi {
  constructor(private ctx: NotificationsContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  private isDemoMode(): boolean {
    return this.ctx.isDemoMode();
  }

  public async getNotifications(): Promise<InAppNotification[]> {
    const currentUserId = this.store.currentUser.id;
    if (supabase && !this.isDemoMode() && isUuid(currentUserId)) {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const { data: rows, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(60);

        const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        if (error) {
          logger.warn('fetch_notifications', error.message, { code: error.code }, durationMs);
        } else if (Array.isArray(rows)) {
          const live = rows.map(mapNotification);
          this.store.notifications = [
            ...this.store.notifications.filter((n) => n.userId !== currentUserId),
            ...live,
          ];
          logger.info('fetch_notifications', `Loaded ${live.length} notification(s)`, { count: live.length }, durationMs);
        }
      } catch (err: any) {
        logger.error('fetch_notifications', err?.message || 'Supabase getNotifications fallback');
      }
    }

    const pendingRequests = this.store.joinRequests.filter(r => r.status === 'pending');
    if (pendingRequests.length > 0) {
      this.store.notifications.forEach(n => {
        if (n.type === 'household' && n.title.toLowerCase().includes('join request')) {
          n.read = false;
        }
      });
    }

    return [...this.store.notifications]
      .filter((n) => n.userId === currentUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationRead(id: string): Promise<void> {
    const n = this.store.notifications.find(item => item.id === id);
    if (n) {
      const isUnresolvedJoin =
        n.type === 'household' &&
        n.title.toLowerCase().includes('join request') &&
        this.store.joinRequests.some(r => r.status === 'pending');
      if (!isUnresolvedJoin) {
        n.read = true;
        if (isUuid(id)) {
          this.ctx.dispatchRemoteMutation(
            this.store.activeHouseholdId,
            'notifications',
            'mark_notification_read',
            { id },
            `Marked notification ${id.slice(0, 8)} read`,
            async () => supabase!.from('notifications').update({ read: true }).eq('id', id)
          );
        }
        this.ctx.save();
      }
    }
  }

  public async markAllNotificationsRead(): Promise<void> {
    const hasPendingJoin = this.store.joinRequests.some(r => r.status === 'pending');
    const markedUuidIds: string[] = [];
    this.store.notifications.forEach(n => {
      if (n.userId === this.store.currentUser.id) {
        if (n.type === 'household' && n.title.toLowerCase().includes('join request') && hasPendingJoin) {
          n.read = false;
        } else {
          n.read = true;
          if (isUuid(n.id)) markedUuidIds.push(n.id);
        }
      }
    });
    if (markedUuidIds.length > 0) {
      this.ctx.dispatchRemoteMutation(
        this.store.activeHouseholdId,
        'notifications',
        'mark_all_notifications_read',
        { ids: markedUuidIds },
        `Marked ${markedUuidIds.length} notification(s) read`,
        async () => supabase!.from('notifications').update({ read: true }).in('id', markedUuidIds)
      );
    }
    this.ctx.save();
  }
}
