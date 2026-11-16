import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { outbox } from './outbox';
import { debugLog } from '../utils/debugLog';

describe('outbox service', () => {
  beforeEach(() => {
    outbox.clear();
    debugLog.clear();
  });

  it('queues, flushes successfully, and logs outbox telemetry', async () => {
    const item = outbox.enqueue('00000000-0000-4000-8000-000000000001', 'create_expense', {
      amount: 50,
    });
    assert.equal(outbox.getPendingCount(), 1);
    assert.equal(item.status, 'pending');

    const replayed: string[] = [];
    outbox.setSyncHandler(async (entry) => {
      replayed.push(entry.id);
      return true;
    });

    await outbox.flush();
    assert.deepEqual(replayed, [item.id]);
    assert.equal(outbox.getPendingCount(), 0);

    const outboxLogs = debugLog.getEntries({ module: 'outbox' });
    assert.ok(outboxLogs.some((l) => l.action === 'enqueue'));
    assert.ok(outboxLogs.some((l) => l.action === 'sync_ok'));
  });

  it('tracks retry count and failure warnings when sync handler returns false', async () => {
    const item = outbox.enqueue('00000000-0000-4000-8000-000000000001', 'vote_topic', {
      topicId: 't1',
    });

    outbox.setSyncHandler(async () => false);
    await outbox.flush();

    const items = outbox.getItems();
    assert.equal(items.length, 1);
    assert.equal(items[0].id, item.id);
    assert.equal(items[0].status, 'failed');
    assert.equal(items[0].retryCount, 1);
    assert.equal(outbox.getPendingCount(), 0); // Bounded backoff delays immediate retry

    const warns = debugLog.getEntries({ module: 'outbox', level: 'warn' });
    assert.equal(warns.length, 1);
  });

  it('quarantines failing items after MAX_OUTBOX_RETRIES = 5 and removes them from pending flush', async () => {
    const item = outbox.enqueue('00000000-0000-4000-8000-000000000001', 'submit_vibe_pulse', {
      rating: 'fire',
    });

    // Simulate 5 failures
    for (let i = 0; i < 5; i++) {
      outbox.markFailed(item.id, `Simulated error attempt ${i + 1}`);
    }

    assert.equal(outbox.getPendingCount(), 0); // No longer in pending loop
    assert.equal(outbox.getQuarantinedCount(), 1);

    const quarantined = outbox.getQuarantined();
    assert.equal(quarantined[0].id, item.id);
    assert.equal(quarantined[0].status, 'quarantined');
    assert.equal(quarantined[0].retryCount, 5);

    // Can be retried via circuit breaker controls
    outbox.retryQuarantined(item.id);
    assert.equal(outbox.getQuarantinedCount(), 0);
    assert.equal(outbox.getPendingCount(), 1);
    assert.equal(outbox.getPending()[0].status, 'pending');
    assert.equal(outbox.getPending()[0].retryCount, 0);
  });

  it('calculates bounded exponential backoff on failure', () => {
    const item = outbox.enqueue('00000000-0000-4000-8000-000000000001', 'propose_chore_swap', {
      cost: 2,
    });

    outbox.markFailed(item.id, 'Temporary network drop');
    const items = outbox.getItems();
    const updated = items.find((i) => i.id === item.id);
    assert.ok(updated);
    assert.equal(updated.status, 'failed');
    assert.equal(updated.retryCount, 1);
    assert.ok(updated.nextRetryAt);

    const nextTime = new Date(updated.nextRetryAt!).getTime();
    assert.ok(nextTime >= Date.now());
  });
});
