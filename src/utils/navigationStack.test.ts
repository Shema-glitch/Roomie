import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationStack } from './navigationStack';

test('navigationStack handles LIFO modals above tab handlers and falls back cleanly', () => {
  navigationStack.clear();
  assert.equal(navigationStack.hasEntries(), false);
  assert.equal(navigationStack.handleBack(), false);

  const calls: string[] = [];
  const unregisterTab = navigationStack.register(10, () => {
    calls.push('tab');
  });
  const unregisterModal1 = navigationStack.register(100, () => {
    calls.push('modal1');
  });
  const unregisterModal2 = navigationStack.register(100, () => {
    calls.push('modal2');
  });

  assert.equal(navigationStack.hasEntries(), true);
  assert.equal(navigationStack.handleBack(), true);
  assert.deepEqual(calls, ['modal2']);

  unregisterModal2();
  assert.equal(navigationStack.handleBack(), true);
  assert.deepEqual(calls, ['modal2', 'modal1']);

  unregisterModal1();
  assert.equal(navigationStack.handleBack(), true);
  assert.deepEqual(calls, ['modal2', 'modal1', 'tab']);

  unregisterTab();
  assert.equal(navigationStack.hasEntries(), false);
  assert.equal(navigationStack.handleBack(), false);
});
