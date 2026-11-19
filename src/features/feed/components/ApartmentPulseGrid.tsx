import React from 'react';
import { Icon } from '@iconify/react';
import {
  Wallet,
  Megaphone,
  ArrowRight,
  Plus,
  ShieldCheck,
  ForkKnife,
} from '@phosphor-icons/react';
import { HouseholdVibeSummary, CulturalDinner, ShoppingItem, VibeRating } from '../../../types';
import { AnimatedNumber } from '../../../components/common/AnimatedNumber';
import { VIBE_DEFINITIONS } from '../../../utils/vibe';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useI18n } from '../../../i18n/I18nProvider';

export interface ApartmentPulseGridProps {
  netBalance: number;
  currencySymbol: string;
  onNavigateMoney: () => void;
  shoppingItems: ShoppingItem[];
  onOpenShoppingList: () => void;
  onTriggerSupermarketPing: () => void;
  vibeSummary?: HouseholdVibeSummary;
  totalRoommates: number;
  onOpenVibeCheck: () => void;
  isCulturalDinnersEnabled: boolean;
  culturalDinner?: CulturalDinner | null;
  onOpenCulturalDinner: () => void;
}

export const ApartmentPulseGrid: React.FC<ApartmentPulseGridProps> = ({
  netBalance,
  currencySymbol,
  onNavigateMoney,
  shoppingItems,
  onOpenShoppingList,
  onTriggerSupermarketPing,
  vibeSummary,
  totalRoommates,
  onOpenVibeCheck,
  isCulturalDinnersEnabled,
  culturalDinner,
  onOpenCulturalDinner,
}) => {
  const { t } = useI18n();
  const isOwed = netBalance > 0.05;
  const owes = netBalance < -0.05;
  const absBal = Math.abs(netBalance);

  const neededCount = shoppingItems.filter((i) => i.status === 'needed').length;
  const runningLowCount = shoppingItems.filter((i) => i.isLow && i.status === 'needed').length;

  const isVibeRating = (m?: string): m is VibeRating =>
    Boolean(m && ['fire', 'chill', 'meh', 'stressed', 'down'].includes(m));

  const vibeRevealed = Boolean(vibeSummary?.revealed && vibeSummary.averageScore);
  const vibeMood = isVibeRating(vibeSummary?.dominantMood)
    ? VIBE_DEFINITIONS[vibeSummary.dominantMood]
    : null;

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="type-section-heading">{t('home.flatOverview')}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 items-stretch">
        {/* Tile 1: Money Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            sound.playTap();
            onNavigateMoney();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigateMoney();
          }}
          className={`btn-tactile ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none ${
            isOwed
              ? 'bg-[#F0FDF4] border-[#86EFAC] border-b-[#4ADE80]'
              : owes
              ? 'bg-[#FFF5F2] border-[#FFD3C9] border-b-[#FF8A70]'
              : 'bg-[#F8FAFC] border-[#E2E8F0] border-b-[#CBD5E1]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOwed
                  ? 'bg-[#BBF7D0] text-[#15803D]'
                  : owes
                  ? 'bg-[#FFD7CF] text-[#D94E30]'
                  : 'bg-[#E2E8F0] text-[#334155]'
              }`}
            >
              <Wallet weight="duotone" className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                isOwed
                  ? 'bg-[#BBF7D0] text-[#166534]'
                  : owes
                  ? 'bg-[#FED7AA] text-[#9A3412]'
                  : 'bg-[#E2E8F0] text-[#475569]'
              }`}
            >
              {isOwed ? t('home.owed') : owes ? t('home.due') : t('home.settled')}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#64748B]">{t('home.expensesTile')}</div>
            <div
              className={`text-base font-heading font-black tracking-tight truncate ${
                isOwed ? 'text-[#166534]' : owes ? 'text-[#9A3412]' : 'text-[#1E293B]'
              }`}
            >
              {isOwed ? '+' : owes ? '-' : ''}
              {currencySymbol}
              <AnimatedNumber value={absBal} decimals={2} />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#64748B]">
            <span>
              {isOwed
                ? t('home.collectPayment')
                : owes
                ? t('home.settleBalance')
                : t('home.balancesClear')}
            </span>
            <ArrowRight weight="bold" className="w-3 h-3 text-[#94A3B8] rtl-flip" />
          </div>
        </div>

        {/* Tile 2: Shopping Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            sound.playTap();
            onOpenShoppingList();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenShoppingList();
          }}
          className="btn-tactile ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FFF9EE] border-[#FDE047] border-b-[#EAB308] flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FDE047] flex items-center justify-center shrink-0">
              <Icon icon="fluent-emoji-flat:shopping-cart" className="w-5 h-5" />
            </div>
            {runningLowCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] border border-[#FECDD3] whitespace-nowrap shrink-0">
                {t('home.lowStockCount', { count: runningLowCount })}
              </span>
            )}
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#854D0E]">{t('home.shoppingTile')}</div>
            <div className="text-base font-heading font-black text-[#1F2430] truncate">
              {t('home.itemsNeeded', { count: neededCount })}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTriggerSupermarketPing();
              }}
              title={t('home.goingToMarket')}
              className="text-[11px] font-bold text-[#B45309] hover:text-[#78350F] flex items-center gap-1 cursor-pointer"
            >
              <Megaphone weight="bold" className="w-3 h-3" />
              <span>Ping</span>
            </button>
            <span className="text-[11px] font-bold text-[#854D0E] flex items-center gap-0.5">
              <span>{t('home.openList')}</span>
              <ArrowRight weight="bold" className="w-3 h-3 text-[#B45309] rtl-flip" />
            </span>
          </div>
        </div>

        {/* Tile 3: House Mood Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            sound.playTap();
            onOpenVibeCheck();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenVibeCheck();
          }}
          className="btn-tactile ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FAF5FF] border-[#E9D5FF] border-b-[#C084FC] flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#E9D5FF] flex items-center justify-center shrink-0">
              {vibeRevealed && vibeMood ? (
                <Icon icon={vibeMood.icon} className="w-5 h-5" />
              ) : (
                <Icon icon="fluent-emoji-flat:locked-with-key" className="w-5 h-5" />
              )}
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#6B21A8]">{t('home.weeklyMoodTile')}</div>
            <div className="text-base font-heading font-black text-[#1F2430] truncate">
              {vibeRevealed && vibeSummary
                ? `${vibeSummary.averageScore} / 5 · ${vibeMood?.label || 'Vibing'}`
                : t('home.moodLocked', { count: vibeSummary?.submissionCount ?? 0 })}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#6B21A8]">
            <ShieldCheck weight="fill" className="w-3.5 h-3.5 text-[#9333EA]" />
            <span>{vibeRevealed ? t('home.moodPrivateHint') : t('home.checkInNow')}</span>
          </div>
        </div>

        {/* Tile 4: Dinner Night Tile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            sound.playTap();
            onOpenCulturalDinner();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenCulturalDinner();
          }}
          className="btn-tactile ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FFF5F5] border-[#FECDD3] border-b-[#FB7185] flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FECDD3] flex items-center justify-center shrink-0">
              <Icon icon="fluent-emoji-flat:pot-of-food" className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFE4E6] text-[#9F1239] whitespace-nowrap shrink-0">
              {t('common.beta')}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#9F1239]">{t('home.dinnersTile')}</div>
            <div className="text-base font-heading font-black text-[#1F2430] truncate">
              {culturalDinner ? culturalDinner.dishTitle : t('home.dinnersTile')}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#9F1239]">
            <ForkKnife weight="bold" className="w-3 h-3 text-[#E11D48]" />
            <span>
              {culturalDinner
                ? t('home.rsvpGoing', { count: culturalDinner.rsvpUserIds?.length || 1 })
                : t('home.planDinner')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
