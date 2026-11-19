import React from 'react';
import { CenterDialog } from '../ui/overlays';
import { MascotView } from './MascotView';
import { Button } from './Button';
import { AppReleaseInfo } from '../../services/appUpdate';
import { DownloadSimple, Sparkle } from '@phosphor-icons/react';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { useI18n } from '../../i18n/I18nProvider';

interface AppUpdateModalProps {
  release: AppReleaseInfo | null;
  onDismiss: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ release, onDismiss }) => {
  const { t } = useI18n();
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
      title={t('update.title')}
      subtitle={t('update.subtitle', { version: release.versionName })}
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
            {t('update.download')}
          </Button>
          {!release.isMandatory && (
            <Button variant="outline" size="sm" fullWidth onClick={onDismiss}>
              {t('common.later')}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-center">
        <div className="flex justify-center pt-1">
          <MascotView state="celebrating" size="md" bubbleText={t('update.title')} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] border border-[#FFD3C9] text-xs font-black text-[#B83B1D]">
          <Sparkle weight="fill" className="w-3.5 h-3.5" />
          <span>v{release.versionName}</span>
        </div>

        {release.releaseNotes && (
          <div className="p-3.5 rounded-2xl bg-[#F7F8FB] border border-[#E5E9F0] text-start">
            <span className="text-xs font-black uppercase tracking-wider text-[#4B5063] block mb-1">
              {t('update.whatsNew')}
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
