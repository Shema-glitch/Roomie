import React from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { Button } from '../../../components/common/Button';
import { Avatar } from '../../../components/common/Avatar';
import { Chip } from '../../../components/common/Chip';
import { User } from '../../../types';
import { sound } from '../../../services/sound';
import { Icon } from '@iconify/react';
import { Receipt, ArrowsClockwise } from '@phosphor-icons/react';
import { useI18n } from '../../../i18n/I18nProvider';
import { localizeChoreDraftState } from '../../../i18n/helpers';
import type { ChoreDraftStateInfo } from '../../../utils/stateTable';

interface HomeSidebarProps {
  roommates: User[];
  currentUser: User;
  choreDraftState: {
    state: string;
    actionLabel: string;
    badgeLabel: string;
  };
  onToggleHomeStatus: () => void;
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onOpenExpensesAction?: (action: 'add' | 'settle' | 'confirm') => void;
  onOpenChoreReveal: () => void;
  onOpenDraftPicks: () => void;
}

export const HomeSidebar: React.FC<HomeSidebarProps> = ({
  roommates,
  currentUser,
  choreDraftState,
  onToggleHomeStatus,
  onNavigateTab,
  onOpenExpensesAction,
  onOpenChoreReveal,
  onOpenDraftPicks,
}) => {
  const { t } = useI18n();
  const homeCount = roommates.filter((r) => r.isHome).length;
  const localizedDraft = localizeChoreDraftState(
    choreDraftState as ChoreDraftStateInfo,
    t
  );

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
                className={`p-2.5 rounded-2xl flex items-center justify-between gap-2.5 border transition-all ${
                  isMe
                    ? 'bg-[#F7F8FB] border-[#E2E5EC]'
                    : 'bg-white border-[#F1F3F9] hover:border-[#E2E5EC]'
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
                    <p className="text-[14px] font-bold text-[#1F2430] truncate">
                      {isMe ? `${r.name.split(' ')[0]} (${t('common.you')})` : r.name.split(' ')[0]}
                    </p>
                    <p className="type-secondary text-[13px] flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="fluent-emoji-flat:fire" className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {t('home.dayStreak', { count: r.streakDays })} · {t('home.pts', { count: r.points })}
                      </span>
                    </p>
                  </div>
                </div>
                <Chip
                  status={r.isHome ? 'active' : 'away'}
                  label={r.isHome ? t('home.imHome') : t('home.away')}
                  size="xs"
                />
              </div>
            );
          })}
        </div>

        <Button variant="secondary" size="sm" fullWidth onClick={onToggleHomeStatus}>
          {currentUser.isHome ? t('home.away') : t('home.imHome')}
        </Button>
      </InfoCard>

      <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-3">
        <h3 className="type-section-heading">{t('home.quickActions')}</h3>
        <div className="grid grid-cols-2 gap-2.5">
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
            className="p-3 rounded-2xl bg-[#FFF5F2] border border-[#FFD3C9] text-start hover:bg-[#FFEAE4] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FF6B4A] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform duration-150">
              <Receipt weight="fill" className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2430]">{t('home.addExpense')}</p>
            <p className="text-[14px] text-[#475569]">{t('home.expensesTile')}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              if (choreDraftState.state === 'reveal_ready') {
                onOpenChoreReveal();
              } else if (choreDraftState.state === 'reveal_done') {
                onNavigateTab('chores');
              } else {
                onOpenDraftPicks();
              }
            }}
            className="p-3 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] text-start hover:bg-[#EDE9FE] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#5B5BD6] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform duration-150">
              <ArrowsClockwise weight="bold" className="w-4 h-4" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2430]">
              {choreDraftState.state === 'reveal_done'
                ? t('chores.scheduleTitle')
                : localizedDraft.actionLabel}
            </p>
            <p className="text-[14px] text-[#475569]">
              {choreDraftState.state === 'reveal_done'
                ? t('home.myTasks')
                : localizedDraft.badgeLabel}
            </p>
          </button>
        </div>
      </InfoCard>
    </div>
  );
};
