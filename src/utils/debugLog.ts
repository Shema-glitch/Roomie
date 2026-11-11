export type DebugModule =
  | 'auth'
  | 'expenses'
  | 'settlements'
  | 'chores_draft'
  | 'governance'
  | 'chat'
  | 'notifications'
  | 'qr_scanner'
  | 'storage'
  | 'outbox'
  | 'realtime';

export type DebugLevel = 'info' | 'warn' | 'error';

export interface DebugModuleInfo {
  id: DebugModule;
  label: string;
  description: string;
}

export const DEBUG_MODULES: readonly DebugModuleInfo[] = [
  { id: 'auth', label: 'Auth & Household', description: 'Session sync, saved quick logins, admin handover, leave' },
  { id: 'expenses', label: 'Expenses', description: 'Split creation, expense_shares, agree/dispute/edit/cancel' },
  { id: 'settlements', label: 'Settlements', description: 'Marked-paid & confirmed settlement ledger transfers' },
  { id: 'chores_draft', label: 'Chores & Draft', description: 'Draft rounds, secret picks, assignments, completions & kudos' },
  { id: 'governance', label: 'Governance', description: 'Meeting topics, votes, comments & house agreements' },
  { id: 'chat', label: 'House Chat', description: 'Messages, linked items & emoji reactions' },
  { id: 'notifications', label: 'Notifications', description: 'Inbox alerts & read acknowledgments' },
  { id: 'qr_scanner', label: 'QR & Invites', description: 'BarcodeDetector / jsQR camera scan & deep-link parsing' },
  { id: 'storage', label: 'Photo Storage', description: 'Client JPEG compression, bucket uploads & signed URLs' },
  { id: 'outbox', label: 'Offline Outbox', description: 'Persistent offline queue & retry replay engine' },
  { id: 'realtime', label: 'Realtime', description: 'Supabase Postgres change subscriptions & reloads' },
] as const;

export interface DebugEntry {
  id: string;
  timestamp: string;
  module: DebugModule;
  level: DebugLevel;
  action: string;
  summary: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface ModuleDebugStats {
  total: number;
  warnings: number;
  errors: number;
  lastAction?: string;
  lastLevel?: DebugLevel;
  lastSummary?: string;
  lastAt?: string;
  lastDurationMs?: number;
}

const MAX_DEBUG_ENTRIES = 250;
const SENSITIVE_KEY_PATTERN = /token|secret|password|authorization|apikey|jwt|credential|cookie|bearer/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:')) {
      return `${value.slice(0, 32)}... [${value.length} chars]`;
    }
    if (value.length > 260) {
      return `${value.slice(0, 220)}... [${value.length} chars]`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeValue(val, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function redactDebugMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  return sanitizeValue(meta, 0) as Record<string, unknown>;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function nextEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dbg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyStatsMap(): Record<DebugModule, ModuleDebugStats> {
  const stats = {} as Record<DebugModule, ModuleDebugStats>;
  for (const mod of DEBUG_MODULES) {
    stats[mod.id] = { total: 0, warnings: 0, errors: 0 };
  }
  return stats;
}

class DebugLogger {
  private entries: DebugEntry[] = [];
  private stats: Record<DebugModule, ModuleDebugStats> = emptyStatsMap();
  private listeners = new Set<() => void>();

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore listener failure
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public log(
    module: DebugModule,
    level: DebugLevel,
    action: string,
    summary: string,
    options?: { durationMs?: number; meta?: Record<string, unknown> }
  ): DebugEntry {
    const entry: DebugEntry = {
      id: nextEntryId(),
      timestamp: new Date().toISOString(),
      module,
      level,
      action,
      summary,
      ...(typeof options?.durationMs === 'number'
        ? { durationMs: Math.round(options.durationMs) }
        : {}),
      ...(options?.meta ? { meta: redactDebugMeta(options.meta) } : {}),
    };

    this.entries.unshift(entry);
    if (this.entries.length > MAX_DEBUG_ENTRIES) {
      this.entries.length = MAX_DEBUG_ENTRIES;
    }

    const modStats = this.stats[module] || { total: 0, warnings: 0, errors: 0 };
    modStats.total += 1;
    if (level === 'warn') modStats.warnings += 1;
    if (level === 'error') modStats.errors += 1;
    modStats.lastAction = action;
    modStats.lastLevel = level;
    modStats.lastSummary = summary;
    modStats.lastAt = entry.timestamp;
    modStats.lastDurationMs = entry.durationMs;
    this.stats[module] = modStats;

    this.notify();
    return entry;
  }

  public info(module: DebugModule, action: string, summary: string, meta?: Record<string, unknown>, durationMs?: number) {
    return this.log(module, 'info', action, summary, { meta, durationMs });
  }

  public warn(module: DebugModule, action: string, summary: string, meta?: Record<string, unknown>, durationMs?: number) {
    return this.log(module, 'warn', action, summary, { meta, durationMs });
  }

  public error(module: DebugModule, action: string, summary: string, meta?: Record<string, unknown>, durationMs?: number) {
    return this.log(module, 'error', action, summary, { meta, durationMs });
  }

  public async timeAsync<T>(
    module: DebugModule,
    action: string,
    fn: () => Promise<T>,
    describeResult?: (result: T) => { level?: DebugLevel; summary: string; meta?: Record<string, unknown> }
  ): Promise<T> {
    const started = nowMs();
    try {
      const result = await fn();
      const durationMs = nowMs() - started;
      const info = describeResult
        ? describeResult(result)
        : { level: 'info' as DebugLevel, summary: `${action} completed` };
      this.log(module, info.level || 'info', action, info.summary, {
        durationMs,
        meta: info.meta,
      });
      return result;
    } catch (err: any) {
      const durationMs = nowMs() - started;
      this.log(module, 'error', action, err?.message || `${action} failed`, {
        durationMs,
        meta: { error: err?.message || String(err) },
      });
      throw err;
    }
  }

  public getEntries(filter?: { module?: DebugModule | 'all'; level?: DebugLevel | 'all' }): DebugEntry[] {
    return this.entries.filter((entry) => {
      if (filter?.module && filter.module !== 'all' && entry.module !== filter.module) return false;
      if (filter?.level && filter.level !== 'all' && entry.level !== filter.level) return false;
      return true;
    });
  }

  public getModuleStats(): Record<DebugModule, ModuleDebugStats> {
    const copy = {} as Record<DebugModule, ModuleDebugStats>;
    for (const mod of DEBUG_MODULES) {
      copy[mod.id] = { ...this.stats[mod.id] };
    }
    return copy;
  }

  public clear(module?: DebugModule): void {
    if (!module) {
      this.entries = [];
      this.stats = emptyStatsMap();
    } else {
      this.entries = this.entries.filter((entry) => entry.module !== module);
      this.stats[module] = { total: 0, warnings: 0, errors: 0 };
    }
    this.notify();
  }

  public exportReport(extra?: Record<string, unknown>): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        stats: this.getModuleStats(),
        entries: this.entries,
        ...(extra ? { context: redactDebugMeta(extra) } : {}),
      },
      null,
      2
    );
  }
}

export const debugLog = new DebugLogger();
