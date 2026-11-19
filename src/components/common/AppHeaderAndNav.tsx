import React, { startTransition } from 'react';
import { Avatar } from './Avatar';
import { AnimatedNumber } from './AnimatedNumber';
import { SyncStatusType } from './SyncStatusPanel';
import { User, Household } from '../../types';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { useI18n } from '../../i18n/I18nProvider';
import { TranslationKey } from '../../i18n';
import {
  House,
  Receipt,
  ChatCircleDots,
  Bell,
  CaretDown,
  CloudCheck,
  CloudSlash,
  ArrowsClockwise,
  CheckCircle,
  Buildings,
  WarningCircle,
} from '@phosphor-icons/react';
import { Icon } from '@iconify/react';

export type AppTab = 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment';

interface NavItemConfig {
  id: AppTab;
  labelKey: TranslationKey;
  renderIcon: (active: boolean) => React.ReactNode;
}

const DESKTOP_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'feed',
    labelKey: 'nav.home',
    renderIcon: (active) => (
      <House weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
    ),
  },
  {
    id: 'chores',
    labelKey: 'nav.chores',
    renderIcon: (active) => (
      <CheckCircle weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
    ),
  },
  {
    id: 'expenses',
    labelKey: 'nav.money',
    renderIcon: (active) => (
      <Receipt weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
    ),
  },
  {
    id: 'chat',
    labelKey: 'nav.chat',
    renderIcon: (active) => (
      <ChatCircleDots weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
    ),
  },
  {
    id: 'apartment',
    labelKey: 'nav.apartment',
    renderIcon: (active) => (
      <Buildings weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
    ),
  },
];

const BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'feed',
    labelKey: 'nav.home',
    renderIcon: (active) => <House weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />,
  },
  {
    id: 'chores',
    labelKey: 'nav.chores',
    renderIcon: (active) => (
      <CheckCircle weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />
    ),
  },
  {
    id: 'expenses',
    labelKey: 'nav.money',
    renderIcon: (active) => <Receipt weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />,
  },
  {
    id: 'chat',
    labelKey: 'nav.chat',
    renderIcon: (active) => (
      <ChatCircleDots weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />
    ),
  },
  {
    id: 'apartment',
    labelKey: 'nav.apartment',
    renderIcon: (active) => (
      <Buildings weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />
    ),
  },
];

