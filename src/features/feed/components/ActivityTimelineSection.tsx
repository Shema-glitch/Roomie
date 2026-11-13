import React, { useState } from 'react';
import { InfoCard } from '../../../components/common/InfoCard';
import { IconTile } from '../../../components/common/IconTile';
import { Button } from '../../../components/common/Button';
import { SectionTitle } from '../../../components/common/SectionTitle';
import { ChatMessage } from '../../../types';
import { sound } from '../../../services/sound';
import {
  MessageSquare,
  Repeat,
  ClipboardCheck,
  Receipt,
  UserPlus,
} from 'lucide-react';

type FeedFilter = 'all' | 'chores' | 'expenses' | 'drafts';

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
      text.includes('bathroom'));
  const isExpense =
    text.includes('expense') ||
    text.includes('₺') ||
    text.includes('$') ||
    text.includes('€') ||
    text.includes('paid');
  return { text, isDraft, isChore, isExpense };
};

export const ActivityTimelineSection: React.FC<ActivityTimelineSectionProps> = ({
  activityMessages,
  onNavigateTab,
  onOpenChoreReveal,
  onSelectExpense,
}) => {
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  const allActivities = [...activityMessages]
    .filter((m) => m.type === 'activity')
    .slice(-10)
    .reverse();

  const filteredActivities = allActivities.filter((act) => {
    const { isDraft, isChore, isExpense } = classifyActivity(act.body);
    if (feedFilter === 'chores') return isChore;
    if (feedFilter === 'expenses') return isExpense;
    if (feedFilter === 'drafts') return isDraft;
    return true;
  });

  const now = new Date();
  const isSameDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const todayActivities = filteredActivities.filter((act) => isSameDay(act.createdAt));
  const earlierActivities = filteredActivities.filter((act) => !isSameDay(act.createdAt));

  const renderActivityCard = (act: ChatMessage) => {
    const { text, isDraft, isChore, isExpense } = classifyActivity(act.body);
    const tileColor = isDraft ? 'indigo' : isChore ? 'teal' : isExpense ? 'coral' : 'indigo';
    const icon = isDraft ? (
      <Repeat className="w-5 h-5" />
    ) : isChore ? (
      <ClipboardCheck className="w-5 h-5" />
    ) : isExpense ? (
      <Receipt className="w-5 h-5" />
    ) : (
      <MessageSquare className="w-5 h-5" />
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
        className="p-3.5 rounded-2xl bg-white border border-[#E6E8EE] hover:border-[#CBD5E1] hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <IconTile icon={icon} color={tileColor} size="sm" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-[#1F2430] leading-snug">{act.body}</p>
            <p className="type-secondary text-[14px] flex items-center gap-1.5 mt-0.5">
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
              icon={<ClipboardCheck className="w-3.5 h-3.5" />}
            >
              Reveal schedule
            </Button>
          </div>
        )}

        {isJoinReq && (
          <div className="shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab('apartment')}
              icon={<UserPlus className="w-3.5 h-3.5 text-[#5B5BD6]" />}
            >
              Review request
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
              icon={<Receipt className="w-3.5 h-3.5" />}
            >
              Review receipt
            </Button>
          </div>
        )}
      </div>
    );
  };

  const filterOptions: { id: FeedFilter; label: string }[] = [
    { id: 'all', label: 'All updates' },
    { id: 'chores', label: 'Chores' },
    { id: 'expenses', label: 'Money' },
    { id: 'drafts', label: 'Secret drafts' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SectionTitle
          title="Apartment live feed"
          subtitle="Recent actions, agreements, and roomie events"
        />
        <Button
          variant="indigo"
          size="sm"
          onClick={() => onNavigateTab('chat')}
          icon={<MessageSquare className="w-4 h-4" />}
        >
          Open chat
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              sound.playTap();
              setFeedFilter(f.id);
            }}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl text-[14px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              feedFilter === f.id
                ? 'bg-[#1F2430] text-white shadow-xs'
                : 'bg-white text-[#475569] border border-[#E6E8EE] hover:bg-[#F1F3F9]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {todayActivities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-1">
            <span className="type-label text-[#64748B]">Today</span>
            <div className="flex-1 h-px bg-[#E6E8EE]" />
          </div>
          {todayActivities.map(renderActivityCard)}
        </div>
      )}

      {earlierActivities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <span className="type-label text-[#64748B]">Earlier this week</span>
            <div className="flex-1 h-px bg-[#E6E8EE]" />
          </div>
          {earlierActivities.map(renderActivityCard)}
        </div>
      )}

      {filteredActivities.length === 0 && (
        <InfoCard padding="md" className="text-center type-secondary bg-white">
          No recent apartment updates matching this filter.
        </InfoCard>
      )}
    </div>
  );
};
