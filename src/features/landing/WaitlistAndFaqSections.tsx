import React, { useState } from 'react';
import {
  QrCode,
  SlidersHorizontal,
  Handshake,
  ShieldCheck,
  EnvelopeSimple,
  DeviceMobile,
  CaretDown,
  CheckCircle,
  ArrowRight,
} from '@phosphor-icons/react';
import { MascotView } from '../../components/common/MascotView';
import { useI18n } from '../../i18n/I18nProvider';
import { submitWaitlistSignup, WaitlistPlatform } from '../../services/waitlist';
import { sound } from '../../services/sound';

interface WaitlistAndFaqSectionsProps {
  onOpenDemo: () => void;
}

/**
 * 3-step explanation, privacy commitment card, Supabase-backed waitlist form,
 * and accessible collapsible FAQ accordions for the public landing page.
 */
export const WaitlistAndFaqSections: React.FC<WaitlistAndFaqSectionsProps> = ({ onOpenDemo }) => {
  const { t, lang } = useI18n();

  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState<WaitlistPlatform>('android');
  const [cityOrUniversity, setCityOrUniversity] = useState('');
  const [flatmateCount, setFlatmateCount] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedState, setSubmittedState] = useState<'none' | 'created' | 'already_registered'>(
    'none'
  );
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    sound.playTap();
    try {
      const res = await submitWaitlistSignup({
        email,
        platform,
        cityOrUniversity,
        flatmateCount,
        locale: lang,
      });
      if (!res.ok) {
        sound.softReject();
        setErrorMsg(res.error);
        return;
      }
      sound.playSuccess();
      setSubmittedState(res.status);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    {
      num: '01',
      title: t('landing.step1Title'),
      desc: t('landing.step1Desc'),
      icon: <QrCode weight="duotone" className="w-6 h-6 text-[#D94E30]" />,
      tint: 'bg-[#FFF5F2] border-[#FFD3C9]',
    },
    {
      num: '02',
      title: t('landing.step2Title'),
      desc: t('landing.step2Desc'),
      icon: <SlidersHorizontal weight="duotone" className="w-6 h-6 text-[#3B4BC4]" />,
      tint: 'bg-[#EEF0FD] border-[#C7D2FE]',
    },
    {
      num: '03',
      title: t('landing.step3Title'),
      desc: t('landing.step3Desc'),
      icon: <Handshake weight="duotone" className="w-6 h-6 text-[#0F7A3D]" />,
      tint: 'bg-[#EBF9F0] border-[#86EFAC]',
    },
  ];

  const faqs = [
    { q: t('landing.faq1Q'), a: t('landing.faq1A') },
    { q: t('landing.faq2Q'), a: t('landing.faq2A') },
    { q: t('landing.faq3Q'), a: t('landing.faq3A') },
    { q: t('landing.faq4Q'), a: t('landing.faq4A') },
  ];

  return (
    <>
      {/* How Roomie Works + Privacy Callout */}
      <section id="how-it-works" className="py-12 sm:py-16 bg-white/70 border-y border-[#E6E8EE]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1F2033]">
              {t('landing.howTitle')}
            </h2>
            <p className="text-sm sm:text-base text-[#4B5063]">{t('landing.howSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="p-5 rounded-[24px] bg-white border-2 border-b-4 border-[#CBD5E1] space-y-3 hover:-translate-y-0.5 transition-transform duration-150 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${step.tint}`}
                  >
                    {step.icon}
                  </div>
                  <span className="font-heading font-black text-sm text-[#4B5063]">
                    {step.num}
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-lg text-[#1F2033]">
                  {step.title}
                </h3>
                <p className="text-sm text-[#4B5063] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Privacy Commitment Banner */}
          <div className="p-5 sm:p-6 rounded-[24px] bg-[#EBF9F0] border-2 border-b-4 border-[#86EFAC] flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#86EFAC] flex items-center justify-center text-[#0F7A3D] shrink-0">
              <ShieldCheck weight="fill" className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#0F7A3D]">
                {t('landing.privacyTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-[#1F2033] leading-relaxed">
                {t('landing.privacyBody')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Early Access Waitlist */}
      <section id="waitlist" className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-[28px] bg-white border-2 border-b-4 border-[#CBD5E1] p-6 sm:p-8 shadow-sm">
            {submittedState !== 'none' ? (
              <div className="text-center space-y-4 py-2">
                <div className="flex justify-center">
                  <MascotView
                    state="celebrating"
                    size="md"
                    bubbleText={
                      submittedState === 'already_registered'
                        ? t('landing.waitlistAlreadyTitle')
                        : t('landing.waitlistSuccessTitle')
                    }
                  />
                </div>
                <h3 className="font-heading font-extrabold text-2xl text-[#1F2033]">
                  {submittedState === 'already_registered'
                    ? t('landing.waitlistAlreadyTitle')
                    : t('landing.waitlistSuccessTitle')}
                </h3>
                <p className="text-sm text-[#4B5063] max-w-md mx-auto">
                  {t('landing.waitlistSuccessBody')}
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      onOpenDemo();
                    }}
                    className="min-h-[48px] px-5 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-extrabold text-sm inline-flex items-center gap-2 cursor-pointer transition-all active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none"
                  >
                    <span>{t('landing.waitlistTryNow')}</span>
                    <ArrowRight weight="bold" className="w-4 h-4 rtl-flip" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-1.5 text-center sm:text-start">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] border border-[#FFD3C9] text-xs font-extrabold text-[#B42318]">
                    <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[#D94E30]" />
                    <span>{t('landing.waitlistEyebrow')}</span>
                  </span>
                  <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1F2033]">
                    {t('landing.waitlistTitle')}
                  </h2>
                  <p className="text-sm text-[#4B5063]">{t('landing.waitlistSubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="waitlist-email"
                      className="block text-xs font-extrabold uppercase tracking-wide text-[#1F2033]"
                    >
                      {t('landing.waitlistEmailLabel')}
                    </label>
                    <div className="relative">
                      <EnvelopeSimple className="w-4 h-4 text-[#4B5063] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="waitlist-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('landing.waitlistEmailPlaceholder')}
                        className="w-full min-h-[44px] ps-10 pe-3.5 rounded-2xl border-2 border-[#CBD5E1] bg-[#F7F8FB] focus:bg-white text-sm font-semibold text-[#1F2033] focus:outline-none focus:border-[#FF6B4A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="waitlist-city"
                      className="block text-xs font-extrabold uppercase tracking-wide text-[#1F2033]"
                    >
                      {t('landing.waitlistCityLabel')}
                    </label>
                    <input
                      id="waitlist-city"
                      type="text"
                      maxLength={120}
                      value={cityOrUniversity}
                      onChange={(e) => setCityOrUniversity(e.target.value)}
                      placeholder={t('landing.waitlistCityPlaceholder')}
                      className="w-full min-h-[44px] px-3.5 rounded-2xl border-2 border-[#CBD5E1] bg-[#F7F8FB] focus:bg-white text-sm font-semibold text-[#1F2033] focus:outline-none focus:border-[#FF6B4A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="block text-xs font-extrabold uppercase tracking-wide text-[#1F2033]">
                      {t('landing.waitlistPlatformLabel')}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'android', label: t('landing.waitlistPlatformAndroid') },
                          { id: 'ios', label: t('landing.waitlistPlatformIos') },
                          { id: 'web', label: t('landing.waitlistPlatformWeb') },
                        ] as { id: WaitlistPlatform; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={platform === opt.id}
                          onClick={() => {
                            sound.playTap();
                            setPlatform(opt.id);
                          }}
                          className={`min-h-[44px] px-2 rounded-xl border-2 border-b-4 text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none ${
                            platform === opt.id
                              ? 'bg-[#EEF0FD] border-[#3B4BC4] text-[#3B4BC4]'
                              : 'bg-white border-[#CBD5E1] text-[#4B5063] hover:text-[#1F2033]'
                          }`}
                        >
                          <DeviceMobile weight="duotone" className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-extrabold uppercase tracking-wide text-[#1F2033]">
                      {t('landing.waitlistFlatmatesLabel')}
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((count) => (
                        <button
                          key={count}
                          type="button"
                          aria-pressed={flatmateCount === count}
                          onClick={() => {
                            sound.playTap();
                            setFlatmateCount(count);
                          }}
                          className={`min-h-[44px] rounded-xl border-2 border-b-4 text-xs font-extrabold cursor-pointer transition-all active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none ${
                            flatmateCount === count
                              ? 'bg-[#FFF0ED] border-[#D94E30] text-[#1F2033]'
                              : 'bg-white border-[#CBD5E1] text-[#4B5063] hover:text-[#1F2033]'
                          }`}
                        >
                          {count === 5 ? '5+' : count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <p role="alert" className="text-xs font-bold text-[#B42318]">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] px-6 rounded-2xl bg-[#FF6B4A] hover:bg-[#FF7D61] disabled:opacity-60 text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-heading font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span>
                    {submitting ? t('landing.waitlistSubmitting') : t('landing.waitlistSubmit')}
                  </span>
                  <ArrowRight weight="bold" className="w-4 h-4 rtl-flip" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Collapsible FAQ Accordions */}
      <section id="faq" className="py-10 sm:py-14 bg-white/70 border-t border-[#E6E8EE]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-5">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1F2033] text-center">
            {t('landing.faqTitle')}
          </h2>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const expanded = openFaqIdx === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl bg-white border-2 border-b-4 border-[#CBD5E1] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => {
                      sound.playTap();
                      setOpenFaqIdx((prev) => (prev === idx ? null : idx));
                    }}
                    className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-start cursor-pointer hover:bg-[#F7F8FB] transition-colors"
                  >
                    <span className="font-heading font-bold text-sm sm:text-base text-[#1F2033]">
                      {faq.q}
                    </span>
                    <CaretDown
                      weight="bold"
                      className={`w-4 h-4 text-[#4B5063] shrink-0 transition-transform duration-150 motion-reduce:transition-none ${
                        expanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#E6E8EE] text-xs sm:text-sm text-[#4B5063] leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};
