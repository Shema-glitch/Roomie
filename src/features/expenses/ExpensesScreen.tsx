import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { AddExpenseFlowModal } from './AddExpenseFlowModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { SettleUpFlowModal } from './SettleUpFlowModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Expense, Settlement, User, ExpenseCategory } from '../../types';
import { NetBalance } from '../../utils/balances';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import {
  Plus,
  ArrowRight,
  HandCoins,
  Receipt,
  ShoppingCart,
  Zap,
  Home,
  MoreHorizontal,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

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
  const [filter, setFilter] = useState<'all' | 'mine' | 'disputed'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);

  // My net balance
  const myNet = balances.userSummaries[currentUser.id] || 0;

  // Debts current user owes to others
  const myDebtsToPay = balances.simplifiedDebts
    .filter((d) => d.fromUserId === currentUser.id)
    .map((d) => ({ toUserId: d.toUserId, amount: d.amount }));

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    if (filter === 'mine') {
      return e.paidBy === currentUser.id || e.shares.some((s) => s.userId === currentUser.id);
    }
    if (filter === 'disputed') {
      return e.status === 'disputed';
    }
    return true;
  });

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'groceries':
        return <ShoppingCart className="w-4 h-4 text-[#FF6B4A]" />;
      case 'utilities':
        return <Zap className="w-4 h-4 text-[#19B5A5]" />;
      case 'household':
        return <Home className="w-4 h-4 text-[#5B5BD6]" />;
      case 'other':
      default:
        return <Receipt className="w-4 h-4 text-[#6B7280]" />;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. BALANCES OVERVIEW (Calm Style as specified) */}
      <Card
        padding="lg"
        variant="calm"
        className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B7280]">
              Your Apartment Balance
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`text-3xl font-heading font-black ${
                  myNet > 0.5
                    ? 'text-[#3DBE6D]'
                    : myNet < -0.5
                    ? 'text-[#FF6B4A]'
                    : 'text-[#1F2430]'
                }`}
              >
                {myNet > 0.5 ? `+₺${myNet.toFixed(2)}` : myNet < -0.5 ? `-₺${Math.abs(myNet).toFixed(2)}` : '₺0.00'}
              </span>
              <span className="text-xs text-[#6B7280] font-semibold">
                {myNet > 0.5
                  ? 'you are owed'
                  : myNet < -0.5
                  ? 'you owe roommates'
                  : 'all settled up'}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettleModalOpen(true)}
            icon={<HandCoins className="w-4 h-4 text-[#19B5A5]" />}
          >
            Settle Up
          </Button>
        </div>

        {/* Simplified debts explanation */}
        {balances.simplifiedDebts.length > 0 ? (
          <div className="pt-2 border-t border-[#E6E8EE] space-y-2">
            <span className="text-[11px] font-bold text-[#6B7280] block">
              Direct Payments Summary:
            </span>
            <div className="space-y-1.5">
              {balances.simplifiedDebts.map((d, i) => {
                const fromUser = roommates.find((r) => r.id === d.fromUserId);
                const toUser = roommates.find((r) => r.id === d.toUserId);
                const isMe = d.fromUserId === currentUser.id;
                return (
                  <div
                    key={i}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      isMe
                        ? 'bg-[#FFF0ED] text-[#D94E30] font-bold border border-[#FFD7CF]'
                        : 'bg-[#F7F8FB] text-[#1F2430] border border-[#E6E8EE]'
                    }`}
                  >
                    <span>
                      {isMe ? 'You owe' : `${fromUser?.name.split(' ')[0]} owes`}{' '}
                      {toUser?.id === currentUser.id ? 'You' : toUser?.name.split(' ')[0]}
                    </span>
                    <span>₺{d.amount.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#3DBE6D] font-bold flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-4 h-4" /> All apartment expenses are fully settled!
          </p>
        )}

        {/* Currency reminder for TRNC */}
        <div className="text-[11px] text-[#6B7280] bg-[#F7F8FB] p-2.5 rounded-xl border border-[#E6E8EE] flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#5B5BD6] shrink-0 mt-0.5" />
          <span>
            <strong>TRNC note:</strong> Due to Turkish Lira inflation, settle up monthly to keep transactions fair.
          </span>
        </div>
      </Card>

      {/* 2. EXPENSES LIST HEADER & FILTERS */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-base text-[#1F2430]">
            Shared Expenses
          </h3>
          <p className="text-xs text-[#6B7280]">
            Tap any expense to see receipt and split
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAddModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Expense
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5">
        {[
          { id: 'all', label: 'All' },
          { id: 'mine', label: 'My Shares' },
          { id: 'disputed', label: 'Disputes' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => {
              sound.playTap();
              setFilter(f.id as any);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === f.id
                ? 'bg-[#1F2430] text-white'
                : 'bg-white text-[#6B7280] border border-[#E6E8EE]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Expense Items */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <EmptyState
            title="No expenses found"
            description={
              filter === 'disputed'
                ? 'No active disputes! All shared purchases are agreed upon.'
                : 'No expenses logged in this view. Share groceries or bills with flatmates.'
            }
            mascotState="calm"
            bubbleText="All peaceful!"
            actionLabel={filter === 'disputed' ? undefined : 'Log an Expense'}
            onAction={() => setAddModalOpen(true)}
          />
        ) : (
          filteredExpenses.map((exp) => {
            const payer = roommates.find((r) => r.id === exp.paidBy);
            const myShare = exp.shares.find((s) => s.userId === currentUser.id);

            return (
              <Card
                key={exp.id}
                padding="md"
                interactive
                onClick={() => {
                  sound.playTap();
                  setSelectedExpense(exp);
                }}
                className="bg-white flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-center shrink-0">
                    {getCategoryIcon(exp.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-sm text-[#1F2430] truncate">
                      {exp.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-0.5">
                      <span>Paid by {payer?.name.split(' ')[0] || 'Roomie'}</span>
                      <span>•</span>
                      <span>{exp.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-heading font-black text-sm text-[#1F2430]">
                    ₺{exp.amount.toFixed(2)}
                  </div>
                  <div className="mt-0.5">
                    <Chip
                      label={
                        exp.status === 'disputed'
                          ? 'Disputed'
                          : exp.status === 'agreed'
                          ? 'Agreed'
                          : 'Pending'
                      }
                      variant={
                        exp.status === 'agreed'
                          ? 'success'
                          : exp.status === 'disputed'
                          ? 'danger'
                          : 'reward'
                      }
                      size="sm"
                    />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Sub-modals */}
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
        pendingSettlements={settlements}
        debtsToPay={myDebtsToPay}
        onMarkPaid={onMarkPaid}
        onConfirmSettlement={onConfirmSettlement}
      />
    </div>
  );
};
