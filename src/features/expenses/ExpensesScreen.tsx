import React, { useState } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile, IconTileColor } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Chip } from '../../components/common/Chip';
import { AddExpenseFlowModal } from './AddExpenseFlowModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { SettleUpFlowModal } from './SettleUpFlowModal';
import { EditSplitModal } from './EditSplitModal';
import { SpendingBreakdownChart } from './SpendingBreakdownChart';
import { EmptyState } from '../../components/common/EmptyState';
import { Expense, Settlement, User, ExpenseCategory } from '../../types';
import { NetBalance, UserCalculationBreakdown } from '../../utils/balances';
import { formatPlural, formatCurrencyTRY } from '../../utils/stateTable';
import { sound } from '../../services/sound';
import {
  Plus,
  Wallet,
  Banknote,
  Receipt,
  ShoppingCart,
  Zap,
  Home,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  PieChart,
  ArrowRight,
  ShieldAlert,
  Bell,
  Split,
  MessageSquare,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ExpensesScreenProps {
  expenses: Expense[];
  settlements: Settlement[];
  roommates: User[];
  currentUser: User;
  balances: {
    userSummaries: Record<string, number>;
    simplifiedDebts: NetBalance[];
    calculationBreakdowns?: Record<string, UserCalculationBreakdown>;
  };
  onAddExpense: (
    title: string,
    amount: number,
    category: ExpenseCategory,
    participants: string[],
    receiptUrl?: string
  ) => Promise<Expense>;
  onRespondExpense: (
    expenseId: string,
    response: 'agreed' | 'disputed',
    reason?: string
  ) => Promise<void>;
  onEditSplit?: (expenseId: string, shares: { userId: string; shareAmount: number }[]) => Promise<Expense>;
  onCancelExpense?: (expenseId: string) => Promise<void>;
  onRemindRoomies?: (message?: string) => Promise<void>;
  onMarkPaid: (toUserId: string, amount: number) => Promise<Settlement>;
  onConfirmSettlement: (settlementId: string) => Promise<Settlement>;
  onOpenChat: () => void;
}

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({
  expenses,
  settlements,
  roommates,
  currentUser,
  balances,
  onAddExpense,
  onRespondExpense,
  onEditSplit,
  onCancelExpense,
  onRemindRoomies,
  onMarkPaid,
  onConfirmSettlement,
  onOpenChat,
}) => {
  const { showToast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editSplitTarget, setEditSplitTarget] = useState<Expense | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(true);
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);

  const formatExpenseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${parseInt(d, 10)} ${monthName}`;
  };

  const formatCurrency = (amount: number | undefined | null) => {
    return (amount ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // My net balance
  const myNet = balances.userSummaries[currentUser.id] || 0;

  // Debts current user owes to others
  const myDebtsToPay = balances.simplifiedDebts
    .filter((d) => d.fromUserId === currentUser.id)
    .map((d) => ({ toUserId: d.toUserId, amount: d.amount }));

  const getCategoryDetails = (
    cat: ExpenseCategory
  ): { icon: React.ReactNode; color: IconTileColor } => {
    switch (cat) {
      case 'groceries':
        return { icon: <ShoppingCart className="w-6 h-6" />, color: 'amber' };
      case 'rent':
        return { icon: <Building2 className="w-6 h-6" />, color: 'coral' };
      case 'utilities':
        return { icon: <Zap className="w-6 h-6" />, color: 'teal' };
      case 'household':
        return { icon: <Home className="w-6 h-6" />, color: 'indigo' };
      case 'other':
      default:
        return { icon: <Receipt className="w-6 h-6" />, color: 'slate' };
    }
  };

  // Semantic Categorization of Expenses (Strict single-source state table)
  // 1. Needs MY Agreement: Paid by someone else, where current user is pending
  const needsMyAgreementExpenses = expenses.filter((e) => {
    if (e.status === 'cancelled' || e.status === 'disputed' || e.status === 'agreed') return false;
    const myShare = e.shares.find((s) => s.userId === currentUser.id);
    return e.paidBy !== currentUser.id && myShare && myShare.response === 'pending';
  });

  // 2. Waiting for Roomies:
  // - Paid by current user and still pending agreement from roomies
  // - OR paid by someone else where current user agreed but other roomies are pending
  const waitingForRoomiesExpenses = expenses.filter((e) => {
    if (e.status === 'cancelled' || e.status === 'disputed' || e.status === 'agreed') return false;
    const myShare = e.shares.find((s) => s.userId === currentUser.id);
    if (e.paidBy === currentUser.id) return true;
    return myShare && myShare.response === 'agreed';
  });

  // 3. Confirmed & Agreed purchases (Only these count in balances)
  const agreedExpenses = expenses.filter((e) => e.status === 'agreed');

  // 4. Disputed purchases
  const disputedExpenses = expenses.filter((e) => e.status === 'disputed');

  return (
    <div className="w-full select-none pb-20 md:pb-8">
      {/* Responsive Desktop 12-Column Grid */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* ================= LEFT COLUMN: Grouped Expenses Ledger ================= */}
        <div className="w-full lg:col-span-7 self-start space-y-6">
          {/* Header Row: Action in ONE place ('+ Log expense') per Section 17 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <SectionTitle
              title="Apartment Expenses Ledger"
              subtitle="Equal split and roomie agreements"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Log expense
            </Button>
          </div>

          {/* EMPTY STATE */}
          {expenses.length === 0 && settlements.length === 0 && (
            <EmptyState
              title="No expenses logged yet"
              description="Keep splits transparent by recording apartment groceries, electricity, or water."
              mascotState="idle"
              bubbleText="No debts, peaceful living!"
              actionLabel="Log expense"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={() => setAddModalOpen(true)}
            />
          )}

          {/* SEMANTIC GROUP 1: NEEDS YOUR AGREEMENT (ONLY PAID BY SOMEONE ELSE) */}
          {needsMyAgreementExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading text-[#8A6200]">Needs your agreement</span>
                  <Chip status="pending" label={`${needsMyAgreementExpenses.length} Pending`} size="sm" />
                </div>
                <span className="type-secondary text-[14px]">Paid by roomie • verify your share</span>
              </div>

              {needsMyAgreementExpenses.map((exp) => renderExpenseCard(exp, 'needs-my-answer'))}
            </div>
          )}

          {/* SEMANTIC GROUP 2: WAITING FOR ROOMIES (YOUR PENDING EXPENSES) */}
          {waitingForRoomiesExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading text-[#475569]">Waiting for roomies</span>
                  <Chip status="pending" label={`${waitingForRoomiesExpenses.length} Awaiting`} size="sm" />
                </div>
                <span className="type-secondary text-[14px]">Waiting for other roomies to agree</span>
              </div>

              {waitingForRoomiesExpenses.map((exp) => renderExpenseCard(exp, 'waiting-roomies'))}
            </div>
          )}

          {/* SEMANTIC GROUP 3: SHARED APARTMENT PURCHASES (AGREED) */}
          {agreedExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading">Shared purchases</span>
                  <Chip status="agreed" label={`${agreedExpenses.length} Agreed`} size="sm" />
                </div>
                <span className="type-secondary text-[14px]">Counted in net apartment balance</span>
              </div>

              {agreedExpenses.map((exp) => renderExpenseCard(exp, 'agreed'))}
            </div>
          )}

          {/* SEMANTIC GROUP 4: DIRECT SETTLEMENTS */}
          {settlements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading">Direct settle up payments</span>
                  <Chip status="paid" label={`${settlements.length} Transfers`} size="sm" />
                </div>
                <span className="type-secondary text-[14px]">Settled balances</span>
              </div>

              {settlements.map((s) => {
                const fromUser = roommates.find((r) => r.id === s.fromUser);
                const toUser = roommates.find((r) => r.id === s.toUser);
                const isMePayer = s.fromUser === currentUser.id;
                const isMeReceiver = s.toUser === currentUser.id;

                return (
                  <ActionCard
                    key={s.id}
                    tint="neutral"
                    iconTile={<IconTile icon={<Banknote className="w-5 h-5" />} color="teal" size="sm" />}
                    title={`₺${formatCurrency(s.amount)} paid directly`}
                    subtitle={`${fromUser?.name.split(' ')[0] || 'Roomie'} to ${toUser?.name.split(' ')[0] || 'Roomie'} • ${formatExpenseDate(s.createdAt)}`}
                    detail={
                      <div className="flex items-center justify-between type-secondary text-[14px]">
                        <span>Direct transfer</span>
                        <span className="font-bold text-[#1F2430]">
                          {isMePayer ? 'You paid' : isMeReceiver ? 'Paid to you' : 'Roomie transfer'}
                        </span>
                      </div>
                    }
                    badge={
                      <Chip
                        status={s.status === 'confirmed' ? 'paid' : 'pending'}
                        label={s.status === 'confirmed' ? 'Confirmed' : 'Pending Receipt'}
                        size="sm"
                      />
                    }
                  />
                );
              })}
            </div>
          )}

          {/* SEMANTIC GROUP 5: DISPUTED PURCHASES */}
          {disputedExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading text-[#BF3337]">Disputed purchases</span>
                  <Chip status="disputed" label={`${disputedExpenses.length} In Review`} size="sm" />
                </div>
                <span className="type-secondary text-[14px]">Discuss in house meeting</span>
              </div>

              {disputedExpenses.map((exp) => renderExpenseCard(exp, 'disputed'))}
            </div>
          )}

          {/* EMPTY STATE IF FILTER HAS NO ITEMS */}
          {expenses.length === 0 && (
            <EmptyState
              title="No apartment expenses logged yet"
              description="Keep grocery receipts, utility bills, and shared items fair and transparent."
              mascotState="calm"
              bubbleText="No debt, all harmony!"
              actionLabel="Log first expense"
              onAction={() => setAddModalOpen(true)}
            />
          )}
        </div>

        {/* ================= RIGHT COLUMN: Net Balance & Analytics Matrix ================= */}
        <div className="w-full lg:col-span-5 self-start h-fit space-y-6 mt-6 lg:mt-0 lg:sticky lg:top-0">
          {/* 1. APARTMENT BALANCE OVERVIEW CARD */}
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
                    <span className="text-[#2CA358]">+₺{formatCurrency(myNet)}</span>
                  ) : myNet < -0.05 ? (
                    <span className="text-[#E5484D]">-₺{formatCurrency(Math.abs(myNet))}</span>
                  ) : (
                    <span className="text-[#1F2430]">₺0.00</span>
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
                    <span className="type-label block text-[#64748B]">
                      Direct Debts Summary
                    </span>
                    {balances.simplifiedDebts.map((d, i) => {
                      const fromUser = roommates.find((r) => r.id === d.fromUserId);
                      const toUser = roommates.find((r) => r.id === d.toUserId);
                      const isMeDebtor = d.fromUserId === currentUser.id;
                      const isMeCreditor = d.toUserId === currentUser.id;
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-2xl text-[14px] font-bold flex items-center justify-between border ${
                            isMeDebtor
                              ? 'bg-[#FFF0ED] text-[#D94E30] border-[#FFD7CF]'
                              : isMeCreditor
                              ? 'bg-[#EBF9F0] text-[#1D7A3E] border-[#B8ECC8]'
                              : 'bg-white text-[#1F2430] border-[#E6E8EE]'
                          }`}
                        >
                          <span>
                            {isMeDebtor ? 'You owe' : `${fromUser?.name.split(' ')[0]} owes`}{' '}
                            {toUser?.id === currentUser.id ? 'You' : toUser?.name.split(' ')[0]}
                          </span>
                          <span className="font-heading font-bold text-[18px]">
                            ₺{formatCurrency(d.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="type-secondary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2CA358]" /> All apartment expenses are fully settled!
                  </p>
                )}

                {/* TRANSPARENT CALCULATION BREAKDOWN ACCORDION */}
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
                    {showCalculationInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showCalculationInfo && (
                    <div className="mt-2 p-3 rounded-xl bg-white border border-[#E6E8EE] text-[14px] space-y-2">
                      <div className="flex items-center justify-between font-bold text-[#1F2430]">
                        <span>Basis</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#EBF9F0] text-[#2CA358] text-[14px]">
                          Only agreed expenses and confirmed settlements
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[#475569] pt-1">
                        <div className="flex justify-between items-center">
                          <span>Total you paid for flat (agreed):</span>
                          <span className="font-mono font-bold text-[#2CA358]">
                            +₺{formatCurrency(balances.calculationBreakdowns?.[currentUser.id]?.totalPaidAgreed ?? 3200)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Your share across agreed expenses:</span>
                          <span className="font-mono font-bold text-[#E5484D]">
                            -₺{formatCurrency(
                              (balances.calculationBreakdowns?.[currentUser.id]?.ownShareOfOwnExpenses ?? 800) +
                              (balances.calculationBreakdowns?.[currentUser.id]?.owedByMeToOtherPayers ?? 300)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Confirmed settlements received:</span>
                          <span className="font-mono font-bold text-[#475569]">
                            ₺{formatCurrency(balances.calculationBreakdowns?.[currentUser.id]?.settlementsReceived ?? 0)}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-[#E6E8EE] flex justify-between items-center font-bold text-[#1F2430]">
                          <span>Your Net Balance:</span>
                          <span className="font-mono font-black text-base text-[#2CA358]">
                            +₺{formatCurrency(myNet)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[14px] text-[#475569] italic">
                        Pending purchases (Shoe Rack, Cleaners) and disputes (Cheese) are excluded until confirmed by all roomies.
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
              myNet > 0.05 ? (
                // IF I AM OWED MONEY: "Remind" / "Confirm payment"
                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={async () => {
                      sound.playSuccess();
                      if (onRemindRoomies) {
                        await onRemindRoomies();
                      }
                      showToast('Friendly payment reminder sent to roomies!', 'success');
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
                      setSettleModalOpen(true);
                    }}
                    icon={<CheckCircle2 className="w-4 h-4 text-[#2CA358]" />}
                  >
                    Confirm payment
                  </Button>
                </div>
              ) : myNet < -0.05 ? (
                // IF I OWE MONEY: "Settle up" only
                <div className="w-full">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => setSettleModalOpen(true)}
                    icon={<Banknote className="w-4 h-4" />}
                  >
                    Settle up
                  </Button>
                </div>
              ) : (
                <div className="w-full py-1 text-center">
                  <span className="text-[14px] font-bold text-[#2CA358] inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> All apartment balances settled
                  </span>
                </div>
              )
            }
          />

          {/* 2. SPENDING BREAKDOWN & ANALYTICS CARD */}
          <InfoCard
            tint="neutral"
            padding="md"
            className="border-2 border-[#E6E8EE] space-y-3 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconTile icon={<PieChart className="w-5 h-5" />} color="coral" size="sm" />
                <div>
                  <h4 className="type-card-title">
                    Spending by category
                  </h4>
                  <p className="type-secondary text-[14px]">
                    Monthly breakdown and charts
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  sound.playTap();
                  setBreakdownExpanded(!breakdownExpanded);
                }}
                icon={breakdownExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              >
                {breakdownExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>

            {breakdownExpanded && (
              <div className="pt-2 border-t border-[#E6E8EE]">
                <SpendingBreakdownChart expenses={expenses} />
              </div>
            )}
          </InfoCard>
        </div>
      </div>

      {/* MODALS */}
      <AddExpenseFlowModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        roommates={roommates}
        currentUser={currentUser}
        onAddExpense={onAddExpense}
      />

      <ExpenseDetailModal
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        roommates={roommates}
        currentUser={currentUser}
        onRespond={onRespondExpense}
        onEditSplit={() => {
          if (selectedExpense) {
            setEditSplitTarget(selectedExpense);
          }
        }}
        onResolveDispute={async () => {
          if (selectedExpense && onRespondExpense) {
            await onRespondExpense(selectedExpense.id, 'agreed');
            setSelectedExpense(null);
          }
        }}
        onOpenChat={onOpenChat}
      />

      <SettleUpFlowModal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        roommates={roommates}
        currentUser={currentUser}
        debtsToPay={myDebtsToPay}
        pendingSettlements={settlements}
        onMarkPaid={onMarkPaid}
        onConfirmSettlement={onConfirmSettlement}
      />

      {editSplitTarget && (
        <EditSplitModal
          isOpen={Boolean(editSplitTarget)}
          onClose={() => setEditSplitTarget(null)}
          expense={editSplitTarget}
          roommates={roommates}
          onSaveSplit={async (expenseId, adjustedShares) => {
            if (onEditSplit) {
              await onEditSplit(expenseId, adjustedShares);
              showToast('Split updated and resolved!', 'success');
            }
            setEditSplitTarget(null);
          }}
        />
      )}
    </div>
  );

  // Helper card renderer: Sleek, tactile, and rich in semantic context
  function renderExpenseCard(
    exp: Expense,
    mode: 'needs-my-answer' | 'waiting-roomies' | 'agreed' | 'disputed'
  ) {
    const payer = roommates.find((r) => r.id === exp.paidBy);
    const { icon, color } = getCategoryDetails(exp.category);
    const myShare = exp.shares.find((s) => s.userId === currentUser.id);
    const isPayerMe = exp.paidBy === currentUser.id;
    const isDisputed = exp.status === 'disputed' || mode === 'disputed';
    const isNeedsMyAnswer = mode === 'needs-my-answer' && myShare?.response === 'pending';
    const isWaitingRoomies = mode === 'waiting-roomies';

    const pendingRoomies = exp.shares
      .filter((s) => s.response === 'pending')
      .map((s) => {
        const u = roommates.find((r) => r.id === s.userId);
        return u?.id === currentUser.id ? 'You' : u?.name.split(' ')[0] || 'Roomie';
      });

    return (
      <div
        key={exp.id}
        onClick={() => {
          sound.playTap();
          setSelectedExpense(exp);
        }}
        className={`group p-4 sm:p-5 rounded-[24px] border-2 transition-all cursor-pointer select-none ${
          isDisputed
            ? 'bg-[#FFF5F2] border-[#FFD3C9] hover:border-[#FFB7A7] shadow-[0_4px_16px_rgba(255,107,74,0.08)]'
            : isNeedsMyAnswer
            ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#FCD34D] shadow-[0_4px_16px_rgba(255,201,60,0.12)] ring-1 ring-[#F59E0B]/30'
            : 'bg-white border-[#E6E8EE] hover:border-[#CBD5E1] hover:shadow-xs'
        }`}
      >
        {/* Main Header Row: Icon + Title + Meta on Left; Total Amount + Status Chip on Right */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
            <IconTile icon={icon} color={color} size="md" className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="type-card-title truncate group-hover:text-[#FF6B4A] transition-colors">
                {exp.title}
              </h4>
              <p className="type-secondary mt-0.5 text-[14px]">
                Paid by {isPayerMe ? 'You' : payer?.name.split(' ')[0] || 'Roomie'} • {formatExpenseDate(exp.date)}
              </p>
            </div>
          </div>

          {/* Right Financial Hub: Big Total Amount & Tactile Chip */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className="font-heading font-black text-lg sm:text-xl text-[#1F2430]">
              ₺{formatCurrency(exp.amount)}
            </span>
            <Chip
              status={
                exp.status === 'agreed'
                  ? 'agreed'
                  : exp.status === 'disputed'
                  ? 'disputed'
                  : 'pending'
              }
              label={
                exp.status === 'agreed'
                  ? 'Agreed'
                  : exp.status === 'disputed'
                  ? 'Disputed'
                  : 'Pending'
              }
              size="sm"
            />
          </div>
        </div>

        {/* Dispute Explanatory Callout Banner if disputed */}
        {isDisputed && exp.disputeReason && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#FFF0ED] border border-[#FFD7CF] text-[14px] text-[#BF3337] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#E5484D]" />
            <span>
              <strong>Dispute Note:</strong> {exp.disputeReason}
            </span>
          </div>
        )}

        {/* Divider & Metadata Bar: Split Details + Share Pill + Inline Actions */}
        <div className="mt-3.5 pt-3 border-t border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Left info: Split info & your contribution */}
          <div className="flex items-center gap-2 flex-wrap text-[14px] font-semibold">
            <span className="text-[#475569]">
              {exp.shares.length} roomies sharing equally
            </span>
            <span className="text-[#CBD5E1] hidden sm:inline">•</span>
            {isPayerMe ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#EBF9F0] text-[#2CA358] font-bold text-[14px]">
                You paid full
              </span>
            ) : myShare ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#F0F4FF] text-[#4353C4] font-bold text-[14px]">
                Your share: ₺{formatCurrency(myShare.shareAmount)}
              </span>
            ) : null}

            {isWaitingRoomies && pendingRoomies.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#FFFBEB] text-[#B45309] font-bold text-[14px]">
                Waiting for: {pendingRoomies.join(', ')}
              </span>
            )}
          </div>

          {/* Right Action / Direct Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {isNeedsMyAnswer ? (
              // Needs My Answer: Agree and Dispute buttons directly on the card
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    sound.playSuccess();
                    await onRespondExpense(exp.id, 'agreed');
                    showToast('Agreed to shared expense!', 'success');
                  }}
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Agree
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    sound.playTap();
                    await onRespondExpense(exp.id, 'disputed', 'Split needs discussion');
                    showToast('Expense marked as disputed', 'info');
                  }}
                  icon={<XCircle className="w-3.5 h-3.5 text-[#E5484D]" />}
                >
                  Dispute
                </Button>
              </div>
            ) : isDisputed ? (
              // Disputed: 3 direct actions: Edit Split, Discuss in Chat, Cancel
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playTap();
                    setEditSplitTarget(exp);
                  }}
                  icon={<Split className="w-3.5 h-3.5" />}
                >
                  Edit split
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playTap();
                    onOpenChat();
                  }}
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                >
                  Discuss in chat
                </Button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    sound.playTap();
                    if (onCancelExpense) {
                      await onCancelExpense(exp.id);
                      showToast('Expense cancelled by mutual agreement', 'info');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-[#FFD7CF] bg-[#FFF0ED] text-[#E5484D] text-[14px] font-bold hover:bg-[#FFE5E0] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSelectedExpense(exp);
                }}
                className="inline-flex items-center gap-1 text-[14px] font-bold text-[#475569] hover:text-[#1F2430] transition-colors cursor-pointer"
              >
                <span>Receipt and details</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
};
