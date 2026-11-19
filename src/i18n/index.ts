import { en, TranslationDictionary, TranslationKey } from './locales/en';
import {
  SupportedLanguage,
  LocaleParams,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  isRtlLanguage,
  getTextDirection,
} from './types';

export type { SupportedLanguage, LocaleParams, TranslationKey, TranslationDictionary };
export { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, isRtlLanguage, getTextDirection };

const STORAGE_KEY = 'roomie_lang';

const localeCache: Partial<Record<SupportedLanguage, TranslationDictionary>> = {
  en,
};

let currentLocale: SupportedLanguage = readInitialStoredLocale();
const listeners = new Set<() => void>();
const inflightLoads: Partial<Record<SupportedLanguage, Promise<TranslationDictionary>>> = {};

function readInitialStoredLocale(): SupportedLanguage {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'en';
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage read failures
  }
  return 'en';
}

function notifyListeners(): void {
  listeners.forEach((cb) => cb());
}

export function applyDocumentLocale(lang: SupportedLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('dir', getTextDirection(lang));
  document.documentElement.setAttribute('lang', lang);
}

/**
 * Loads a lazy locale dictionary chunk once and caches it in memory.
 */
export async function loadLocaleDictionary(
  lang: SupportedLanguage
): Promise<TranslationDictionary> {
  if (localeCache[lang]) {
    return localeCache[lang]!;
  }
  if (inflightLoads[lang]) {
    return inflightLoads[lang]!;
  }

  const loader = (async (): Promise<TranslationDictionary> => {
    let loaded: TranslationDictionary;
    switch (lang) {
      case 'tr':
        loaded = (await import('./locales/tr')).default;
        break;
      case 'fr':
        loaded = (await import('./locales/fr')).default;
        break;
      case 'ar':
        loaded = (await import('./locales/ar')).default;
        break;
      case 'en':
      default:
        loaded = en;
        break;
    }
    localeCache[lang] = loaded;
    delete inflightLoads[lang];
    return loaded;
  })();

  inflightLoads[lang] = loader;
  return loader;
}

export function getLocale(): SupportedLanguage {
  return currentLocale;
}

export function isLocaleLoaded(lang: SupportedLanguage): boolean {
  return Boolean(localeCache[lang]);
}

/**
 * Switches active locale, updates `<html dir lang>`, persists choice,
 * and triggers subscribers both immediately and once the lazy chunk lands.
 */
export async function setLocale(lang: SupportedLanguage): Promise<void> {
  const normalized: SupportedLanguage = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
  currentLocale = normalized;
  applyDocumentLocale(normalized);

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // Ignore storage quota errors
    }
  }

  notifyListeners();

  if (!localeCache[normalized]) {
    await loadLocaleDictionary(normalized);
    if (currentLocale === normalized) {
      notifyListeners();
    }
  }
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatMessage(template: string, params?: LocaleParams): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token: string) => {
    const val = params[token];
    return val === undefined ? match : String(val);
  });
}

/**
 * Translates a typed key using the active loaded locale with synchronous English fallback.
 */
export function translate(
  key: TranslationKey,
  params?: LocaleParams,
  lang: SupportedLanguage = currentLocale
): string {
  const dict = localeCache[lang] ?? en;
  const template = dict[key] ?? en[key] ?? key;
  return formatMessage(template, params);
}

/**
 * Preload non-English stored preference right on bootstrap.
 */
if (currentLocale !== 'en') {
  applyDocumentLocale(currentLocale);
  void loadLocaleDictionary(currentLocale).then(() => {
    notifyListeners();
  });
}
