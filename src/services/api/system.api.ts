/**
 * Diagnostics, System Health & Data Backup Domain API
 */

import { Capacitor } from '@capacitor/core';
import { clearLocalSupabaseSessionStorage, supabase, isSupabaseConfigured } from '../supabase';
import { localCache } from '../localCache';
import { outbox, OutboxActionType } from '../outbox';
import { CURRENT_APP_VERSION } from '../../config/appVersion';
import { DebugModule } from '../../utils/debugLog';
import { removeSavedAccount } from '../../utils/savedAccounts';
import { AppStore, createDomainLogger, getInitialStore, isUuid, RemoteMutationError } from './shared';

const logger = createDomainLogger('SystemAPI', 'auth');

export interface SystemContext {
  store: AppStore;
  setStore: (s: AppStore) => void;
  save: () => void;
  isDemoMode: () => boolean;
  leaveHousehold?: (householdId: string) => Promise<{ success: boolean; message: string }>;
  dispatchRemoteMutation?: <T>(
    householdId: string,
    module: DebugModule,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: RemoteMutationError } | void>
  ) => void;
}

export class SystemApi {
  constructor(private ctx: SystemContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  public resetData(): AppStore {
    const fresh = getInitialStore();
    this.ctx.setStore(fresh);
    outbox.clear();
    localCache.clearAllSnapshots();
    this.ctx.save();
    logger.info('reset_data', 'Local store reset to default seed state');
    return fresh;
  }

  public async submitFeedback(params: {
    category: 'rate' | 'problem' | 'feature';
    rating?: number | null;
    message: string;
  }): Promise<{ success: boolean; persistedRemote: boolean; error?: string }> {
    const trimmed = params.message.trim();
    if (!trimmed) {
      return { success: false, persistedRemote: false, error: 'Feedback message cannot be empty.' };
    }

    const userId = this.store.currentUser?.id;
    const rawHouseholdId = this.store.activeHouseholdId;
    const householdId = isUuid(rawHouseholdId) ? rawHouseholdId : null;
    const rating = params.category === 'rate' && typeof params.rating === 'number'
      ? Math.min(5, Math.max(1, Math.round(params.rating)))
      : null;
    const platform = Capacitor.getPlatform();
    const safeMessage = trimmed.slice(0, 2000);

    logger.info('submit_feedback', `Captured ${params.category} feedback (${safeMessage.length} chars)`, {
      category: params.category,
      rating,
      platform,
      appVersion: CURRENT_APP_VERSION,
    });

    if (this.ctx.isDemoMode() || !isUuid(userId)) {
      return { success: true, persistedRemote: false };
    }

    const payload = {
      userId,
      householdId,
      category: params.category,
      rating,
      message: safeMessage,
      appVersion: CURRENT_APP_VERSION,
      platform,
    };

    const insertExec = async () => {
      if (!supabase) return;
      const { error } = await supabase.from('app_feedback').insert({
        user_id: payload.userId,
        household_id: payload.householdId,
        category: payload.category,
        rating: payload.rating,
        message: payload.message,
        app_version: payload.appVersion,
        platform: payload.platform,
      });
      return { error: error ? { message: error.message, code: error.code } : null };
    };

    if (this.ctx.dispatchRemoteMutation && householdId) {
      this.ctx.dispatchRemoteMutation(
        householdId,
        'outbox',
        'submit_feedback',
        payload,
        `Submitted ${params.category} feedback`,
        insertExec
      );
      return { success: true, persistedRemote: Boolean(supabase) };
    }

    const action = outbox.enqueue(householdId || userId, 'submit_feedback', payload);
    if (!supabase) {
      return { success: true, persistedRemote: false };
    }

    try {
      const res = await insertExec();
      if (res?.error) {
        outbox.markFailed(action.id, res.error.message);
        return { success: true, persistedRemote: false };
      }
      outbox.markSuccess(action.id);
      return { success: true, persistedRemote: true };
    } catch (err: unknown) {
      outbox.markFailed(action.id, err instanceof Error ? err.message : 'Network error');
      return { success: true, persistedRemote: false };
    }
  }

  public async deleteAccount(): Promise<{
    success: boolean;
    mode: 'demo' | 'account';
    message: string;
  }> {
    if (this.ctx.isDemoMode()) {
      this.resetData();
      return {
        success: true,
        mode: 'demo',
        message: 'Account data reset to fresh demo state.',
      };
    }

    const uid = this.store.currentUser?.id || '';
    const email = (this.store.currentUser?.email || '').trim().toLowerCase();
    const activeMembershipHouseholds = this.store.memberships
      .filter((m) => m.userId === uid && m.status === 'active')
      .map((m) => m.householdId);

    if (supabase && isUuid(uid)) {
      const { data, error } = await supabase.rpc('delete_my_account');
      const parsed = data as { success?: boolean; message?: string } | null;
      if (error || (parsed && parsed.success === false)) {
        logger.warn('delete_account_rpc_fallback', error?.message || parsed?.message || 'RPC unavailable', {
          userId: uid,
        });
        let leftAll = true;
        if (this.ctx.leaveHousehold && activeMembershipHouseholds.length > 0) {
          for (const hid of activeMembershipHouseholds) {
            const leaveRes = await this.ctx.leaveHousehold(hid);
            if (!leaveRes.success) leftAll = false;
          }
        } else if (activeMembershipHouseholds.length > 0) {
          leftAll = false;
        }
        if (!leftAll) {
          return {
            success: false,
            mode: 'account',
            message: error?.message || 'Could not leave all active households. Please check your connection and try again.',
          };
        }
      }

      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore signOut cleanup failures
      }
      clearLocalSupabaseSessionStorage();
    }

    if (uid) removeSavedAccount(uid);
    if (email) removeSavedAccount(email);

    const remainingLocalAccounts = { ...(this.store.localAccounts || {}) };
    if (email && remainingLocalAccounts[email]) {
      delete remainingLocalAccounts[email];
    }

    const fresh = getInitialStore();
    fresh.localAccounts = remainingLocalAccounts;
    fresh.localSessionActive = false;
    fresh.localSession = null;
    fresh.householdSetupMode = undefined;
    this.ctx.setStore(fresh);

    outbox.clear();
    localCache.clearAllSnapshots();
    this.ctx.save();
    logger.info('delete_account', 'Deleted account, left active flats, and cleared device session');

    return {
      success: true,
      mode: 'account',
      message: 'Your account has been deleted and removed from this device.',
    };
  }

