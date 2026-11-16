import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { ShoppingItem, ShoppingItemCategory, ShoppingItemStatus } from '../../types';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { Icon } from '@iconify/react';
import {
  ShoppingCart,
  Check,
  Trash,
  Plus,
  Receipt,
  WarningCircle,
  Tag,
  Funnel,
} from '@phosphor-icons/react';

export interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  onAddItem: (params: {
    title: string;
    category: ShoppingItemCategory;
    quantityLabel: string;
    isLow: boolean;
  }) => Promise<void>;
  onToggleItemStatus: (itemId: string, newStatus: ShoppingItemStatus) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onConvertCartToExpense?: (cartItems: ShoppingItem[]) => void;
}

const CATEGORIES: { id: ShoppingItemCategory; label: string }[] = [
  { id: 'groceries', label: 'Groceries' },
  { id: 'household', label: 'Household' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'other', label: 'Other' },
];

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  items,
  onAddItem,
  onToggleItemStatus,
  onDeleteItem,
  onConvertCartToExpense,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'needed' | 'cart'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ShoppingItemCategory>('groceries');
  const [newQuantity, setNewQuantity] = useState('');
  const [newIsLow, setNewIsLow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (filterTab === 'needed') return item.status === 'needed';
    if (filterTab === 'cart') return item.status === 'in_cart' || item.status === 'purchased';
    return true;
  });

  const cartItems = items.filter((i) => i.status === 'in_cart' || i.status === 'purchased');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddItem({
        title: newTitle.trim(),
        category: newCategory,
        quantityLabel: newQuantity.trim(),
        isLow: newIsLow,
      });
      sound.tokenClink();
      haptics.tokenClink();
      setNewTitle('');
      setNewQuantity('');
      setNewIsLow(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertExpense = () => {
    sound.playSuccess();
    haptics.swapAccept();
    onClose();
    if (onConvertCartToExpense) {
      onConvertCartToExpense(cartItems);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Shared Shopping List"
      subtitle="Collaborative apartment essentials, low-stock tags & expense conversion"
    >
      <div className="space-y-4 py-1">
        {/* Add Item Form */}
        <form onSubmit={handleAddSubmit} className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add item (e.g. Oat Milk, Dish Soap)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={80}
              required
              className="flex-1 px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1F2430] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6]"
            />
            <input
              type="text"
              placeholder="Qty (2L, 1 pk)"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              maxLength={30}
              className="w-24 px-2.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1F2430] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6]"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    newCategory === c.id
                      ? 'bg-[#14B8A6] text-white shadow-xs'
                      : 'bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#DC2626] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsLow}
                  onChange={(e) => setNewIsLow(e.target.checked)}
                  className="rounded text-[#DC2626] focus:ring-[#DC2626]"
                />
                <span>Running Low</span>
              </label>

              <Button
                type="submit"
                variant="teal"
                size="sm"
                loading={isSubmitting}
                icon={<Plus weight="bold" className="w-3.5 h-3.5" />}
              >
                Add
              </Button>
            </div>
          </div>
        </form>

        {/* Filter Tabs & Cart Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-xl bg-[#F0F2F6] p-1 border border-[#E6E8EE]">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                filterTab === 'all'
                  ? 'bg-white text-[#1F2430] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1F2430]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('needed')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                filterTab === 'needed'
                  ? 'bg-white text-[#1F2430] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1F2430]'
              }`}
            >
              Needed ({items.filter((i) => i.status === 'needed').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('cart')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                filterTab === 'cart'
                  ? 'bg-white text-[#1F2430] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1F2430]'
              }`}
            >
              In Cart ({cartItems.length})
            </button>
          </div>

          {cartItems.length > 0 && onConvertCartToExpense && (
            <Button
              variant="reward"
              size="sm"
              onClick={handleConvertExpense}
              icon={<Receipt weight="bold" className="w-4 h-4" />}
            >
              Convert to Expense ({cartItems.length})
            </Button>
          )}
        </div>

        {/* Items Checklist List */}
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isCart = item.status === 'in_cart' || item.status === 'purchased';
              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                    isCart
                      ? 'bg-[#F0FDFA] border-[#99F6E4]'
                      : 'bg-white border-[#E6E8EE]'
                  }`}
                >
                  <div
                    onClick={() => {
                      sound.playTap();
                      haptics.tokenClink();
                      onToggleItemStatus(item.id, isCart ? 'needed' : 'in_cart');
                    }}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${
                        isCart
                          ? 'border-[#14B8A6] bg-[#14B8A6] text-white'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {isCart && <Check weight="bold" className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold truncate ${
                            isCart ? 'text-[#0F766E] line-through' : 'text-[#1F2430]'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.quantityLabel && (
                          <span className="text-[11px] text-[#64748B] shrink-0 font-medium">
                            • {item.quantityLabel}
                          </span>
                        )}
                        {item.isLow && (
                          <span className="px-1.5 py-0.2 rounded bg-[#FFF5F5] text-[#DC2626] text-[9px] font-black uppercase tracking-wider border border-[#FEB2B2]">
                            Low
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.softReject();
                      onDeleteItem(item.id);
                    }}
                    className="p-1 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
                  >
                    <Trash weight="bold" className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-[#64748B] italic">
              No items in this view.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
