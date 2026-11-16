import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { LocalSnapshotCacheService, SNAPSHOT_KEY_PREFIX } from './localCache';
import { getInitialStore } from './api/shared';
import { SocialApi } from './api/social.api';

describe('localCache service: 0ms synchronous snapshot hydration & optimistic mutation sync', () => {
  let storageMap: Map<string, string>;

  beforeEach(() => {
    storageMap = new Map<string, string>();
    Reflect.set(globalThis, 'window', {
      localStorage: {
        getItem: (key: string) => storageMap.get(key) ?? null,
        setItem: (key: string, val: string) => {
          storageMap.set(key, val);
        },
        removeItem: (key: string) => {
          storageMap.delete(key);
        },
      },
    });
    Reflect.set(globalThis, 'localStorage', (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage);
  });

  it('hydrates initial household snapshot synchronously in 0ms and persists roomie_snapshot_${householdId}', () => {
    const cache = new LocalSnapshotCacheService();
    const store = getInitialStore();
    const hId = store.activeHouseholdId;

    const snap = cache.hydrateOnBoot(store);
    assert.ok(snap);
    assert.strictEqual(snap.householdId, hId);
    assert.strictEqual(snap.activeHousehold.id, hId);
    assert.ok(snap.weeklyAwards.length > 0);
    assert.ok(storageMap.has(`${SNAPSHOT_KEY_PREFIX}${hId}`));

    // Subsequent boot reads directly from localStorage
    const freshCacheInstance = new LocalSnapshotCacheService();
    const hydratedFromStorage = freshCacheInstance.getSnapshot(hId);
    assert.ok(hydratedFromStorage);
    assert.strictEqual(hydratedFromStorage.householdId, hId);
    assert.strictEqual(hydratedFromStorage.chores.length, snap.chores.length);
  });

  it('updates the cached snapshot immediately on optimistic social mutations (vibe check & token swap)', async () => {
    const cache = new LocalSnapshotCacheService();
    const store = getInitialStore();
    const hId = store.activeHouseholdId;
    cache.hydrateOnBoot(store);

    const socialApi = new SocialApi({
      store,
      save: (s) => {
        cache.syncSnapshotFromStore(s || store, hId);
      },
      isDemoMode: () => true,
      dispatchRemoteMutation: () => {},
    });

    // Clear initial seed vibe checks and submit 3 anonymous vibe pulses -> snapshot should immediately reflect revealed = true
    store.vibeChecks = { [hId]: [] };
    await socialApi.submitVibePulse('fire', hId);
    await socialApi.submitVibePulse('chill', hId);
    await socialApi.submitVibePulse('fire', hId);

    const afterVibeSnap = cache.getSnapshot(hId);
    assert.ok(afterVibeSnap);
    assert.strictEqual(afterVibeSnap.vibeSummary.revealed, true);
    assert.strictEqual(afterVibeSnap.vibeSummary.submissionCount, 3);

    // Propose and accept a chore swap -> snapshot token balance updates immediately
    const targetUser = store.users.find((u) => u.id !== store.currentUser.id)!;
    const propRes = await socialApi.proposeChoreSwap({
      targetUserId: targetUser.id,
      requesterChoreName: 'Clean Kitchen',
      targetChoreName: 'Take Out Trash',
      tokenCost: 1,
    });
    assert.strictEqual(propRes.success, true);

    const resolveRes = await socialApi.resolveChoreSwap(propRes.request!.id, 'accept');
    assert.strictEqual(resolveRes.success, true);

    const afterSwapSnap = cache.getSnapshot(hId);
    assert.ok(afterSwapSnap);
    assert.strictEqual(afterSwapSnap.currentUser.favorTokens, 4);
  });
});
