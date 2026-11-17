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
    <div className="bg-white rounded-[24px] p-5 border-2 border-[#E5E9F0] shadow-xs mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[#FFF0ED] flex items-center justify-center text-[#FF6B4A] shrink-0">
            <CalendarCheck weight="duotone" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-black text-[#1F2430] text-[16px]">Recurring Rent &amp; Bills</h3>
            <p className="type-caption text-[#64748B]">
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#FFF0ED] text-[#FF6B4A] font-bold text-[13px] hover:bg-[#FFE4DD] active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus weight="bold" className="w-4 h-4" />
          <span>Add Template</span>
        </button>
      </div>

      {activeBills.length === 0 ? (
        <div className="p-4 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-center">
          <p className="type-caption text-[#64748B]">
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
                className="p-4 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex flex-col justify-between gap-3 hover:border-[#FF6B4A]/40 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#E6E8EE] flex items-center justify-center text-[#1F2430] shrink-0">
                        <IconComponent weight="duotone" className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="type-body font-semibold text-[#1F2430] text-[14px] line-clamp-1">
                          {bill.title}
                        </h4>
                        <span className="type-caption text-[#64748B]">
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
                      <span className="text-[18px] font-bold text-[#1F2430]">
                        {sym}
                        {bill.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="type-caption text-[#64748B] ml-1">/ mo</span>
                    </div>
                    <span className="type-caption text-[#64748B] bg-white px-2 py-0.5 rounded-full border border-[#E6E8EE]">
                      {sym}
                      {perPersonShare.toFixed(2)}/ea
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#64748B]">
                    <span>Paid upfront by:</span>
                    <span className="font-semibold text-[#475569]">
                      {payer.name} {payer.id === currentUser.id ? '(You)' : ''}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E6E8EE]">
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
