import { Capacitor } from '@capacitor/core';
import { CURRENT_APP_VERSION, CURRENT_BUILD_CODE } from '../config/appVersion';
import { supabase } from './supabase';
import { debugLog } from '../utils/debugLog';

export interface AppReleaseInfo {
  id: string;
  platform: 'android' | 'web';
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  releaseNotes: string;
  isMandatory: boolean;
  createdAt: string;
}

const DISMISS_STORAGE_PREFIX = 'roomie_dismissed_update_';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Compares two semver-like version strings (e.g. "2.2.0" vs "2.1.0-beta").
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string): number[] =>
    v
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      });

  const partsA = parse(a);
  const partsB = parse(b);
  const len = Math.max(partsA.length, partsB.length, 3);

  for (let i = 0; i < len; i += 1) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export function isSafeDownloadUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isNewerRelease(
  remote: Pick<AppReleaseInfo, 'versionName' | 'versionCode' | 'downloadUrl'>,
  currentVersionName = CURRENT_APP_VERSION,
  currentBuildCode = CURRENT_BUILD_CODE
): boolean {
  if (!isSafeDownloadUrl(remote.downloadUrl)) {
    return false;
  }
  if (remote.versionCode > currentBuildCode) {
    return true;
  }
  if (remote.versionCode === currentBuildCode) {
    return compareSemver(remote.versionName, currentVersionName) > 0;
  }
  return false;
}

export function isUpdateDismissed(versionCode: number, nowMs = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(`${DISMISS_STORAGE_PREFIX}${versionCode}`);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return nowMs - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function dismissUpdateVersion(versionCode: number, nowMs = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${DISMISS_STORAGE_PREFIX}${versionCode}`, String(nowMs));
  } catch {
    // Ignore storage quota errors in restricted WebViews
  }
}

async function resolveInstalledVersion(): Promise<{
  versionName: string;
  buildCode: number;
  platform: 'android' | 'web';
}> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return {
      versionName: CURRENT_APP_VERSION,
      buildCode: CURRENT_BUILD_CODE,
      platform: 'android',
    };
  }

  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    const parsedBuild = parseInt(String(info.build || ''), 10);
    return {
      versionName: info.version || CURRENT_APP_VERSION,
      buildCode:
        Number.isFinite(parsedBuild) && parsedBuild > 0
          ? Math.max(parsedBuild, CURRENT_BUILD_CODE)
          : CURRENT_BUILD_CODE,
      platform: Capacitor.getPlatform() === 'android' ? 'android' : 'web',
    };
  } catch {
    return {
      versionName: CURRENT_APP_VERSION,
      buildCode: CURRENT_BUILD_CODE,
      platform: 'android',
    };
  }
}

export interface CheckAppUpdateOptions {
  ignoreDismissed?: boolean;
}

/**
 * Checks Supabase `app_releases` for a newer hosted APK/release.
 * Returns null silently when offline, unconfigured, up-to-date, or dismissed.
 */
export async function checkForAppUpdate(
  options: CheckAppUpdateOptions = {}
): Promise<AppReleaseInfo | null> {
  if (!supabase) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  try {
    const installed = await resolveInstalledVersion();
    const { data, error } = await supabase
      .from('app_releases')
      .select('id, platform, version_name, version_code, download_url, release_notes, is_mandatory, created_at')
      .eq('platform', 'android')
      .eq('is_active', true)
      .order('version_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        debugLog.warn('storage', 'app_update_check_failed', error.message);
      }
      return null;
    }

    const candidate: AppReleaseInfo = {
      id: data.id,
      platform: data.platform === 'web' ? 'web' : 'android',
      versionName: data.version_name,
      versionCode: data.version_code,
      downloadUrl: data.download_url,
      releaseNotes: data.release_notes,
      isMandatory: data.is_mandatory,
      createdAt: data.created_at,
    };

    if (!isNewerRelease(candidate, installed.versionName, installed.buildCode)) {
      return null;
    }

    if (!options.ignoreDismissed && !candidate.isMandatory && isUpdateDismissed(candidate.versionCode)) {
      return null;
    }

    return candidate;
  } catch (err) {
    debugLog.warn(
      'storage',
      'app_update_check_exception',
      err instanceof Error ? err.message : 'Update check failed'
    );
    return null;
  }
}
