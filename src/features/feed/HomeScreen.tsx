import React, { useState } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { Chip } from '../../components/common/Chip';
import { DoneFlowModal } from '../chores/DoneFlowModal';
import {
  User,
  Household,
  Chore,
  ChoreAssignment,
  Expense,
  ChatMessage,
  JoinRequest,
  KudosType,
} from '../../types';
import { sound } from '../../services/sound';
import { useToast } from '../../components/common/Toast';
import {
  Flame,
  CheckCircle2,
  Sparkles,
  Receipt,
  MessageSquare,
  UserPlus,
  Wallet,
  Bell,
  Shuffle,
  ClipboardCheck,
} from 'lucide-react';
import { isAssignmentDueToday, CHORE_REWARD_POINTS } from '../../utils/stateTable';

interface HomeScreenProps {
  currentUser: User;
  household: Household;
  roommates: User[];
  chores: Chore[];
  assignments: ChoreAssignment[];
  expenses: Expense[];
  activityMessages: ChatMessage[];
  pendingJoinRequests: JoinRequest[];
  netBalance: number;
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'apartment') => void;
  onOpenChoreReveal: () => void;
  onOpenDraftPicks: () => void;
  onSelectExpense: (expenseId: string) => void;
  onSelectJoinRequest: (req: JoinRequest) => void;
  onToggleHomeStatus: () => void;
  onCompleteChore?: (choreId: string, photoUrl?: string) => Promise<void>;
  onGiveKudos?: (choreId: string, targetUserId: string, type: KudosType, note?: string) => Promise<void>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  household,
  roommates,
  chores,
  assignments,
  expenses,
  activityMessages,
  pendingJoinRequests,
  netBalance,
  onNavigateTab,
  onOpenChoreReveal,
  onOpenDraftPicks,
  onSelectExpense,
  onSelectJoinRequest,
  onToggleHomeStatus,
  onCompleteChore,
  onGiveKudos,
}) => {
  const { showToast } = useToast();
  const [doneChoreModalTarget, setDoneChoreModalTarget] = useState<Chore | null>(null);
  const [feedFilter, setFeedFilter] = useState<'all' | 'chores' | 'expenses' | 'drafts'>('all');

  // My chore for today - only chores actually due today appear in Today's due tasks
  const myTodayAssignment = assignments.find(
    (a) => a.userId === currentUser.id && isAssignmentDueToday(a) && !a.completedToday
  );
  const myTodayChore = myTodayAssignment
    ? chores.find((c) => c.id === myTodayAssignment.choreId)
    : null;

  // Filter and group recent activities
  const allActivities = [...activityMessages]
    .filter((m) => m.type === 'activity')
    .slice(-10)
    .reverse();

  const filteredActivities = allActivities.filter((act) => {
    const text = act.body.toLowerCase();
    const isDraft = text.includes('draft') || text.includes('reveal');
    const isChore =
      !isDraft &&
      (text.includes('chore') ||
        text.includes('clean') ||
        text.includes('dishes') ||
        text.includes('bathroom'));
    const isExpense = text.includes('expense') || text.includes('₺') || text.includes('paid');

    if (feedFilter === 'chores') return isChore;
    if (feedFilter === 'expenses') return isExpense;
    if (feedFilter === 'drafts') return isDraft;
    return true;
  });

  // Group into today vs earlier
  const now = new Date();
  const todayActivities = filteredActivities.filter((act) => {
    const actDate = new Date(act.createdAt);
    return (
      actDate.getDate() === now.getDate() &&
      actDate.getMonth() === now.getMonth() &&
      actDate.getFullYear() === now.getFullYear()
    );
  });
  const earlierActivities = filteredActivities.filter((act) => {
    const actDate = new Date(act.createdAt);
    return !(
      actDate.getDate() === now.getDate() &&
      actDate.getMonth() === now.getMonth() &&
      actDate.getFullYear() === now.getFullYear()
    );
  });

  const homeCount = roommates.filter((r) => r.isHome).length;

  return (
    <div className="w-full select-none pb-20 md:pb-8">
      {/* Responsive Desktop 12-Column Grid */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* ================= LEFT COLUMN: Priority Focus & Activity Feed ================= */}
        <div className="w-full lg:col-span-8 self-start space-y-6">
          {/* 1. HERO MASCOT GREETING CARD (No duplicated apartment name or presence) */}
          <InfoCard
            tint="coral"
            padding="lg"
            className="bg-linear-to-br from-[#FFF5F2] via-[#FFFFFF] to-[#FFF8E6] border-2 border-[#FFD3C9]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <h2 className="text-2xl sm:text-3xl font-heading font-black text-[#1F2430] leading-snug">
                  Hey, {currentUser.name.split(' ')[0]}!
                </h2>
                <p className="text-base font-semibold text-[#475569]">
                  Keeping your apartment running peacefully today.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#FFF8E6] text-[#8A6200] border-2 border-[#FFE8A3] text-sm font-black shadow-xs">
                    <Flame className="w-4 h-4 text-[#FF6B4A] fill-[#FF6B4A]" />
                    {currentUser.streakDays} Day Streak!
                  </div>
                  <span className="text-sm font-extrabold text-[#475569]">
                    {currentUser.points} pts
                  </span>
                </div>
              </div>

              <div className="shrink-0 hidden sm:block">
                <MascotView state="idle" size="lg" bubbleText="Good day, roomie!" />
              </div>
            </div>
          </InfoCard>

          {/* 2. PENDING JOIN REQUEST BANNER (IF ANY) */}
          {pendingJoinRequests.length > 0 && (
            <ActionCard
              tint="indigo"
              iconTile={<IconTile icon={<UserPlus className="w-6 h-6" />} color="indigo" size="md" />}
              title={`${pendingJoinRequests[0].userName} wants to join your apartment!`}
              subtitle="Doorkeeper approval needed to confirm access"
              detail={
                <span className="text-sm text-[#5B5BD6] font-bold">
                  Roomies are voting: {pendingJoinRequests[0].votes ? Object.keys(pendingJoinRequests[0].votes).length : 1} vote recorded
                </span>
              }
              actions={
                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button
                    variant="indigo"
                    size="md"
                    onClick={() => {
                      sound.playSuccess();
                      showToast(`Voted OK for ${pendingJoinRequests[0].userName}!`, 'success');
                      onSelectJoinRequest(pendingJoinRequests[0]);
                    }}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      sound.playTap();
                      onSelectJoinRequest(pendingJoinRequests[0]);
                    }}
                  >
                    Review
                  </Button>
                </div>
              }
            />
          )}

          {/* 3. TODAY'S DAILY FOCUS (DUAL COLUMN AUTO-LAYOUT ON MD+) */}
          <div>
            <SectionTitle
              title="Today's priority focus"
              subtitle="Immediate action items for your apartment"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TODAY'S CHORE CARD */}
              <ActionCard
                tint="teal"
                iconTile={<IconTile icon={<ClipboardCheck className="w-6 h-6" />} color="teal" size="md" />}
                title={myTodayChore ? myTodayChore.name : 'All chores done'}
                subtitle={
                  myTodayChore
                    ? `${myTodayChore.frequency === 'daily' ? 'Daily' : 'Weekly'} • ${myTodayAssignment?.scheduledTime}`
                    : 'Kitchen and living area are clean'
                }
                detail={
                  myTodayChore ? (
                    <span className="type-secondary text-[#19B5A5] font-bold text-[14px]">
                      Earn +{(myTodayChore.effortLevel === 'heavy' ? 3 : myTodayChore.effortLevel === 'medium' ? 2 : 1) * 10} streak points
                    </span>
                  ) : (
                    <span className="type-secondary text-[#19B5A5] font-bold text-[14px]">
                      Streak protected for today
                    </span>
                  )
                }
                actions={
                  myTodayChore ? (
                    <div className="w-full grid grid-cols-2 gap-3">
                      <Button
                        variant="teal"
                        size="md"
                        onClick={() => setDoneChoreModalTarget(myTodayChore)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Done
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => onNavigateTab('chores')}
                      >
                        Schedule
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      onClick={() => onNavigateTab('chores')}
                    >
                      Open chores hub
                    </Button>
                  )
                }
              />

              {/* BALANCE SNAPSHOT CARD */}
              <ActionCard
                tint="green"
                iconTile={<IconTile icon={<Wallet className="w-6 h-6" />} color="green" size="md" />}
                title={
                  <div className="flex items-baseline gap-2">
                    <span className="type-big-number">
                      {netBalance > 0.05 ? (
                        <span className="text-[#2CA358]">
                          +₺{netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : netBalance < -0.05 ? (
                        <span className="text-[#E5484D]">
                          -₺{Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-[#1F2430]">₺0.00</span>
                      )}
                    </span>
                  </div>
                }
                subtitle={
                  netBalance > 0.05
                    ? 'You are owed by roomies'
                    : netBalance < -0.05
                    ? 'You owe shared balance'
                    : 'All roomie expenses settled'
                }
                detail={
                  <span className="type-secondary text-[14px]">
                    Simplified across all shared purchases
                  </span>
                }
                actions={
                  <div className="w-full grid grid-cols-2 gap-3">
                    {netBalance > 0.05 ? (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => onNavigateTab('expenses')}
                          icon={<Bell className="w-4 h-4" />}
                        >
                          Remind
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => onNavigateTab('expenses')}
                        >
                          Confirm payment
                        </Button>
                      </>
                    ) : netBalance < -0.05 ? (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => onNavigateTab('expenses')}
                          icon={<Receipt className="w-4 h-4" />}
                        >
                          Settle up
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => onNavigateTab('expenses')}
                        >
                          Ledger
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={() => onNavigateTab('expenses')}
                      >
                        View ledger
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </div>

          {/* 4. APARTMENT FEED WITH FILTER PILLS & SEMANTIC GROUPING */}
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

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All updates' },
                { id: 'chores', label: 'Chores' },
                { id: 'expenses', label: 'Money' },
                { id: 'drafts', label: 'Secret drafts' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setFeedFilter(f.id as any);
                  }}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl text-[14px] font-bold transition-all cursor-pointer ${
                    feedFilter === f.id
                      ? 'bg-[#1F2430] text-white shadow-xs'
                      : 'bg-white text-[#475569] border border-[#E6E8EE] hover:bg-[#F1F3F9]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Group 1: Today's Updates */}
            {todayActivities.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pt-1">
                  <span className="type-label text-[#64748B]">Today</span>
                  <div className="flex-1 h-px bg-[#E6E8EE]" />
                </div>
                {todayActivities.map((act) => renderActivityCard(act))}
              </div>
            )}

            {/* Group 2: Earlier Updates */}
            {earlierActivities.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pt-2">
                  <span className="type-label text-[#64748B]">Earlier this week</span>
                  <div className="flex-1 h-px bg-[#E6E8EE]" />
                </div>
                {earlierActivities.map((act) => renderActivityCard(act))}
              </div>
            )}

            {filteredActivities.length === 0 && (
              <InfoCard padding="md" className="text-center type-secondary bg-white">
                No recent apartment updates matching this filter.
              </InfoCard>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Roomie Hub & Quick Action Dock ================= */}
        <div className="w-full lg:col-span-4 self-start h-fit space-y-6 mt-6 lg:mt-0 lg:sticky lg:top-0">
          {/* 1. ROOMIES PRESENCE LIVE HUB */}
          <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="type-section-heading">Roomie presence</h3>
                <p className="type-secondary text-[14px]">Live apartment status</p>
              </div>
              <Chip
                status="active"
                label={`${homeCount} of ${roommates.length} Home`}
                size="sm"
              />
            </div>

            {/* Roomies List with Status Indicators */}
            <div className="space-y-2.5">
              {roommates.map((r) => {
                const isMe = r.id === currentUser.id;
                return (
                  <div
                    key={r.id}
                    className={`p-2.5 rounded-2xl flex items-center justify-between border transition-all ${
                      isMe
                        ? 'bg-[#F7F8FB] border-[#E2E5EC]'
                        : 'bg-white border-[#F1F3F9] hover:border-[#E2E5EC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={r.avatar}
                        name={r.name}
                        flag={r.flag}
                        isHome={r.isHome}
                        statusRing={true}
                        size="sm"
                      />
                      <div>
                        <p className="text-[14px] font-bold text-[#1F2430] flex items-center gap-1.5">
                          <span>{isMe ? `${r.name.split(' ')[0]} (You)` : r.name.split(' ')[0]}</span>
                        </p>
                        <p className="type-secondary text-[14px] flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-[#FF6B4A] fill-[#FF6B4A]" />
                          {r.streakDays}d streak • {r.points} pts
                        </p>
                      </div>
                    </div>
                    <Chip
                      status={r.isHome ? 'active' : 'away'}
                      label={r.isHome ? 'Home' : 'Away'}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>

            {/* Quick Switch Presence Button */}
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={onToggleHomeStatus}
            >
              Toggle my status ({currentUser.isHome ? 'Leave home' : 'Return home'})
            </Button>
          </InfoCard>

          {/* 2. QUICK ACTION DOCK (Real actions only per Section 17) */}
          <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-3">
            <h3 className="type-section-heading">Quick actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onNavigateTab('expenses');
                }}
                className="p-3 rounded-2xl bg-[#FFF5F2] border border-[#FFD3C9] text-left hover:bg-[#FFEAE4] transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-[#FF6B4A] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                  <Receipt className="w-4 h-4" />
                </div>
                <p className="text-[14px] font-bold text-[#1F2430]">Log expense</p>
                <p className="text-[14px] text-[#475569]">Split purchases</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  onOpenDraftPicks();
                }}
                className="p-3 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] text-left hover:bg-[#EDE9FE] transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-[#5B5BD6] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                  <Shuffle className="w-4 h-4" />
                </div>
                <p className="text-[14px] font-bold text-[#1F2430]">Pick wishes</p>
                <p className="text-[14px] text-[#475569]">Chore preferences</p>
              </button>
            </div>
          </InfoCard>
        </div>
      </div>

      {/* Done Flow Modal for Quick Completion */}
      {doneChoreModalTarget && (
        <DoneFlowModal
          isOpen={Boolean(doneChoreModalTarget)}
          onClose={() => setDoneChoreModalTarget(null)}
          chore={doneChoreModalTarget}
          currentUser={currentUser}
          onComplete={async (choreId: string, photoUrl?: string) => {
            if (onCompleteChore) {
              await onCompleteChore(choreId, photoUrl);
            }
            setDoneChoreModalTarget(null);
            showToast('Chore marked as complete! Streak updated.', 'success');
          }}
        />
      )}
    </div>
  );

  // Helper renderer for compact feed list rows (Section 17)
  function renderActivityCard(act: ChatMessage) {
    const text = act.body.toLowerCase();
    const isDraft = text.includes('draft') || text.includes('reveal');
    const isChore =
      !isDraft &&
      (text.includes('chore') ||
        text.includes('clean') ||
        text.includes('dishes') ||
        text.includes('bathroom'));
    const isExpense = text.includes('expense') || text.includes('₺') || text.includes('paid');

    const tileColor = isDraft ? 'indigo' : isChore ? 'teal' : isExpense ? 'coral' : 'indigo';
    const icon = isDraft ? (
      <Shuffle className="w-5 h-5" />
    ) : isChore ? (
      <ClipboardCheck className="w-5 h-5" />
    ) : isExpense ? (
      <Receipt className="w-5 h-5" />
    ) : (
      <MessageSquare className="w-5 h-5" />
    );

    const isRevealReady = act.linkTarget?.screen === 'chore-reveal' || text.includes('reveal ready');
    const isJoinReq = text.includes('wants to join') || text.includes('join request') || act.linkTarget?.screen === 'members';
    const isExpenseNeedsAction = isExpense && (text.includes('needs your agreement') || text.includes('pending your approval') || text.includes('verify'));

    const timeFormatted = new Date(act.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const categoryLabel = isDraft ? 'Chore Draft' : isChore ? 'Chores' : isExpense ? 'Money' : 'Apartment';

    return (
      <div
        key={act.id}
        className="p-3.5 rounded-2xl bg-white border border-[#E6E8EE] hover:border-[#CBD5E1] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
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

        {/* Action button ONLY on items that need a response */}
        {isRevealReady && (
          <div className="shrink-0">
            <Button
              variant="indigo"
              size="sm"
              onClick={onOpenChoreReveal}
              icon={<Sparkles className="w-3.5 h-3.5" />}
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
  }
};
