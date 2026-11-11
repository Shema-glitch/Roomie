import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const PENDING_INVITE_KEY = 'roomie_pending_invite_code';

/**
 * Extracts a normalized invite code from a full URL, deep link, or raw typed/scanned string.
 * Supports `?code=XYZ`, `?join=XYZ`, `roomie://join/XYZ`, and bare codes like `CYP-7492` or `8chars`.
 */
export function extractInviteCodeFromInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Query parameter check (works for both full URLs and partial strings like "?code=CYP-7492")
  const paramMatch = trimmed.match(/[?&](?:code|join|invite)=([A-Za-z0-9-]{3,20})/i);
  if (paramMatch?.[1]) {
    return paramMatch[1].toUpperCase();
  }

  // Deep-link or URL path check
  if (trimmed.includes('://') || trimmed.startsWith('/')) {
    try {
      const parsed = new URL(trimmed, 'https://roomie.local');
      const qp =
        parsed.searchParams.get('code') ||
        parsed.searchParams.get('join') ||
        parsed.searchParams.get('invite');
      if (qp && qp.trim()) {
        return qp.trim().toUpperCase();
      }
      if (parsed.hostname.toLowerCase() === 'join' || parsed.hostname.toLowerCase() === 'invite') {
        const hostPathCode = parsed.pathname.replace(/^\/+|\/+$/g, '');
        if (/^[A-Za-z0-9-]{3,20}$/.test(hostPathCode)) {
          return hostPathCode.toUpperCase();
        }
      }
      const pathMatch = parsed.pathname.match(/\/(?:join|invite)\/([A-Za-z0-9-]{3,20})/i);
      if (pathMatch?.[1]) {
        return pathMatch[1].toUpperCase();
      }
    } catch {
      // fall through to bare-code check
    }
  }

  // Bare invite code (4-20 alphanumeric/hyphen characters)
  if (/^[A-Za-z0-9]{3,12}(?:-[A-Za-z0-9]{2,8})?$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

/**
 * Resolves the base HTTPS origin used in shareable QR codes & invite links.
 * Uses `VITE_PUBLIC_APP_URL` when set (essential when scanning from native APK localhost),
 * otherwise falls back to the active browser HTTP(S) origin.
 */
export function getPublicInviteOrigin(): string {
  const configured = (import.meta as any)?.env?.VITE_PUBLIC_APP_URL as string | undefined;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://roomie.app';
}

export function buildInviteUrl(inviteCode: string): string {
  const code = inviteCode.trim().toUpperCase();
  return `${getPublicInviteOrigin()}/?code=${encodeURIComponent(code)}`;
}

export function buildNativeDeepLink(inviteCode: string): string {
  const code = inviteCode.trim().toUpperCase();
  return `roomie://join?code=${encodeURIComponent(code)}`;
}

export function getPendingInviteCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(PENDING_INVITE_KEY);
    return val ? val.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function setPendingInviteCode(code: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!code) {
      localStorage.removeItem(PENDING_INVITE_KEY);
    } else {
      localStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
    }
  } catch {
    // ignore storage limits
  }
}

/**
 * Reads any `?code=` or `?join=` invite parameter from the current browser URL (if present),
 * persists it in localStorage so it survives auth/email verification, and removes it from
 * the visible query string without reloading.
 */
export function captureInviteCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return getPendingInviteCode();
  try {
    const code = extractInviteCodeFromInput(window.location.href);
    if (code) {
      setPendingInviteCode(code);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('code');
      cleanUrl.searchParams.delete('join');
      cleanUrl.searchParams.delete('invite');
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      return code;
    }
  } catch {
    // ignore URL parse errors
  }
  return getPendingInviteCode();
}

/**
 * Listens for native Android/iOS deep links (`roomie://join?code=...` or App Links).
 * Safe no-op on plain web browsers.
 */
export function subscribeToAppDeepLinks(onInviteCode: (code: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let cancelled = false;
  let removeListener: (() => void) | undefined;

  const handleUrl = (url?: string | null) => {
    const code = extractInviteCodeFromInput(url);
    if (code) {
      setPendingInviteCode(code);
      onInviteCode(code);
    }
  };

  CapApp.getLaunchUrl()
    .then((res) => {
      if (!cancelled && res?.url) {
        handleUrl(res.url);
      }
    })
    .catch(() => {});

  CapApp.addListener('appUrlOpen', (event) => {
    handleUrl(event.url);
  })
    .then((handle) => {
      if (cancelled) {
        handle.remove();
      } else {
        removeListener = () => handle.remove();
      }
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    removeListener?.();
  };
}