interface AppHeaderProps {
  activeHousehold: Household;
  currentUser: User;
  activeTab: AppTab;
  syncStatus: SyncStatusType;
  isOffline: boolean;
  isDemoMode: boolean;
  unreadNotifsCount: number;
  pendingJoinRequestsCount?: number;
  onSelectTab: (tab: AppTab) => void;
  onOpenHouseholdSwitcher: () => void;
  onOpenShowQR: () => void;
  onOpenSyncPanel: () => void;
  onOpenNotifications: () => void;
  onOpenProfileSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = React.memo(
  ({
    activeHousehold,
    currentUser,
    activeTab,
    syncStatus,
    isOffline,
    isDemoMode,
    unreadNotifsCount,
    pendingJoinRequestsCount = 0,
    onSelectTab,
    onOpenHouseholdSwitcher,
    onOpenShowQR,
    onOpenSyncPanel,
    onOpenNotifications,
    onOpenProfileSettings,
  }) => {
    const { t } = useI18n();
    const syncTitleLabel =
      syncStatus === 'syncing'
        ? t('nav.syncing')
        : syncStatus === 'offline'
        ? t('nav.offline')
        : syncStatus === 'needs_attention'
        ? t('nav.needsAttention')
        : t('nav.synced');

    const syncButtonLabel =
      syncStatus === 'syncing'
        ? t('nav.syncing')
        : syncStatus === 'offline'
        ? t('nav.offline')
        : syncStatus === 'needs_attention'
        ? t('nav.attention')
        : t('nav.synced');

    return (
      <header
        className={`sticky top-0 z-30 bg-[#F7F8FB]/95 border-b border-[#E6E8EE] w-full ${
          isOffline || syncStatus === 'offline' || isDemoMode ? '' : 'pt-safe'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 md:flex-initial">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenHouseholdSwitcher();
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white border border-[#E6E8EE] shadow-2xs hover:border-[#CBD5E1] active:scale-[0.98] transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none cursor-pointer min-w-0 shrink"
            >
              <span className="type-section-heading max-w-[215px] sm:max-w-[260px] md:max-w-none truncate text-[14px] sm:text-[18px]">
                {activeHousehold.name}
              </span>
              <CaretDown weight="bold" className="w-3.5 h-3.5 text-[#475569] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenShowQR();
              }}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5F2] border border-[#FFD3C9] text-[14px] font-bold text-[#FF6B4A] hover:bg-[#FFEAE4] active:scale-[0.98] transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0"
              title="Click to view apartment invite code and QR"
            >
              <span className="font-mono tracking-wide font-black">
                {activeHousehold.inviteCode}
              </span>
            </button>
          </div>

          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-0.5 lg:gap-1 p-1 bg-[#EEF0F6] rounded-2xl border border-[#E2E5EC] shrink min-w-0"
          >
            {DESKTOP_NAV_ITEMS.map((tab) => {
              const isActive = activeTab === tab.id;
              const tabLabel = t(tab.labelKey);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    startTransition(() => {
                      onSelectTab(tab.id);
                    });
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-xl text-[14px] font-heading font-black transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-[#1F2430] shadow-xs border border-[#E2E5EC]'
                      : 'text-[#475569] hover:text-[#1F2430] hover:bg-white/60 border border-transparent'
                  }`}
                  title={tabLabel}
                  aria-label={tabLabel}
                >
                  <span
                    className={`transition-colors duration-150 ${
                      isActive ? 'text-[#FF6B4A]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {tab.renderIcon(isActive)}
                  </span>
                  <span className={isActive ? 'inline' : 'hidden lg:inline'}>{tabLabel}</span>
                  {tab.id === 'apartment' && pendingJoinRequestsCount > 0 && (
                    <span className="ms-0.5 min-w-[18px] h-[18px] px-1 bg-[#FF6B4A] text-white rounded-full text-[10px] font-black leading-none flex items-center justify-center shadow-2xs">
                      {pendingJoinRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenSyncPanel();
              }}
              className={`relative w-10 h-10 shrink-0 aspect-square rounded-full p-0 border flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 active:scale-[0.96] transition-[transform,border-color,background-color,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                syncStatus === 'syncing'
                  ? 'bg-[#EEF0FD] border-[#D3D5F9] text-[#5B5BD6]'
                  : syncStatus === 'offline'
                  ? 'bg-[#FFF0ED] border-[#FFD7CF] text-[#E5484D]'
                  : syncStatus === 'needs_attention'
                  ? 'bg-[#FFF8E6] border-[#FFE8A3] text-[#8A6200]'
                  : 'bg-white border-[#E6E8EE] text-[#19B5A5] hover:border-[#19B5A5]'
              }`}
              title={`Sync status: ${syncTitleLabel}. Tap to open sync details.`}
              aria-label="Apartment sync status"
            >
              {syncStatus === 'syncing' ? (
                <ArrowsClockwise
                  weight="duotone"
                  className="w-5 h-5 shrink-0 animate-spin text-[#5B5BD6]"
                />
              ) : syncStatus === 'offline' ? (
                <CloudSlash weight="duotone" className="w-5 h-5 shrink-0 text-[#E5484D]" />
              ) : syncStatus === 'needs_attention' ? (
                <WarningCircle weight="duotone" className="w-5 h-5 shrink-0 text-[#8A6200]" />
              ) : (
                <CloudCheck weight="duotone" className="w-5 h-5 shrink-0 text-[#19B5A5]" />
              )}
              <span className="sr-only">{syncButtonLabel}</span>
            </button>

            {/* Phase 2: Favor Token Pill */}
            <button
              type="button"
              onClick={() => {
                haptics.tokenClink();
                sound.tokenClink();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-[#FFF8E6] border border-[#FDE68A] text-[#B45309] font-black text-xs shadow-2xs shrink-0 select-none active:scale-[0.96] transition-transform cursor-pointer whitespace-nowrap"
              title="Favor Tokens: Spend to swap chores or ask a roommate favor!"
              aria-label={`Favor Tokens: ${currentUser.favorTokens ?? 5}`}
            >
              <Icon icon="fluent-emoji-flat:coin" className="w-4 h-4 shrink-0" />
              <AnimatedNumber value={currentUser.favorTokens ?? 5} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (unreadNotifsCount > 0) {
                  haptics.notificationPing();
                  sound.notificationPing();
                } else {
                  sound.playTap();
                }
                onOpenNotifications();
              }}
              className="relative w-10 h-10 shrink-0 aspect-square rounded-full p-0 bg-white border border-[#E6E8EE] flex items-center justify-center text-[#1F2430] hover:border-[#FF6B4A] active:scale-[0.96] shadow-2xs transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2"
              aria-label={t('nav.openNotifications')}
            >
              <Bell weight={unreadNotifsCount > 0 ? 'fill' : 'duotone'} className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-[#FF6B4A] text-white rounded-full text-[10px] font-extrabold leading-none flex items-center justify-center border-2 border-white">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenProfileSettings();
              }}
              className="w-10 h-10 shrink-0 aspect-square rounded-full p-0 flex items-center justify-center hover:ring-2 hover:ring-[#FF6B4A] active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none cursor-pointer"
              aria-label={t('nav.profileSettings')}
            >
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                flag={currentUser.flag}
                size="sm"
              />
            </button>
          </div>
        </div>
      </header>
    );
  }
);
AppHeader.displayName = 'AppHeader';

interface AppBottomNavProps {
  activeTab: AppTab;
  pendingJoinRequestsCount?: number;
  onSelectTab: (tab: AppTab) => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = React.memo(
  ({ activeTab, pendingJoinRequestsCount = 0, onSelectTab }) => {
    const { t } = useI18n();
    return (
      <nav
        aria-label="Main Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-[#F7F8FB]/95 border-t border-[#E6E8EE] px-2 pt-2 pb-[calc(0.5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] flex items-center justify-around z-30 shadow-lg"
      >
        {BOTTOM_NAV_ITEMS.map((tabItem) => {
          const isActive = activeTab === tabItem.id;
          const showJoinBadge = tabItem.id === 'apartment' && pendingJoinRequestsCount > 0;
          const itemLabel = t(tabItem.labelKey);
          return (
            <button
              key={tabItem.id}
              onClick={() => {
                sound.playTap();
                startTransition(() => {
                  onSelectTab(tabItem.id);
                });
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl min-h-[48px] min-w-[58px] transition-[transform,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.95] motion-reduce:transition-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 ${
                isActive
                  ? 'text-[#FF6B4A] font-extrabold'
                  : 'text-[#475569] hover:text-[#1F2430]'
              }`}
              aria-label={itemLabel}
            >
              <div
                className={`relative p-1 rounded-xl transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive ? 'bg-[#FFF0ED] scale-105' : 'bg-transparent scale-100'
                }`}
              >
                {tabItem.renderIcon(isActive)}
                {showJoinBadge && (
                  <span className="absolute -top-1 -end-1.5 min-w-[17px] h-[17px] px-1 bg-[#FF6B4A] text-white rounded-full text-[10px] font-black leading-none flex items-center justify-center border-2 border-white shadow-xs">
                    {pendingJoinRequestsCount}
                  </span>
                )}
              </div>
              <span className="text-[13px] font-bold mt-0.5 leading-none">{itemLabel}</span>
            </button>
          );
        })}
      </nav>
    );
  }
);
AppBottomNav.displayName = 'AppBottomNav';
