import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  SupportedLanguage,
  TranslationKey,
  LocaleParams,
  getLocale,
  setLocale,
  subscribeLocale,
  translate,
  isRtlLanguage,
  getTextDirection,
} from './index';

interface I18nContextValue {
  lang: SupportedLanguage;
  isRtl: boolean;
  dir: 'rtl' | 'ltr';
  t: (key: TranslationKey, params?: LocaleParams) => string;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  language?: SupportedLanguage;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ language, children }) => {
  const [tick, setTick] = useState(0);
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(() => language || getLocale());

  useEffect(() => {
    return subscribeLocale(() => {
      setActiveLang(getLocale());
      setTick((v) => v + 1);
    });
  }, []);

  useEffect(() => {
    if (language && language !== getLocale()) {
      void setLocale(language);
    }
  }, [language]);

  const changeLanguage = useCallback(async (next: SupportedLanguage) => {
    await setLocale(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: LocaleParams) => translate(key, params, activeLang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeLang, tick]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang: activeLang,
      isRtl: isRtlLanguage(activeLang),
      dir: getTextDirection(activeLang),
      t,
      changeLanguage,
    }),
    [activeLang, t, changeLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  const [, setTick] = useState(0);
  const lang = ctx?.lang ?? getLocale();

  useEffect(() => {
    if (ctx) return;
    return subscribeLocale(() => setTick((v) => v + 1));
  }, [ctx]);

  const fallbackT = useCallback(
    (key: TranslationKey, params?: LocaleParams) => translate(key, params, lang),
    [lang]
  );

  const fallbackChange = useCallback(async (next: SupportedLanguage) => {
    await setLocale(next);
  }, []);

  if (ctx) return ctx;

  return {
    lang,
    isRtl: isRtlLanguage(lang),
    dir: getTextDirection(lang),
    t: fallbackT,
    changeLanguage: fallbackChange,
  };
}
