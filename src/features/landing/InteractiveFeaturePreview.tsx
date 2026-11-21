import React, { useState } from 'react';
import {
  Sparkle,
  Wallet,
  ShoppingCartSimple,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  Megaphone,
  ArrowsClockwise,
  WifiHigh,
} from '@phosphor-icons/react';
import { Icon } from '@iconify/react';
import { useI18n } from '../../i18n/I18nProvider';
import { copyTextToClipboard } from '../../utils/clipboard';
import { formatDecimalCurrency } from '../../utils/stateTable';
import { sound } from '../../services/sound';

type FeatureTabId = 'draft' | 'ledger' | 'hub' | 'passport';
type ChoreFeeling = 'prefer' | 'okay' | 'avoid';
type DemoCurrency = 'TRY' | 'USD' | 'EUR';

const CURRENCY_META: Record<DemoCurrency, { symbol: string; total: number; share: number }> = {
  TRY: { symbol: '₺', total: 540, share: 180 },
  USD: { symbol: '$', total: 45, share: 15 },
  EUR: { symbol: '€', total: 42, share: 14 },
};

/**
 * Interactive 4-tab Storybook preview widget allowing visitors to experience
 * Roomie's core workflows directly on the public landing page.
 */
export const InteractiveFeaturePreview: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<FeatureTabId>('draft');

  // Draft tab demo state
  const [choreOnePick, setChoreOnePick] = useState<ChoreFeeling>('prefer');
  const [choreTwoPick, setChoreTwoPick] = useState<ChoreFeeling>('okay');

  // Ledger tab demo state
  const [currency, setCurrency] = useState<DemoCurrency>('TRY');
  const [ledgerAgreed, setLedgerAgreed] = useState(false);

  // Hub tab demo state
  const [wifiCopied, setWifiCopied] = useState(false);
  const [pingSent, setPingSent] = useState(false);

  const tabs: { id: FeatureTabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'draft',
      label: t('landing.tabDraft'),
      icon: <Sparkle weight="duotone" className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'ledger',
      label: t('landing.tabLedger'),
      icon: <Wallet weight="duotone" className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'hub',
      label: t('landing.tabHub'),
      icon: <ShoppingCartSimple weight="duotone" className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'passport',
      label: t('landing.tabPassport'),
      icon: <ShieldCheck weight="duotone" className="w-4 h-4 shrink-0" />,
    },
  ];

  const feelingButtonClass = (selected: boolean, kind: ChoreFeeling): string => {
    const base =
      'min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-b-4 text-xs font-extrabold transition-[transform,background-color,border-color] duration-150 ease-out active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none motion-reduce:active:translate-y-0 cursor-pointer';
    if (!selected) {
      return `${base} bg-white border-[#CBD5E1] text-[#4B5063] hover:text-[#1F2033] hover:bg-[#F8FAFC]`;
    }
    if (kind === 'prefer') {
      return `${base} bg-[#EBF9F0] border-[#0F7A3D] text-[#0F7A3D]`;
    }
    if (kind === 'avoid') {
      return `${base} bg-[#FEF2F2] border-[#B42318] text-[#B42318]`;
    }
    return `${base} bg-[#EEF0FD] border-[#3B4BC4] text-[#3B4BC4]`;
  };

  const currencyInfo = CURRENCY_META[currency];

  return (
    <section id="features" className="py-12 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1F2033]">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-sm sm:text-base text-[#4B5063]">
            {t('landing.featuresSubtitle')}
          </p>
        </div>

        {/* Tactile 4-tab Switcher */}
        <div
          role="tablist"
          aria-label={t('landing.featuresTitle')}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-2 rounded-[22px] bg-[#EEF0F6] border-2 border-[#CBD5E1]"
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  sound.playTap();
                  setActiveTab(tab.id);
                }}
                className={`min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-extrabold flex items-center justify-center gap-2 transition-[transform,background-color,color,border-color] duration-150 ease-out active:translate-y-[1px] motion-reduce:transition-none cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF6B4A] text-[#1F2033] border-2 border-b-4 border-[#D94E30] shadow-xs'
                    : 'bg-white/80 text-[#4B5063] hover:text-[#1F2033] hover:bg-white border-2 border-transparent'
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Interactive Tab Panel */}
        <div
          key={activeTab}
          role="tabpanel"
          className="animate-fade-up motion-reduce:animate-none rounded-[28px] bg-white border-2 border-b-4 border-[#CBD5E1] p-5 sm:p-8 shadow-sm"
        >
          {activeTab === 'draft' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5F2] border border-[#FFD3C9] text-xs font-extrabold text-[#B42318]">
                  <Sparkle weight="fill" className="w-3.5 h-3.5 text-[#D94E30]" />
                  <span>{t('landing.tabDraft')}</span>
                </span>
                <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-[#1F2033]">
                  {t('landing.draftPreviewTitle')}
                </h3>
                <p className="text-sm text-[#4B5063] leading-relaxed">
                  {t('landing.draftPreviewDesc')}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EBF9F0] border border-[#86EFAC] text-xs font-bold text-[#0F7A3D]">
                  <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                  <span>{t('landing.draftBalancedNote')}</span>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                {[
                  {
                    label: t('landing.draftChoreOne'),
                    pts: '20 pts',
                    pick: choreOnePick,
                    setPick: setChoreOnePick,
                    icon: 'fluent-emoji-flat:sponge',
                  },
                  {
                    label: t('landing.draftChoreTwo'),
                    pts: '15 pts',
                    pick: choreTwoPick,
                    setPick: setChoreTwoPick,
                    icon: 'fluent-emoji-flat:wastebasket',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E6E8EE] flex items-center justify-center shrink-0">
                        <Icon icon={item.icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading font-bold text-sm sm:text-base text-[#1F2033] truncate">
                          {item.label}
                        </p>
                        <p className="text-xs font-bold text-[#4B5063]">{item.pts}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {(['prefer', 'okay', 'avoid'] as ChoreFeeling[]).map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => {
                            sound.playPop();
                            item.setPick(choice);
                          }}
                          className={feelingButtonClass(item.pick === choice, choice)}
                        >
                          {choice === 'prefer'
                            ? t('landing.draftPrefer')
                            : choice === 'okay'
                            ? t('landing.draftOkay')
                            : t('landing.draftAvoid')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF9F0] border border-[#86EFAC] text-xs font-extrabold text-[#0F7A3D]">
                  <Wallet weight="fill" className="w-3.5 h-3.5" />
                  <span>{t('landing.tabLedger')}</span>
                </span>
                <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-[#1F2033]">
                  {t('landing.ledgerPreviewTitle')}
                </h3>
                <p className="text-sm text-[#4B5063] leading-relaxed">
                  {t('landing.ledgerPreviewDesc')}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  {(['TRY', 'USD', 'EUR'] as DemoCurrency[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setCurrency(code);
                      }}
                      className={`min-h-[44px] min-w-[44px] px-3.5 rounded-xl border-2 border-b-4 text-xs font-extrabold cursor-pointer transition-all active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none ${
                        currency === code
                          ? 'bg-[#1F2033] text-white border-[#1F2033]'
                          : 'bg-white text-[#1F2033] border-[#CBD5E1] hover:bg-[#F7F8FB]'
                      }`}
                    >
                      {code} ({CURRENCY_META[code].symbol})
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7">
                <div
                  className={`p-5 rounded-2xl border-2 border-b-4 space-y-4 transition-colors duration-150 ${
                    ledgerAgreed
                      ? 'bg-[#F0FDF4] border-[#86EFAC]'
                      : 'bg-[#FFFBEB] border-[#FDE68A]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-base text-[#1F2033] truncate">
                        {t('landing.ledgerItemTitle')}
                      </p>
                      <p className="text-xs font-semibold text-[#4B5063] mt-0.5 tabular-nums">
                        {currencyInfo.symbol}
                        {formatDecimalCurrency(currencyInfo.total)} · 3 roomies ({currencyInfo.symbol}
                        {formatDecimalCurrency(currencyInfo.share)} each)
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 ${
                        ledgerAgreed
                          ? 'bg-[#EBF9F0] text-[#0F7A3D] border border-[#86EFAC]'
                          : 'bg-[#FFF8E6] text-[#9A6700] border border-[#FDE68A]'
                      }`}
                    >
                      {ledgerAgreed ? t('landing.ledgerStatusAgreed') : t('landing.ledgerStatusPending')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-black/10 flex-wrap">
                    <span className="font-heading font-black text-2xl text-[#1F2033] tabular-nums">
                      {currencyInfo.symbol}
                      {formatDecimalCurrency(currencyInfo.share)}
                    </span>

                    <div className="flex items-center gap-2">
                      {!ledgerAgreed ? (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playSuccess();
                            setLedgerAgreed(true);
                          }}
                          className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer transition-transform active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none"
                        >
                          <CheckCircle weight="fill" className="w-4 h-4" />
                          <span>{t('landing.ledgerAgreeBtn')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setLedgerAgreed(false);
                          }}
                          className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-white hover:bg-[#F7F8FB] text-[#1F2033] border-2 border-b-4 border-[#CBD5E1] font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer transition-transform active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none"
                        >
                          <ArrowsClockwise weight="bold" className="w-4 h-4" />
                          <span>{t('landing.ledgerResetBtn')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hub' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E6] border border-[#FDE68A] text-xs font-extrabold text-[#9A6700]">
                  <ShoppingCartSimple weight="fill" className="w-3.5 h-3.5" />
                  <span>{t('landing.tabHub')}</span>
                </span>
                <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-[#1F2033]">
                  {t('landing.hubPreviewTitle')}
                </h3>
                <p className="text-sm text-[#4B5063] leading-relaxed">
                  {t('landing.hubPreviewDesc')}
                </p>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <div className="p-4 rounded-2xl bg-[#F0F7FF] border-2 border-[#DBEAFE] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DBEAFE] flex items-center justify-center text-[#3B4BC4] shrink-0">
                      <WifiHigh weight="duotone" className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#4B5063]">{t('landing.hubWifiLabel')}</p>
                      <p className="font-mono font-bold text-sm text-[#1F2033] truncate">
                        SunnyFlat_5G_2026
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playTap();
                      await copyTextToClipboard('SunnyFlat_5G_2026');
                      setWifiCopied(true);
                      window.setTimeout(() => setWifiCopied(false), 1800);
                    }}
                    className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-white border-2 border-b-4 border-[#BFDBFE] text-xs font-extrabold text-[#1E40AF] inline-flex items-center gap-1.5 cursor-pointer shrink-0 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none"
                  >
                    {wifiCopied ? (
                      <>
                        <Check weight="bold" className="w-4 h-4 text-[#0F7A3D]" />
                        <span>{t('landing.hubCopiedBtn')}</span>
                      </>
                    ) : (
                      <>
                        <Copy weight="bold" className="w-4 h-4" />
                        <span>{t('landing.hubCopyBtn')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFF8E6] border-2 border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Megaphone weight="duotone" className="w-5 h-5 text-[#9A6700] shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-[#1F2033]">
                      {pingSent ? t('landing.hubPingSent') : 'Milk, Dish Soap, Olive Oil'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playPop();
                      setPingSent(true);
                    }}
                    className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#FF6B4A] hover:bg-[#FF7D61] text-[#1F2033] border-2 border-b-4 border-[#D94E30] font-extrabold text-xs cursor-pointer shrink-0 active:translate-y-[2px] active:border-b-2 motion-reduce:transition-none"
                  >
                    {t('landing.hubPingBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'passport' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-xs font-extrabold text-[#3B4BC4]">
                  <ShieldCheck weight="fill" className="w-3.5 h-3.5" />
                  <span>{t('landing.tabPassport')}</span>
                </span>
                <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-[#1F2033]">
                  {t('landing.passportPreviewTitle')}
                </h3>
                <p className="text-sm text-[#4B5063] leading-relaxed">
                  {t('landing.passportPreviewDesc')}
                </p>
              </div>

              <div className="lg:col-span-7 p-5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF9F0] border border-[#86EFAC] flex items-center justify-center text-[#0F7A3D]">
                      <ShieldCheck weight="fill" className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-heading font-extrabold text-base text-[#1F2033]">
                        {t('landing.passportScore')}
                      </p>
                      <p className="text-xs font-bold text-[#0F7A3D]">
                        {t('landing.passportBadge')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-[#E6E8EE]">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1F2033]">
                    <CheckCircle weight="fill" className="w-4 h-4 text-[#0F7A3D] shrink-0" />
                    <span>{t('landing.passportChecklistOne')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1F2033]">
                    <CheckCircle weight="fill" className="w-4 h-4 text-[#0F7A3D] shrink-0" />
                    <span>{t('landing.passportChecklistTwo')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
