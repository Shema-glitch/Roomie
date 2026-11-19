export type SupportedLanguage = 'en' | 'tr' | 'fr' | 'ar';

export type LocaleParams = Record<string, string | number | undefined>;

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'tr', 'fr', 'ar'] as const;

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  tr: 'Türkçe',
  fr: 'Français',
  ar: 'العربية',
};

export function isRtlLanguage(lang?: string | null): boolean {
  return lang === 'ar';
}

export function getTextDirection(lang?: string | null): 'rtl' | 'ltr' {
  return isRtlLanguage(lang) ? 'rtl' : 'ltr';
}
