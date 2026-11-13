import React, { useState, useRef } from 'react';
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
import { processPhoto } from '../../utils/photoPipeline';
import { buildScopedStoragePath, uploadPhotoToStorage } from '../../services/supabase';
import { api } from '../../services/api';
import { getCurrencySymbol } from '../../utils/stateTable';
import {
  ShoppingCart,
  Lightning,
  House,
  Buildings,
  DotsThree,
  Camera,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { useBackHandler } from '../../utils/useBackHandler';

interface AddExpenseFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  roommates: User[];
  currentUser: User;
  currency?: string;
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
  currency = 'TRY',
  onAddExpense,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sym = getCurrencySymbol(currency);
  const currencyLabel = currency || 'TRY';

  // Multi-step:
  // 1: Payer -> 2: Category -> 3: Title & Amount -> 4: Receipt (optional) -> 5: Split -> 6: Review & Submit
  const [step, setStep] = useState<number>(1);
  const [payerId, setPayerId] = useState<string>(currentUser.id);
  const [category, setCategory] = useState<ExpenseCategory>('groceries');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [participants, setParticipants] = useState<string[]>(roommates.map((r) => r.id));
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [receiptCompressing, setReceiptCompressing] = useState(false);
  const [loading, setLoading] = useState(false);

  const amountNum = parseFloat(amountStr) || 0;
  const sharePerPerson =
    participants.length > 0 ? (amountNum / participants.length).toFixed(2) : '0.00';

  const resetForm = () => {
    setStep(1);
    setPayerId(currentUser.id);
    setCategory('groceries');
    setTitle('');
    setAmountStr('');
    setParticipants(roommates.map((r) => r.id));
    setSplitType('equal');
    setReceiptUrl(undefined);
    setReceiptCompressing(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = () => {
    sound.playTap();
    setStep((prev) => Math.min(prev + 1, 6));
  };

  useBackHandler(isOpen && step > 1, 110, () => {
    handleBack();
  });

  const handleBack = () => {
    sound.playTap();
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptCompressing(true);
    sound.playTap();
    try {
      const processed = await processPhoto(file);
      const fileName = buildScopedStoragePath(
        api.getActiveHouseholdId(),
        `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`
      );
      const finalUrl = await uploadPhotoToStorage('receipts', fileName, processed.fullBlob, processed.fullDataUrl);
      setReceiptUrl(finalUrl);
      showToast('Receipt attached & compressed!', 'success');
    } catch (err) {
      showToast('Could not process receipt', 'error');
    } finally {
      setReceiptCompressing(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    sound.playTap();
    if (participants.includes(userId)) {
      if (participants.length === 1) {
        showToast('At least one roomie must share this expense', 'error');
        return;
      }
      setParticipants(participants.filter((id) => id !== userId));
    } else {
      setParticipants([...participants, userId]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || amountNum <= 0 || participants.length === 0) {
      showToast('Please fill in title, valid amount, and participants', 'error');
      return;
    }

    setLoading(true);
    sound.playSuccess();
    try {
      await onAddExpense(
        title.trim(),
        amountNum,
        category,
        participants,
        receiptUrl,
        payerId
      );
      setStep(6);
    } catch {
      showToast('Could not log expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  const categories: { id: ExpenseCategory; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'groceries', label: 'Groceries & Food', icon: <ShoppingCart className="w-5 h-5" />, desc: 'Supermarket, fruit & veg, bakery' },
    { id: 'utilities', label: 'Utilities & Bills', icon: <Lightning className="w-5 h-5" />, desc: 'Electricity, gas cylinders, water bottles' },
    { id: 'household', label: 'Household Essentials', icon: <House className="w-5 h-5" />, desc: 'Cleaning supplies, toilet paper, detergent' },
    { id: 'rent', label: 'Rent & Landlord', icon: <Buildings className="w-5 h-5" />, desc: 'Apartment monthly rent or building fee' },
    { id: 'other', label: 'Other Shared Items', icon: <DotsThree className="w-5 h-5" />, desc: 'Taxi rides, shared dinner, router' },
  ];

  const payer = roommates.find((r) => r.id === payerId) || currentUser;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step < 6 ? 'Log Shared Expense' : 'Expense Logged! 🎉'}
      subtitle={step < 6 ? `Step ${step} of 5` : 'Awaiting roomie agreements'}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* STEP 1: CHOOSE WHO PAID */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Who paid for this?
              </h4>
              <p className="type-secondary mt-0.5">
                Default is you, but you can record an expense on behalf of another roomie.
              </p>
            </div>

            <div className="space-y-2">
              {roommates.map((r) => {
                const isSelected = payerId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      sound.playTap();
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
                          {r.name} {r.id === currentUser.id ? '(You)' : ''}
                        </h4>
                        <p className="type-secondary">
                          {r.id === currentUser.id ? 'You paid out of pocket' : 'Roomie paid'}
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
              <Button variant="primary" size="lg" fullWidth onClick={handleNext} icon={<ArrowRight className="w-5 h-5" />}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: CATEGORY */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Select category
              </h4>
              <p className="type-secondary mt-0.5">
                Helps your apartment track monthly spending transparently.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {categories.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      sound.playTap();
                      setCategory(cat.id);
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF6B4A] bg-[#FFF0ED]/40 shadow-xs'
                        : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          isSelected ? 'bg-[#FF6B4A] text-white' : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <h4 className="type-section-heading">
                          {cat.label}
                        </h4>
                        <p className="type-secondary">
                          {cat.desc}
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

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={handleBack}>
                Back
              </Button>
              <Button variant="primary" size="md" onClick={handleNext} icon={<ArrowRight className="w-4 h-4" />}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: TITLE & AMOUNT */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Expense details & amount
              </h4>
              <p className="type-secondary mt-0.5">
                Paid by {payer.name} in {currencyLabel} ({sym}).
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
                placeholder="e.g. Lemar weekly groceries, Water refills"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-[16px] focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="type-label block mb-1.5">
                Total Amount ({currencyLabel} {sym})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black font-heading text-[#6B7280]">
                  {sym}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-2xl font-heading font-black text-[#1F2430] focus:outline-none focus:border-[#FF6B4A]"
                />
              </div>
            </div>

            {/* Optional Receipt Photo */}
            <div>
              <label className="type-label block mb-1.5">
                Receipt Photo (optional)
              </label>
              {receiptUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#E6E8EE] max-h-40">
                  <img src={receiptUrl} alt="Receipt" className="w-full h-36 object-cover" />
                  <button
                    type="button"
                    onClick={() => setReceiptUrl(undefined)}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-black/60 text-white text-xs font-bold hover:bg-black/80"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={receiptCompressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F7F8FB] hover:border-[#FF6B4A] hover:bg-[#FFF5F2] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Camera className="w-5 h-5 text-[#FF6B4A]" />
                    <span className="type-secondary font-bold text-[#FF6B4A]">
                      {receiptCompressing ? 'Compressing photo...' : 'Upload receipt or snap photo'}
                    </span>
                  </button>
                </div>
              )}
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
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SPLIT CONFIGURATION */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Choose how to split
              </h4>
              <p className="type-secondary mt-0.5">
                Splitting {sym}{amountNum.toFixed(2)} fairly.
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
                          {isSelected ? `Share: ${sym}${shareAmount}` : 'Excluded from split'}
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
                {sym}{sharePerPerson}
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
                Review
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & CONFIRM */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Review expense summary
              </h4>
              <p className="type-secondary mt-0.5">
                Make sure details look accurate before logging.
              </p>
            </div>

            <Card padding="md" variant="calm" className="bg-[#F7F8FB] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6E8EE]">
                <div>
                  <span className="type-label block">{category}</span>
                  <h3 className="type-section-heading">
                    {title}
                  </h3>
                  <p className="type-secondary">Paid by {payer.name}</p>
                </div>
                <div className="text-right">
                  <span className="type-big-number text-[#FF6B4A]">
                    {sym}{amountNum.toFixed(2)}
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
                        {sym}{sharePerPerson}
                      </span>
                    </div>
                  );
                })}
              </div>

              {receiptUrl && (
                <div className="pt-1 flex items-center gap-2 type-secondary text-[#3DBE6D] font-bold">
                  <CheckCircle className="w-4 h-4" weight="fill" />
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
                <span className="text-[#1F2430] font-bold">{sym}{amountNum.toFixed(2)}</span> for "{title}" has been shared with your roomies.
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
