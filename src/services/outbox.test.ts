import test from 'node:test';
import assert from 'node:assert/strict';
import { outbox } from './outbox';

test('outbox enqueues actions with pending status and increments count', () => {
  outbox.clear();
  assert.equal(outbox.getPendingCount(), 0);

  const action = outbox.enqueue('h1', 'create_expense', { title: 'Milk', amount: 20 });
  assert.equal(action.householdId, 'h1');
  assert.equal(action.type, 'create_expense');
  assert.equal(action.status, 'pending');
  assert.equal(outbox.getPendingCount(), 1);

  // Mark syncing
  outbox.markSyncing(action.id);
  const pending = outbox.getPending();
  assert.equal(pending.length, 0); // Currently syncing, not pending/failed

  // On retry failure
  outbox.markFailed(action.id, 'Network timeout');
  const failedList = outbox.getPending();
  assert.equal(failedList.length, 1);
  assert.equal(failedList[0].status, 'failed');
  assert.equal(failedList[0].retryCount, 1);
  assert.equal(failedList[0].errorMessage, 'Network timeout');

  // On success
  outbox.markSuccess(action.id);
  assert.equal(outbox.getPendingCount(), 0);
});

test('outbox accepts custom deterministic action ID for safe retries', () => {
  outbox.clear();
  const customId = 'deterministic_uuid_123';
  const action = outbox.enqueue('h1', 'agree_expense', { expenseId: 'e1' }, customId);
  assert.equal(action.id, customId);
  outbox.clear();
});
