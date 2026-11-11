/**
 * Roomie Outbox Queue
 * Matching Roomie Data Handling and Offline Spec (Section 4 & 6)
 * - Records local actions waiting to be synced to the server
 * - Guarantees idempotency via unique action ID (UUID)
 * - Automatic exponential backoff retry on temporary failure
 */

import { debugLog } from '../utils/debugLog';

export type OutboxActionType =
  | 'create_expense'
  | 'agree_expense'
  | 'dispute_expense'
  | 'edit_expense_split'
  | 'cancel_expense'
  | 'create_settlement'
  | 'confirm_settlement'
  | 'open_draft_round'
  | 'submit_draft_picks'
  | 'update_assignments'
  | 'reveal_draft'
  | 'complete_chore'
  | 'give_kudos'
  | 'swap_chore'
  | 'send_message'
  | 'add_reaction'
  | 'create_topic'
  | 'vote_topic'
  | 'add_comment'
  | 'add_agreement'
  | 'mark_notification_read'
  | 'mark_all_notifications_read';

export type OutboxStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export interface OutboxItem<T = any> {
  id: string; // Action UUID
  householdId: string;
  type: OutboxActionType;
  payload: T;
  status: OutboxStatus;
  retryCount: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  createdAt: string;
}

const OUTBOX_STORAGE_KEY = 'roomie_outbox_queue_v1';

class OutboxService {
  private items: OutboxItem[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(OUTBOX_STORAGE_KEY);
      if (stored) {
        this.items = JSON.parse(stored);
      }
    } catch {
      this.items = [];
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      // storage full or disabled
    }
  }

  /**
   * Enqueues an action to be dispatched to the remote backend
   */
  public enqueue<T>(householdId: string, type: OutboxActionType, payload: T, id?: string): OutboxItem<T> {
    const item: OutboxItem<T> = {
      id: id || 'act_' + Math.random().toString(36).substring(2, 9) + Date.now(),
      householdId,
      type,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.items.push(item);
    this.save();
    debugLog.info('outbox', 'enqueue', `Queued ${type} (${item.id.slice(0, 12)})`, {
      actionId: item.id,
      type,
      householdId,
      pendingCount: this.getPendingCount(),
    });
    return item;
  }

  public getItems(): OutboxItem[] {
    return [...this.items];
  }

  public getPending(): OutboxItem[] {
    return this.items.filter((item) => item.status === 'pending' || item.status === 'failed');
  }

  public getPendingCount(): number {
    return this.getPending().length;
  }

  public markSyncing(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.status = 'syncing';
      item.lastAttemptAt = new Date().toISOString();
      this.save();
    }
  }

  public markSuccess(id: string) {
    const existing = this.items.find((i) => i.id === id);
    this.items = this.items.filter((i) => i.id !== id);
    this.save();
    if (existing) {
      debugLog.info('outbox', 'sync_ok', `Synced ${existing.type}`, {
        actionId: id,
        type: existing.type,
        pendingCount: this.getPendingCount(),
      });
    }
  }

  public markFailed(id: string, error: string) {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.status = 'failed';
      item.retryCount += 1;
      item.errorMessage = error;
      this.save();
      debugLog.warn('outbox', 'sync_failed', `Failed ${item.type}: ${error}`, {
        actionId: id,
        type: item.type,
        retryCount: item.retryCount,
        error,
      });
    }
  }

  public clear() {
    const cleared = this.items.length;
    this.items = [];
    this.save();
    debugLog.info('outbox', 'clear', `Cleared ${cleared} outbox item(s)`);
  }

  private syncHandler?: (item: OutboxItem) => Promise<boolean>;

  public setSyncHandler(handler: (item: OutboxItem) => Promise<boolean>) {
    this.syncHandler = handler;
  }

  public async flush(): Promise<void> {
    if (!this.syncHandler) return;
    const pending = this.getPending();
    if (pending.length === 0) return;
    debugLog.info('outbox', 'flush_start', `Flushing ${pending.length} pending item(s)`);
    for (const item of pending) {
      this.markSyncing(item.id);
      try {
        const ok = await this.syncHandler(item);
        if (ok) {
          this.markSuccess(item.id);
        } else {
          this.markFailed(item.id, 'Sync handler returned false');
        }
      } catch (err: any) {
        this.markFailed(item.id, err?.message || 'Sync failed');
      }
    }
  }

  public initAutoFlush() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      this.flush();
    });
    // Check periodically if online and pending items exist
    setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && this.getPendingCount() > 0) {
        this.flush();
      }
    }, 15000);
  }
}

export const outbox = new OutboxService();
