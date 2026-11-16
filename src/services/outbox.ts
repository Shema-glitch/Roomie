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
  | 'mark_all_notifications_read'
  | 'submit_vibe_pulse'
  | 'propose_chore_swap'
  | 'resolve_chore_swap';

export type OutboxStatus = 'pending' | 'syncing' | 'failed' | 'quarantined' | 'synced';

export interface OutboxItem<T = unknown> {
  id: string; // Action UUID
  householdId: string;
  type: OutboxActionType;
  payload: T;
  status: OutboxStatus;
  retryCount: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export const MAX_OUTBOX_RETRIES = 5;

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
    const now = Date.now();
    return this.items.filter((item) => {
      if (item.status === 'quarantined' || item.status === 'synced') return false;
      if (item.status === 'pending') return true;
      if (item.status === 'failed') {
        if (!item.nextRetryAt) return true;
        return new Date(item.nextRetryAt).getTime() <= now;
      }
      return false;
    });
  }

  public getPendingCount(): number {
    return this.getPending().length;
  }

  public getQuarantined(): OutboxItem[] {
    return this.items.filter((item) => item.status === 'quarantined');
  }

  public getQuarantinedCount(): number {
    return this.getQuarantined().length;
  }

  public retryQuarantined(id?: string): void {
    if (id) {
      const item = this.items.find((i) => i.id === id && i.status === 'quarantined');
      if (item) {
        item.status = 'pending';
        item.retryCount = 0;
        item.nextRetryAt = undefined;
        item.errorMessage = undefined;
      }
    } else {
      this.items.forEach((item) => {
        if (item.status === 'quarantined') {
          item.status = 'pending';
          item.retryCount = 0;
          item.nextRetryAt = undefined;
          item.errorMessage = undefined;
        }
      });
    }
    this.save();
    debugLog.info('outbox', 'retry_quarantined', 'Reset quarantined mutation(s) to pending');
  }

  public discardQuarantined(id?: string): void {
    if (id) {
      this.items = this.items.filter((i) => !(i.id === id && i.status === 'quarantined'));
    } else {
      this.items = this.items.filter((i) => i.status !== 'quarantined');
    }
    this.save();
    debugLog.info('outbox', 'discard_quarantined', 'Discarded quarantined mutation(s)');
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
      item.retryCount += 1;
      item.lastAttemptAt = new Date().toISOString();
      item.errorMessage = error;

      if (item.retryCount >= MAX_OUTBOX_RETRIES) {
        item.status = 'quarantined';
        item.nextRetryAt = undefined;
        this.save();
        debugLog.error('outbox', 'quarantine', `Quarantined ${item.type} after ${item.retryCount} failed attempts: ${error}`, {
          actionId: id,
          type: item.type,
          retryCount: item.retryCount,
          error,
        });
      } else {
        item.status = 'failed';
        // Bounded exponential backoff: 1s, 2s, 4s, 8s, 16s... up to max 60s
        const backoffMs = Math.min(60000, 1000 * Math.pow(2, item.retryCount - 1));
        item.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
        this.save();
        debugLog.warn('outbox', 'sync_failed', `Failed ${item.type} (retry ${item.retryCount}/${MAX_OUTBOX_RETRIES}, next in ${Math.round(backoffMs / 1000)}s): ${error}`, {
          actionId: id,
          type: item.type,
          retryCount: item.retryCount,
          nextRetryAt: item.nextRetryAt,
          error,
        });
      }
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        this.markFailed(item.id, msg);
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
