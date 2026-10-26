import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
  onToggle: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, onToggle }) => {
  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-[#1F2430] text-white px-4 py-2 text-[14px] font-normal flex items-center justify-between sticky top-0 z-40 border-b border-[#374151]"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-[#FFC93C]" />
        <span>Working offline — changes are saved locally</span>
      </div>
      <button
        onClick={onToggle}
        className="text-[14px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-xl cursor-pointer flex items-center gap-1.5"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Reconnect
      </button>
    </div>
  );
};
