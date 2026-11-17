import React from 'react';
import { CenterDialog } from '../ui/overlays';
import { MascotView } from './MascotView';
import { Button } from './Button';
import { AppReleaseInfo } from '../../services/appUpdate';
import { DownloadSimple, Sparkle } from '@phosphor-icons/react';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';

interface AppUpdateModalProps {
  release: AppReleaseInfo | null;
  onDismiss: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ release, onDismiss }) => {
  if (!release) return null;

  const handleDownload = () => {
    sound.playTap();
    haptics.tokenClink();
    if (typeof window !== 'undefined') {
      window.open(release.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <CenterDialog
      isOpen={Boolean(release)}
      onClose={release.isMandatory ? () => {} : onDismiss}
      showClose={!release.isMandatory}
      title="New Roomie Update"
      subtitle={`Version ${release.versionName} is ready to install`}
      maxWidth="sm"
      footer={
        <div className="space-y-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleDownload}
            icon={<DownloadSimple weight="bold" className="w-4 h-4" />}
          >
            Download Update
          </Button>
          {!release.isMandatory && (
            <Button variant="outline" size="sm" fullWidth onClick={onDismiss}>
              Later
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-center">
        <div className="flex justify-center pt-1">
          <MascotView state="celebrating" size="md" bubbleText="Fresh update ready!" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] border border-[#FFD3C9] text-xs font-black text-[#FF6B4A]">
          <Sparkle weight="fill" className="w-3.5 h-3.5" />
          <span>v{release.versionName}</span>
        </div>

        {release.releaseNotes && (
          <div className="p-3.5 rounded-2xl bg-[#F7F8FB] border border-[#E5E9F0] text-left">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] block mb-1">
              What&apos;s New
            </span>
            <p className="text-xs font-medium text-[#1F2430] leading-relaxed whitespace-pre-line">
              {release.releaseNotes}
            </p>
          </div>
        )}
      </div>
    </CenterDialog>
  );
};
