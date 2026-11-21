import React, { useEffect, useState } from 'react';
import {
  DownloadSimple,
  ArrowRight,
  DeviceMobile,
  PlayCircle,
  CheckCircle,
  Wallet,
  Globe,
  CaretDown,
} from '@phosphor-icons/react';
import { Icon } from '@iconify/react';
import { MascotView } from '../../components/common/MascotView';
import { CURRENT_APP_VERSION } from '../../config/appVersion';
import { useI18n } from '../../i18n/I18nProvider';
import { SupportedLanguage } from '../../i18n';
import {
  AppReleaseInfo,
  fetchLatestActiveAndroidRelease,
  isSafeDownloadUrl,
} from '../../services/appUpdate';
import { sound } from '../../services/sound';
import { MascotState } from '../../types';
import { InteractiveFeaturePreview } from './InteractiveFeaturePreview';
import { WaitlistAndFaqSections } from './WaitlistAndFaqSections';

interface PublicLandingPageProps {
  onOpenApp: () => void;
  onOpenDemo: () => void;
}

const LANG_OPTIONS: { code: SupportedLanguage; short: string; label: string }[] = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'tr', short: 'TR', label: 'Türkçe' },
  { code: 'fr', short: 'FR', label: 'Français' },
  { code: 'ar', short: 'AR', label: 'العربية' },
];

/**
 * Custom Roomie roof gable + mascot badge emblem replacing generic icons.
 */
const RoomieBrandEmblem: React.FC = () => (
  <span
    aria-hidden="true"
    className="w-10 h-10 rounded-2xl bg-[#FFF3EC] border-2 border-b-4 border-[#FFD3C9] flex items-center justify-center shrink-0 shadow-2xs"
  >
    <svg viewBox="0 0 36 36" className="w-7 h-7">
      {/* Warm roof gable */}
      <path
        d="M5 17 L18 6 L31 17"
        fill="none"
        stroke="#D94E30"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Roof accent dot */}
      <circle cx="27" cy="9" r="2.5" fill="#FFC93C" />
      {/* Plush Mascot face */}
      <circle cx="18" cy="22" r="9.5" fill="#FF6B4A" />
      <circle cx="14.6" cy="20.8" r="1.4" fill="#1F2033" />
      <circle cx="21.4" cy="20.8" r="1.4" fill="#1F2033" />
      <ellipse cx="12.6" cy="22.8" rx="1.6" ry="1" fill="#D94E30" opacity="0.55" />
      <ellipse cx="23.4" cy="22.8" rx="1.6" ry="1" fill="#D94E30" opacity="0.55" />
      <path
        d="M15.4 23.6 Q18 26.2 20.6 23.6"
        fill="none"
        stroke="#1F2033"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  </span>
);

/**
 * Public Roomie Storybook landing page & early-access waitlist served on `/`
 * for unauthenticated web visitors while isolating the `/app` bundle.
 */
