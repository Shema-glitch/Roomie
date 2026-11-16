/**
 * Diagnostics, System Health & Data Backup Domain API
 */

import { supabase, isSupabaseConfigured } from '../supabase';
import { AppStore, createDomainLogger, getInitialStore } from './shared';

const logger = createDomainLogger('SystemAPI', 'auth');

export interface SystemContext {
  store: AppStore;
  setStore: (s: AppStore) => void;
  save: () => void;
  isDemoMode: () => boolean;
}

export class SystemApi {
  constructor(private ctx: SystemContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  public resetData(): AppStore {
    const fresh = getInitialStore();
    this.ctx.setStore(fresh);
    this.ctx.save();
    logger.info('reset_data', 'Local store reset to default seed state');
    return fresh;
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
