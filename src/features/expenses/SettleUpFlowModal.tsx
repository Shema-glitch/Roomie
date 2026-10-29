import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { Settlement, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import {
  HandCoins,
  Check,
  Banknote,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface SettleUpFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  roommates: User[];
  currentUser: User;
  pendingSettlements: Settlement[];
  debtsToPay: { toUserId: string; amount: number }[];
  onMarkPaid: (toUserId: string, amount: number) => Promise<Settlement>;
  onConfirmSettlement: (settlementId: string) => Promise<Settlement>;
}

export const SettleUpFlowModal: React.FC<SettleUpFlowModalProps> = ({
  isOpen,
  onClose,
  roommates,
  currentUser,
  pendingSettlements = [],
  debtsToPay = [],
  onMarkPaid,
  onConfirmSettlement,
}) => {
  const { showToast } = useToast();

  // Multi-step:
  // 1: Recipient -> 2: Amount & Method -> 3: Review -> 4: Pending Confirmation
  const [step, setStep] = useState<number>(1);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    debtsToPay[0]?.toUserId || roommates.find((r) => r.id !== currentUser.id)?.id || ''
  );
  const [amountStr, setAmountStr] = useState<string>(
    debtsToPay[0] ? debtsToPay[0].amount.toFixed(2) : '100.00'
  );
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [loading, setLoading] = useState<boolean>(false);
  const [settledRecipient, setSettledRecipient] = useState<User | null>(null);

  // Incoming settlements for current user to confirm
  const confirmationsForMe = pendingSettlements.filter(
    (s) => s.toUser === currentUser.id && s.status === 'marked_paid'
  );

  const amountNum = parseFloat(amountStr) || 0;
  const recipient = roommates.find((r) => r.id === selectedRecipientId);

  const handleNext = () => {
    sound.playTap();
    if (step === 2) {
      if (amountNum <= 0) {
        showToast('Please enter a valid payment amount', 'error');
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    sound.playTap();
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      handleClose();
    }
  };

  const handleConfirmPaid = async () => {
    if (!selectedRecipientId || amountNum <= 0) return;
    setLoading(true);
    try {
      sound.playSuccess();
      await onMarkPaid(selectedRecipientId, amountNum);
      setSettledRecipient(recipient || null);
      setStep(4);
      showToast('Marked as paid! Awaiting recipient confirmation.', 'success');
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
      showToast('Payment confirmed! Ledger updated.', 'reward');
    } catch {
      showToast('Confirmation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 4 ? 'Payment Submitted' : `Settle Up (${step}/3)`}
      subtitle={
        step === 1
          ? 'Step 1: Choose roomie to pay'
          : step === 2
          ? 'Step 2: Amount and payment method'
          : step === 3
          ? 'Step 3: Review and mark as paid'
          : 'Waiting for roomie confirmation'
      }
    >
      <div className="space-y-4">
        {/* Pending incoming confirmations for this user */}
        {confirmationsForMe.length > 0 && step === 1 && (
          <div className="p-3.5 rounded-2xl bg-[#FFF8E6] border border-[#FFE8A3] space-y-2">
            <div className="flex items-center gap-1.5 type-label">
              <ShieldCheck className="w-4 h-4 text-[#8A6200]" />
              <span>Roomies sent you payments</span>
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
                      <p className="type-body font-bold">
                        {payer?.name} sent <span className="text-[#3DBE6D]">₺{s.amount.toFixed(2)}</span>
                      </p>
                      <p className="type-secondary">Marked as paid</p>
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

        {/* STEP 1: CHOOSE RECIPIENT */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Who are you settling with?
              </h4>
              <p className="type-secondary mt-0.5">
                Roomie simplified your debts so you only need to pay the minimum transactions.
              </p>
            </div>

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
                        sound.playTap();
                        setSelectedRecipientId(r.id);
                        if (debt) setAmountStr(debt.amount.toFixed(2));
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#FF6B4A] bg-[#FFF0ED]/40 shadow-xs'
                          : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={r.avatar} name={r.name} flag={r.flag} size="md" />
                        <div>
                          <h4 className="type-section-heading">
                            {r.name}
                          </h4>
                          <p className="type-secondary">
                            {debt ? (
                              <span className="text-[#FF6B4A] font-bold">
                                You owe ₺{debt.amount.toFixed(2)}
                              </span>
                            ) : (
                              'No debt owed'
                            )}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!selectedRecipientId}
                onClick={handleNext}
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: AMOUNT & PAYMENT METHOD */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Payment amount & method
              </h4>
              <p className="type-secondary mt-0.5">
                Paying to <span className="text-[#1F2430] font-bold">{recipient?.name}</span>.
              </p>
            </div>

            <div>
              <label className="type-label block mb-1">
                Amount Paid (₺ TRY)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 type-big-number text-[#64748B]">
                  ₺
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-big-number focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
            </div>

            <div>
              <label className="type-label block mb-2">
                How did you pay?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setMethod('cash');
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                    method === 'cash'
                      ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                      : 'border-[#E6E8EE] bg-white text-[#64748B]'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-[14px] font-bold">Physical Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setMethod('transfer');
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                    method === 'transfer'
                      ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                      : 'border-[#E6E8EE] bg-white text-[#64748B]'
                  }`}
                >
                  <HandCoins className="w-5 h-5" />
                  <span className="text-[14px] font-bold">Bank Transfer</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="md" onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={amountNum <= 0}
                onClick={handleNext}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & MARK AS PAID */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Review payment details
              </h4>
              <p className="type-secondary mt-0.5">
                Ensure you have completed the cash or bank transaction.
              </p>
            </div>

            <Card padding="md" variant="calm" className="bg-[#F7F8FB] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6E8EE]">
                <div>
                  <span className="type-label block mb-1">
                    Payment To
                  </span>
                  <h4 className="type-section-heading">
                    {recipient?.name}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="type-big-number text-[#FF6B4A]">
                    ₺{amountNum.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between type-secondary">
                <span>Payment Method:</span>
                <span className="text-[#1F2430] font-bold">
                  {method === 'cash' ? 'Cash handed directly' : 'Bank Transfer'}
                </span>
              </div>

              <div className="type-secondary bg-white p-3 rounded-xl border border-[#E6E8EE] leading-relaxed">
                <strong>Fairness principle:</strong> Roomie will notify {recipient?.name.split(' ')[0]} to confirm receipt. Both taps are required before the payment is counted as fully settled.
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="md" onClick={handleBack}>
                Edit
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={loading}
                onClick={handleConfirmPaid}
                icon={<Check className="w-4 h-4" />}
              >
                {loading ? 'Submitting...' : 'Mark as paid'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION SCREEN */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center space-y-4 py-3">
            <MascotView
              state="calm"
              size="lg"
              bubbleText="Payment logged peacefully!"
            />

            <div className="space-y-1 max-w-xs">
              <h3 className="type-title">
                Marked as Paid
              </h3>
              <p className="type-secondary leading-relaxed">
                We let <span className="text-[#1F2430] font-bold">{settledRecipient?.name}</span> know you sent ₺{amountNum.toFixed(2)}. Once they tap Confirm, your balances will be settled.
              </p>
            </div>

            <div className="w-full pt-2">
              <Button variant="primary" size="lg" fullWidth onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