export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  onOpenApp,
  onOpenDemo,
}) => {
  const { t, lang, changeLanguage } = useI18n();
  const [latestRelease, setLatestRelease] = useState<AppReleaseInfo | null>(null);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const [heroMascot, setHeroMascot] = useState<{ state: MascotState; bubble: string } | null>(null);

  useEffect(() => {
    let active = true;
    void fetchLatestActiveAndroidRelease().then((rel) => {
      if (active && rel) setLatestRelease(rel);
    });
    return () => {
      active = false;
    };
  }, []);

  const hasApkDownload = Boolean(latestRelease && isSafeDownloadUrl(latestRelease.downloadUrl));
  const displayVersion = latestRelease?.versionName || CURRENT_APP_VERSION;
  const displayReleaseNotes = hasApkDownload
    ? latestRelease?.releaseNotes || t('landing.releaseActiveNotes')
    : t('landing.releasePendingNotes');

  const scrollToSection = (id: string) => {
    sound.playTap();
    if (typeof document !== 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const triggerHeroPill = (state: MascotState, bubble: string, nextLang?: SupportedLanguage) => {
    sound.playPop();
    setHeroMascot({ state, bubble });
    if (nextLang) {
      void changeLanguage(nextLang);
    }
  };

  const cycleNextLanguage = () => {
    const order: SupportedLanguage[] = ['en', 'tr', 'fr', 'ar'];
    const nextIdx = (order.indexOf(lang) + 1) % order.length;
    triggerHeroPill('cheering', t('landing.pillLanguages'), order[nextIdx]);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FB] text-[#1F2033] flex flex-col">
      {/* Single-Row Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#FFF9F5]/95 backdrop-blur-sm border-b-2 border-[#FFE4D6]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
          <a
            href="#top"
            className="min-h-[44px] inline-flex items-center gap-2 font-heading font-extrabold text-xl text-[#1F2033] shrink-0"
          >
            <RoomieBrandEmblem />
            <span>Roomie</span>
          </a>

          <nav aria-label="Landing Navigation" className="hidden lg:flex items-center gap-2">
            {[
              { id: 'features', label: t('landing.navFeatures') },
              { id: 'how-it-works', label: t('landing.navHow') },
              { id: 'waitlist', label: t('landing.navWaitlist') },
              { id: 'faq', label: t('landing.navFaq') },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="min-h-[44px] px-3 rounded-xl text-sm font-bold text-[#4B5063] hover:text-[#1F2033] hover:bg-white cursor-pointer transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Compact Single-Row Mobile Language Selector (< sm) */}
            <div className="relative sm:hidden">
              <button
                type="button"
                aria-label="Language switcher"
                aria-expanded={mobileLangOpen}
                aria-haspopup="menu"
                onClick={() => {
                  sound.playTap();
                  setMobileLangOpen((prev) => !prev);
                }}
                className="min-h-[44px] min-w-[44px] px-2.5 rounded-2xl bg-white border-2 border-b-4 border-[#E2E8F0] text-xs font-extrabold text-[#1F2033] inline-flex items-center gap-1 cursor-pointer active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none"
              >
                <Globe weight="duotone" className="w-4 h-4 text-[#3B4BC4] shrink-0" />
                <span>{lang.toUpperCase()}</span>
                <CaretDown weight="bold" className="w-3 h-3 text-[#4B5063] shrink-0" />
              </button>

              {mobileLangOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMobileLangOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute end-0 top-full mt-1.5 z-30 w-40 rounded-2xl bg-white border-2 border-b-4 border-[#CBD5E1] shadow-xl p-1.5 space-y-1"
                  >
                    {LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={lang === opt.code}
                        onClick={() => {
                          sound.playTap();
                          void changeLanguage(opt.code);
                          setMobileLangOpen(false);
                        }}
                        className={`w-full min-h-[44px] px-3 rounded-xl text-xs font-extrabold flex items-center justify-between cursor-pointer transition-colors ${
                          lang === opt.code
                            ? 'bg-[#FFF5F2] text-[#B42318]'
                            : 'text-[#1F2033] hover:bg-[#F7F8FB]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span>{opt.short}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Full 4-Language Pill Bar (sm+) */}
            <div
              role="group"
              aria-label="Language switcher"
              className="hidden sm:inline-flex items-center gap-1 p-1 rounded-2xl bg-white border-2 border-[#E2E8F0]"
            >
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  aria-label={opt.label}
                  aria-pressed={lang === opt.code}
                  onClick={() => {
                    sound.playTap();
                    void changeLanguage(opt.code);
                  }}
                  className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    lang === opt.code
                      ? 'bg-[#FFF5F2] text-[#B42318] border border-[#FFD3C9]'
                      : 'text-[#4B5063] hover:text-[#1F2033]'
                  }`}
                >
                  {opt.short}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenApp();
              }}
              className="min-h-[44px] min-w-[44px] px-3.5 sm:px-4 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 whitespace-nowrap"
            >
              <span>{t('landing.navOpenApp')}</span>
              <ArrowRight weight="bold" className="w-4 h-4 rtl-flip shrink-0" />
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Warm Cream-to-Peach Storybook Hero Above the Fold */}
        <section className="py-8 sm:py-14 bg-gradient-to-b from-[#FFF3EC] via-[#FFF9F5] to-white border-b-2 border-[#FFE4D6]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Mascot & Interactive Micro-Pills Stage (above fold on mobile & right on desktop) */}
            <div className="lg:col-span-5 lg:order-last">
              <div className="rounded-[28px] bg-white border-2 border-b-4 border-[#FFD3C9] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex justify-center">
                  <MascotView
                    state={heroMascot?.state || 'celebrating'}
                    size="lg"
                    bubbleText={heroMascot?.bubble || t('landing.heroMascotBubble')}
                  />
                </div>

                {/* Floating Interactive Storybook Micro-Pills */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerHeroPill('celebrating', t('landing.pillDutyDone'))}
                    className="min-h-[44px] px-3 rounded-2xl bg-[#ECFDF5] border-2 border-b-4 border-[#86EFAC] text-xs font-extrabold text-[#0F7A3D] inline-flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 transition-transform motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('landing.pillDutyDone')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerHeroPill('calm', t('landing.pillSettled'))}
                    className="min-h-[44px] px-3 rounded-2xl bg-[#ECFDF5] border-2 border-b-4 border-[#86EFAC] text-xs font-extrabold text-[#0F7A3D] inline-flex items-center justify-center gap-1.5 cursor-pointer tabular-nums hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 transition-transform motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <Wallet weight="duotone" className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('landing.pillSettled')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerHeroPill('cheering', t('landing.pillStreak'))}
                    className="min-h-[44px] px-3 rounded-2xl bg-[#FFFBEB] border-2 border-b-4 border-[#FDE68A] text-xs font-extrabold text-[#9A6700] inline-flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 transition-transform motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <Icon icon="fluent-emoji-flat:fire" className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('landing.pillStreak')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={cycleNextLanguage}
                    className="min-h-[44px] px-3 rounded-2xl bg-[#F5F3FF] border-2 border-b-4 border-[#C7D2FE] text-xs font-extrabold text-[#3B4BC4] inline-flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 transition-transform motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <Globe weight="duotone" className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('landing.pillLanguages')}</span>
                  </button>
                </div>

                {/* Live Release Notes Strip */}
                <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE68A] text-start space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#9A6700]">
                      {t('landing.releaseTag')}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#86EFAC] text-xs font-extrabold text-[#0F7A3D]">
                      {t('landing.ctaDownloadVersion', { version: displayVersion })}
                    </span>
                  </div>
                  <p className="text-xs text-[#1F2033] leading-relaxed">{displayReleaseNotes}</p>
                </div>
              </div>
            </div>

            {/* Hero Copy & Equal-Width Mobile CTAs */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-start">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border-2 border-[#FFD3C9] text-xs font-extrabold text-[#B42318] shadow-2xs">
                <DeviceMobile weight="duotone" className="w-4 h-4 text-[#D94E30]" />
                <span>{t('landing.badge')}</span>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl leading-[1.12] text-[#1F2033] tracking-tight">
                {t('landing.heroTitle')}
              </h1>

              <p className="text-base sm:text-lg text-[#4B5063] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t('landing.heroSubtitle')}
              </p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                {hasApkDownload && latestRelease ? (
                  <a
                    href={latestRelease.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => sound.playSuccess()}
                    className="w-full max-w-xs sm:w-auto sm:max-w-none min-h-[48px] px-5 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-heading font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <DownloadSimple weight="bold" className="w-5 h-5 shrink-0" />
                    <span>{t('landing.ctaDownloadApk')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/85 text-xs font-black">
                      v{displayVersion}
                    </span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollToSection('waitlist')}
                    className="w-full max-w-xs sm:w-auto sm:max-w-none min-h-[48px] px-5 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-heading font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <DownloadSimple weight="bold" className="w-5 h-5 shrink-0" />
                    <span>{t('landing.ctaWaitlistApk')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onOpenApp();
                  }}
                  className="w-full max-w-xs sm:w-auto sm:max-w-none min-h-[48px] px-5 rounded-2xl bg-white hover:bg-[#F8FAFC] text-[#1F2033] border-2 border-b-4 border-[#CBD5E1] font-heading font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span>{t('landing.ctaOpenApp')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 rtl-flip shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    onOpenDemo();
                  }}
                  className="w-full max-w-xs sm:w-auto sm:max-w-none min-h-[48px] px-4 rounded-2xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#3B4BC4] border-2 border-b-4 border-[#C7D2FE] font-heading font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <PlayCircle weight="duotone" className="w-5 h-5 shrink-0" />
                  <span>{t('landing.ctaTryDemo')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <InteractiveFeaturePreview />
        <WaitlistAndFaqSections onOpenDemo={onOpenDemo} />
      </main>

      <footer className="border-t-2 border-[#E2E8F0] bg-[#FFF9F5] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
          <div className="flex items-center gap-3">
            <RoomieBrandEmblem />
            <div className="space-y-0.5">
              <p className="font-heading font-extrabold text-base text-[#1F2033]">
                Roomie v{displayVersion} · {t('landing.footerTagline')}
              </p>
              <p className="text-xs font-medium text-[#4B5063]">
                {t('landing.footerPrivacyNote')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenApp();
            }}
            className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-[#F5F3FF] border-2 border-b-4 border-[#CBD5E1] text-xs font-extrabold text-[#1F2033] inline-flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none"
          >
            <span>{t('landing.footerOpenApp')}</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5 rtl-flip" />
          </button>
        </div>
      </footer>
    </div>
  );
};
