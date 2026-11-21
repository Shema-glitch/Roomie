import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { submitWaitlistSignup } from './waitlist';

describe('waitlist signup service', () => {
  it('rejects invalid or placeholder email addresses before submitting', async () => {
    const res = await submitWaitlistSignup({
      email: 'not-an-email',
      platform: 'android',
      cityOrUniversity: 'Kyrenia',
      flatmateCount: 3,
      locale: 'en',
    });

    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(res.error.length > 0);
    }
  });

  it('stores local fallback waitlist signups cleanly and detects duplicates', async () => {
    const storageMap = new Map<string, string>();
    const prevStorage = (globalThis as { localStorage?: Storage }).localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => {
          storageMap.set(k, v);
        },
        removeItem: (k: string) => {
          storageMap.delete(k);
        },
      },
    });

    try {
      const first = await submitWaitlistSignup({
        email: 'RoomieTester@uni.edu',
        platform: 'ios',
        cityOrUniversity: 'Istanbul',
        flatmateCount: 4,
        locale: 'tr',
      });
      assert.deepEqual(first, { ok: true, status: 'created' });

      const second = await submitWaitlistSignup({
        email: 'roomietester@uni.edu',
        platform: 'ios',
        flatmateCount: 4,
        locale: 'tr',
      });
      assert.deepEqual(second, { ok: true, status: 'already_registered' });
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: prevStorage,
      });
    }
  });
});
