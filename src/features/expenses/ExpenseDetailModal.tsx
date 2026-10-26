import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { DisputeReasonModal } from './DisputeReasonModal';
import { Expense, User } from '../../types';
import { Check, AlertCircle, Calendar, Receipt, MessageSquare } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  roommates: User[];
  currentUser: User;
  onRespond: (expenseId: string, response: 'agreed' | 'disputed', reason?: string) => Promise<void>;
  onOpenChat: () => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  roommates,
  currentUser,
  onRespond,
  onOpenChat,
}) => {
  const { showToast } = useToast();
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!expense) return null;

  const payer = roommates.find((r) => r.id === expense.paidBy);
  const myShare = expense.shares.find((s) => s.userId === currentUser.id);
  const isPayer = expense.paidBy === currentUser.id;

  const handleAgree = async () => {
    setLoading(true);
    try {
      await onRespond(expense.id, 'agreed');
      showToast('You agreed to this expense share!', 'success');
      onClose();
    } catch {
      showToast('Could not register response', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async (reason: string) => {
    setLoading(true);
    try {
      await onRespond(expense.id, 'disputed', reason);
      setDisputeModalOpen(false);
      onClose();
    } catch {
      showToast('Could not register dispute', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Expense Details"
        subtitle={`Logged on ${expense.date}`}
      >
        <div className="space-y-4">
          {/* Header Amount */}
          <div className="p-4 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between">
            <div>
              <span className="type-label block">
                {expense.category}
              </span>
              <h3 className="type-section-heading">
                {expense.title}
              </h3>
              <p className="type-secondary mt-0.5">
                Paid by {payer?.name || 'Roomie'}
              </p>
            </div>
            <div className="text-right">
              <span className="type-title text-[#FF6B4A]">
                ₺{expense.amount.toFixed(2)}
              </span>
              <div className="mt-1">
                <Chip
                  label={expense.status}
                  variant={
                    expense.status === 'agreed'
                      ? 'success'
                      : expense.status === 'disputed'
                      ? 'danger'
                      : 'reward'
                  }
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Receipt Image if present */}
          {expense.receiptUrl && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Receipt className="w-4 h-4 text-[#FF6B4A]" />
                <span className="type-label">Uploaded Receipt</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-[#E6E8EE] max-h-48 shadow-xs">
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="w-full h-40 object-cover"
                />
              </div>
            </div>
          )}

          {/* Roomie Splits Breakdown */}
          <div className="space-y-2">
            <span className="type-label block">
              Roomie Splits ({expense.shares.length} people)
            </span>
            <div className="space-y-1.5">
              {expense.shares.map((s) => {
                const user = roommates.find((r) => r.id === s.userId);
                const isMe = s.userId === currentUser.id;
                return (
                  <div
                    key={s.userId}
                    className="p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={user?.avatar}
                        name={user?.name || 'User'}
                        flag={user?.flag}
                        size="xs"
                      />
                      <div>
                        <span className="text-[14px] font-bold text-[#1F2430]">
                          {user?.name} {isMe ? '(You)' : ''}
                        </span>
                        {s.disputeReason && (
                          <p className="type-secondary text-[#E5484D]">
                            Dispute: {s.disputeReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#1F2430]">
                        ₺{s.shareAmount.toFixed(2)}
                      </span>
                      <Chip
                        label={s.response}
                        variant={
                          s.response === 'agreed'
                            ? 'success'
                            : s.response === 'disputed'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agree / Dispute Actions for current user */}
          {!isPayer && myShare && myShare.response !== 'agreed' && (
            <div className="pt-2 border-t border-[#E6E8EE] space-y-2">
              <p className="type-secondary">
                Your share is ₺{myShare.shareAmount.toFixed(2)}. Do you agree?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="danger-outline"
                  size="md"
                  onClick={() => setDisputeModalOpen(true)}
                  icon={<AlertCircle className="w-4 h-4 text-[#E5484D]" />}
                >
                  Dispute
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={loading}
                  onClick={handleAgree}
                  icon={<Check className="w-4 h-4 stroke-[3]" />}
                >
                  Agree
                </Button>
              </div>
            </div>
          )}

          {/* Settle in chat helper */}
          <div className="pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                onClose();
                onOpenChat();
              }}
              icon={<MessageSquare className="w-4 h-4 text-[#5B5BD6]" />}
            >
              Discuss in Chat
            </Button>
          </div>
        </div>
      </Modal>

      <DisputeReasonModal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        expenseTitle={expense.title}
        onSubmitDispute={handleDispute}
      />
    </>
  );
};
