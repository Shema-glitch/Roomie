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
import {
  HouseholdVibeSummary,
  CulturalDinner,
  ShoppingItem,
  VibeRating,
  Expense,
} from '../../../types';
import { AnimatedNumber } from '../../../components/common/AnimatedNumber';
import { VIBE_DEFINITIONS } from '../../../utils/vibe';
import { formatDecimalCurrency } from '../../../utils/stateTable';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useI18n } from '../../../i18n/I18nProvider';

export interface ApartmentPulseGridProps {
  netBalance: number;
  currencySymbol: string;
  expenses?: Expense[];
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
  expenses = [],
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
  const pendingApprovalCount = expenses.filter(
    (e) => e.status === 'pending' || e.status === 'disputed'
  ).length;
  const hasPendingApproval = pendingApprovalCount > 0;
  const isPendingWithoutBalance = !isOwed && !owes && hasPendingApproval;

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
          className={`btn-tactile tactile-hover ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2 ${
            isOwed
              ? 'bg-[#F0FDF4] border-[#86EFAC] border-b-[#4ADE80]'
              : owes
              ? 'bg-[#FFF5F2] border-[#FFD3C9] border-b-[#FF8A70]'
              : isPendingWithoutBalance
              ? 'bg-[#FFFBEB] border-[#FDE68A] border-b-[#F59E0B]'
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
                  : isPendingWithoutBalance
                  ? 'bg-[#FDE68A] text-[#B45309]'
                  : 'bg-[#E2E8F0] text-[#334155]'
              }`}
            >
              <Wallet weight="duotone" className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                isOwed
                  ? 'bg-[#EBF9F0] text-[#0F7A3D]'
                  : owes
                  ? 'bg-[#FFF5F2] text-[#B83B1D]'
                  : isPendingWithoutBalance
                  ? 'bg-[#FFF8E6] text-[#9A6700]'
                  : 'bg-[#EBF9F0] text-[#0F7A3D]'
              }`}
            >
              {isOwed
                ? t('home.owed')
                : owes
                ? t('home.due')
                : isPendingWithoutBalance
                ? t('home.pendingBadge')
                : t('home.settled')}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xs font-bold text-[#4B5063]">{t('home.expensesTile')}</div>
            <div
              className={`text-base font-heading font-black tracking-tight truncate tabular-nums ${
                isOwed
                  ? 'text-[#0F7A3D]'
                  : owes
                  ? 'text-[#9A3412]'
                  : isPendingWithoutBalance
                  ? 'text-[#9A6700]'
                  : 'text-[#1F2033]'
              }`}
            >
              {isOwed ? '+' : owes ? '-' : ''}
              {currencySymbol}
              <AnimatedNumber
                value={absBal}
                decimals={2}
                formatFn={(v) => formatDecimalCurrency(v)}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[#4B5063] tabular-nums">
            <span>
              {isOwed
                ? t('home.collectPayment')
                : owes
                ? t('home.settleBalance')
                : hasPendingApproval
                ? t('home.pendingCount', { count: pendingApprovalCount })
                : t('home.balancesClear')}
            </span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5 text-[#4B5063] rtl-flip" />
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
          className="btn-tactile tactile-hover ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FFF9EE] border-[#FDE047] border-b-[#EAB308] flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FDE047] flex items-center justify-center shrink-0">
              <Icon icon="fluent-emoji-flat:shopping-cart" className="w-5 h-5" />
            </div>
            {runningLowCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B42318] border border-[#FECACA] whitespace-nowrap shrink-0">
                {t('home.lowStockCount', { count: runningLowCount })}
              </span>
            )}
          </div>

          <div className="mt-2.5">
            <div className="text-xs font-bold text-[#78350F]">{t('home.shoppingTile')}</div>
            <div className="text-base font-heading font-black text-[#1F2033] truncate">
              {t('home.itemsNeeded', { count: neededCount })}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTriggerSupermarketPing();
              }}
              title={t('home.goingToMarket')}
              className="min-h-[44px] min-w-[44px] px-2.5 -my-2 rounded-xl hover:bg-[#FDE68A]/50 text-xs font-bold text-[#78350F] hover:text-[#451A03] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Megaphone weight="bold" className="w-3.5 h-3.5" />
              <span>Ping</span>
            </button>
            <span className="min-h-[44px] -my-2 px-1 text-xs font-bold text-[#78350F] flex items-center gap-0.5">
              <span>{t('home.openList')}</span>
              <ArrowRight weight="bold" className="w-3.5 h-3.5 text-[#78350F] rtl-flip" />
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
          className="btn-tactile tactile-hover ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FAF5FF] border-[#E9D5FF] border-b-[#C084FC] flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2"
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
            <div className="text-xs font-bold text-[#6B21A8]">{t('home.houseMoodTile')}</div>
            <div className="text-base font-heading font-black text-[#1F2033] truncate">
              {vibeRevealed && vibeSummary
                ? `${vibeSummary.averageScore} / 5 · ${vibeMood?.label || 'Vibing'}`
                : (vibeSummary?.submissionCount ?? 0) > 0
                ? t('home.moodLocked', {
                    count: vibeSummary?.submissionCount ?? 0,
                    total: Math.max(1, Math.min(3, totalRoommates || 3)),
                  })
                : t('home.flatCheckIn')}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[#6B21A8]">
            <ShieldCheck weight="fill" className="w-3.5 h-3.5 text-[#7E22CE]" />
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
          className="btn-tactile tactile-hover ease-spring h-full p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FFF5F5] border-[#FECDD3] border-b-[#FB7185] flex flex-col justify-between text-start cursor-pointer transition-all shadow-2xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FECDD3] flex items-center justify-center shrink-0">
              <Icon icon="fluent-emoji-flat:pot-of-food" className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#9F1239] whitespace-nowrap shrink-0">
              {t('common.beta')}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xs font-bold text-[#9F1239]">{t('home.sharedMeal')}</div>
            <div className="text-base font-heading font-black text-[#1F2033] truncate">
              {culturalDinner ? culturalDinner.dishTitle : t('home.dinnerNight')}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[#9F1239]">
            <ForkKnife weight="bold" className="w-3.5 h-3.5 text-[#9F1239]" />
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
