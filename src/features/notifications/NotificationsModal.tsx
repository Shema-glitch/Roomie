import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { IconTile } from '../../components/common/IconTile';
import { InAppNotification, DraftRound, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { Bell, ClipboardCheck, Receipt, Building, Check, Clock, X, Shuffle } from 'lucide-react';
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
        <div className="flex items-center justify-between pb-1">
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'chore', label: 'Chores' },
              { id: 'expense', label: 'Money' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[14px] font-bold transition-all cursor-pointer ${
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
            className="text-[14px] font-bold text-[#FF6B4A] hover:underline cursor-pointer"
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
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-white text-[#5B5BD6] border border-[#DDD6FE] shrink-0">
                    {draftState.badgeLabel}
                  </span>
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
                    ? 'bg-[#FFF0ED]/40 border-[#FFD7CF]'
                    : 'bg-white border-[#E6E8EE]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    <IconTile
                      icon={
                        n.type === 'chore' ? (
                          <ClipboardCheck className="w-4 h-4" />
                        ) : n.type === 'expense' ? (
                          <Receipt className="w-4 h-4" />
                        ) : (
                          <Building className="w-4 h-4" />
                        )
                      }
                      color={
                        n.type === 'chore'
                          ? 'teal'
                          : n.type === 'expense'
                          ? 'coral'
                          : 'indigo'
                      }
                      size="sm"
                    />
                    <div>
                      <h4 className="type-section-heading">
                        {n.title}
                      </h4>
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
                    <span className="w-2 h-2 rounded-full bg-[#FF6B4A] shrink-0 mt-1" />
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
                      className="px-3.5 py-1.5 rounded-xl bg-[#FF6B4A] text-white text-[14px] font-bold cursor-pointer hover:bg-[#D94E30] transition-colors"
                    >
                      {n.linkTarget.screen === 'chore-reveal' || n.title.toLowerCase().includes('reveal')
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
