import React, { useState } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { SpendingBreakdownChart } from '../SpendingBreakdownChart';
import { Expense, User } from '../../../types';
import { NetBalance, UserCalculationBreakdown } from '../../../utils/balances';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import {
  Wallet,
  CheckCircle2,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Bell,
  Banknote,
  PieChart,
} from 'lucide-react';
import { formatCurrency } from './ExpenseCard';

interface BalanceOverviewSectionProps {
  myNet: number;
  balances: {
    userSummaries: Record<string, number>;
    simplifiedDebts: NetBalance[];
    calculationBreakdowns?: Record<string, UserCalculationBreakdown>;
  };
  roommates: User[];
  currentUser: User;
  currencySymbol: string;
  expenses: Expense[];
  agreedExpenses: Expense[];
  onRemindRoomies?: (message?: string) => Promise<void>;
  onOpenSettleModal: () => void;
}

export const BalanceOverviewSection: React.FC<BalanceOverviewSectionProps> = ({
  myNet,
  balances,
  roommates,
  currentUser,
  currencySymbol: sym,
  expenses,
  agreedExpenses,
  onRemindRoomies,
  onOpenSettleModal,
}) => {
  const { showToast } = useToast();
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(true);

  const myBreakdown = balances.calculationBreakdowns?.[currentUser.id];

  return (
    <div className="space-y-6">
      <ActionCard
        tint={myNet >= 0 ? 'green' : 'coral'}
        iconTile={
          <IconTile
            icon={<Wallet className="w-6 h-6" />}
            color={myNet >= 0 ? 'green' : 'coral'}
            size="md"
          />
        }
        title={
          <div className="flex items-baseline gap-2">
            <span className="type-big-number">
              {myNet > 0.05 ? (
                <span className="text-[#2CA358]">
                  +{sym}
                  {formatCurrency(myNet)}
                </span>
              ) : myNet < -0.05 ? (
                <span className="text-[#E5484D]">
                  -{sym}
                  {formatCurrency(Math.abs(myNet))}
                </span>
              ) : (
                <span className="text-[#1F2430]">{sym}0.00</span>
              )}
            </span>
          </div>
        }
        subtitle={
          myNet > 0.05
            ? 'You are owed by your roomies'
            : myNet < -0.05
            ? 'You owe shared apartment balance'
            : 'All roomie expenses settled up'
        }
        detail={
          <div className="space-y-3 mt-2">
            {balances.simplifiedDebts.length > 0 ? (
              <div className="space-y-2">
                <span className="type-label block text-[#64748B]">Direct Debts Summary</span>
                {balances.simplifiedDebts.map((d, i) => {
                  const fromUser = roommates.find((r) => r.id === d.fromUserId);
                  const toUser = roommates.find((r) => r.id === d.toUserId);
                  const isMeDebtor = d.fromUserId === currentUser.id;
                  const isMeCreditor = d.toUserId === currentUser.id;
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl text-[14px] font-bold flex items-center justify-between gap-2 border ${
                        isMeDebtor
                          ? 'bg-[#FFF0ED] text-[#D94E30] border-[#FFD7CF]'
                          : isMeCreditor
                          ? 'bg-[#EBF9F0] text-[#1D7A3E] border-[#B8ECC8]'
                          : 'bg-white text-[#1F2430] border-[#E6E8EE]'
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {isMeDebtor ? 'You owe' : `${fromUser?.name.split(' ')[0]} owes`}{' '}
                        {toUser?.id === currentUser.id ? 'You' : toUser?.name.split(' ')[0]}
                      </span>
                      <span className="font-heading font-bold text-[18px] shrink-0 whitespace-nowrap">
                        {sym}
                        {formatCurrency(d.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="type-secondary flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2CA358]" /> All apartment expenses are fully
                settled!
              </p>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowCalculationInfo(!showCalculationInfo);
                }}
                className="flex items-center justify-between w-full p-2.5 rounded-xl bg-black/5 hover:bg-black/10 text-[14px] font-bold text-[#475569] transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#5B5BD6]" />
                  How is this total calculated?
                </span>
                {showCalculationInfo ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showCalculationInfo && (
                <div className="mt-2 p-3 rounded-xl bg-white border border-[#E6E8EE] text-[14px] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-[#1F2430]">
                    <span>Basis</span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#EBF9F0] text-[#2CA358] text-[12px] sm:text-[13px] font-bold">
                      Only agreed expenses and confirmed settlements
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[#475569] pt-1">
                    <div className="flex justify-between items-center">
                      <span>Total you paid for flat (agreed):</span>
                      <span className="font-mono font-bold text-[#2CA358]">
                        +{sym}
                        {formatCurrency(myBreakdown?.totalPaidAgreed ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Your share across agreed expenses:</span>
                      <span className="font-mono font-bold text-[#E5484D]">
                        -{sym}
                        {formatCurrency(
                          (myBreakdown?.ownShareOfOwnExpenses ?? 0) +
                            (myBreakdown?.owedByMeToOtherPayers ?? 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Confirmed settlements received:</span>
                      <span className="font-mono font-bold text-[#475569]">
                        {sym}
                        {formatCurrency(myBreakdown?.settlementsReceived ?? 0)}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-[#E6E8EE] flex justify-between items-center font-bold text-[#1F2430]">
                      <span>Your Net Balance:</span>
                      <span className="font-mono font-black text-base text-[#2CA358]">
                        {myNet >= 0 ? '+' : '-'}
                        {sym}
                        {formatCurrency(Math.abs(myNet))}
                      </span>
                    </div>
                  </div>
                  <p className="text-[14px] text-[#475569] italic">
                    Pending purchases and disputes are excluded until confirmed by all roomies.
                  </p>
                </div>
              )}
            </div>

            <p className="type-secondary pt-1 text-[14px]">
              Settle up monthly to keep transactions fair with currency changes.
            </p>
          </div>
        }
        actions={
          <div className="w-full">
            {myNet > 0.05 ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="primary"
                  size="md"
                  onClick={async () => {
                    sound.playTap();
                    if (onRemindRoomies) {
                      await onRemindRoomies(
                        'Gentle reminder to settle apartment balances when you have a moment 🙏'
                      );
                      showToast('Reminder posted to flat chat!', 'success');
                    }
                  }}
                  icon={<Bell className="w-4 h-4" />}
                >
                  Remind
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    sound.playTap();
                    onOpenSettleModal();
                  }}
                >
                  Confirm payment
                </Button>
              </div>
            ) : myNet < -0.05 ? (
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  sound.playTap();
                  onOpenSettleModal();
                }}
                icon={<Banknote className="w-4 h-4" />}
              >
                Settle up now
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {
                  sound.playTap();
                  onOpenSettleModal();
                }}
              >
                Payment history
              </Button>
            )}
          </div>
        }
      />

      <InfoCard padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconTile icon={<PieChart className="w-5 h-5" />} color="amber" size="sm" />
            <span className="type-section-heading">Spending by category</span>
          </div>
          <button
            type="button"
            onClick={() => setBreakdownExpanded(!breakdownExpanded)}
            className="type-secondary font-bold text-[14px] text-[#FF6B4A] hover:underline cursor-pointer"
          >
            {breakdownExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {breakdownExpanded && (
          <SpendingBreakdownChart
            expenses={agreedExpenses.length > 0 ? agreedExpenses : expenses}
            currencySymbol={sym}
          />
        )}
      </InfoCard>
    </div>
  );
};
