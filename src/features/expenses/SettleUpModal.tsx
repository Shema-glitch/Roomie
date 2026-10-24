import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { Settlement, User } from '../../types';
import { sound } from '../../services/sound';
import { HandCoins, Check, ArrowRight, ShieldCheck, Banknote } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  roommates: User[];
  currentUser: User;
  pendingSettlements: Settlement[];
  debtsToPay: { toUserId: string; amount: number }[];
  onMarkPaid: (toUserId: string, amount: number) => Promise<Settlement>;
  onConfirmSettlement: (settlementId: string) => Promise<Settlement>;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  roommates,
  currentUser,
  pendingSettlements,
  debtsToPay,
  onMarkPaid,
  onConfirmSettlement,
}) => {
  const { showToast } = useToast();
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    debtsToPay[0]?.toUserId || roommates.find((r) => r.id !== currentUser.id)?.id || ''
  );
  const [amount, setAmount] = useState<string>(
    debtsToPay[0] ? debtsToPay[0].amount.toFixed(2) : '100.00'
  );
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [loading, setLoading] = useState(false);

  // Settlements waiting for CURRENT USER to confirm (money paid to current user)
  const confirmationsForMe = pendingSettlements.filter(
    (s) => s.toUser === currentUser.id && s.status === 'marked_paid'
  );

  const handleMarkPaid = async () => {
    const num = parseFloat(amount);
    if (!selectedRecipientId || isNaN(num) || num <= 0) {
      showToast('Please specify a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      sound.playSuccess();
      await onMarkPaid(selectedRecipientId, num);
      const recipient = roommates.find((r) => r.id === selectedRecipientId);
      showToast(
        `Marked ₺${num.toFixed(2)} as paid to ${recipient?.name.split(' ')[0]}. Waiting for confirmation!`,
        'success'
      );
      onClose();
    } catch {
      showToast('Could not record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceived = async (settlementId: string) => {
    setLoading(true);
    try {
      sound.playCelebration();
      await onConfirmSettlement(settlementId);
      showToast('Payment confirmed! Balances updated.', 'reward');
    } catch {
      showToast('Confirmation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settle Balances"
      subtitle="Pay directly in cash or bank transfer"
    >
      <div className="space-y-4">
        {/* Pending confirmations waiting for user */}
        {confirmationsForMe.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#FFF8E6] border border-[#FFE8A3] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A6200]">
              <ShieldCheck className="w-4 h-4" />
              <span>Pending Confirmations For You</span>
            </div>
            {confirmationsForMe.map((s) => {
              const payer = roommates.find((r) => r.id === s.fromUser);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#FFE8A3]"
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={payer?.avatar} name={payer?.name || ''} size="xs" />
                    <div>
                      <p className="text-xs font-bold text-[#1F2430]">
                        {payer?.name} sent ₺{s.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-[#6B7280]">Marked as paid</p>
                    </div>
                  </div>
                  <Button
                    variant="reward"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleConfirmReceived(s.id)}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    Confirm
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Informational banner */}
        <div className="text-[11px] text-[#6B7280] bg-[#F7F8FB] p-2.5 rounded-xl border border-[#E6E8EE]">
          💳 <strong>Remember:</strong> Roomie does not move money. Give cash to your flatmate or transfer to their TRNC/Turkish bank account, then tap below.
        </div>

        {/* Recipient Picker */}
        <div>
          <label className="block text-xs font-bold text-[#1F2430] mb-1.5">
            Who are you paying?
          </label>
          <div className="space-y-2">
            {roommates
              .filter((r) => r.id !== currentUser.id)
              .map((r) => {
                const debt = debtsToPay.find((d) => d.toUserId === r.id);
                const isSelected = selectedRecipientId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRecipientId(r.id);
                      if (debt) setAmount(debt.amount.toFixed(2));
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF6B4A] bg-[#FFF0ED]'
                        : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                      <div>
                        <h4 className="font-heading font-bold text-sm text-[#1F2430]">
                          {r.name}
                        </h4>
                        <p className="text-xs text-[#6B7280]">
                          {debt ? (
                            <span className="text-[#FF6B4A] font-bold">
                              You owe ₺{debt.amount.toFixed(2)}
                            </span>
                          ) : (
                            'No current debt'
                          )}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-[#1F2430] mb-1">
            Amount Paid (₺ TRY)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#6B7280]">
              ₺
            </span>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-white text-lg font-heading font-black text-[#1F2430] focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-bold text-[#1F2430] mb-1.5">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className={`py-2 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                method === 'cash'
                  ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                  : 'border-[#E6E8EE] bg-white text-[#6B7280]'
              }`}
            >
              <Banknote className="w-4 h-4" /> Physical Cash
            </button>
            <button
              type="button"
              onClick={() => setMethod('transfer')}
              className={`py-2 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                method === 'transfer'
                  ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                  : 'border-[#E6E8EE] bg-white text-[#6B7280]'
              }`}
            >
              <HandCoins className="w-4 h-4" /> Bank / FAST
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={loading || !amount || parseFloat(amount) <= 0}
            onClick={handleMarkPaid}
            icon={<Check className="w-4 h-4" />}
          >
            {loading ? 'Submitting...' : 'Mark as Paid'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
