import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareSemver,
  isNewerRelease,
  isSafeDownloadUrl,
  isUpdateDismissed,
  dismissUpdateVersion,
} from './appUpdate';

function installMockWindowStorage() {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  (globalThis as { window?: { localStorage: typeof mockLocalStorage } }).window = {
    localStorage: mockLocalStorage,
  };
  return store;
}

test('compareSemver accurately compares patch, minor, and major versions', () => {
  assert.equal(compareSemver('2.2.0', '2.1.0'), 1);
  assert.equal(compareSemver('2.1.1', '2.1.0-beta'), 1);
  assert.equal(compareSemver('2.1.0', '2.1.0'), 0);
  assert.equal(compareSemver('2.0.9', '2.1.0'), -1);
  assert.equal(compareSemver('v3.0.0', '2.9.9'), 1);
});

test('isSafeDownloadUrl allows only valid HTTPS links', () => {
  assert.equal(isSafeDownloadUrl('https://github.com/Shema-glitch/Roomie/releases/latest/download/roomie.apk'), true);
  assert.equal(isSafeDownloadUrl('http://insecure.example.com/roomie.apk'), false);
  assert.equal(isSafeDownloadUrl('javascript:alert(1)'), false);
  assert.equal(isSafeDownloadUrl(''), false);
});

test('isNewerRelease requires valid HTTPS URL and higher build code or semver', () => {
  const validUrl = 'https://example.supabase.co/storage/v1/object/public/releases/roomie-2.2.0.apk';

  assert.equal(
    isNewerRelease({ versionName: '2.2.0', versionCode: 220, downloadUrl: validUrl }, '2.1.0', 210),
    true
  );
  assert.equal(
    isNewerRelease({ versionName: '2.1.1', versionCode: 210, downloadUrl: validUrl }, '2.1.0', 210),
    true
  );
  assert.equal(
    isNewerRelease({ versionName: '2.1.0', versionCode: 210, downloadUrl: validUrl }, '2.1.0', 210),
    false
  );
  assert.equal(
    isNewerRelease({ versionName: '2.2.0', versionCode: 220, downloadUrl: '' }, '2.1.0', 210),
    false
  );
});

test('dismissUpdateVersion suppresses prompts for 24 hours', () => {
  installMockWindowStorage();
  const baseTime = 1_700_000_000_000;

  assert.equal(isUpdateDismissed(220, baseTime), false);
  dismissUpdateVersion(220, baseTime);

  assert.equal(isUpdateDismissed(220, baseTime + 60 * 60 * 1000), true);
  assert.equal(isUpdateDismissed(220, baseTime + 25 * 60 * 60 * 1000), false);
});
