import React from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { ChatMessage } from '../../../types';
import { sound } from '../../../services/sound';
import {
  ChatCircleDots,
  ArrowsClockwise,
  CheckCircle,
  Receipt,
  UserPlus,
  ArrowRight,
} from '@phosphor-icons/react';

interface ActivityTimelineSectionProps {
  activityMessages: ChatMessage[];
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onOpenChoreReveal: () => void;
  onSelectExpense: (expenseId: string) => void;
}

const classifyActivity = (body: string) => {
  const text = body.toLowerCase();
  const isDraft = text.includes('draft') || text.includes('reveal');
  const isChore =
    !isDraft &&
    (text.includes('chore') ||
      text.includes('clean') ||
      text.includes('dishes') ||
      text.includes('bathroom') ||
      text.includes('duty'));
  const isExpense =
    text.includes('expense') ||
    text.includes('₺') ||
    text.includes('$') ||
    text.includes('€') ||
    text.includes('paid') ||
    text.includes('bill');
  return { text, isDraft, isChore, isExpense };
};

export const ActivityTimelineSection: React.FC<ActivityTimelineSectionProps> = ({
  activityMessages,
  onNavigateTab,
  onOpenChoreReveal,
  onSelectExpense,
}) => {
  const recentActivities = [...activityMessages]
    .filter((m) => m.type === 'activity')
    .slice(-3)
    .reverse();

  const renderActivityCard = (act: ChatMessage, idx = 0) => {
    const { text, isDraft, isChore, isExpense } = classifyActivity(act.body);
    const tileColor = isDraft ? 'indigo' : isChore ? 'teal' : isExpense ? 'coral' : 'indigo';
    const icon = isDraft ? (
      <ArrowsClockwise weight="duotone" className="w-4 h-4" />
    ) : isChore ? (
      <CheckCircle weight="duotone" className="w-4 h-4" />
    ) : isExpense ? (
      <Receipt weight="duotone" className="w-4 h-4" />
    ) : (
      <ChatCircleDots weight="duotone" className="w-4 h-4" />
    );

    const isRevealReady = act.linkTarget?.screen === 'chore-reveal' || text.includes('reveal ready');
    const isJoinReq =
      text.includes('wants to join') ||
      text.includes('join request') ||
      act.linkTarget?.screen === 'members';
    const isExpenseNeedsAction =
      isExpense &&
      (text.includes('needs your agreement') ||
        text.includes('pending your approval') ||
        text.includes('verify'));

    const timeFormatted = new Date(act.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const categoryLabel = isDraft
      ? 'Chore Draft'
      : isChore
      ? 'Chores'
      : isExpense
      ? 'Money'
      : 'Apartment';

    return (
      <div
        key={act.id}
        style={{ '--stagger-index': idx } as React.CSSProperties}
        className="stagger-item card-interactive ease-spring p-3 rounded-2xl bg-white border border-[#E6E8EE] hover:border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs contain-content"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <IconTile icon={icon} color={tileColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[#1F2430] leading-snug truncate">{act.body}</p>
            <p className="type-secondary text-[11px] flex items-center gap-1.5 mt-0.5 text-[#64748B]">
              <span>{timeFormatted}</span>
              <span>•</span>
              <span className="font-semibold text-[#475569]">{categoryLabel}</span>
            </p>
          </div>
        </div>

        {isRevealReady && (
          <div className="shrink-0">
            <Button
              variant="indigo"
              size="sm"
              onClick={onOpenChoreReveal}
              icon={<CheckCircle weight="fill" className="w-3.5 h-3.5" />}
            >
              Reveal
            </Button>
          </div>
        )}

        {isJoinReq && (
          <div className="shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab('apartment')}
              icon={<UserPlus weight="duotone" className="w-3.5 h-3.5 text-[#5B5BD6]" />}
            >
              Review
            </Button>
          </div>
        )}

        {isExpenseNeedsAction && (
          <div className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onNavigateTab('expenses');
                if (act.linkTarget?.id) onSelectExpense(act.linkTarget.id);
              }}
              icon={<Receipt weight="fill" className="w-3.5 h-3.5" />}
            >
              Review
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="type-section-heading">Recent Activity</h3>
          <p className="type-secondary text-xs text-[#64748B]">Latest flat events & updates</p>
        </div>
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onNavigateTab('chat');
          }}
          className="btn-tactile ease-spring px-3 py-1.5 rounded-xl bg-white border border-[#E6E8EE] hover:border-[#CBD5E1] text-xs font-bold text-[#5B5BD6] flex items-center gap-1.5 shadow-2xs cursor-pointer select-none"
        >
          <ChatCircleDots weight="fill" className="w-3.5 h-3.5" />
          <span>Open Chat</span>
          <ArrowRight weight="bold" className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {recentActivities.length > 0 ? (
          recentActivities.map(renderActivityCard)
        ) : (
          <InfoCard padding="md" className="text-center type-secondary bg-white text-xs">
            No recent apartment updates yet.
          </InfoCard>
        )}
      </div>
    </div>
  );
};
