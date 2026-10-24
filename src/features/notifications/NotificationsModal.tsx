import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { InAppNotification } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { Bell, Sparkles, Receipt, Home, Check, Clock, X } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onActionClick: (target: { screen: string; id?: string }) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onActionClick,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'chore' | 'expense'>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const handleSnooze = (id: string) => {
    sound.playTap();
    onMarkRead(id);
    showToast('Reminder snoozed for 30 minutes ⏰', 'info');
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
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-[#1F2430] text-white'
                    : 'bg-[#F7F8FB] text-[#6B7280] border border-[#E6E8EE]'
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
            className="text-[11px] font-bold text-[#FF6B4A] hover:underline cursor-pointer"
          >
            Mark all read
          </button>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#6B7280]">
              <Bell className="w-8 h-8 mx-auto text-[#6B7280]/40 mb-2" />
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
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        n.type === 'chore'
                          ? 'bg-[#E6FAF8] text-[#19B5A5]'
                          : n.type === 'expense'
                          ? 'bg-[#FFF0ED] text-[#FF6B4A]'
                          : 'bg-[#EEF0FD] text-[#5B5BD6]'
                      }`}
                    >
                      {n.type === 'chore' ? (
                        <Sparkles className="w-4 h-4" />
                      ) : n.type === 'expense' ? (
                        <Receipt className="w-4 h-4" />
                      ) : (
                        <Home className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-sm text-[#1F2430] leading-snug">
                        {n.title}
                      </h4>
                      <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                      <span className="text-[10px] text-[#9CA3AF] block mt-1">
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
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#E6E8EE]/60">
                  {n.type === 'chore' && (
                    <button
                      onClick={() => handleSnooze(n.id)}
                      className="text-[11px] font-bold text-[#6B7280] hover:text-[#1F2430] flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3 h-3" /> Snooze 30m
                    </button>
                  )}
                  {n.linkTarget && (
                    <button
                      onClick={() => {
                        onMarkRead(n.id);
                        onClose();
                        onActionClick(n.linkTarget!);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#FF6B4A] text-white text-[11px] font-bold cursor-pointer hover:bg-[#D94E30]"
                    >
                      View
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
