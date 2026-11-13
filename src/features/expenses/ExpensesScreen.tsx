import React, { useState, useEffect } from 'react';
import { InfoCard } from '../../components/common/InfoCard';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { AddExpenseFlowModal } from './AddExpenseFlowModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { SettleUpFlowModal } from './SettleUpFlowModal';
import { EditSplitModal } from './EditSplitModal';
import { DisputeReasonModal } from './DisputeReasonModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Expense, Settlement, User, ExpenseCategory } from '../../types';
import { NetBalance, UserCalculationBreakdown } from '../../utils/balances';
import { getCurrencySymbol } from '../../utils/stateTable';
import { sound } from '../../services/sound';
import { Plus, Bell } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { ExpenseCard, ExpenseCardMode } from './components/ExpenseCard';
import { SettlementItemCard } from './components/SettlementItemCard';
import { BalanceOverviewSection } from './components/BalanceOverviewSection';

interface ExpensesScreenProps {
  expenses: Expense[];
  settlements: Settlement[];
  roommates: User[];
  currentUser: User;
  currency?: string;
  initialExpenseId?: string | null;
  onClearInitialExpense?: () => void;
  initialAction?: 'add' | 'settle' | 'confirm' | null;
  onClearInitialAction?: () => void;
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
  onEditSplit?: (
    expenseId: string,
    shares: { userId: string; shareAmount: number }[]
  ) => Promise<Expense>;
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
  currency = 'TRY',
  initialExpenseId,
  onClearInitialExpense,
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
  const sym = getCurrencySymbol(currency);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [cardDisputeTarget, setCardDisputeTarget] = useState<Expense | null>(null);
  const [editSplitTarget, setEditSplitTarget] = useState<Expense | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);

  useEffect(() => {
    if (!initialExpenseId) return;
    const found = expenses.find((e) => e.id === initialExpenseId);
    if (found) {
      setSelectedExpense(found);
      onClearInitialExpense?.();
    }
  }, [initialExpenseId, expenses, onClearInitialExpense]);

  const myNet = balances.userSummaries[currentUser.id] || 0;

  const myDebtsToPay = balances.simplifiedDebts
    .filter((d) => d.fromUserId === currentUser.id)
    .map((d) => ({ toUserId: d.toUserId, amount: d.amount }));

  const needsMyAgreementExpenses = expenses.filter((e) => {
    if (e.status === 'cancelled' || e.status === 'disputed' || e.status === 'agreed') return false;
    const myShare = e.shares.find((s) => s.userId === currentUser.id);
    return e.paidBy !== currentUser.id && myShare?.response === 'pending';
  });

  const waitingForRoomiesExpenses = expenses.filter((e) => {
    if (e.status === 'cancelled' || e.status === 'disputed' || e.status === 'agreed') return false;
    const myShare = e.shares.find((s) => s.userId === currentUser.id);
    if (e.paidBy === currentUser.id) return true;
    return myShare?.response === 'agreed';
  });

  const agreedExpenses = expenses.filter((e) => e.status === 'agreed');
  const disputedExpenses = expenses.filter((e) => e.status === 'disputed');

  const renderCard = (exp: Expense, mode: ExpenseCardMode) => (
    <ExpenseCard
      key={exp.id}
      expense={exp}
      mode={mode}
      roommates={roommates}
      currentUser={currentUser}
      currencySymbol={sym}
      onSelect={setSelectedExpense}
      onRespondExpense={onRespondExpense}
      onSelectDisputeTarget={setCardDisputeTarget}
      onSelectEditSplitTarget={setEditSplitTarget}
      onOpenChat={onOpenChat}
      onCancelExpense={onCancelExpense}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="type-title">Expenses & money</h2>
          <p className="type-secondary mt-0.5">
            Fair shared flat ledger with consent-first splits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              sound.playTap();
              setAddModalOpen(true);
            }}
            icon={<Plus className="w-5 h-5" />}
          >
            Log expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="w-full lg:col-span-7 space-y-6">
          {needsMyAgreementExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="type-section-heading text-[#FF6B4A]">Needs your agreement</span>
                  <Chip
                    status="pending"
                    label={`${needsMyAgreementExpenses.length} Action Required`}
                    size="xs"
                  />
                </div>
                <span className="type-secondary text-[13px] sm:text-[14px]">
                  Tap to review or dispute
                </span>
              </div>

              {needsMyAgreementExpenses.map((exp) => renderCard(exp, 'needs-my-answer'))}
            </div>
          )}

          {waitingForRoomiesExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="type-section-heading">Waiting for roomies</span>
                  <Chip
                    status="pending"
                    label={`${waitingForRoomiesExpenses.length} Pending`}
                    size="xs"
                  />
                </div>
                {waitingForRoomiesExpenses.some((e) => e.paidBy === currentUser.id) && (
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playTap();
                      if (onRemindRoomies) {
                        await onRemindRoomies('Please review and agree to shared purchases 🙏');
                        showToast('Sent gentle reminder to roomies!', 'info');
                      }
                    }}
                    className="text-[14px] font-bold text-[#FF6B4A] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Bell className="w-3.5 h-3.5" /> Remind all
                  </button>
                )}
              </div>

              {waitingForRoomiesExpenses.map((exp) => renderCard(exp, 'waiting-roomies'))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="type-section-heading">Agreed purchases</span>
                <Chip status="agreed" label={`${agreedExpenses.length} Confirmed`} size="xs" />
              </div>
              <span className="type-secondary text-[13px] sm:text-[14px]">
                Counted in final balance
              </span>
            </div>

            {agreedExpenses.length === 0 ? (
              <InfoCard padding="md" className="text-center type-secondary bg-white">
                No agreed expenses yet. When all roomies agree, purchases appear here.
              </InfoCard>
            ) : (
              agreedExpenses.map((exp) => renderCard(exp, 'agreed'))
            )}
          </div>

          {settlements.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="type-section-heading">Direct settlements</span>
                  <Chip status="agreed" label={`${settlements.length} Transfers`} size="xs" />
                </div>
                <span className="type-secondary text-[13px] sm:text-[14px]">
                  Cash or bank transfers
                </span>
              </div>

              {settlements.map((s) => (
                <SettlementItemCard
                  key={s.id}
                  settlement={s}
                  roommates={roommates}
                  currentUser={currentUser}
                  currencySymbol={sym}
                  onConfirmSettlement={onConfirmSettlement}
                />
              ))}
            </div>
          )}

          {disputedExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="type-section-heading text-[#BF3337]">Disputed purchases</span>
                  <Chip status="disputed" label={`${disputedExpenses.length} In Review`} size="xs" />
                </div>
                <span className="type-secondary text-[13px] sm:text-[14px]">
                  Discuss in house meeting
                </span>
              </div>

              {disputedExpenses.map((exp) => renderCard(exp, 'disputed'))}
            </div>
          )}

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

        <div className="w-full lg:col-span-5 self-start h-fit mt-6 lg:mt-0 lg:sticky lg:top-0">
          <BalanceOverviewSection
            myNet={myNet}
            balances={balances}
            roommates={roommates}
            currentUser={currentUser}
            currencySymbol={sym}
            expenses={expenses}
            agreedExpenses={agreedExpenses}
            onRemindRoomies={onRemindRoomies}
            onOpenSettleModal={() => setSettleModalOpen(true)}
          />
        </div>
      </div>

      <AddExpenseFlowModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        roommates={roommates}
        currentUser={currentUser}
        currency={currency}
        onAddExpense={onAddExpense}
      />

      <ExpenseDetailModal
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        roommates={roommates}
        currentUser={currentUser}
        currency={currency}
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
        currency={currency}
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
          currency={currency}
          onSaveSplit={async (expenseId, adjustedShares) => {
            if (onEditSplit) {
              await onEditSplit(expenseId, adjustedShares);
              showToast('Split updated and resolved!', 'success');
            }
            setEditSplitTarget(null);
          }}
        />
      )}

      {cardDisputeTarget && (
        <DisputeReasonModal
          isOpen={Boolean(cardDisputeTarget)}
          onClose={() => setCardDisputeTarget(null)}
          expenseTitle={cardDisputeTarget.title}
          onSubmitDispute={async (reason) => {
            await onRespondExpense(cardDisputeTarget.id, 'disputed', reason);
            showToast('Expense marked as disputed', 'info');
            setCardDisputeTarget(null);
          }}
        />
      )}
    </div>
  );
};
