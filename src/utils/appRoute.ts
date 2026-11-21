export interface AppEntryRouteParams {
  pathname: string;
  search: string;
  isNative: boolean;
  isAuthenticated: boolean;
  isStandalonePwa?: boolean;
}

/**
 * Determines whether the visitor should enter the `/app` shell immediately
 * rather than viewing the public landing page on `/`.
 */
export function isAppEntryLocation({
  pathname,
  search,
  isNative,
  isAuthenticated,
  isStandalonePwa = false,
}: AppEntryRouteParams): boolean {
  if (isNative || isAuthenticated || isStandalonePwa) {
    return true;
  }

  const normalizedPath = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  if (normalizedPath === '/app' || normalizedPath.startsWith('/app/')) {
    return true;
  }

  if (search) {
    const params = new URLSearchParams(search);
    if (
      params.has('invite') ||
      params.has('code') ||
      params.has('join') ||
      params.get('demo') === '1' ||
      params.get('autostart') === '1'
    ) {
      return true;
    }
  }

  return false;
}

export function detectStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      return true;
    }
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return Boolean(nav.standalone);
  } catch {
    return false;
  }
}
