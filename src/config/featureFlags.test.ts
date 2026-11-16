import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  getFeatureFlags,
  setFeatureFlag,
  isFeatureEnabled,
  resetFeatureFlagsForTesting,
  DEFAULT_FEATURE_FLAGS,
} from './featureFlags';

describe('featureFlags module', () => {
  beforeEach(() => {
    resetFeatureFlagsForTesting();
  });

  it('returns default feature flags when storage is empty', () => {
    const flags = getFeatureFlags();
    assert.deepEqual(flags, DEFAULT_FEATURE_FLAGS);
    assert.equal(isFeatureEnabled('culturalDinnersBeta'), false);
    assert.equal(isFeatureEnabled('roomieWrappedBeta'), false);
  });

  it('persists and updates feature flags correctly', () => {
    setFeatureFlag('culturalDinnersBeta', true);
    assert.equal(isFeatureEnabled('culturalDinnersBeta'), true);
    assert.equal(isFeatureEnabled('roomieWrappedBeta'), false);

    setFeatureFlag('roomieWrappedBeta', true);
    assert.equal(isFeatureEnabled('roomieWrappedBeta'), true);

    setFeatureFlag('culturalDinnersBeta', false);
    assert.equal(isFeatureEnabled('culturalDinnersBeta'), false);
    assert.equal(isFeatureEnabled('roomieWrappedBeta'), true);
  });
});
