import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAppEntryLocation } from './appRoute';

describe('isAppEntryLocation (/ vs /app routing)', () => {
  it('routes unauthenticated web visitors on / to the public landing page', () => {
    assert.equal(
      isAppEntryLocation({
        pathname: '/',
        search: '',
        isNative: false,
        isAuthenticated: false,
        isStandalonePwa: false,
      }),
      false
    );
  });

  it('routes Capacitor native platforms, active sessions, and standalone PWAs straight into /app', () => {
    assert.equal(
      isAppEntryLocation({
        pathname: '/',
        search: '',
        isNative: true,
        isAuthenticated: false,
      }),
      true
    );
    assert.equal(
      isAppEntryLocation({
        pathname: '/',
        search: '',
        isNative: false,
        isAuthenticated: true,
      }),
      true
    );
    assert.equal(
      isAppEntryLocation({
        pathname: '/',
        search: '',
        isNative: false,
        isAuthenticated: false,
        isStandalonePwa: true,
      }),
      true
    );
  });

  it('routes /app paths and invite/demo query parameters directly into /app', () => {
    assert.equal(
      isAppEntryLocation({
        pathname: '/app',
        search: '',
        isNative: false,
        isAuthenticated: false,
      }),
      true
    );
    assert.equal(
      isAppEntryLocation({
        pathname: '/',
        search: '?invite=CYP-7492',
        isNative: false,
        isAuthenticated: false,
      }),
      true
    );
    assert.equal(
      isAppEntryLocation({
        pathname: '/',
        search: '?code=ABC123',
        isNative: false,
        isAuthenticated: false,
      }),
      true
    );
    assert.equal(
      isAppEntryLocation({
        pathname: '/',
        search: '?demo=1',
        isNative: false,
        isAuthenticated: false,
      }),
      true
    );
  });
});
