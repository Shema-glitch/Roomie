import React from 'react';
import { Avatar } from './Avatar';
import { SyncStatusType } from './SyncStatusPanel';
import { User, Household } from '../../types';
import { sound } from '../../services/sound';
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

export type AppTab = 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment';

interface AppHeaderProps {
  activeHousehold: Household;
  currentUser: User;
  activeTab: AppTab;
  syncStatus: SyncStatusType;
  isOffline: boolean;
  isDemoMode: boolean;
  unreadNotifsCount: number;
  onSelectTab: (tab: AppTab) => void;
  onOpenHouseholdSwitcher: () => void;
  onOpenShowQR: () => void;
  onOpenSyncPanel: () => void;
  onOpenNotifications: () => void;
  onOpenProfileSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeHousehold,
  currentUser,
  activeTab,
  syncStatus,
  isOffline,
  isDemoMode,
  unreadNotifsCount,
  onSelectTab,
  onOpenHouseholdSwitcher,
  onOpenShowQR,
  onOpenSyncPanel,
  onOpenNotifications,
  onOpenProfileSettings,
}) => {
  const navItems: {
    id: AppTab;
    label: string;
    renderIcon: (active: boolean) => React.ReactNode;
  }[] = [
    {
      id: 'feed',
      label: 'Home',
      renderIcon: (active) => (
        <House weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
      ),
    },
    {
      id: 'chores',
      label: 'Chores',
      renderIcon: (active) => (
        <CheckCircle weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
      ),
    },
    {
      id: 'expenses',
      label: 'Money',
      renderIcon: (active) => (
        <Receipt weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
      ),
    },
    {
      id: 'chat',
      label: 'Chat',
      renderIcon: (active) => (
        <ChatCircleDots weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
      ),
    },
    {
      id: 'apartment',
      label: 'Apartment',
      renderIcon: (active) => (
        <Buildings weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
      ),
    },
  ];

  const syncTitleLabel =
    syncStatus === 'syncing'
      ? 'Syncing'
      : syncStatus === 'offline'
      ? 'Offline'
      : syncStatus === 'needs_attention'
      ? 'Needs attention'
      : 'Synced';

  const syncButtonLabel =
    syncStatus === 'syncing'
      ? 'Syncing'
      : syncStatus === 'offline'
      ? 'Offline'
      : syncStatus === 'needs_attention'
      ? 'Attention'
      : 'Synced';

  return (
    <header
      className={`sticky top-0 z-30 bg-[#F7F8FB]/95 backdrop-blur-md border-b border-[#E6E8EE] w-full ${
        isOffline || syncStatus === 'offline' || isDemoMode ? '' : 'pt-safe'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenHouseholdSwitcher();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white border border-[#E6E8EE] shadow-2xs hover:border-[#CBD5E1] active:scale-[0.98] transition-all duration-150 ease-out motion-reduce:transition-none cursor-pointer max-w-full min-w-0"
          >
            <span className="type-section-heading max-w-[135px] sm:max-w-[200px] md:max-w-none truncate text-[15px] sm:text-[18px]">
              {activeHousehold.name}
            </span>
            <CaretDown weight="bold" className="w-4 h-4 text-[#475569] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenShowQR();
            }}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5F2] border border-[#FFD3C9] text-[14px] font-bold text-[#FF6B4A] hover:bg-[#FFEAE4] active:scale-[0.98] transition-all duration-150 ease-out motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0"
            title="Click to view apartment invite code and QR"
          >
            <span className="font-mono tracking-wide font-black">{activeHousehold.inviteCode}</span>
          </button>
        </div>

        <nav
          aria-label="Desktop Navigation"
          className="hidden md:flex items-center gap-0.5 lg:gap-1 p-1 bg-[#EEF0F6] rounded-2xl border border-[#E2E5EC] shrink min-w-0"
        >
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  onSelectTab(tab.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-xl text-[14px] font-heading font-black transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white text-[#1F2430] shadow-xs border border-[#E2E5EC]'
                    : 'text-[#475569] hover:text-[#1F2430] hover:bg-white/60 border border-transparent'
                }`}
                title={tab.label}
                aria-label={tab.label}
              >
                <span
                  className={`transition-colors duration-150 ${
                    isActive ? 'text-[#FF6B4A]' : 'text-[#94A3B8]'
                  }`}
                >
                  {tab.renderIcon(isActive)}
                </span>
                <span className={isActive ? 'inline' : 'hidden lg:inline'}>{tab.label}</span>
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
            className={`min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-2xl border flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 active:scale-[0.98] transition-all duration-150 ease-out motion-reduce:transition-none ${
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
              <ArrowsClockwise weight="duotone" className="w-4 h-4 shrink-0 animate-spin text-[#5B5BD6]" />
            ) : syncStatus === 'offline' ? (
              <CloudSlash weight="duotone" className="w-4 h-4 shrink-0 text-[#E5484D]" />
            ) : syncStatus === 'needs_attention' ? (
              <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-[#8A6200]" />
            ) : (
              <CloudCheck weight="duotone" className="w-4 h-4 shrink-0 text-[#19B5A5]" />
            )}
            <span
              className={`type-secondary font-bold text-[12px] sm:text-[14px] whitespace-nowrap ${
                syncStatus === 'synced'
                  ? 'hidden sm:inline text-[#19B5A5]'
                  : syncStatus === 'syncing'
                  ? 'text-[#5B5BD6]'
                  : syncStatus === 'offline'
                  ? 'text-[#E5484D]'
                  : 'text-[#8A6200]'
              }`}
            >
              {syncButtonLabel}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              onOpenNotifications();
            }}
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white border border-[#E6E8EE] flex items-center justify-center relative text-[#1F2430] hover:border-[#FF6B4A] active:scale-[0.96] shadow-2xs transition-all duration-150 ease-out motion-reduce:transition-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2"
            aria-label="Open notifications"
          >
            <Bell weight={unreadNotifsCount > 0 ? 'fill' : 'duotone'} className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[20px] h-5 px-1 bg-[#FF6B4A] text-white rounded-full text-[11px] font-extrabold leading-none flex items-center justify-center border-2 border-white">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              sound.playTap();
              onOpenProfileSettings();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:ring-2 hover:ring-[#FF6B4A] active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 transition-all duration-150 ease-out motion-reduce:transition-none cursor-pointer"
            aria-label="Open profile settings"
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
};

interface AppBottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: {
    id: AppTab;
    label: string;
    renderIcon: (active: boolean) => React.ReactNode;
  }[] = [
    {
      id: 'feed',
      label: 'Home',
      renderIcon: (active) => <House weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />,
    },
    {
      id: 'chores',
      label: 'Chores',
      renderIcon: (active) => (
        <CheckCircle weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />
      ),
    },
    {
      id: 'expenses',
      label: 'Money',
      renderIcon: (active) => <Receipt weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />,
    },
    {
      id: 'chat',
      label: 'Chat',
      renderIcon: (active) => (
        <ChatCircleDots weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />
      ),
    },
    {
      id: 'apartment',
      label: 'Apartment',
      renderIcon: (active) => (
        <Buildings weight={active ? 'fill' : 'duotone'} className="w-5 h-5" />
      ),
    },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-[#E6E8EE] px-2 pt-2 pb-[calc(0.5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] flex items-center justify-around z-30 shadow-lg"
    >
      {navItems.map((tabItem) => {
        const isActive = activeTab === tabItem.id;
        return (
          <button
            key={tabItem.id}
            onClick={() => {
              sound.playTap();
              onSelectTab(tabItem.id);
            }}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl min-h-[48px] min-w-[58px] transition-all duration-150 ease-out active:scale-[0.95] motion-reduce:transition-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/70 focus-visible:ring-offset-2 ${
              isActive
                ? 'text-[#FF6B4A] font-extrabold'
                : 'text-[#475569] hover:text-[#1F2430]'
            }`}
            aria-label={tabItem.label}
          >
            <div
              className={`p-1 rounded-xl transition-all duration-150 ease-out ${
                isActive ? 'bg-[#FFF0ED] scale-105' : 'bg-transparent scale-100'
              }`}
            >
              {tabItem.renderIcon(isActive)}
            </div>
            <span className="text-[14px] font-bold mt-0.5 leading-none">{tabItem.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
