import React, { useState } from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { Avatar } from '../../../components/common/Avatar';
import { Chip } from '../../../components/common/Chip';
import { PresenceSegmentedControl } from '../../../components/common/PresenceSegmentedControl';
import { DayOfWeek, DutyDayEntry, User } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import { Icon } from '@iconify/react';
import { Receipt, ShoppingCart, CheckCircle, House, AirplaneTilt } from '@phosphor-icons/react';
import { useI18n } from '../../../i18n/I18nProvider';

interface HomeSidebarProps {
  roommates: User[];
  currentUser: User;
  choreDraftState: {
    state: string;
    actionLabel: string;
    badgeLabel: string;
  };
  todayDuty?: { entry: DutyDayEntry; user: User | null; isMe: boolean; day: DayOfWeek } | null;
  onCompleteTodayDuty?: (day: DayOfWeek) => Promise<void>;
  onUndoTodayDuty?: (day: DayOfWeek) => Promise<void>;
  onToggleHomeStatus: () => void;
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onOpenExpensesAction?: (action: 'add' | 'settle' | 'confirm') => void;
  onOpenShoppingList?: () => void;
  onOpenChoreReveal: () => void;
  onOpenDraftPicks: () => void;
}

export const HomeSidebar: React.FC<HomeSidebarProps> = ({
  roommates,
  currentUser,
  todayDuty,
  onCompleteTodayDuty,
  onUndoTodayDuty,
  onToggleHomeStatus,
  onNavigateTab,
  onOpenExpensesAction,
  onOpenShoppingList,
}) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [finishingDuty, setFinishingDuty] = useState(false);
  const homeCount = roommates.filter((r) => r.isHome).length;
  const canMarkDutyDone = Boolean(todayDuty?.isMe && !todayDuty.entry.completed && onCompleteTodayDuty);

  const handleMarkDutyShortcut = async () => {
    sound.playTap();
    if (canMarkDutyDone && todayDuty && onCompleteTodayDuty && !finishingDuty) {
      setFinishingDuty(true);
      try {
        const completedDay = todayDuty.day;
        await onCompleteTodayDuty(completedDay);
        showToast('Duty day finished! Streak and points updated.', 'success', {
          duration: 5000,
          action: onUndoTodayDuty
            ? {
                label: 'Undo',
                onClick: async () => {
                  await onUndoTodayDuty(completedDay);
                  showToast('Duty completion undone', 'info');
                },
              }
            : undefined,
        });
      } finally {
        setFinishingDuty(false);
      }
      return;
    }
    onNavigateTab('chores');
  };

  return (
    <div className="space-y-6">
      <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4">
        <div className="min-w-0">
          <h3 className="type-section-heading">{t('home.atHomeCount', { home: homeCount, total: roommates.length })}</h3>
        </div>

        <div className="space-y-2.5">
          {roommates.map((r) => {
            const isMe = r.id === currentUser.id;
            return (
              <div
                key={r.id}
                className={`tactile-hover p-2.5 rounded-2xl flex items-center justify-between gap-2.5 border ${
                  isMe
                    ? 'bg-[#F7F8FB] border-[#E2E5EC]'
                    : 'bg-white border-[#F1F3F9]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    src={r.avatar}
                    name={r.name}
                    flag={r.flag}
                    isHome={r.isHome}
                    statusRing={true}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#1F2033] truncate">
                      {isMe ? `${r.name.split(' ')[0]} (${t('common.you')})` : r.name.split(' ')[0]}
                    </p>
                    <p className="type-secondary text-[13px] flex items-center gap-1 min-w-0 truncate">
                      <Icon icon="fluent-emoji-flat:fire" className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {t('home.dayStreak', { count: r.streakDays })} · {t('home.pts', { count: r.points })}
                      </span>
                    </p>
                  </div>
                </div>
                <Chip
                  status={r.isHome ? 'active' : 'away'}
                  label={r.isHome ? 'Home' : 'Away'}
                  size="xs"
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>

        <PresenceSegmentedControl
          isHome={currentUser.isHome}
          className="w-full"
          onSelectHome={() => {
            if (!currentUser.isHome) onToggleHomeStatus();
          }}
          onSelectAway={() => {
            if (currentUser.isHome) onToggleHomeStatus();
          }}
        />
      </InfoCard>

      <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-3">
        <h3 className="type-section-heading">{t('home.quickActions')}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={finishingDuty}
            onClick={handleMarkDutyShortcut}
            className="tactile-hover tactile-press min-h-[82px] p-3.5 rounded-2xl bg-[#EBF9F0] border border-[#BBF7D0] text-start hover:bg-[#DCFCE7] disabled:opacity-60 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2"
          >
            <div className="w-8 h-8 rounded-xl bg-[#0F7A3D] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform duration-150">
              <CheckCircle weight="fill" className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2033] leading-snug">
              {finishingDuty ? 'Finishing...' : 'Mark duty done'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              if (onOpenExpensesAction) {
                onOpenExpensesAction('add');
              } else {
                onNavigateTab('expenses');
              }
            }}
            className="tactile-hover tactile-press min-h-[82px] p-3.5 rounded-2xl bg-[#FFF5F2] border border-[#FFD3C9] text-start hover:bg-[#FFEAE4] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FF6B4A] text-[#1F2033] flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform duration-150">
              <Receipt weight="fill" className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2033] leading-snug">{t('home.addExpense')}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              if (onOpenShoppingList) {
                onOpenShoppingList();
              } else {
                onNavigateTab('feed');
              }
            }}
            className="tactile-hover tactile-press min-h-[82px] p-3.5 rounded-2xl bg-[#FFF9EE] border border-[#FDE047] text-start hover:bg-[#FEF3C7] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FFC93C] text-[#1F2033] flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform duration-150">
              <ShoppingCart weight="fill" className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2033] leading-snug">{t('home.shoppingListAction')}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onToggleHomeStatus();
            }}
            className={`tactile-hover tactile-press min-h-[82px] p-3.5 rounded-2xl border text-start cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A] focus-visible:ring-offset-2 ${
              currentUser.isHome
                ? 'bg-[#E6FAF8] border-[#BBEFEA] hover:bg-[#D1F5F1]'
                : 'bg-[#EEF0FD] border-[#C7D2FE] hover:bg-[#E0E4FC]'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform duration-150 ${
                currentUser.isHome ? 'bg-[#0B7A6E]' : 'bg-[#3B4BC4]'
              }`}
            >
              {currentUser.isHome ? (
                <House weight="fill" className="w-4 h-4" />
              ) : (
                <AirplaneTilt weight="fill" className="w-4 h-4" />
              )}
            </div>
            <p className="text-[14px] font-bold text-[#1F2033] leading-snug">Home / Away</p>
          </button>
        </div>
      </InfoCard>
    </div>
  );
};
