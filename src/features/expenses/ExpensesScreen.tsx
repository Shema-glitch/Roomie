import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/common/Button';
import { AddExpenseFlowModal } from './AddExpenseFlowModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { SettleUpFlowModal } from './SettleUpFlowModal';
import { EditSplitModal } from './EditSplitModal';
import { DisputeReasonModal } from './DisputeReasonModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Expense, Settlement, User, ExpenseCategory, RecurringBill, RecurringBillCategory } from '../../types';
import { NetBalance, UserCalculationBreakdown } from '../../utils/balances';
import { getCurrencySymbol } from '../../utils/stateTable';
import { sound } from '../../services/sound';
import { api } from '../../services/api';
import { localCache } from '../../services/localCache';
import { PlusCircle, Bell } from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { ExpenseCard, ExpenseCardMode } from './components/ExpenseCard';
import { SettlementItemCard } from './components/SettlementItemCard';
import { BalanceOverviewSection } from './components/BalanceOverviewSection';
import { RecurringBillsSection } from './components/RecurringBillsSection';
import { useI18n } from '../../i18n/I18nProvider';

interface ExpensesScreenProps {
  expenses: Expense[];
  settlements: Settlement[];
  roommates: User[];
  currentUser: User;
  householdId?: string;
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
  householdId,
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
  const { t, isRtl } = useI18n();
  const sym = getCurrencySymbol(currency);

  const effectiveHouseholdId =
    householdId || expenses[0]?.householdId || api.store.activeHouseholdId || 'h_main';

  const [recurringBillsList, setRecurringBillsList] = useState<RecurringBill[]>(() => {
    return (
      localCache.getSnapshot(effectiveHouseholdId)?.recurringBills ||
      api.store.recurringBills?.[effectiveHouseholdId] ||
      []
    );
  });

  useEffect(() => {
    if (effectiveHouseholdId) {
      api.flatUtilities
        .getRecurringBills(effectiveHouseholdId)
        .then((bills) => {
          if (bills) setRecurringBillsList(bills);
        })
        .catch(() => {});
    }
  }, [effectiveHouseholdId]);

  const handleAddRecurringBill = async (params: {
    householdId: string;
    title: string;
    category: RecurringBillCategory;
    amount: number;
    currency?: string;
    dueDay: number;
    paidByUserId: string;
  }) => {
    const bill = await api.flatUtilities.addRecurringBill(params);
    setRecurringBillsList((prev) => [...prev.filter((b) => b.id !== bill.id), bill]);
    return bill;
  };

  const handleLogRecurringBill = async (billId: string) => {
    const createdExp = await api.flatUtilities.logRecurringBillExpense(billId);
    if (createdExp) {
      const updatedBills = await api.flatUtilities.getRecurringBills(effectiveHouseholdId);
      setRecurringBillsList(updatedBills);
    }
    return createdExp;
  };

  const handleDeleteRecurringBill = async (billId: string) => {
    const ok = await api.flatUtilities.deleteRecurringBill(billId);
    if (ok) {
      setRecurringBillsList((prev) => prev.filter((b) => b.id !== billId));
    }
    return ok;
  };

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

  const myDebtsToPay = useMemo(
    () =>
      balances.simplifiedDebts
        .filter((d) => d.fromUserId === currentUser.id)
        .map((d) => ({ toUserId: d.toUserId, amount: d.amount })),
    [balances.simplifiedDebts, currentUser.id]
  );

  const {
    needsMyAgreementExpenses,
    waitingForRoomiesExpenses,
    agreedExpenses,
    disputedExpenses,
  } = useMemo(() => {
    const needs: Expense[] = [];
    const waiting: Expense[] = [];
    const agreed: Expense[] = [];
    const disputed: Expense[] = [];

    for (const e of expenses) {
      if (e.status === 'cancelled') continue;
      if (e.status === 'agreed') {
        agreed.push(e);
        continue;
      }
      if (e.status === 'disputed') {
        disputed.push(e);
        continue;
      }
      const myShare = e.shares.find((s) => s.userId === currentUser.id);
      if (e.paidBy !== currentUser.id && myShare?.response === 'pending') {
        needs.push(e);
      } else if (e.paidBy === currentUser.id || myShare?.response === 'agreed') {
        waiting.push(e);
      }
    }

    return {
      needsMyAgreementExpenses: needs,
      waitingForRoomiesExpenses: waiting,
      agreedExpenses: agreed,
      disputedExpenses: disputed,
    };
  }, [expenses, currentUser.id]);

  const [expenseFilter, setExpenseFilter] = useState<'all' | 'pending' | 'agreed'>('all');
  const filterIndex = expenseFilter === 'all' ? 0 : expenseFilter === 'pending' ? 1 : 2;

