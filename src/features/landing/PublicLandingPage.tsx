import React, { useEffect, useState } from 'react';
import { DownloadSimple, ArrowRight, Sparkle, DeviceMobile, PlayCircle } from '@phosphor-icons/react';
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
 * Public marketing landing page & early-access waitlist served on `/`
 * for unauthenticated web visitors, keeping the `/app` bundle isolated.
 */
export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  onOpenApp,
  onOpenDemo,
}) => {
  const { t, lang, changeLanguage } = useI18n();
  const [latestRelease, setLatestRelease] = useState<AppReleaseInfo | null>(null);

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

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FB] text-[#1F2033] flex flex-col">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-30 bg-[#F7F8FB]/95 backdrop-blur-sm border-b border-[#E6E8EE]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <a
            href="#top"
            className="min-h-[44px] inline-flex items-center gap-2 font-heading font-black text-xl text-[#1F2033]"
          >
            <span className="w-9 h-9 rounded-2xl bg-[#FFF0ED] border-2 border-[#FFD3C9] flex items-center justify-center shrink-0">
              <Sparkle weight="fill" className="w-5 h-5 text-[#FF6B4A]" />
            </span>
            <span>Roomie</span>
          </a>

          <nav aria-label="Landing Navigation" className="hidden md:flex items-center gap-2">
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* 4-Language Switcher */}
            <div
              role="group"
              aria-label="Language switcher"
              className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#EEF0F6] border border-[#CBD5E1]"
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
                      ? 'bg-white text-[#1F2033] border border-[#CBD5E1] shadow-2xs'
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
              className="min-h-[44px] min-w-[44px] px-4 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span>{t('landing.navOpenApp')}</span>
              <ArrowRight weight="bold" className="w-4 h-4 rtl-flip" />
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="py-10 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5 text-center lg:text-start">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF5F2] border-2 border-[#FFD3C9] text-xs font-extrabold text-[#B42318]">
                <DeviceMobile weight="duotone" className="w-4 h-4 text-[#D94E30]" />
                <span>{t('landing.badge')}</span>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl leading-[1.12] text-[#1F2033] tracking-tight">
                {t('landing.heroTitle')}
              </h1>

              <p className="text-base sm:text-lg text-[#4B5063] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t('landing.heroSubtitle')}
              </p>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                {hasApkDownload && latestRelease ? (
                  <a
                    href={latestRelease.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => sound.playSuccess()}
                    className="min-h-[48px] px-5 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-heading font-extrabold text-sm sm:text-base inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <DownloadSimple weight="bold" className="w-5 h-5" />
                    <span>{t('landing.ctaDownloadApk')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/80 text-xs font-black">
                      v{displayVersion}
                    </span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollToSection('waitlist')}
                    className="min-h-[48px] px-5 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-heading font-extrabold text-sm sm:text-base inline-flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <DownloadSimple weight="bold" className="w-5 h-5" />
                    <span>{t('landing.ctaWaitlistApk')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onOpenApp();
                  }}
                  className="min-h-[48px] px-5 rounded-2xl bg-white hover:bg-[#F8FAFC] text-[#1F2033] border-2 border-b-4 border-[#CBD5E1] font-heading font-extrabold text-sm sm:text-base inline-flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span>{t('landing.ctaOpenApp')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 rtl-flip" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    onOpenDemo();
                  }}
                  className="min-h-[48px] px-4 rounded-2xl bg-[#EEF0FD] hover:bg-[#E0E4FC] text-[#3B4BC4] border-2 border-b-4 border-[#C7D2FE] font-heading font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <PlayCircle weight="duotone" className="w-5 h-5" />
                  <span>{t('landing.ctaTryDemo')}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Mascot & Live Release Feed Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-[28px] bg-white border-2 border-b-4 border-[#CBD5E1] p-6 text-center space-y-4 shadow-sm">
                <div className="flex justify-center">
                  <MascotView
                    state="celebrating"
                    size="lg"
                    bubbleText={t('landing.heroMascotBubble')}
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-start space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#4B5063]">
                      {t('landing.releaseTag')}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EBF9F0] border border-[#86EFAC] text-xs font-extrabold text-[#0F7A3D]">
                      {t('landing.ctaDownloadVersion', { version: displayVersion })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#1F2033] leading-relaxed">
                    {displayReleaseNotes}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <InteractiveFeaturePreview />
        <WaitlistAndFaqSections onOpenDemo={onOpenDemo} />
      </main>

      <footer className="border-t border-[#E6E8EE] bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
          <div className="space-y-1">
            <p className="font-heading font-extrabold text-base text-[#1F2033]">
              Roomie v{displayVersion} · {t('landing.footerTagline')}
            </p>
            <p className="text-xs font-medium text-[#4B5063]">
              {t('landing.footerPrivacyNote')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenApp();
            }}
            className="min-h-[44px] px-4 rounded-xl bg-[#F7F8FB] hover:bg-[#EEF0FD] border border-[#CBD5E1] text-xs font-extrabold text-[#1F2033] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>{t('landing.footerOpenApp')}</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5 rtl-flip" />
          </button>
        </div>
      </footer>
    </div>
  );
};
