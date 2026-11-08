import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Expense, User } from '../../types';
import { sound } from '../../services/sound';
import { useToast } from '../../components/common/Toast';
import { CheckCircle2, Split, RotateCcw } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/stateTable';

interface EditSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  roommates: User[];
  currency?: string;
  onSaveSplit: (
    expenseId: string,
    adjustedShares: { userId: string; shareAmount: number }[]
  ) => Promise<void>;
}

export const EditSplitModal: React.FC<EditSplitModalProps> = ({
  isOpen,
  onClose,
  expense,
  roommates,
  currency = 'TRY',
  onSaveSplit,
}) => {
  const { showToast } = useToast();
  if (!expense) return null;

  const sym = getCurrencySymbol(currency);

  // Initialize shares
  const [shares, setShares] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    expense.shares.forEach((s) => {
      init[s.userId] = s.shareAmount;
    });
    return init;
  });

  const [saving, setSaving] = useState(false);

  const totalAllocated = Object.values(shares).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const diff = Math.round((expense.amount - totalAllocated) * 100) / 100;
  const isBalanced = Math.abs(diff) <= 0.05;

  const disputedShare = expense.shares.find((s) => s.response === 'disputed' || Boolean(s.disputeReason));
  const disputingUser = disputedShare ? roommates.find((r) => r.id === disputedShare.userId) : null;

  const handleShareChange = (userId: string, val: number) => {
    setShares((prev) => ({
      ...prev,
      [userId]: Math.max(0, val),
    }));
  };

  const handleExcludeDisputingUser = () => {
    sound.playTap();
    if (!disputingUser) return;
    const remaining = expense.shares.filter((s) => s.userId !== disputingUser.id);
    if (remaining.length === 0) return;
    const splitAmount = Math.round((expense.amount / remaining.length) * 100) / 100;
    const newShares: Record<string, number> = {};
    expense.shares.forEach((s) => {
      if (s.userId === disputingUser.id) {
        newShares[s.userId] = 0;
      } else {
        newShares[s.userId] = splitAmount;
      }
    });
    setShares(newShares);
    showToast(`Excluded ${disputingUser.name.split(' ')[0]}. Split rebalanced among remaining flatmates!`, 'info');
  };

  const handleEqualSplit = () => {
    sound.playTap();
    const count = expense.shares.length;
    if (count === 0) return;
    const splitAmount = Math.round((expense.amount / count) * 100) / 100;
    const newShares: Record<string, number> = {};
    expense.shares.forEach((s) => {
      newShares[s.userId] = splitAmount;
    });
    setShares(newShares);
    showToast(`Split equally among all ${count} flatmates.`, 'info');
  };

  const handleSave = async () => {
    if (!isBalanced) {
      showToast(`Total shares must equal ${sym}${expense.amount.toFixed(2)} (Diff: ${sym}${diff.toFixed(2)})`, 'error');
      return;
    }
    setSaving(true);
    sound.playSuccess();
    try {
      const adjusted = Object.entries(shares).map(([userId, shareAmount]) => ({
        userId,
        shareAmount,
      }));
      await onSaveSplit(expense.id, adjusted);
      showToast('Split updated and dispute resolved! 🤝', 'success');
      onClose();
    } catch {
      showToast('Could not save adjusted split', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust expense split" maxWidth="lg">
      <div className="space-y-4">
        {/* Banner about the dispute */}
        <div className="p-3.5 rounded-2xl bg-[#FFF5F2] border border-[#FFD3C9] text-[14px] text-[#E5484D]">
          <p className="font-bold text-[14px] text-[#1F2430] mb-0.5">{expense.title}</p>
          <p className="text-[#475569]">Total Amount: <span className="font-bold text-[#1F2430]">{sym}{expense.amount.toFixed(2)}</span></p>
          {expense.shares.some((s) => s.disputeReason) && (
            <p className="mt-1 font-semibold italic text-[#BF3337]">
              Dispute note: "{expense.shares.find((s) => s.disputeReason)?.disputeReason}"
            </p>
          )}
        </div>

        {/* Quick presets */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="type-label">Participant Shares</span>
          <div className="flex items-center gap-3">
            {disputingUser && (
              <button
                type="button"
                onClick={handleExcludeDisputingUser}
                className="text-[13px] font-bold text-[#5B5BD6] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Split className="w-3.5 h-3.5" />
                Exclude {disputingUser.name.split(' ')[0]} ({sym}0)
              </button>
            )}
            <button
              type="button"
              onClick={handleEqualSplit}
              className="text-[13px] font-bold text-[#19B5A5] hover:underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Equal split
            </button>
          </div>
        </div>

        {/* Roomie share inputs */}
        <div className="space-y-2.5">
          {expense.shares.map((s) => {
            const user = roommates.find((r) => r.id === s.userId);
            const currentVal = shares[s.userId] ?? s.shareAmount;
            return (
              <div
                key={s.userId}
                className="p-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={user?.avatar} name={user?.name || 'Roomie'} flag={user?.flag} size="xs" />
                  <div className="truncate">
                    <p className="text-[14px] font-bold text-[#1F2430] truncate">{user?.name}</p>
                    <p className="type-secondary text-[14px]">
                      {s.response === 'disputed' ? (
                        <span className="text-[#E5484D] font-bold">Disputed</span>
                      ) : (
                        'Agreed'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[14px] font-bold text-[#475569]">{sym}</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentVal}
                    onChange={(e) => handleShareChange(s.userId, parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-right font-mono font-bold text-[14px] text-[#1F2430] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Balance status */}
        <div
          className={`p-3 rounded-2xl text-[14px] font-bold flex items-center justify-between border ${
            isBalanced
              ? 'bg-[#EBF9F0] text-[#2CA358] border-[#B8ECC8]'
              : 'bg-[#FFF0ED] text-[#E5484D] border-[#FFD7CF]'
          }`}
        >
          <span>Allocated: {sym}{totalAllocated.toFixed(2)} / {sym}{expense.amount.toFixed(2)}</span>
          <span>{isBalanced ? 'Balanced ✓' : `Remaining: ${sym}${diff.toFixed(2)}`}</span>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E6E8EE]">
          <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!isBalanced || saving}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {saving ? 'Saving...' : 'Save & Resolve Dispute'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
