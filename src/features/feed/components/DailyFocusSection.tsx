import React from 'react';
import { ActionCard } from '../../../components/common/ActionCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { SectionTitle } from '../../../components/common/SectionTitle';
import { Chore, ChoreAssignment } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import { Icon } from '@iconify/react';
import {
  CheckCircle,
  Wallet,
  Bell,
  Receipt,
} from '@phosphor-icons/react';

interface DailyFocusSectionProps {
  myTodayChore: Chore | null | undefined;
  myTodayAssignment: ChoreAssignment | undefined;
  netBalance: number;
  currencySymbol: string;
  onSelectDoneChore: (chore: Chore) => void;
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onRemindRoomies?: () => Promise<void>;
  onOpenExpensesAction?: (action: 'add' | 'settle' | 'confirm') => void;
}

export const DailyFocusSection: React.FC<DailyFocusSectionProps> = ({
  myTodayChore,
  myTodayAssignment,
  netBalance,
  currencySymbol: sym,
  onSelectDoneChore,
  onNavigateTab,
  onRemindRoomies,
  onOpenExpensesAction,
}) => {
  const { showToast } = useToast();

  return (
    <div>
      <SectionTitle
        title="Today's priority focus"
        subtitle="Immediate action items for your apartment"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          tint="teal"
          iconTile={
            <IconTile
              icon={
                myTodayChore ? (
                  <Icon icon="fluent-emoji-flat:broom" className="w-6 h-6" />
                ) : (
                  <Icon icon="fluent-emoji-flat:trophy" className="w-6 h-6" />
                )
              }
              color="teal"
              size="md"
            />
          }
          title={myTodayChore ? myTodayChore.name : 'All chores done'}
          subtitle={
            myTodayChore
              ? `${myTodayChore.frequency === 'daily' ? 'Daily' : 'Weekly'} · ${
                  myTodayChore.effortLevel.charAt(0).toUpperCase() +
                  myTodayChore.effortLevel.slice(1)
                } · ${myTodayAssignment?.scheduledTime}`
              : 'Kitchen and living area are clean'
          }
          detail={
            myTodayChore ? (
              <span className="type-secondary text-[#19B5A5] font-bold text-[14px]">
                Earn +
                {(myTodayChore.effortLevel === 'heavy'
                  ? 3
                  : myTodayChore.effortLevel === 'medium'
                  ? 2
                  : 1) * 10}{' '}
                streak points
              </span>
            ) : (
              <span className="type-secondary text-[#19B5A5] font-bold text-[14px]">
                Streak protected for today
              </span>
            )
          }
          actions={
            myTodayChore ? (
              <div className="w-full grid grid-cols-2 gap-3">
                <Button
                  variant="teal"
                  size="md"
                  onClick={() => onSelectDoneChore(myTodayChore)}
                  icon={<CheckCircle weight="fill" className="w-4 h-4" />}
                >
                  Done
                </Button>
                <Button variant="secondary" size="md" onClick={() => onNavigateTab('chores')}>
                  Schedule
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => onNavigateTab('chores')}
              >
                Open chores hub
              </Button>
            )
          }
        />

        <ActionCard
          tint="green"
          iconTile={<IconTile icon={<Wallet className="w-6 h-6" />} color="green" size="md" />}
          title={
            <div className="flex items-baseline gap-2">
              <span className="type-big-number">
                {netBalance > 0.05 ? (
                  <span className="text-[#2CA358]">
                    +{sym}
                    {netBalance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : netBalance < -0.05 ? (
                  <span className="text-[#E5484D]">
                    -{sym}
                    {Math.abs(netBalance).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : (
                  <span className="text-[#1F2430]">{sym}0.00</span>
                )}
              </span>
            </div>
          }
          subtitle={
            netBalance > 0.05
              ? 'You are owed by roomies'
              : netBalance < -0.05
              ? 'You owe shared balance'
              : 'All roomie expenses settled'
          }
          detail={
            <span className="type-secondary text-[14px]">
              Simplified across all shared purchases
            </span>
          }
          actions={
            <div className="w-full grid grid-cols-2 gap-3">
              {netBalance > 0.05 ? (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={async () => {
                      sound.playTap();
                      if (onRemindRoomies) {
                        await onRemindRoomies();
                        showToast('Reminder posted to flat chat!', 'success');
                      } else {
                        onNavigateTab('expenses');
                      }
                    }}
                    icon={<Bell weight="fill" className="w-4 h-4" />}
                  >
                    Remind
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      sound.playTap();
                      if (onOpenExpensesAction) {
                        onOpenExpensesAction('confirm');
                      } else {
                        onNavigateTab('expenses');
                      }
                    }}
                  >
                    Confirm payment
                  </Button>
                </>
              ) : netBalance < -0.05 ? (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      sound.playTap();
                      if (onOpenExpensesAction) {
                        onOpenExpensesAction('settle');
                      } else {
                        onNavigateTab('expenses');
                      }
                    }}
                    icon={<Receipt weight="fill" className="w-4 h-4" />}
                  >
                    Settle up
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => onNavigateTab('expenses')}>
                    Ledger
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => onNavigateTab('expenses')}
                >
                  View ledger
                </Button>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
};
