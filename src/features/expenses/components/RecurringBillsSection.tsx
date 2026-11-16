import React, { useState } from 'react';
import {
  Buildings,
  WifiHigh,
  Lightning,
  Receipt,
  Plus,
  CheckCircle,
  CalendarCheck,
  Trash,
} from '@phosphor-icons/react';
import { RecurringBill, User, RecurringBillCategory, Expense } from '../../../types';
import { getCurrencySymbol } from '../../../utils/stateTable';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';
import { AddRecurringBillModal } from './AddRecurringBillModal';

export interface RecurringBillsSectionProps {
  bills: RecurringBill[];
  roommates: User[];
  currentUser: User;
  householdId: string;
  currency?: string;
  onAddBill: (params: {
    householdId: string;
    title: string;
    category: RecurringBillCategory;
    amount: number;
    currency?: string;
    dueDay: number;
    paidByUserId: string;
  }) => Promise<RecurringBill>;
  onLogBill: (billId: string) => Promise<Expense | null>;
  onDeleteBill?: (billId: string) => Promise<boolean>;
}

function getCategoryIcon(cat: RecurringBillCategory) {
  switch (cat) {
    case 'rent':
      return Buildings;
    case 'wifi':
      return WifiHigh;
    case 'utilities':
      return Lightning;
    case 'other':
    default:
      return Receipt;
  }
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export const RecurringBillsSection: React.FC<RecurringBillsSectionProps> = ({
  bills,
  roommates,
  currentUser,
  householdId,
  currency = 'TRY',
  onAddBill,
  onLogBill,
  onDeleteBill,
}) => {
  const { showToast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const sym = getCurrencySymbol(currency);
  const now = new Date();
  const currentCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleString('default', { month: 'short' });

  const handleLogClick = async (bill: RecurringBill) => {
    try {
      setLoggingId(bill.id);
      sound.playSuccess();
      haptics.success();
      const exp = await onLogBill(bill.id);
      if (exp) {
        showToast(`${bill.title} logged as an expense for ${monthName}!`, 'success');
      }
    } catch (err) {
      sound.playPop();
      haptics.warning();
      showToast(err instanceof Error ? err.message : 'Failed to log bill', 'error');
    } finally {
      setLoggingId(null);
    }
  };

  const activeBills = bills.filter((b) => !b.deletedAt && b.active);

  return (
    <div className="bg-surface rounded-3xl p-5 border border-border shadow-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <CalendarCheck weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="type-h3 text-text-primary text-[16px]">Recurring Rent & Bills</h3>
            <p className="type-caption text-text-secondary">
              Monthly flat expenses with 1-tap split logging
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-brand-primary/10 text-brand-primary font-semibold text-[13px] hover:bg-brand-primary/20 active:scale-95 transition-all"
        >
          <Plus weight="bold" className="w-4 h-4" />
          <span>Add Template</span>
        </button>
      </div>

      {activeBills.length === 0 ? (
        <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/60 text-center">
          <p className="type-caption text-text-secondary">
            No recurring bills set up yet. Add templates for monthly rent, fiber Wi-Fi, or electricity.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeBills.map((bill) => {
            const IconComponent = getCategoryIcon(bill.category);
            const payer = roommates.find((r) => r.id === bill.paidByUserId) || currentUser;
            const isLoggedThisMonth = bill.lastGeneratedCycle === currentCycle;
            const isLogging = loggingId === bill.id;
            const memberCount = Math.max(1, roommates.length);
            const perPersonShare = Math.round((bill.amount / memberCount) * 100) / 100;

            return (
              <div
                key={bill.id}
                className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/80 flex flex-col justify-between gap-3 hover:border-brand-primary/30 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-surface border border-border/80 flex items-center justify-center text-text-primary">
                        <IconComponent weight="duotone" className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="type-body font-semibold text-text-primary text-[14px] line-clamp-1">
                          {bill.title}
                        </h4>
                        <span className="type-caption text-text-muted">
                          Due {getOrdinalSuffix(bill.dueDay)} of month
                        </span>
                      </div>
                    </div>

                    {onDeleteBill && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove ${bill.title} template?`)) {
                            onDeleteBill(bill.id);
                          }
                        }}
                        aria-label={`Delete ${bill.title}`}
                        className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash weight="regular" className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-[18px] font-bold text-text-primary">
                        {sym}
                        {bill.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="type-caption text-text-muted ml-1">/ mo</span>
                    </div>
                    <span className="type-caption text-text-secondary bg-surface px-2 py-0.5 rounded-full border border-border/60">
                      {sym}
                      {perPersonShare.toFixed(2)}/ea
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[12px] text-text-muted">
                    <span>Paid upfront by:</span>
                    <span className="font-medium text-text-secondary">
                      {payer.name} {payer.id === currentUser.id ? '(You)' : ''}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  {isLoggedThisMonth ? (
                    <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-green-500/10 text-green-600 font-semibold text-[13px]">
                      <CheckCircle weight="fill" className="w-4 h-4" />
                      <span>Logged for {monthName}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLogClick(bill)}
                      disabled={isLogging}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-brand-primary text-white font-semibold text-[13px] hover:bg-brand-primary/90 active:scale-95 transition-all shadow-sm"
                    >
                      <Plus weight="bold" className="w-4 h-4" />
                      <span>{isLogging ? 'Logging...' : `Log for ${monthName}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addModalOpen && (
        <AddRecurringBillModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          householdId={householdId}
          roommates={roommates}
          currentUser={currentUser}
          currency={currency}
          onAddBill={onAddBill}
        />
      )}
    </div>
  );
};
