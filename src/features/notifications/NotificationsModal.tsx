import React, { useState } from 'react';
import { BottomSheet } from '../../components/ui/overlays';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { IconTile } from '../../components/common/IconTile';
import { InAppNotification, DraftRound, User, JoinRequest } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import {
  Bell,
  CheckCircle,
  Receipt,
  Buildings,
  Clock,
  Shuffle,
  ShieldWarning,
  ArrowsLeftRight,
  Sparkle,
} from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { getChoreDraftState } from '../../utils/stateTable';
import { useI18n } from '../../i18n/I18nProvider';
import { localizeChoreDraftState } from '../../i18n/helpers';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  pendingJoinRequests?: JoinRequest[];
  draftRound?: DraftRound | null;
  currentUser?: User | null;
  householdName?: string;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onActionClick: (target: { screen: string; id?: string }) => void;
}

const formatNotificationCopy = (
  n: InAppNotification,
  householdName?: string
): { title: string; body: string } => {
  const cleanTitle = n.title
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\s]+/u, '')
    .replace(/^Privacy Alert:\s*/i, '')
    .trim();
  const cleanBody = n.body
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\s]+/u, '')
    .trim();

  const joinMatch = cleanBody.match(/^(.+?)\s+(?:has\s+(?:officially\s+)?)?joined\b/i);
  if (
    n.type === 'privacy_alert' &&
    (cleanTitle.toLowerCase().includes('new flatmate joined') || joinMatch)
  ) {
    const memberName = joinMatch?.[1]?.trim() || 'A new roomie';
    return {
      title: `${memberName} joined the flat`,
      body: `Say hi or check everyone in ${householdName || 'your apartment'}.`,
    };
  }

  return { title: cleanTitle, body: cleanBody };
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  pendingJoinRequests = [],
  draftRound,
  currentUser,
  householdName,
  onMarkRead,
  onMarkAllRead,
  onActionClick,
}) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'chore' | 'expense'>('all');

  const draftState = localizeChoreDraftState(
    getChoreDraftState(draftRound, currentUser?.id || ''),
    t
  );

  const activePendingRequestIds = new Set(pendingJoinRequests.map((r) => r.id));

  const filtered = notifications
    .filter((n) => {
      const titleLower = n.title.toLowerCase();
      const isActionableJoinRequest =
        n.type === 'household' &&
        titleLower.includes('join request') &&
        !titleLower.includes('update');
      if (isActionableJoinRequest) {
        if (pendingJoinRequests.length === 0) return false;
        const linkId = n.linkTarget?.id || (n.linkTarget as { requestId?: string } | undefined)?.requestId;
        if (linkId && !activePendingRequestIds.has(linkId)) return false;
      }
      if (filter === 'all') return true;
      return n.type === filter;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSnooze = (id: string) => {
    haptics.softReject();
    sound.softReject();
    onMarkRead(id);
    showToast('Reminder snoozed for 30 minutes', 'info');
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('notifs.title')}
      subtitle={t('notifs.subtitle')}
    >
      <div className="space-y-4">
        {/* Filter pills & Mark All Read */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div className="flex gap-1.5">
            {(
              [
                { id: 'all', label: t('common.all') },
                { id: 'chore', label: t('nav.chores') },
                { id: 'expense', label: t('nav.money') },
              ] satisfies Array<{ id: 'all' | 'chore' | 'expense'; label: string }>
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  sound.playTap();
                  setFilter(f.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-[14px] font-bold whitespace-nowrap transition-[transform,background-color,border-color] duration-150 active:translate-y-[2px] cursor-pointer min-h-[44px] flex items-center justify-center ${
                  filter === f.id
                    ? 'bg-[#1F2430] text-white border-2 border-b-4 border-[#1F2430] shadow-2xs'
                    : 'bg-[#F7F8FB] text-[#64748B] border-2 border-b-4 border-[#E6E8EE] hover:border-[#CBD5E1]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              haptics.swapAccept();
              sound.swapAccept();
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
          <div className="p-3.5 rounded-2xl bg-[#EEF0FD] border-2 border-[#C7D2FE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
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
                  if (draftState.state === 'reveal_ready') {
                    haptics.awardCelebrate();
                    sound.awardCelebrate();
                  } else {
                    haptics.notificationPing();
                    sound.notificationPing();
                  }
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
            filtered.map((n) => {
              const titleLower = n.title.toLowerCase();
              const isSwapNotif = titleLower.includes('swap');
              const isVibeNotif = titleLower.includes('vibe');

              return (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border-2 border-b-4 transition-[transform,opacity] duration-150 contain-content ${
                    !n.read
                      ? n.type === 'privacy_alert'
                        ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                        : 'bg-[#FFF0ED]/40 border-[#FFD7CF] shadow-2xs'
                      : 'bg-white border-[#E6E8EE]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1">
                      <IconTile
                        icon={
                          n.type === 'privacy_alert' ? (
                            <ShieldWarning className="w-4 h-4" />
                          ) : isSwapNotif ? (
                            <ArrowsLeftRight className="w-4 h-4" />
                          ) : isVibeNotif ? (
                            <Sparkle weight="fill" className="w-4 h-4" />
                          ) : n.type === 'chore' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : n.type === 'expense' ? (
                            <Receipt className="w-4 h-4" />
                          ) : (
                            <Buildings className="w-4 h-4" />
                          )
                        }
                        color={
                          n.type === 'privacy_alert' || isSwapNotif
                            ? 'amber'
                            : isVibeNotif || n.type === 'chore'
                            ? 'teal'
                            : n.type === 'expense'
                            ? 'coral'
                            : 'indigo'
                        }
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="type-section-heading">
                          {formatNotificationCopy(n, householdName).title}
                        </h4>
                        <p className="type-secondary mt-0.5 leading-relaxed">
                          {formatNotificationCopy(n, householdName).body}
                        </p>
                      </div>
                    </div>

                    {!n.read && (
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${n.type === 'privacy_alert' ? 'bg-amber-500' : 'bg-[#FF6B4A]'}`} />
                    )}
                  </div>

                  {/* Footer row: timestamp on left, action CTA on right */}
                  <div className="flex items-center justify-between gap-3 mt-2.5 pt-2.5 border-t border-[#E6E8EE]/60">
                    <span className="type-secondary text-xs text-[#64748B] shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                    {n.type === 'chore' && !isSwapNotif && (
                      <button
                        onClick={() => handleSnooze(n.id)}
                        className="type-secondary font-bold text-[#64748B] hover:text-[#1F2430] flex items-center gap-1 cursor-pointer active:translate-y-[1px] whitespace-nowrap"
                      >
                        <Clock className="w-3.5 h-3.5" /> Snooze 30m
                      </button>
                    )}
                    {n.linkTarget && (
                      <button
                        onClick={() => {
                          if (isSwapNotif) {
                            haptics.tokenClink();
                            sound.tokenClink();
                          } else if (n.linkTarget?.screen === 'chore-reveal' || titleLower.includes('reveal')) {
                            haptics.awardCelebrate();
                            sound.awardCelebrate();
                          } else if (isVibeNotif) {
                            haptics.vibeSubmit();
                            sound.vibeSubmit('high');
                          } else {
                            haptics.notificationPing();
                            sound.notificationPing();
                          }
                          onMarkRead(n.id);
                          onClose();
                          onActionClick(n.linkTarget!);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-white text-[13px] font-bold cursor-pointer transition-all active:translate-y-[1px] whitespace-nowrap shrink-0 ${
                          n.type === 'privacy_alert'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-[#FF6B4A] hover:bg-[#D94E30]'
                        }`}
                      >
                        {n.type === 'privacy_alert' || n.linkTarget.screen === 'apartment'
                          ? 'View Roomies'
                          : isSwapNotif
                          ? 'Review swap'
                          : isVibeNotif
                          ? 'View Vibe Pulse'
                          : n.linkTarget.screen === 'chore-reveal' || titleLower.includes('reveal')
                          ? 'Reveal'
                          : n.linkTarget.screen === 'expenses' || n.type === 'expense'
                          ? 'Review receipt'
                          : n.linkTarget.screen === 'members' || n.linkTarget.id?.startsWith('req_') || titleLower.includes('request')
                          ? 'Review request'
                          : n.type === 'chore'
                          ? 'Review chore'
                          : 'Review'}
                      </button>
                    )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
