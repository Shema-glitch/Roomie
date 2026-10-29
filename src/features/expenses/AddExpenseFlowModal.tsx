import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { MascotView } from '../../components/common/MascotView';
import { IconTile } from '../../components/common/IconTile';
import { Expense, ExpenseCategory, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import {
  ShoppingCart,
  Zap,
  Home,
  Building2,
  MoreHorizontal,
  Camera,
  Check,
  ArrowRight,
  ArrowLeft,
  Receipt,
  Users,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface AddExpenseFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  roommates: User[];
  currentUser: User;
  onAddExpense: (
    title: string,
    amount: number,
    category: ExpenseCategory,
    participants: string[],
    receiptUrl?: string,
    payerId?: string
  ) => Promise<Expense>;
}

export const AddExpenseFlowModal: React.FC<AddExpenseFlowModalProps> = ({
  isOpen,
  onClose,
  roommates,
  currentUser,
  onAddExpense,
}) => {
  const { showToast } = useToast();

  // Multi-step state: 1 to 6
  // 1: Payer -> 2: Details & Amount -> 3: Split Options -> 4: Receipt Capture -> 5: Review -> 6: Success
  const [step, setStep] = useState<number>(1);

  // Form values
  const [payerId, setPayerId] = useState<string>(currentUser.id);
  const [title, setTitle] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('groceries');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [participants, setParticipants] = useState<string[]>(roommates.map((r) => r.id));
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [createdExpense, setCreatedExpense] = useState<Expense | null>(null);

  const amountNum = parseFloat(amountStr) || 0;

  // Toggle participant
  const toggleParticipant = (userId: string) => {
    sound.playTap();
    if (participants.includes(userId)) {
      if (participants.length > 1) {
        setParticipants(participants.filter((id) => id !== userId));
      } else {
        showToast('At least one roomie must share this expense', 'error');
      }
    } else {
      setParticipants([...participants, userId]);
    }
  };

  // Simulate receipt photo capture
  const handleCaptureReceipt = () => {
    sound.playPop();
    const samples = [
      'https://images.unsplash.com/photo-1554415707-9e44667ff469?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    ];
    setReceiptUrl(samples[Math.floor(Math.random() * samples.length)]);
    showToast('Receipt attached successfully.', 'info');
  };

  const handleNext = () => {
    sound.playTap();
    if (step === 2) {
      if (!title.trim() || amountNum <= 0) {
        showToast('Please enter what it was for and a valid amount', 'error');
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      sound.playSuccess();
      const exp = await onAddExpense(
        title.trim(),
        amountNum,
        category,
        participants,
        receiptUrl || undefined,
        payerId
      );
      setCreatedExpense(exp);
      setStep(6); // Success confirmation screen
    } catch {
      showToast('Could not save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setTitle('');
    setAmountStr('');
    setReceiptUrl('');
    setCreatedExpense(null);
    setPayerId(currentUser.id);
    setParticipants(roommates.map((r) => r.id));
    onClose();
  };

  const sharePerPerson =
    participants.length > 0 && amountNum > 0
      ? (amountNum / participants.length).toFixed(2)
      : '0.00';

  const payer = roommates.find((r) => r.id === payerId) || currentUser;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 6 ? 'Expense logged' : `Add Expense (${step}/5)`}
      subtitle={
        step === 1
          ? 'Step 1: Choose who paid for this'
          : step === 2
          ? 'Step 2: Enter title, amount and category'
          : step === 3
          ? 'Step 3: Select roomie split'
          : step === 4
          ? 'Step 4: Attach receipt photo'
          : step === 5
          ? 'Step 5: Review & confirm breakdown'
          : 'Awaiting roomie agreement'
      }
    >
      <div className="space-y-4">
        {/* Progress Bar (Calm style) */}
        {step <= 5 && (
          <div className="flex gap-1.5 w-full">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  s === step
                    ? 'bg-[#FF6B4A]'
                    : s < step
                    ? 'bg-[#19B5A5]'
                    : 'bg-[#E6E8EE]'
                }`}
              />
            ))}
          </div>
        )}

        {/* STEP 1: CHOOSE PAYER */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Who paid the bill?
              </h4>
              <p className="type-secondary mt-0.5">
                Select which roomie paid at the store or covered the utility.
              </p>
            </div>

            <div className="space-y-2">
              {roommates.map((r) => {
                const isSelected = payerId === r.id;
                const isMe = r.id === currentUser.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      sound.playPop();
                      setPayerId(r.id);
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
                          {r.name} {isMe ? '(You)' : ''}
                        </h4>
                        <p className="type-secondary">
                          From {r.country}
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
                size="md"
                fullWidth
                onClick={handleNext}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS & AMOUNT */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Expense details & amount
              </h4>
              <p className="type-secondary mt-0.5">
                Paid by {payer.name} in Turkish Lira (₺ TRY).
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="type-label block mb-1.5">
                What was purchased?
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lemar weekly groceries, Water 19L refills"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-[16px] focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="type-label block mb-1.5">
                Total Amount (₺ TRY)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black font-heading text-[#6B7280]">
                  ₺
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#E6E8EE] bg-white type-title text-[#1F2430] focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="type-label block mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'groceries', label: 'Groceries', icon: <ShoppingCart className="w-4 h-4" /> },
                  { id: 'rent', label: 'Rent', icon: <Building2 className="w-4 h-4" /> },
                  { id: 'utilities', label: 'Utilities', icon: <Zap className="w-4 h-4" /> },
                  { id: 'household', label: 'House', icon: <Home className="w-4 h-4" /> },
                  { id: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> },
                ].map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      sound.playTap();
                      setCategory(c.id as ExpenseCategory);
                    }}
                    className={`py-2.5 px-1 rounded-2xl border text-[14px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      category === c.id
                        ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                        : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                    }`}
                  >
                    {c.icon}
                    <span className="text-[14px] font-normal">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!title.trim() || amountNum <= 0}
                onClick={handleNext}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SPLIT OPTIONS */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Choose how to split
              </h4>
              <p className="type-secondary mt-0.5">
                Splitting ₺{amountNum.toFixed(2)} fairly.
              </p>
            </div>

            {/* Split Type toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#E6E8EE]/60 rounded-2xl">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`py-2 rounded-xl text-[14px] font-bold transition-all cursor-pointer ${
                  splitType === 'equal' ? 'bg-white text-[#1F2430] shadow-xs' : 'text-[#6B7280]'
                }`}
              >
                Split Equally ({participants.length})
              </button>
              <button
                type="button"
                onClick={() => setSplitType('custom')}
                className={`py-2 rounded-xl text-[14px] font-bold transition-all cursor-pointer ${
                  splitType === 'custom' ? 'bg-white text-[#1F2430] shadow-xs' : 'text-[#6B7280]'
                }`}
              >
                Custom Split
              </button>
            </div>

            {/* Roomie Checklist */}
            <div className="space-y-2">
              <span className="type-label block">
                Roomies Sharing
              </span>
              {roommates.map((r) => {
                const isSelected = participants.includes(r.id);
                const shareAmount = isSelected ? sharePerPerson : '0.00';
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleParticipant(r.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#19B5A5] bg-[#E6FAF8]/50'
                        : 'border-[#E6E8EE] bg-white opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                      <div>
                        <h4 className="type-section-heading">
                          {r.name} {r.id === currentUser.id ? '(You)' : ''}
                        </h4>
                        <p className="type-secondary">
                          {isSelected ? `Share: ₺${shareAmount}` : 'Excluded from split'}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#19B5A5] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Card padding="sm" className="bg-[#FFF8E6] border border-[#FFE8A3] type-secondary font-bold text-[#8A6200] flex items-center justify-between">
              <span>Each roomie owes:</span>
              <span className="type-section-heading text-[#8A6200]">
                ₺{sharePerPerson}
              </span>
            </Card>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={participants.length === 0}
                onClick={handleNext}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: RECEIPT CAPTURE */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <div className="text-left">
              <h4 className="type-section-heading">
                Capture receipt photo
              </h4>
              <p className="type-secondary mt-0.5">
                Receipts keep everything transparent and prevent disputes.
              </p>
            </div>

            {receiptUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#19B5A5] shadow-xs max-h-52">
                  <img
                    src={receiptUrl}
                    alt="Captured receipt"
                    className="w-full h-44 object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/70 text-white text-[14px] font-bold">
                    Receipt attached
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="type-secondary text-[#E5484D] font-bold hover:underline cursor-pointer"
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <div
                onClick={handleCaptureReceipt}
                className="p-8 border-2 border-dashed border-[#CBD5E1] rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-[#FF6B4A] hover:bg-[#FFF0ED]/20 cursor-pointer transition-all bg-[#F7F8FB]"
              >
                <IconTile icon={<Camera className="w-7 h-7" />} color="coral" size="lg" />
                <div>
                  <h4 className="type-section-heading">
                    Take or Upload Receipt Photo
                  </h4>
                  <p className="type-secondary mt-0.5">
                    Tap to simulate camera scan
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="md" onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {receiptUrl ? 'Review' : 'Skip'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & SUMMARY */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Review expense summary
              </h4>
              <p className="type-secondary mt-0.5">
                Verify details before notifying roomies.
              </p>
            </div>

            <Card padding="md" variant="calm" className="bg-[#F7F8FB] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6E8EE]">
                <div>
                  <span className="type-label block mb-1">
                    {category}
                  </span>
                  <h3 className="type-section-heading">
                    {title}
                  </h3>
                  <p className="type-secondary">Paid by {payer.name}</p>
                </div>
                <div className="text-right">
                  <span className="type-big-number text-[#FF6B4A]">
                    ₺{amountNum.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Shares Breakdown */}
              <div className="space-y-2">
                <span className="type-label block">
                  Roomie Shares ({participants.length}):
                </span>
                {participants.map((pid) => {
                  const u = roommates.find((r) => r.id === pid);
                  return (
                    <div
                      key={pid}
                      className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white border border-[#E6E8EE]"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar src={u?.avatar} name={u?.name || ''} size="xs" />
                        <span className="type-body">{u?.name}</span>
                      </div>
                      <span className="type-section-heading">
                        ₺{sharePerPerson}
                      </span>
                    </div>
                  );
                })}
              </div>

              {receiptUrl && (
                <div className="pt-1 flex items-center gap-2 type-secondary text-[#3DBE6D] font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Receipt photo included</span>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="md" onClick={handleBack}>
                Edit
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={loading}
                onClick={handleSubmit}
                icon={<Check className="w-4 h-4" />}
              >
                {loading ? 'Submitting...' : 'Log expense'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: SUBMITTED CONFIRMATION */}
        {step === 6 && (
          <div className="flex flex-col items-center text-center space-y-4 py-3">
            <MascotView
              state="calm"
              size="lg"
              bubbleText="Expense recorded peacefully!"
            />

            <div className="space-y-1 max-w-xs">
              <h3 className="type-title">
                Expense Logged
              </h3>
              <p className="type-secondary leading-relaxed">
                <span className="text-[#1F2430] font-bold">₺{amountNum.toFixed(2)}</span> for "{title}" has been shared with your roomies.
              </p>
            </div>

            <Card padding="md" variant="calm" className="w-full bg-[#F7F8FB] text-left space-y-2">
              <div className="flex items-center gap-2 type-label text-[#1F2430]">
                <ShieldCheck className="w-4 h-4 text-[#19B5A5]" />
                <span>Next steps</span>
              </div>
              <p className="type-secondary leading-relaxed">
                Your roomies will receive an in-app notice to tap Agree. Only agreed shares will update the final balance.
              </p>
            </Card>

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
