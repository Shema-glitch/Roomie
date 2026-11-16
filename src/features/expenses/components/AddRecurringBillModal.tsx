import React, { useState } from 'react';
import {
  X,
  Buildings,
  WifiHigh,
  Lightning,
  Receipt,
  Plus,
} from '@phosphor-icons/react';
import { User, RecurringBillCategory, RecurringBillSplitRule, RecurringBill } from '../../../types';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';

export interface AddRecurringBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  roommates: User[];
  currentUser: User;
  currency?: string;
  onAddBill: (params: {
    householdId: string;
    title: string;
    category: RecurringBillCategory;
    amount: number;
    currency?: string;
    dueDay: number;
    splitRule?: RecurringBillSplitRule;
    paidByUserId: string;
  }) => Promise<RecurringBill>;
}

const CATEGORY_OPTIONS: { id: RecurringBillCategory; label: string; icon: typeof Buildings }[] = [
  { id: 'rent', label: 'Rent', icon: Buildings },
  { id: 'wifi', label: 'Wi-Fi', icon: WifiHigh },
  { id: 'utilities', label: 'Utilities', icon: Lightning },
  { id: 'other', label: 'Other', icon: Receipt },
];

export const AddRecurringBillModal: React.FC<AddRecurringBillModalProps> = ({
  isOpen,
  onClose,
  householdId,
  roommates,
  currentUser,
  currency = 'TRY',
  onAddBill,
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecurringBillCategory>('rent');
  const [amountStr, setAmountStr] = useState('');
  const [dueDay, setDueDay] = useState(1);
  const [paidByUserId, setPaidByUserId] = useState(currentUser.id);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      showToast('Please enter a bill title', 'error');
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return;
    }
    if (dueDay < 1 || dueDay > 31) {
      showToast('Due day must be between 1 and 31', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await onAddBill({
        householdId,
        title: cleanTitle,
        category,
        amount,
        currency,
        dueDay,
        splitRule: 'equal',
        paidByUserId,
      });
      sound.playSuccess();
      haptics.success();
      showToast('Recurring bill template saved!', 'success');
      onClose();
    } catch (err) {
      sound.playPop();
      haptics.warning();
      showToast(err instanceof Error ? err.message : 'Failed to save bill template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-recurring-bill-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
    >
      <div
        className="w-full max-w-lg bg-surface rounded-3xl p-6 shadow-card border border-border flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-scale-up"
        style={{ contain: 'content' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Buildings weight="duotone" className="w-6 h-6" />
            </div>
            <div>
              <h2 id="add-recurring-bill-title" className="type-h3 text-text-primary">
                Add Recurring Bill
              </h2>
              <p className="type-caption text-text-secondary">
                Set up recurring rent, Wi-Fi, or utility templates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            <X weight="bold" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Category Selector */}
          <div>
            <label className="type-label block text-text-secondary mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCategory(opt.id);
                      sound.playTap();
                    }}
                    className={`py-2 px-1 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold shadow-sm'
                        : 'border-border bg-surface-elevated/40 text-text-secondary hover:border-text-secondary/30'
                    }`}
                  >
                    <IconComponent weight={isSelected ? 'fill' : 'regular'} className="w-5 h-5" />
                    <span className="text-[12px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="bill-title" className="type-label block text-text-secondary mb-1.5">
              Bill Name
            </label>
            <input
              id="bill-title"
              type="text"
              maxLength={80}
              placeholder="e.g. Monthly Flat Rent, High-Speed Wi-Fi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary text-[14px]"
            />
          </div>

          {/* Amount & Due Day (2 columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bill-amount" className="type-label block text-text-secondary mb-1.5">
                Amount ({currency})
              </label>
              <input
                id="bill-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary text-[14px]"
              />
            </div>
            <div>
              <label htmlFor="bill-due-day" className="type-label block text-text-secondary mb-1.5">
                Due Day of Month
              </label>
              <input
                id="bill-due-day"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 1)}
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary text-[14px]"
              />
            </div>
          </div>

          {/* Paid By Selector */}
          <div>
            <label htmlFor="bill-paid-by" className="type-label block text-text-secondary mb-1.5">
              Who Pays This Upfront?
            </label>
            <select
              id="bill-paid-by"
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary focus:outline-none focus:border-brand-primary text-[14px]"
            >
              {roommates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.id === currentUser.id ? '(You)' : ''}
                </option>
              ))}
            </select>
            <span className="type-caption text-text-muted block mt-1">
              Split equally across all active flatmates when logged each month.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-2xl text-[14px] text-text-secondary hover:bg-surface-elevated font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-brand-primary text-white text-[14px] font-semibold hover:bg-brand-primary/90 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus weight="bold" className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
