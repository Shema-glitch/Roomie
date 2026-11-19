import React from 'react';
import { WifiSlash, ArrowsClockwise } from '@phosphor-icons/react';
import { useI18n } from '../../i18n/I18nProvider';

interface OfflineBannerProps {
  isOffline: boolean;
  onToggle: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, onToggle }) => {
  const { t } = useI18n();
  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-[#1F2430] text-white sticky top-0 z-40 border-b border-[#374151] pt-safe"
    >
      <div className="px-4 py-2 text-[14px] font-normal flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <WifiSlash weight="duotone" className="w-4 h-4 text-[#FFC93C] shrink-0" />
          <span className="truncate">{t('banner.offline')}</span>
        </div>
        <button
          onClick={onToggle}
          className="text-[14px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" /> {t('sync.syncNow')}
        </button>
      </div>
    </div>
  );
};
