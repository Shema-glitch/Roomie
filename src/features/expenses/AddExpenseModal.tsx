import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Expense, ExpenseCategory, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { Camera, Receipt, ShoppingCart, Zap, Home, MoreHorizontal, Check, Plus } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  roommates: User[];
  currentUser: User;
  onAddExpense: (
    title: string,
    amount: number,
    category: ExpenseCategory,
    participants: string[],
    receiptUrl?: string
  ) => Promise<Expense>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  roommates,
  currentUser,
  onAddExpense,
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('groceries');
  const [participants, setParticipants] = useState<string[]>(roommates.map((r) => r.id));
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const toggleParticipant = (userId: string) => {
    sound.playTap();
    if (participants.includes(userId)) {
      if (participants.length > 1) {
        setParticipants(participants.filter((id) => id !== userId));
      } else {
        showToast('At least one roommate must share the expense', 'error');
      }
    } else {
      setParticipants([...participants, userId]);
    }
  };

  const handleSimulateReceipt = () => {
    sound.playPop();
    const receipts = [
      'https://images.unsplash.com/photo-1554415707-9e44667ff469?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=80',
    ];
    setReceiptUrl(receipts[Math.floor(Math.random() * receipts.length)]);
    showToast('Receipt photo attached! 🧾', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid title and amount', 'error');
      return;
    }

    setLoading(true);
    try {
      sound.playSuccess();
      await onAddExpense(
        title.trim(),
        numAmount,
        category,
        participants,
        receiptUrl || undefined
      );
      showToast(`Expense "${title}" logged! Pending roomie agreement.`, 'success');
      setTitle('');
      setAmount('');
      setReceiptUrl('');
      onClose();
    } catch {
      showToast('Could not save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sharePerPerson =
    parseFloat(amount) > 0 && participants.length > 0
      ? (parseFloat(amount) / participants.length).toFixed(2)
      : '0.00';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Shared Expense"
      subtitle="Paid by you • Fair split with roommates"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="type-label block mb-1.5">
            What was it for?
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lemar groceries, Olive oil, Water jugs"
            className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-[16px] focus:outline-none focus:border-[#FF6B4A]"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="type-label block mb-1.5">
            Amount in Turkish Lira (₺ TRY)
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
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white type-title text-[#1F2430] focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>
          {parseFloat(amount) > 0 && (
            <p className="type-secondary mt-1">
              Split {participants.length} ways = <strong>₺{sharePerPerson}</strong> per person
            </p>
          )}
        </div>

        {/* Category Pills */}
        <div>
          <label className="type-label block mb-1.5">
            Category
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'groceries', label: 'Groceries', icon: <ShoppingCart className="w-4 h-4" /> },
              { id: 'utilities', label: 'Utilities', icon: <Zap className="w-4 h-4" /> },
              { id: 'household', label: 'House', icon: <Home className="w-4 h-4" /> },
              { id: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> },
            ].map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id as ExpenseCategory)}
                className={`py-2 px-1 rounded-2xl border text-[14px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  category === cat.id
                    ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                    : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                }`}
              >
                {cat.icon}
                <span className="text-[14px] font-normal">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Split With (Roomies) */}
        <div>
          <label className="type-label block mb-1.5">
            Roomies Sharing ({participants.length} selected)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {roommates.map((r) => {
              const isSelected = participants.includes(r.id);
              const isMe = r.id === currentUser.id;
              return (
                <div
                  key={r.id}
                  onClick={() => toggleParticipant(r.id)}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#19B5A5] bg-[#E6FAF8]'
                      : 'border-[#E6E8EE] bg-white opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={r.avatar} name={r.name} flag={r.flag} size="xs" />
                    <span className="text-[14px] font-bold text-[#1F2430]">
                      {isMe ? 'You' : r.name.split(' ')[0]}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[#19B5A5] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Receipt Photo Placeholder */}
        <div>
          <label className="type-label block mb-1.5">
            Receipt Photo
          </label>
          {receiptUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#E6E8EE] max-h-32">
              <img src={receiptUrl} alt="Receipt preview" className="w-full h-28 object-cover" />
              <button
                type="button"
                onClick={() => setReceiptUrl('')}
                className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 text-white rounded-lg text-[14px] font-bold"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSimulateReceipt}
              className="w-full p-3 border-2 border-dashed border-[#CBD5E1] rounded-2xl flex items-center justify-center gap-2 hover:border-[#FF6B4A] bg-[#F7F8FB] cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4 text-[#FF6B4A]" />
              <span className="text-[14px] font-bold text-[#1F2430]">
                Attach Receipt Photo
              </span>
            </button>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={loading || !title.trim() || !amount}
          >
            {loading ? 'Logging...' : 'Log Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
