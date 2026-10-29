import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { CloudCheck, CloudOff, RefreshCw, AlertCircle, Check, Wifi, WifiOff } from 'lucide-react';

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'needs_attention';

interface SyncStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatusType;
  onSetStatus: (status: SyncStatusType) => void;
  lastSyncedTime: string;
  onTriggerSync: () => void;
  householdName?: string;
}

export const SyncStatusPanel: React.FC<SyncStatusPanelProps> = ({
  isOpen,
  onClose,
  status,
  onSetStatus,
  lastSyncedTime,
  onTriggerSync,
  householdName = 'Your Apartment',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          label: 'Syncing',
          color: 'indigo' as const,
          icon: <RefreshCw className="w-5 h-5 animate-spin" />,
          pillClass: 'bg-[#EEF0FD] text-[#5B5BD6] border-[#D3D5F9]',
          description: 'Reconciling ledger, chore assignments, and live roomie presence with the apartment database.',
        };
      case 'offline':
        return {
          label: 'Offline',
          color: 'slate' as const,
          icon: <CloudOff className="w-5 h-5" />,
          pillClass: 'bg-[#FFF0ED] text-[#E5484D] border-[#FFD7CF]',
          description: 'Working in offline mode. All chores and logged expenses are safely cached locally and will sync when you reconnect.',
        };
      case 'needs_attention':
        return {
          label: 'Needs attention',
          color: 'amber' as const,
          icon: <AlertCircle className="w-5 h-5" />,
          pillClass: 'bg-[#FFF8E6] text-[#8A6200] border-[#FFE8A3]',
          description: 'A shared ledger update requires resolution. Tap "Sync now" to fetch the latest state from your roomies.',
        };
      case 'synced':
      default:
        return {
          label: 'Synced',
          color: 'green' as const,
          icon: <CloudCheck className="w-5 h-5" />,
          pillClass: 'bg-[#E6FAF8] text-[#19B5A5] border-[#97E5DE]',
          description: 'All apartment changes, expenses, and chore rotations are backed up and live across roomies.',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sync status"
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
            <span>Database: <strong>Live</strong></span>
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
            icon={status === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudCheck className="w-4 h-4" />}
          >
            {status === 'syncing' ? 'Syncing...' : status === 'offline' ? 'Reconnect & Sync' : 'Sync now'}
          </Button>
        </div>

        {/* Mode Switchers for Testing / Offline Usage */}
        <div className="pt-2 border-t border-[#E6E8EE] space-y-2">
          <span className="type-label block text-[#64748B]">Simulate mode</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSetStatus(status === 'offline' ? 'synced' : 'offline')}
              icon={status === 'offline' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            >
              {status === 'offline' ? 'Go online' : 'Go offline'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSetStatus(status === 'needs_attention' ? 'synced' : 'needs_attention')}
              icon={<AlertCircle className="w-3.5 h-3.5" />}
            >
              {status === 'needs_attention' ? 'Clear alert' : 'Trigger alert'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
