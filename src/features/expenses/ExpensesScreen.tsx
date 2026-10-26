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
import { SpendingBreakdownChart } from './SpendingBreakdownChart';
import { EmptyState } from '../../components/common/EmptyState';
import { Expense, Settlement, User, ExpenseCategory } from '../../types';
import { NetBalance } from '../../utils/balances';
import { sound } from '../../services/sound';
import {
  Plus,
  HandCoins,
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
  onMarkPaid,
  onConfirmSettlement,
  onOpenChat,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'needs_action' | 'agreed' | 'disputed'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(true);

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

  // Semantic Categorization of Expenses
  // 1. Needs User Agreement: current user is a participant with pending share status
  const needsAgreementExpenses = expenses.filter((e) => {
    const myShare = e.shares.find((s) => s.userId === currentUser.id);
    return e.status === 'pending' || (myShare && myShare.response === 'pending');
  });

  // 2. Confirmed & Agreed regular expenses
  const agreedExpenses = expenses.filter((e) => e.status === 'agreed');

  // 3. Disputed expenses
  const disputedExpenses = expenses.filter((e) => e.status === 'disputed');

  // Filter application
  const shouldShowSection = (section: 'needs_action' | 'agreed' | 'disputed' | 'settlements') => {
    if (filter === 'all') return true;
    if (filter === 'needs_action') return section === 'needs_action';
    if (filter === 'agreed') return section === 'agreed' || section === 'settlements';
    if (filter === 'disputed') return section === 'disputed';
    return true;
  };

  return (
    <div className="w-full select-none pb-20 md:pb-8">
      {/* Responsive Desktop 12-Column Grid */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* ================= LEFT COLUMN: Grouped Expenses Ledger ================= */}
        <div className="w-full lg:col-span-7 self-start space-y-6">
          {/* Header & Filter Row */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
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
                Log Expense
              </Button>
            </div>

            {/* Filter Segmented Controls */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Expenses', count: expenses.length },
                { id: 'needs_action', label: 'Needs Agreement', count: needsAgreementExpenses.length },
                { id: 'agreed', label: 'Agreed', count: agreedExpenses.length },
                { id: 'disputed', label: 'Disputes', count: disputedExpenses.length },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setFilter(f.id as any);
                  }}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-2xl text-[14px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filter === f.id
                      ? 'bg-[#1F2430] text-white shadow-xs'
                      : 'bg-white text-[#475569] border-2 border-[#E6E8EE] hover:bg-[#F7F8FB]'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-black ${
                        filter === f.id
                          ? 'bg-white/20 text-white'
                          : f.id === 'needs_action'
                          ? 'bg-[#FFF0ED] text-[#FF6B4A]'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SEMANTIC GROUP 1: NEEDS YOUR AGREEMENT (PRIORITY ACTION) */}
          {shouldShowSection('needs_action') && needsAgreementExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading text-[#8A6200]">Needs Your Agreement</span>
                  <Chip status="pending" label={`${needsAgreementExpenses.length} Pending`} size="sm" />
                </div>
                <span className="type-secondary text-xs">Verify your share</span>
              </div>

              {needsAgreementExpenses.map((exp) => renderExpenseCard(exp, true))}
            </div>
          )}

          {/* SEMANTIC GROUP 2: SHARED APARTMENT PURCHASES (AGREED) */}
          {shouldShowSection('agreed') && agreedExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading">Shared Purchases</span>
                  <Chip status="agreed" label={`${agreedExpenses.length} Agreed`} size="sm" />
                </div>
                <span className="type-secondary text-xs">Equal split active</span>
              </div>

              {agreedExpenses.map((exp) => renderExpenseCard(exp, false))}
            </div>
          )}

          {/* SEMANTIC GROUP 3: DIRECT SETTLEMENTS */}
          {shouldShowSection('settlements') && settlements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading">Direct Settle-up Payments</span>
                  <Chip status="paid" label={`${settlements.length} Transfers`} size="sm" />
                </div>
                <span className="type-secondary text-xs">Settled balances</span>
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
                    iconTile={<IconTile icon={<HandCoins className="w-5 h-5" />} color="teal" size="sm" />}
                    title={`₺${formatCurrency(s.amount)} paid directly`}
                    subtitle={`${fromUser?.name.split(' ')[0] || 'Roomie'} ➔ ${toUser?.name.split(' ')[0] || 'Roomie'} • ${formatExpenseDate(s.createdAt)}`}
                    detail={
                      <div className="flex items-center justify-between type-secondary">
                        <span>Direct Settle-up Transfer</span>
                        <span className="font-bold text-[#1F2430]">
                          {isMePayer ? 'You paid' : isMeReceiver ? 'Paid to you' : 'Roomie settlement'}
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

          {/* SEMANTIC GROUP 4: DISPUTED PURCHASES */}
          {shouldShowSection('disputed') && disputedExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading text-[#BF3337]">Disputed Purchases</span>
                  <Chip status="disputed" label={`${disputedExpenses.length} In Review`} size="sm" />
                </div>
                <span className="type-secondary text-xs">Discuss in house meeting</span>
              </div>

              {disputedExpenses.map((exp) => renderExpenseCard(exp, false))}
            </div>
          )}

          {/* EMPTY STATE IF FILTER HAS NO ITEMS */}
          {expenses.length === 0 && (
            <EmptyState
              title="No apartment expenses logged yet"
              description="Keep grocery receipts, utility bills, and shared items fair and transparent."
              mascotState="calm"
              bubbleText="No debt, all harmony!"
              actionLabel="Log First Expense"
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
                icon={<HandCoins className="w-6 h-6" />}
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
                      const isMe = d.fromUserId === currentUser.id;
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-2xl text-[14px] font-bold flex items-center justify-between border ${
                            isMe
                              ? 'bg-[#FFF0ED] text-[#D94E30] border-[#FFD7CF]'
                              : 'bg-white text-[#1F2430] border-[#E6E8EE]'
                          }`}
                        >
                          <span>
                            {isMe ? 'You owe' : `${fromUser?.name.split(' ')[0]} owes`}{' '}
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

                <p className="type-secondary pt-1 text-xs">
                  Settle up monthly to keep transactions fair with currency changes.
                </p>
              </div>
            }
            actions={
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setSettleModalOpen(true)}
                  icon={<HandCoins className="w-4 h-4" />}
                >
                  Settle Up
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setAddModalOpen(true)}
                  icon={<Plus className="w-4 h-4 text-[#FF6B4A]" />}
                >
                  Add Expense
                </Button>
              </div>
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
                  <h4 className="font-heading font-black text-lg text-[#1F2430]">
                    Spending by Category
                  </h4>
                  <p className="type-secondary text-xs">
                    Monthly breakdown & charts
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
    </div>
  );

  // Helper card renderer: Sleek, tactile, and compact without awkward bottom button bloat
  function renderExpenseCard(exp: Expense, showDirectActions: boolean) {
    const payer = roommates.find((r) => r.id === exp.paidBy);
    const { icon, color } = getCategoryDetails(exp.category);
    const myShare = exp.shares.find((s) => s.userId === currentUser.id);
    const isPayerMe = exp.paidBy === currentUser.id;
    const isAgreed = exp.status === 'agreed';
    const isDisputed = exp.status === 'disputed';
    const isPending = exp.status === 'pending';
    const needsMyAgreement = showDirectActions && myShare && myShare.response === 'pending';

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
            : needsMyAgreement
            ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#FCD34D] shadow-[0_4px_16px_rgba(255,201,60,0.12)] ring-1 ring-[#F59E0B]/30'
            : 'bg-white border-[#E6E8EE] hover:border-[#CBD5E1] hover:shadow-xs'
        }`}
      >
        {/* Main Header Row: Icon + Title + Meta on Left; Total Amount + Status Chip on Right */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
            <IconTile icon={icon} color={color} size="md" className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="type-section-heading truncate group-hover:text-[#FF6B4A] transition-colors">
                {exp.title}
              </h4>
              <p className="type-secondary mt-0.5 text-xs sm:text-sm">
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
              status={exp.status as any}
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

        {/* Divider & Metadata Bar: Split Details + Share Pill + Inline Actions */}
        <div className="mt-3.5 pt-3 border-t border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Left info: Split info & your contribution */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
            <span className="text-[#64748B]">
              {exp.shares.length} roomies sharing equally
            </span>
            <span className="text-[#CBD5E1] hidden sm:inline">•</span>
            {isPayerMe ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#EBF9F0] text-[#2CA358] font-bold">
                You paid full
              </span>
            ) : myShare ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#F0F4FF] text-[#4353C4] font-bold">
                Your share: ₺{formatCurrency(myShare.shareAmount)}
              </span>
            ) : null}
          </div>

          {/* Right Action / Hint: Direct Agree/Review if pending, or subtle "View details" prompt */}
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {needsMyAgreement ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    sound.playSuccess();
                    await onRespondExpense(exp.id, 'agreed');
                    showToast('Agreed to shared expense! 🤝', 'success');
                  }}
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Agree
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedExpense(exp);
                  }}
                >
                  Review
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSelectedExpense(exp);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#64748B] group-hover:text-[#1F2430] transition-colors cursor-pointer"
              >
                <span>Receipt & details</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
};
