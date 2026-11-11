import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { DEBUG_MODULES, debugLog, redactDebugMeta } from './debugLog';

describe('debugLog', () => {
  beforeEach(() => {
    debugLog.clear();
  });

  it('tracks per-module logs and summary stats across all 11 modules', () => {
    assert.equal(DEBUG_MODULES.length, 11);

    debugLog.info('expenses', 'create_expense', 'Added 120.00 TRY', { amount: 120 }, 42);
    debugLog.warn('qr_scanner', 'camera_error', 'Fallback triggered');
    debugLog.error('outbox', 'sync_failed', 'Timeout');

    const stats = debugLog.getModuleStats();
    assert.equal(stats.expenses.total, 1);
    assert.equal(stats.expenses.lastDurationMs, 42);
    assert.equal(stats.qr_scanner.warnings, 1);
    assert.equal(stats.outbox.errors, 1);
    assert.equal(debugLog.getEntries({ module: 'expenses' }).length, 1);
    assert.equal(debugLog.getEntries({ level: 'error' }).length, 1);
  });

  it('redacts sensitive keys and truncates oversized payloads', () => {
    const clean = redactDebugMeta({
      access_token: 'secret-jwt-value',
      refreshToken: 'refresh-abc',
      nested: { password: '123', safe: 'ok' },
      dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(400),
    });

    assert.equal(clean?.access_token, '[REDACTED]');
    assert.equal(clean?.refreshToken, '[REDACTED]');
    assert.deepEqual(clean?.nested, { password: '[REDACTED]', safe: 'ok' });
    assert.ok(String(clean?.dataUrl).includes('[truncated') || String(clean?.dataUrl).includes('chars]'));
  });

  it('measures latency and captures errors via timeAsync', async () => {
    const value = await debugLog.timeAsync(
      'settlements',
      'confirm_settlement',
      async () => 'settled',
      (res) => ({ summary: `Completed: ${res}` })
    );
    assert.equal(value, 'settled');
    const latest = debugLog.getEntries({ module: 'settlements' })[0];
    assert.equal(latest.level, 'info');
    assert.equal(typeof latest.durationMs, 'number');

    await assert.rejects(
      () =>
        debugLog.timeAsync('governance', 'vote_topic', async () => {
          throw new Error('RLS denied');
        }),
      /RLS denied/
    );
    const govErr = debugLog.getEntries({ module: 'governance', level: 'error' })[0];
    assert.equal(govErr.summary, 'RLS denied');
  });
});
