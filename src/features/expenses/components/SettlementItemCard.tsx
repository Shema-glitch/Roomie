import React, { useState } from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { Chip } from '../../../components/common/Chip';
import { Settlement, User } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import { Money, Check } from '@phosphor-icons/react';
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
  const [confirming, setConfirming] = useState(false);
  const [optimisticConfirmed, setOptimisticConfirmed] = useState(false);

  const fromUser = roommates.find((r) => r.id === s.fromUser);
  const toUser = roommates.find((r) => r.id === s.toUser);
  const isMePayer = s.fromUser === currentUser.id;
  const isMeReceiver = s.toUser === currentUser.id;
  const isConfirmed = s.status === 'confirmed' || optimisticConfirmed;

  return (
    <ActionCard
      tint={isConfirmed ? 'green' : 'neutral'}
      iconTile={
        <IconTile
          icon={<Money className="w-5 h-5" />}
          color={isConfirmed ? 'green' : 'teal'}
          size="sm"
        />
      }
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
          status={isConfirmed ? 'paid' : 'pending'}
          label={isConfirmed ? 'Confirmed' : 'Pending Receipt'}
          size="sm"
        />
      }
      actions={
        isMeReceiver && !isConfirmed ? (
          <div className="w-full">
            <Button
              variant="reward"
              size="sm"
              fullWidth
              loading={confirming}
              onClick={async () => {
                if (confirming) return;
                setConfirming(true);
                setOptimisticConfirmed(true);
                sound.playSuccess();
                try {
                  await onConfirmSettlement(s.id);
                  showToast(
                    `Confirmed receipt of ${sym}${formatCurrency(s.amount)}!`,
                    'success'
                  );
                } catch {
                  setOptimisticConfirmed(false);
                  showToast('Could not confirm payment. Please try again.', 'error');
                } finally {
                  setConfirming(false);
                }
              }}
              icon={<Check className="w-4 h-4" />}
            >
              {confirming
                ? 'Confirming...'
                : `Confirm Payment Received (${sym}${formatCurrency(s.amount)})`}
            </Button>
          </div>
        ) : undefined
      }
    />
  );
};
