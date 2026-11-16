export interface SavedSessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SavedLoginAccount {
  userId: string;
  email: string;
  name: string;
  avatar: string;
  flag?: string;
  mode: 'supabase' | 'local';
  sessionTokens?: SavedSessionTokens;
  savedAt: string;
  lastUsedAt: string;
}

const SAVED_ACCOUNTS_KEY = 'roomie_saved_accounts_v1';
const MAX_SAVED_ACCOUNTS = 5;

function readStorage(): SavedLoginAccount[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.email === 'string' && typeof item.userId === 'string')
      .sort((a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime());
  } catch {
    return [];
  }
}

function writeStorage(accounts: SavedLoginAccount[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, MAX_SAVED_ACCOUNTS)));
  } catch {
    // ignore quota errors
  }
}

export function getSavedAccounts(): SavedLoginAccount[] {
  return readStorage();
}

export function isAccountSaved(userIdOrEmail?: string | null): boolean {
  if (!userIdOrEmail) return false;
  const key = userIdOrEmail.trim().toLowerCase();
  return readStorage().some(
    (a) => a.userId.toLowerCase() === key || a.email.toLowerCase() === key
  );
}

export function upsertSavedAccount(
  entry: Omit<SavedLoginAccount, 'savedAt' | 'lastUsedAt'>
): SavedLoginAccount[] {
  const now = new Date().toISOString();
  const cleanEmail = entry.email.trim().toLowerCase();
  const existing = readStorage();
  const match = existing.find(
    (a) => a.userId === entry.userId || a.email.toLowerCase() === cleanEmail
  );

  const nextAccount: SavedLoginAccount = {
    userId: entry.userId,
    email: cleanEmail,
    name: entry.name || match?.name || cleanEmail.split('@')[0],
    avatar: entry.avatar || match?.avatar || '',
    flag: entry.flag || match?.flag,
    mode: entry.mode,
    sessionTokens: entry.sessionTokens ?? match?.sessionTokens,
    savedAt: match?.savedAt || now,
    lastUsedAt: now,
  };

  const filtered = existing.filter(
    (a) => a.userId !== entry.userId && a.email.toLowerCase() !== cleanEmail
  );
  const updated = [nextAccount, ...filtered].slice(0, MAX_SAVED_ACCOUNTS);
  writeStorage(updated);
  return updated;
}

export function updateSavedAccountTokens(
  userIdOrEmail: string,
  sessionTokens: SavedSessionTokens | undefined
): SavedLoginAccount[] {
  const key = userIdOrEmail.trim().toLowerCase();
  const accounts = readStorage();
  const idx = accounts.findIndex(
    (a) => a.userId.toLowerCase() === key || a.email.toLowerCase() === key
  );
  if (idx < 0) return accounts;

  accounts[idx] = {
    ...accounts[idx],
    sessionTokens,
    lastUsedAt: new Date().toISOString(),
  };
  writeStorage(accounts);
  return accounts;
}

export function removeSavedAccount(userIdOrEmail: string): SavedLoginAccount[] {
  const key = userIdOrEmail.trim().toLowerCase();
  const filtered = readStorage().filter(
    (a) => a.userId.toLowerCase() !== key && a.email.toLowerCase() !== key
  );
  writeStorage(filtered);
  return filtered;
}
