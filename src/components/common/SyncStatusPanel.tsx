import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { CloudCheck, CloudSlash, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { outbox } from '../../services/outbox';
import { useI18n } from '../../i18n/I18nProvider';

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'needs_attention';

interface SyncStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatusType;
  lastSyncedTime: string;
  onTriggerSync: () => void;
  householdName?: string;
}

export const SyncStatusPanel: React.FC<SyncStatusPanelProps> = ({
  isOpen,
  onClose,
  status,
  lastSyncedTime,
  onTriggerSync,
  householdName = 'Your Apartment',
}) => {
  const { t } = useI18n();
  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          label: t('nav.syncing'),
          color: 'indigo' as const,
          icon: <ArrowsClockwise weight="duotone" className="w-5 h-5 animate-spin" />,
          pillClass: 'bg-[#EEF0FD] text-[#5B5BD6] border-[#D3D5F9]',
          description: 'Reconciling ledger, chore assignments, and live roomie presence with the apartment database.',
        };
      case 'offline':
        return {
          label: t('nav.offline'),
          color: 'slate' as const,
          icon: <CloudSlash weight="duotone" className="w-5 h-5" />,
          pillClass: 'bg-[#FFF0ED] text-[#E5484D] border-[#FFD7CF]',
          description: t('banner.offline'),
        };
      case 'needs_attention':
        return {
          label: t('nav.needsAttention'),
          color: 'amber' as const,
          icon: <WarningCircle weight="duotone" className="w-5 h-5" />,
          pillClass: 'bg-[#FFF8E6] text-[#8A6200] border-[#FFE8A3]',
          description: t('sync.subtitle'),
        };
      case 'synced':
      default:
        return {
          label: t('nav.synced'),
          color: 'green' as const,
          icon: <CloudCheck weight="duotone" className="w-5 h-5" />,
          pillClass: 'bg-[#E6FAF8] text-[#19B5A5] border-[#97E5DE]',
          description: t('sync.allUpToDate'),
        };
    }
  };

  const config = getStatusConfig();
  const pendingCount = outbox.getPendingCount();
  const quarantinedCount = outbox.getQuarantinedCount();
  const queueLabel =
    quarantinedCount > 0
      ? `${quarantinedCount} needs retry`
      : pendingCount > 0
      ? `${pendingCount} queued`
      : 'All caught up';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('sync.title')}
      subtitle={householdName}
    >
      <div className="space-y-4">
        {/* Status Highlight Card */}
        <Card padding="md" variant="calm" className="bg-[#F7F8FB] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconTile icon={config.icon} color={config.color} size="md" />
              <div>
                <span className="type-label block">Connection</span>
                <h4 className="type-section-heading">
                  {config.label}
                </h4>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full border text-[14px] font-bold ${config.pillClass}`}
            >
              {config.label}
            </span>
          </div>

          <p className="type-secondary leading-relaxed">
            {config.description}
          </p>

          <div className="pt-2 border-t border-[#E6E8EE] flex items-center justify-between type-secondary text-[14px]">
            <span>Last sync: <strong>{lastSyncedTime}</strong></span>
            <span>Queue: <strong>{queueLabel}</strong></span>
          </div>
        </Card>

        {/* Primary Sync Action */}
        <div className="pt-1">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              onTriggerSync();
            }}
            disabled={status === 'syncing'}
            icon={status === 'syncing' ? <ArrowsClockwise weight="fill" className="w-4 h-4 animate-spin" /> : <CloudCheck weight="fill" className="w-4 h-4" />}
          >
            {status === 'syncing' ? t('sync.syncingNow') : t('sync.syncNow')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
