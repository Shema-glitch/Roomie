import React from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
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
  householdName?: string;
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onOpenChoreReveal: () => void;
  onSelectExpense: (expenseId: string) => void;
}

const formatActivityBody = (body: string, householdName?: string): string => {
  const clean = body
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\s]+/u, '')
    .replace(/^Privacy Notice:\s*/i, '')
    .trim();

  const rosterMatch = clean.match(/^(.+?)\s+has joined(?: the apartment roster\.?)?$/i);
  if (rosterMatch) {
    return `${rosterMatch[1]} joined ${householdName || 'the apartment'}`;
  }
  return clean;
};

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
  householdName,
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

    const tileColors = {
      indigo: 'bg-[#EEF0FD] text-[#5B5BD6] border-[#C7D2FE]',
      teal: 'bg-[#E6FAF8] text-[#138E82] border-[#B6EFEA]',
      coral: 'bg-[#FFF0ED] text-[#FF6B4A] border-[#FFD3C9]',
    }[tileColor];

    return (
      <div
        key={act.id}
        style={{ '--stagger-index': idx } as React.CSSProperties}
        className="stagger-item p-3.5 sm:px-4 flex items-start sm:items-center justify-between gap-3 contain-content"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${tileColors}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[#1F2430] leading-snug line-clamp-2">
              {formatActivityBody(act.body, householdName)}
            </p>
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
          <p className="type-secondary text-xs text-[#64748B]">Latest flat events &amp; updates</p>
        </div>
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onNavigateTab('chat');
          }}
          className="btn-tactile ease-spring px-3 py-1.5 rounded-xl bg-white border border-[#E6E8EE] hover:border-[#CBD5E1] text-xs font-bold text-[#5B5BD6] flex items-center gap-1.5 shadow-2xs cursor-pointer select-none whitespace-nowrap shrink-0"
        >
          <ChatCircleDots weight="fill" className="w-3.5 h-3.5" />
          <span>Open Chat</span>
          <ArrowRight weight="bold" className="w-3 h-3" />
        </button>
      </div>

      {recentActivities.length > 0 ? (
        <div className="rounded-[24px] border-2 border-[#E5E9F0] bg-white divide-y divide-[#EEF1F6] shadow-2xs overflow-hidden">
          {recentActivities.map(renderActivityCard)}
        </div>
      ) : (
        <InfoCard padding="md" className="text-center type-secondary bg-white text-xs">
          No recent apartment updates yet.
        </InfoCard>
      )}
    </div>
  );
};
