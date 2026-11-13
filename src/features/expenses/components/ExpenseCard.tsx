import React, { useState } from 'react';
import { IconTile, IconTileColor } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { Expense, User, ExpenseCategory } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import {
  ShoppingCart,
  Buildings,
  Lightning,
  House,
  Receipt,
  ShieldWarning,
  CheckCircle,
  XCircle,
  GitFork,
  ChatCircleDots,
  CaretRight,
} from '@phosphor-icons/react';

export const formatExpenseDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(m, 10) - 1] || m;
  return `${parseInt(d, 10)} ${monthName}`;
};

export const formatCurrency = (amount: number | undefined | null): string => {
  return (amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getCategoryDetails = (
  cat: ExpenseCategory
): { icon: React.ReactNode; color: IconTileColor } => {
  switch (cat) {
    case 'groceries':
      return { icon: <ShoppingCart className="w-6 h-6" />, color: 'amber' };
    case 'rent':
      return { icon: <Buildings className="w-6 h-6" />, color: 'coral' };
    case 'utilities':
      return { icon: <Lightning className="w-6 h-6" />, color: 'teal' };
    case 'household':
      return { icon: <House className="w-6 h-6" />, color: 'indigo' };
    case 'other':
    default:
      return { icon: <Receipt className="w-6 h-6" />, color: 'slate' };
  }
};

export type ExpenseCardMode = 'needs-my-answer' | 'waiting-roomies' | 'agreed' | 'disputed';

interface ExpenseCardProps {
  expense: Expense;
  mode: ExpenseCardMode;
  roommates: User[];
  currentUser: User;
  currencySymbol: string;
  onSelect: (expense: Expense) => void;
  onRespondExpense: (
    expenseId: string,
    response: 'agreed' | 'disputed',
    reason?: string
  ) => Promise<void>;
  onSelectDisputeTarget: (expense: Expense) => void;
  onSelectEditSplitTarget: (expense: Expense) => void;
  onOpenChat: () => void;
  onCancelExpense?: (expenseId: string) => Promise<void>;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = React.memo(({
  expense: exp,
  mode,
  roommates,
  currentUser,
  currencySymbol: sym,
  onSelect,
  onRespondExpense,
  onSelectDisputeTarget,
  onSelectEditSplitTarget,
  onOpenChat,
  onCancelExpense,
}) => {
  const { showToast } = useToast();
  const [agreeing, setAgreeing] = useState(false);
  const [optimisticAgreed, setOptimisticAgreed] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const payer = roommates.find((r) => r.id === exp.paidBy);
  const { icon, color } = getCategoryDetails(exp.category);
  const myShare = exp.shares.find((s) => s.userId === currentUser.id);
  const isPayerMe = exp.paidBy === currentUser.id;
  const isDisputed = exp.status === 'disputed' || mode === 'disputed';
  const isNeedsMyAnswer =
    mode === 'needs-my-answer' && myShare?.response === 'pending' && !optimisticAgreed;
  const isWaitingRoomies = mode === 'waiting-roomies' || optimisticAgreed;

  const pendingRoomies = exp.shares
    .filter((s) => s.response === 'pending' && !(optimisticAgreed && s.userId === currentUser.id))
    .map((s) => {
      const u = roommates.find((r) => r.id === s.userId);
      return u?.id === currentUser.id ? 'You' : u?.name.split(' ')[0] || 'Roomie';
    });

  const handleAgree = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agreeing) return;
    setAgreeing(true);
    setOptimisticAgreed(true);
    sound.playSuccess();
    try {
      await onRespondExpense(exp.id, 'agreed');
      showToast('Agreed to shared expense!', 'success');
    } catch {
      setOptimisticAgreed(false);
      showToast('Could not agree to expense. Please try again.', 'error');
    } finally {
      setAgreeing(false);
    }
  };

  return (
    <div
      onClick={() => {
        sound.playTap();
        onSelect(exp);
      }}
      className={`group p-4 sm:p-5 rounded-[24px] border-2 border-b-4 transition-[transform,opacity,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-[2px] motion-reduce:transition-none motion-reduce:transform-none cursor-pointer select-none ${
        isDisputed
          ? 'bg-[#FFF5F2] border-[#FFD3C9] hover:border-[#FFB7A7] shadow-[0_4px_16px_rgba(255,107,74,0.06)]'
          : isNeedsMyAnswer
          ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#FCD34D] shadow-[0_4px_16px_rgba(255,201,60,0.10)] ring-1 ring-[#F59E0B]/30'
          : 'bg-white border-[#E6E8EE] hover:border-[#CBD5E1] hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
          <IconTile icon={icon} color={color} size="md" className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="type-card-title truncate group-hover:text-[#FF6B4A] transition-colors duration-150">
              {exp.title}
            </h4>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Paid by {isPayerMe ? 'You' : payer?.name.split(' ')[0] || 'Roomie'} ·{' '}
              {formatExpenseDate(exp.date)} · <span className="capitalize">{exp.category}</span>
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className="font-heading font-semibold text-lg sm:text-xl text-[#1F2430] whitespace-nowrap">
            {sym}
            {formatCurrency(exp.amount)}
          </span>
          <Chip
            status={
              exp.status === 'agreed' || (optimisticAgreed && pendingRoomies.length === 0)
                ? 'agreed'
                : exp.status === 'disputed'
                ? 'disputed'
                : 'pending'
            }
            label={
              exp.status === 'agreed' || (optimisticAgreed && pendingRoomies.length === 0)
                ? 'Agreed'
                : exp.status === 'disputed'
                ? 'Disputed'
                : 'Pending'
            }
            size="xs"
          />
        </div>
      </div>

      {isDisputed && exp.disputeReason && (
        <div className="mt-3 p-2.5 rounded-xl bg-[#FFF0ED] border border-[#FFD7CF] text-[14px] text-[#BF3337] flex items-center gap-2">
          <ShieldWarning className="w-4 h-4 shrink-0 text-[#E5484D]" />
          <span>
            <strong>Dispute Note:</strong> {exp.disputeReason}
          </span>
        </div>
      )}

      <div className="mt-3.5 pt-3 border-t border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap text-[13px] text-[#64748B]">
          <span>{exp.shares.length} roomies</span>
          <span aria-hidden="true">·</span>
          {isPayerMe ? (
            <span className="font-medium text-[#2CA358]">You paid full</span>
          ) : myShare ? (
            <span className="font-medium text-[#1F2430]">
              Your share: {sym}
              {formatCurrency(myShare.shareAmount)}
            </span>
          ) : null}

          {isWaitingRoomies && pendingRoomies.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>Waiting for {pendingRoomies.join(', ')}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {isNeedsMyAnswer ? (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={agreeing}
                onClick={handleAgree}
                icon={<CheckCircle className="w-3.5 h-3.5" weight="fill" />}
              >
                {agreeing ? 'Agreeing...' : 'Agree'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={agreeing}
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playTap();
                  onSelectDisputeTarget(exp);
                }}
                icon={<XCircle className="w-3.5 h-3.5 text-[#E5484D]" />}
              >
                Dispute
              </Button>
            </div>
          ) : isDisputed ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playTap();
                  onSelectEditSplitTarget(exp);
                }}
                icon={<GitFork className="w-3.5 h-3.5" />}
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
                icon={<ChatCircleDots className="w-3.5 h-3.5" />}
              >
                Discuss in chat
              </Button>
              <button
                type="button"
                disabled={cancelling}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (cancelling || !onCancelExpense) return;
                  sound.playTap();
                  setCancelling(true);
                  try {
                    await onCancelExpense(exp.id);
                    showToast('Expense cancelled by mutual agreement', 'info');
                  } catch {
                    showToast('Could not cancel expense', 'error');
                  } finally {
                    setCancelling(false);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl border border-[#FFD7CF] bg-[#FFF0ED] text-[#E5484D] text-[14px] font-bold hover:bg-[#FFE5E0] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onSelect(exp);
              }}
              className="inline-flex items-center gap-1 text-[14px] font-bold text-[#475569] hover:text-[#1F2430] transition-colors duration-150 cursor-pointer"
            >
              <span>Receipt and details</span>
              <CaretRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform duration-150" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
ExpenseCard.displayName = 'ExpenseCard';