  public async pingSupabaseHealth(): Promise<{
    configured: boolean;
    demoMode: boolean;
    authenticated: boolean;
    activeHouseholdId: string;
    latencyMs: number;
    checks: { name: string; ok: boolean; detail: string; ms: number }[];
  }> {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const hid = this.store.activeHouseholdId;
    const demoMode = this.ctx.isDemoMode();
    if (!supabase || !isSupabaseConfigured) {
      logger.warn('health_probe', 'Supabase client not configured');
      return {
        configured: false,
        demoMode,
        authenticated: false,
        activeHouseholdId: hid,
        latencyMs: 0,
        checks: [{ name: 'supabase_env', ok: false, detail: 'Missing VITE_SUPABASE_URL/ANON_KEY', ms: 0 }],
      };
    }

    const checks: { name: string; ok: boolean; detail: string; ms: number }[] = [];
    const { data: sessData } = await supabase.auth.getSession();
    const authenticated = Boolean(sessData?.session?.user);
    checks.push({
      name: 'auth_session',
      ok: authenticated,
      detail: authenticated ? `uid:${sessData.session!.user.id.slice(0, 8)}` : 'Signed out',
      ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
    });

    const tables = ['households', 'expenses', 'settlements', 'chores', 'draft_rounds', 'meeting_topics', 'chat_messages', 'notifications'] as const;
    for (const table of tables) {
      const s = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const { error } = await (supabase.from(table) as any).select('id', { count: 'exact', head: true }).limit(1);
      const ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - s);
      checks.push({
        name: `rls_${table}`,
        ok: !error,
        detail: error ? error.message : 'RLS reachable',
        ms,
      });
    }

    const totalMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    const failed = checks.filter((c) => !c.ok).length;
    if (failed > 0) {
      logger.warn('health_probe', `Probe complete with warnings: ${checks.length - failed}/${checks.length} checks ok`, {
        durationMs: totalMs,
        demoMode,
        authenticated,
        householdId: hid,
        failed,
      });
    } else {
      logger.info('health_probe', `Probe complete: all ${checks.length} checks ok`, {
        durationMs: totalMs,
        demoMode,
        authenticated,
        householdId: hid,
      });
    }

    return {
      configured: true,
      demoMode,
      authenticated,
      activeHouseholdId: hid,
      latencyMs: totalMs,
      checks,
    };
  }

  public exportData(): string {
    return JSON.stringify(this.store, null, 2);
  }
}
