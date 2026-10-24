import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { AlertCircle } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface DisputeReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseTitle: string;
  onSubmitDispute: (reason: string) => Promise<void>;
}

export const DisputeReasonModal: React.FC<DisputeReasonModalProps> = ({
  isOpen,
  onClose,
  expenseTitle,
  onSubmitDispute,
}) => {
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string>("I didn't use or consume this item");
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedReasons = [
    "I didn't use or consume this item",
    "Price looks incorrect or different from receipt",
    "I wasn't home / in town during this period",
    "Already paid my share in cash",
    "Other reason",
  ];

  const handleSubmit = async () => {
    const finalReason =
      selectedReason === 'Other reason'
        ? customNote.trim() || 'Disputed by roommate'
        : `${selectedReason}${customNote.trim() ? `: ${customNote.trim()}` : ''}`;

    setLoading(true);
    try {
      await onSubmitDispute(finalReason);
      showToast('Dispute recorded calmly. The buyer can review and adjust.', 'info');
      onClose();
    } catch {
      showToast('Could not record dispute', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispute Expense"
      subtitle={`Explain peacefully for "${expenseTitle}"`}
    >
      <div className="space-y-4">
        <p className="text-xs text-[#6B7280] leading-relaxed">
          Purchases are only shared after agreement. Disputing pauses this expense from your balance while you and your roommate chat.
        </p>

        <div className="space-y-2">
          {predefinedReasons.map((r) => (
            <label
              key={r}
              className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer text-xs font-semibold transition-all ${
                selectedReason === r
                  ? 'border-[#E5484D] bg-[#FDECEE] text-[#BF3337]'
                  : 'border-[#E6E8EE] bg-white text-[#1F2430]'
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
          <label className="block text-xs font-bold text-[#1F2430] mb-1">
            Additional detail (optional):
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. I already have my own laundry soap"
            className="w-full px-3 py-2.5 rounded-2xl border border-[#E6E8EE] bg-white text-xs focus:outline-none focus:border-[#E5484D]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="danger"
            size="md"
            disabled={loading}
            onClick={handleSubmit}
            icon={<AlertCircle className="w-4 h-4" />}
          >
            {loading ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
