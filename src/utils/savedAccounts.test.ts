import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSavedAccounts,
  isAccountSaved,
  upsertSavedAccount,
  updateSavedAccountTokens,
  removeSavedAccount,
} from './savedAccounts';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = mockStorage;
}

test('savedAccounts upserts, refreshes tokens, and removes accounts cleanly', () => {
  installMockLocalStorage();
  assert.deepEqual(getSavedAccounts(), []);

  upsertSavedAccount({
    userId: 'u_1',
    email: 'Alex@Example.com',
    name: 'Alex Rivera',
    avatar: 'https://example.com/a.jpg',
    mode: 'supabase',
    sessionTokens: { accessToken: 'acc_1', refreshToken: 'ref_1' },
  });

  assert.equal(isAccountSaved('alex@example.com'), true);
  assert.equal(getSavedAccounts().length, 1);
  assert.equal(getSavedAccounts()[0].email, 'alex@example.com');
  assert.equal(getSavedAccounts()[0].sessionTokens?.refreshToken, 'ref_1');

  updateSavedAccountTokens('u_1', { accessToken: 'acc_2', refreshToken: 'ref_2' });
  assert.equal(getSavedAccounts()[0].sessionTokens?.refreshToken, 'ref_2');

  removeSavedAccount('alex@example.com');
  assert.equal(isAccountSaved('u_1'), false);
  assert.deepEqual(getSavedAccounts(), []);
});
