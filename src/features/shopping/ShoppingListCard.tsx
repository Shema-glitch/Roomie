import React from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { ShoppingItem } from '../../types';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { Icon } from '@iconify/react';
import { ShoppingCart, Check, Plus, Broadcast, WarningCircle } from '@phosphor-icons/react';

export interface ShoppingListCardProps {
  items: ShoppingItem[];
  onOpenShoppingModal: () => void;
  onToggleItemStatus: (itemId: string, newStatus: ShoppingItem['status']) => void;
  onTriggerSupermarketPing: () => void;
}

export const ShoppingListCard: React.FC<ShoppingListCardProps> = ({
  items,
  onOpenShoppingModal,
  onToggleItemStatus,
  onTriggerSupermarketPing,
}) => {
  const neededItems = items.filter((i) => i.status === 'needed');
  const inCartCount = items.filter((i) => i.status === 'in_cart').length;
  const lowCount = neededItems.filter((i) => i.isLow).length;

  const topItems = neededItems.slice(0, 3);

  const handlePing = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.tokenClink();
    haptics.tokenClink();
    onTriggerSupermarketPing();
  };

  return (
    <ActionCard
      tint="teal"
      className="contain-content card-interactive ease-spring border-2 border-b-4 border-[#14B8A6]/40 cursor-pointer"
      onClick={onOpenShoppingModal}
      iconTile={
        <IconTile
          icon={<Icon icon="fluent-emoji-flat:shopping-cart" className="w-6 h-6" />}
          color="teal"
          size="md"
        />
      }
      title={
        <div className="flex items-center justify-between gap-2 flex-wrap w-full">
          <div className="flex items-center gap-2">
            <span className="type-card-title text-[#1F2033]">Shared shopping list</span>
            {lowCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#B42318] text-xs font-black uppercase tracking-wider flex items-center gap-1 border border-[#FECACA]">
                <WarningCircle weight="fill" className="w-3.5 h-3.5" />
                <span>{lowCount} Low</span>
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-[#0B6B5F] hover:underline">
            View all ({items.length}) →
          </span>
        </div>
      }
      subtitle={
        neededItems.length > 0
          ? `${neededItems.length} essential${neededItems.length === 1 ? '' : 's'} needed for the flat${inCartCount > 0 ? ` • ${inCartCount} in cart` : ''}`
          : 'Pantry is fully stocked! Tap to add new flat items.'
      }
      detail={
        <div className="space-y-2 pt-1">
          {/* Quick checklist snippet */}
          <div className="space-y-1.5">
            {topItems.length > 0 ? (
              topItems.map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playTap();
                    haptics.tokenClink();
                    onToggleItemStatus(item.id, 'in_cart');
                  }}
                  className="p-2 rounded-xl bg-white border border-[#E6E8EE] flex items-center justify-between text-xs transition-colors hover:border-[#14B8A6]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-4 h-4 rounded-md border-2 border-[#CBD5E1] flex items-center justify-center shrink-0">
                      {item.status === 'in_cart' && <Check weight="bold" className="w-3 h-3 text-[#14B8A6]" />}
                    </div>
                    <span className="font-semibold text-[#1F2430] truncate">{item.title}</span>
                    {item.quantityLabel && (
                      <span className="text-xs text-[#4B5063] shrink-0">({item.quantityLabel})</span>
                    )}
                  </div>
                  {item.isLow && (
                    <span className="px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#B42318] text-xs font-black tracking-wider uppercase shrink-0">
                      Running low
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-[#64748B] italic">No items currently needed.</p>
            )}
          </div>
        </div>
      }
      actions={
        <div className="w-full flex items-center gap-2 pt-1">
          <Button
            variant="teal"
            size="sm"
            fullWidth
            onClick={handlePing}
            icon={<Broadcast weight="duotone" className="w-4 h-4" />}
          >
            I'm Going to Supermarket!
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenShoppingModal();
            }}
            icon={<Plus weight="bold" className="w-3.5 h-3.5" />}
          >
            Add
          </Button>
        </div>
      }
    />
  );
};