  const renderCard = (exp: Expense, mode: ExpenseCardMode, idx = 0) => (
    <div
      key={exp.id}
      className="stagger-item"
      style={{ '--stagger-index': idx } as React.CSSProperties}
    >
      <ExpenseCard
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
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="type-title">{t('expenses.title')}</h2>
          <p className="type-secondary mt-0.5">
            {t('expenses.subtitle')}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="whitespace-nowrap shrink-0"
          onClick={() => {
            sound.playTap();
            setAddModalOpen(true);
          }}
          icon={<PlusCircle className="w-5 h-5" weight="fill" />}
        >
          {t('expenses.logExpense')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="w-full lg:col-span-7 space-y-6">
          <RecurringBillsSection
            bills={recurringBillsList}
            roommates={roommates}
            currentUser={currentUser}
            householdId={effectiveHouseholdId}
            currency={currency}
            onAddBill={handleAddRecurringBill}
            onLogBill={handleLogRecurringBill}
            onDeleteBill={handleDeleteRecurringBill}
          />

          {/* Sliding Segmented Filter Control */}
          <div className="relative grid grid-cols-3 p-1.5 rounded-2xl bg-[#E6E8EE]/70 max-w-md">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1.5 bottom-1.5 start-1.5 w-[calc(33.333%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-250 ease-spring will-change-transform motion-reduce:transition-none"
              style={{
                transform: `translate3d(${filterIndex * (isRtl ? -100 : 100)}%, 0, 0)`,
              }}
            />
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setExpenseFilter('all');
              }}
              className={`relative z-10 py-2 px-2 rounded-xl text-[13px] font-heading font-black whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                expenseFilter === 'all' ? 'text-[#1F2430]' : 'text-[#475569] hover:text-[#1F2430]'
              }`}
            >
              {t('expenses.filterAll', { count: expenses.length })}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setExpenseFilter('pending');
              }}
              className={`relative z-10 py-2 px-2 rounded-xl text-[13px] font-heading font-black whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                expenseFilter === 'pending' ? 'text-[#1F2430]' : 'text-[#475569] hover:text-[#1F2430]'
              }`}
            >
              {t('expenses.filterPending', {
                count: needsMyAgreementExpenses.length + waitingForRoomiesExpenses.length,
              })}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setExpenseFilter('agreed');
              }}
              className={`relative z-10 py-2 px-2 rounded-xl text-[13px] font-heading font-black whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                expenseFilter === 'agreed' ? 'text-[#1F2430]' : 'text-[#475569] hover:text-[#1F2430]'
              }`}
            >
              {t('expenses.filterAgreed', { count: agreedExpenses.length })}
            </button>
          </div>

          {expenseFilter !== 'agreed' && needsMyAgreementExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="type-section-heading text-[#FF6B4A]">
                  {t('expenses.needsAgreement', { count: needsMyAgreementExpenses.length })}
                </span>
                <span className="type-secondary text-[13px] sm:text-[14px]">
                  {t('expenses.agree')} / {t('expenses.dispute')}
                </span>
              </div>

              {needsMyAgreementExpenses.map((exp, idx) => renderCard(exp, 'needs-my-answer', idx))}
            </div>
          )}

          {expenseFilter !== 'agreed' && waitingForRoomiesExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="type-section-heading">
                  {t('expenses.waitingRoomies', { count: waitingForRoomiesExpenses.length })}
                </span>
                {waitingForRoomiesExpenses.some((e) => e.paidBy === currentUser.id) && (
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playTap();
                      if (onRemindRoomies) {
                        await onRemindRoomies('Please review and agree to shared purchases');
                        showToast('Sent gentle reminder to roomies!', 'info');
                      }
                    }}
                    className="text-[14px] font-bold text-[#FF6B4A] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Bell className="w-3.5 h-3.5" /> {t('expenses.remind')}
                  </button>
                )}
              </div>

              {waitingForRoomiesExpenses.map((exp, idx) => renderCard(exp, 'waiting-roomies', idx))}
            </div>
          )}

          {expenses.length > 0 && expenseFilter !== 'pending' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
              <span className="type-section-heading">
                {t('expenses.agreedSection', { count: agreedExpenses.length })}
              </span>
            </div>

            {agreedExpenses.length === 0 ? (
              <p className="px-4 py-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-xs font-medium text-[#64748B]">
                {t('expenses.agreedEmptyNote')}
              </p>
            ) : (
              agreedExpenses.map((exp, idx) => renderCard(exp, 'agreed', idx))
            )}
          </div>
          )}

          {settlements.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
                <span className="type-section-heading">
                  Direct settlements ({settlements.length})
                </span>
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
                <span className="type-section-heading text-[#BF3337]">
                  Disputed purchases ({disputedExpenses.length})
                </span>
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
