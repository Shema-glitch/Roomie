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
        <h3 className="type-section-heading">Flat Overview</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
          className={`btn-tactile ease-spring p-3.5 rounded-[22px] border-2 border-b-4 flex flex-col justify-between text-left cursor-pointer transition-all shadow-2xs select-none ${
            isOwed
              ? 'bg-[#F0FDF4] border-[#86EFAC] border-b-[#4ADE80]'
              : owes
              ? 'bg-[#FFF5F2] border-[#FFD3C9] border-b-[#FF8A70]'
              : 'bg-[#F8FAFC] border-[#E2E8F0] border-b-[#CBD5E1]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isOwed
                  ? 'bg-[#DCFCE7] text-[#16A34A]'
                  : owes
                  ? 'bg-[#FFE2DB] text-[#FF6B4A]'
                  : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              <Wallet weight="duotone" className="w-4 h-4" />
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isOwed
                  ? 'bg-[#BBF7D0] text-[#166534]'
                  : owes
                  ? 'bg-[#FED7AA] text-[#9A3412]'
                  : 'bg-[#E2E8F0] text-[#475569]'
              }`}
            >
              {isOwed ? 'Owed' : owes ? 'Due' : 'Settled'}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#64748B]">Expenses</div>
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
            <span>{isOwed ? 'Collect payment' : owes ? 'Settle balance' : 'Balances clear'}</span>
            <ArrowRight weight="bold" className="w-3 h-3 text-[#94A3B8]" />
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
          className="btn-tactile ease-spring p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FFF9EE] border-[#FDE047] border-b-[#EAB308] flex flex-col justify-between text-left cursor-pointer transition-all shadow-2xs select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEF08A] flex items-center justify-center">
              <Icon icon="fluent-emoji-flat:shopping-cart" className="w-5 h-5" />
            </div>
            {runningLowCount > 0 ? (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] border border-[#FECDD3]">
                {runningLowCount} Low
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#854D0E]">
                Groceries
              </span>
            )}
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#854D0E]">Flat Shopping</div>
            <div className="text-base font-heading font-black text-[#1F2430] truncate">
              {neededCount} {neededCount === 1 ? 'item' : 'items'} needed
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTriggerSupermarketPing();
              }}
              title="Broadcast: I am at supermarket"
              className="text-[11px] font-bold text-[#B45309] hover:text-[#78350F] flex items-center gap-1 cursor-pointer"
            >
              <Megaphone weight="bold" className="w-3 h-3" />
              <span>Ping</span>
            </button>
            <span className="text-[11px] font-bold text-[#854D0E] flex items-center gap-0.5">
              <span>List</span>
              <ArrowRight weight="bold" className="w-3 h-3 text-[#B45309]" />
            </span>
          </div>
        </div>

        {/* Tile 3: Vibe Pulse Tile */}
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
          className="btn-tactile ease-spring p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FAF5FF] border-[#E9D5FF] border-b-[#C084FC] flex flex-col justify-between text-left cursor-pointer transition-all shadow-2xs select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] flex items-center justify-center">
              {vibeRevealed && vibeMood ? (
                <Icon icon={vibeMood.icon} className="w-5 h-5" />
              ) : (
                <Icon icon="fluent-emoji-flat:locked-with-key" className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#6B21A8]">
              {vibeRevealed ? 'Unlocked' : 'Anonymous'}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#6B21A8]">House Mood</div>
            <div className="text-base font-heading font-black text-[#1F2430] truncate">
              {vibeRevealed && vibeSummary ? `${vibeSummary.averageScore} / 5 · ${vibeMood?.label || 'Vibing'}` : 'Flat Check-in'}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#6B21A8]">
            <ShieldCheck weight="fill" className="w-3.5 h-3.5 text-[#9333EA]" />
            <span>{vibeRevealed ? 'Flat average' : 'Tap to check in'}</span>
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
          className="btn-tactile ease-spring p-3.5 rounded-[22px] border-2 border-b-4 bg-[#FFF5F5] border-[#FECDD3] border-b-[#FB7185] flex flex-col justify-between text-left cursor-pointer transition-all shadow-2xs select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFE4E6] flex items-center justify-center">
              <Icon icon="fluent-emoji-flat:pot-of-food" className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFE4E6] text-[#9F1239]">
              BETA
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-[11px] font-bold text-[#9F1239]">Shared Meal</div>
            <div className="text-base font-heading font-black text-[#1F2430] truncate">
              {culturalDinner ? culturalDinner.dishTitle : 'Dinner Night'}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#9F1239]">
            <ForkKnife weight="bold" className="w-3 h-3 text-[#E11D48]" />
            <span>
              {culturalDinner
                ? `${culturalDinner.rsvpUserIds?.length || 1} attending`
                : 'Plan dinner'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
