import React from 'react';
import { Home } from 'lucide-react';

interface DemoModeBannerProps {
  householdName?: string;
  onSetupRealFlat: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  householdName,
  onSetupRealFlat,
}) => {
  return (
    <div
      role="status"
      className="bg-[#FFF8E6] text-[#8A6300] sticky top-0 z-40 border-b border-[#FFDDA0] pt-safe"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 text-[12px] sm:text-[13px] font-medium flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-[#FFE8A3] text-[#7A5200] shrink-0">
            Demo
          </span>
          <span className="truncate">
            Previewing {householdName || 'sample flat'}
          </span>
        </div>
        <button
          type="button"
          onClick={onSetupRealFlat}
          className="text-[12px] font-bold bg-[#FF6B4A] hover:bg-[#E85635] text-white px-2.5 py-1 rounded-xl cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
        >
          <Home className="w-3 h-3" />
          <span>My real flat</span>
        </button>
      </div>
    </div>
  );
};
