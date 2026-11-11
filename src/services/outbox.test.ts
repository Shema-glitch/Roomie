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

    const pending = outbox.getPending();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, item.id);
    assert.equal(pending[0].status, 'failed');
    assert.equal(pending[0].retryCount, 1);

    const warns = debugLog.getEntries({ module: 'outbox', level: 'warn' });
    assert.equal(warns.length, 1);
  });
});
