import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { WarningCircle } from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';

interface DisputeReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseTitle: string;
  onSubmitDispute: (reason: string) => Promise<void>;
}

const DEFAULT_DISPUTE_REASON = "I didn't use or consume this item";

export const DisputeReasonModal: React.FC<DisputeReasonModalProps> = ({
  isOpen,
  onClose,
  expenseTitle,
  onSubmitDispute,
}) => {
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string>(DEFAULT_DISPUTE_REASON);
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedReason(DEFAULT_DISPUTE_REASON);
      setCustomNote('');
      setLoading(false);
    }
  }, [isOpen]);

  const predefinedReasons = [
    DEFAULT_DISPUTE_REASON,
    "Price looks incorrect or different from receipt",
    "I wasn't home / in town during this period",
    "Already paid my share in cash",
    "Other reason",
  ];

  const handleSubmit = async () => {
    if (loading) return;
    const finalReason =
      selectedReason === 'Other reason'
        ? customNote.trim() || 'Disputed by roomie'
        : `${selectedReason}${customNote.trim() ? `: ${customNote.trim()}` : ''}`;

    setLoading(true);
    try {
      await onSubmitDispute(finalReason);
      sound.playCalmNotice();
      haptics.medium();
      showToast('Dispute recorded calmly. The buyer can review and adjust.', 'info');
      onClose();
    } catch {
      haptics.warning();
      showToast('Could not record dispute', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispute expense"
      subtitle={`Explain peacefully for "${expenseTitle}"`}
    >
      <div className="space-y-4">
        <p className="type-secondary leading-relaxed">
          Purchases are only shared after agreement. Disputing pauses this expense from your balance while you and your roomie chat.
        </p>

        <div className="space-y-2">
          {predefinedReasons.map((r) => (
            <label
              key={r}
              className={`p-3 rounded-2xl border-2 border-b-4 flex items-center gap-3 cursor-pointer text-[14px] font-normal transition-[transform,background-color,border-color] duration-150 active:translate-y-[2px] min-h-[44px] ${
                selectedReason === r
                  ? 'border-[#E5484D] bg-[#FDECEE] text-[#BF3337] shadow-2xs font-bold'
                  : 'border-[#E6E8EE] bg-white text-[#1F2430] hover:border-[#CBD5E1]'
              }`}
            >
              <input
                type="radio"
                name="dispute_reason"
                checked={selectedReason === r}
                onChange={() => setSelectedReason(r)}
                className="accent-[#E5484D]"
              />
              <span>{r}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="type-label block mb-1.5">
            Additional detail (optional)
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. I already have my own laundry soap"
            className="w-full px-4 py-3 rounded-2xl border-2 border-[#E6E8EE] bg-white text-[15px] focus:outline-none focus:border-[#E5484D] min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            size="md"
            disabled={loading}
            onClick={handleSubmit}
            icon={<WarningCircle className="w-4 h-4" />}
          >
            {loading ? 'Submitting...' : 'Dispute'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
