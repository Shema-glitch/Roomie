import React from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { Settlement, User } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import { Banknote, Check } from 'lucide-react';
import { formatExpenseDate, formatCurrency } from './ExpenseCard';

interface SettlementItemCardProps {
  settlement: Settlement;
  roommates: User[];
  currentUser: User;
  currencySymbol: string;
  onConfirmSettlement: (settlementId: string) => Promise<Settlement>;
}

export const SettlementItemCard: React.FC<SettlementItemCardProps> = ({
  settlement: s,
  roommates,
  currentUser,
  currencySymbol: sym,
  onConfirmSettlement,
}) => {
  const { showToast } = useToast();
  const fromUser = roommates.find((r) => r.id === s.fromUser);
  const toUser = roommates.find((r) => r.id === s.toUser);
  const isMePayer = s.fromUser === currentUser.id;
  const isMeReceiver = s.toUser === currentUser.id;

  return (
    <ActionCard
      tint="neutral"
      iconTile={<IconTile icon={<Banknote className="w-5 h-5" />} color="teal" size="sm" />}
      title={`${sym}${formatCurrency(s.amount)} paid directly`}
      subtitle={`${fromUser?.name.split(' ')[0] || 'Roomie'} to ${
        toUser?.name.split(' ')[0] || 'Roomie'
      } • ${formatExpenseDate(s.createdAt)}`}
      detail={
        <div className="flex items-center justify-between type-secondary text-[14px]">
          <span>Direct transfer</span>
          <span className="font-bold text-[#1F2430]">
            {isMePayer ? 'You paid' : isMeReceiver ? 'Paid to you' : 'Roomie transfer'}
          </span>
        </div>
      }
      badge={
        <Chip
          status={s.status === 'confirmed' ? 'paid' : 'pending'}
          label={s.status === 'confirmed' ? 'Confirmed' : 'Pending Receipt'}
          size="sm"
        />
      }
      actions={
        isMeReceiver && s.status === 'marked_paid' ? (
          <div className="w-full">
            <Button
              variant="reward"
              size="sm"
              fullWidth
              onClick={async () => {
                sound.playSuccess();
                await onConfirmSettlement(s.id);
                showToast(`Confirmed receipt of ${sym}${formatCurrency(s.amount)}!`, 'success');
              }}
              icon={<Check className="w-4 h-4" />}
            >
              Confirm Payment Received ({sym}
              {formatCurrency(s.amount)})
            </Button>
          </div>
        ) : undefined
      }
    />
  );
};
