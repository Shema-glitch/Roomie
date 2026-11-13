import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { IconTile } from '../../components/common/IconTile';
import { InAppNotification, DraftRound, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { Bell, CheckCircle, Receipt, Buildings, Clock, Shuffle, ShieldWarning } from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { getChoreDraftState } from '../../utils/stateTable';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  draftRound?: DraftRound | null;
  currentUser?: User | null;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onActionClick: (target: { screen: string; id?: string }) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  draftRound,
  currentUser,
  onMarkRead,
  onMarkAllRead,
  onActionClick,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'chore' | 'expense'>('all');

  const draftState = getChoreDraftState(draftRound, currentUser?.id || '');

  const filtered = notifications
    .filter((n) => {
      if (filter === 'all') return true;
      return n.type === filter;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSnooze = (id: string) => {
    sound.playTap();
    onMarkRead(id);
    showToast('Reminder snoozed for 30 minutes', 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle="Gentle updates & reminders"
    >
      <div className="space-y-4">
        {/* Filter pills & Mark All Read */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'chore', label: 'Chores' },
              { id: 'expense', label: 'Money' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[14px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-[#1F2430] text-white'
                    : 'bg-[#F7F8FB] text-[#64748B] border border-[#E6E8EE]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onMarkAllRead();
              showToast('All notifications marked as read', 'info');
            }}
            className="text-[14px] font-bold text-[#FF6B4A] hover:underline whitespace-nowrap cursor-pointer"
          >
            Mark all read
          </button>
        </div>

        {/* Single-Source Chore Draft State Banner */}
        {draftState.state !== 'reveal_done' && (
          <div className="p-3.5 rounded-2xl bg-[#EEF0FD] border border-[#C7D2FE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <IconTile icon={<Shuffle className="w-5 h-5" />} color="indigo" size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-bold text-[#1F2430]">{draftState.bannerTitle}</p>
                  <Chip variant="info" size="xs" label={draftState.badgeLabel} />
                </div>
                <p className="text-[13px] text-[#475569]">{draftState.bannerSubtitle}</p>
              </div>
            </div>
            <div className="w-full sm:w-auto shrink-0 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  onClose();
                  onActionClick({ screen: draftState.state === 'reveal_ready' ? 'chore-reveal' : 'chore-draft' });
                }}
              >
                {draftState.actionLabel}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 type-secondary">
              <Bell className="w-8 h-8 mx-auto text-[#64748B]/40 mb-2" />
              All caught up! No unread notifications.
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl border transition-all ${
                  !n.read
                    ? n.type === 'privacy_alert'
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-[#FFF0ED]/40 border-[#FFD7CF]'
                    : 'bg-white border-[#E6E8EE]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    <IconTile
                      icon={
                        n.type === 'privacy_alert' ? (
                          <ShieldWarning className="w-4 h-4" />
                        ) : n.type === 'chore' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : n.type === 'expense' ? (
                          <Receipt className="w-4 h-4" />
                        ) : (
                          <Buildings className="w-4 h-4" />
                        )
                      }
                      color={
                        n.type === 'privacy_alert'
                          ? 'amber'
                          : n.type === 'chore'
                          ? 'teal'
                          : n.type === 'expense'
                          ? 'coral'
                          : 'indigo'
                      }
                      size="sm"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="type-section-heading">
                          {n.title}
                        </h4>
                        {n.type === 'privacy_alert' && (
                          <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 tracking-wider">
                            Privacy Notice
                          </span>
                        )}
                      </div>
                      <p className="type-secondary mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                      <span className="type-secondary block mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {!n.read && (
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${n.type === 'privacy_alert' ? 'bg-amber-500' : 'bg-[#FF6B4A]'}`} />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-[#E6E8EE]/60">
                  {n.type === 'chore' && (
                    <button
                      onClick={() => handleSnooze(n.id)}
                      className="type-secondary font-bold text-[#64748B] hover:text-[#1F2430] flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" /> Snooze 30m
                    </button>
                  )}
                  {n.linkTarget && (
                    <button
                      onClick={() => {
                        onMarkRead(n.id);
                        onClose();
                        onActionClick(n.linkTarget!);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-white text-[14px] font-bold cursor-pointer transition-colors ${
                        n.type === 'privacy_alert'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-[#FF6B4A] hover:bg-[#D94E30]'
                      }`}
                    >
                      {n.type === 'privacy_alert' || n.linkTarget.screen === 'apartment'
                        ? 'View Roster'
                        : n.linkTarget.screen === 'chore-reveal' || n.title.toLowerCase().includes('reveal')
                        ? 'Reveal'
                        : n.linkTarget.screen === 'expenses' || n.type === 'expense'
                        ? 'Review receipt'
                        : n.linkTarget.screen === 'members' || n.linkTarget.id?.startsWith('req_') || n.title.toLowerCase().includes('request')
                        ? 'Review request'
                        : n.type === 'chore'
                        ? 'Review chore'
                        : 'Review'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
