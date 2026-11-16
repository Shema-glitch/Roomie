/**
 * Roomie Feature Flags & Beta Labs Gate
 * Isolates experimental Phase 2B/3 features from core production flows.
 * Persisted in localStorage with synchronous hydration and zero external dependencies.
 */

import { useState, useEffect } from 'react';
import { debugLog } from '../utils/debugLog';

export interface FeatureFlags {
  culturalDinnersBeta: boolean;
  roomieWrappedBeta: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  culturalDinnersBeta: true,
  roomieWrappedBeta: true,
};

const FEATURE_FLAGS_STORAGE_KEY = 'roomie_feature_flags_v1';
const FEATURE_FLAGS_CHANGE_EVENT = 'roomie_feature_flags_changed';

let inMemoryFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

/**
 * Returns current feature flags synchronously from localStorage with fallback to defaults.
 */
export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...inMemoryFlags };
  }
  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
    if (!raw) return { ...inMemoryFlags };
    const parsed = JSON.parse(raw);
    return {
      culturalDinnersBeta:
        typeof parsed.culturalDinnersBeta === 'boolean'
          ? parsed.culturalDinnersBeta
          : inMemoryFlags.culturalDinnersBeta,
      roomieWrappedBeta:
        typeof parsed.roomieWrappedBeta === 'boolean'
          ? parsed.roomieWrappedBeta
          : inMemoryFlags.roomieWrappedBeta,
    };
  } catch {
    return { ...inMemoryFlags };
  }
}

/**
 * Check if a specific feature flag is currently active.
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatureFlags()[flag] ?? false;
}

/**
 * Updates a feature flag and dispatches a broadcast event for reactive UI re-renders.
 */
export function setFeatureFlag<K extends keyof FeatureFlags>(
  flag: K,
  enabled: boolean
): FeatureFlags {
  const current = getFeatureFlags();
  const updated: FeatureFlags = {
    ...current,
    [flag]: enabled,
  };

  inMemoryFlags = { ...updated };

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent(FEATURE_FLAGS_CHANGE_EVENT, { detail: { flag, enabled } })
      );
    } catch {
      // ignore storage full
    }
  }

  debugLog.info('auth', 'feature_flag_set', `Feature flag "${flag}" set to ${enabled}`, {
    flag,
    enabled,
  });

  return updated;
}

/**
 * Test helper to reset feature flags back to default state.
 */
export function resetFeatureFlagsForTesting(): void {
  inMemoryFlags = { ...DEFAULT_FEATURE_FLAGS };
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * React hook to reactively track a feature flag's state.
 */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isFeatureEnabled(flag));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      setEnabled(isFeatureEnabled(flag));
    };
    window.addEventListener(FEATURE_FLAGS_CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(FEATURE_FLAGS_CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, [flag]);

  return enabled;
}
