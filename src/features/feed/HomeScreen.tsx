import React from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { User, Household, Chore, ChoreAssignment, Expense, ChatMessage, JoinRequest } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import {
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  HandCoins,
  Receipt,
  MessageSquare,
  Users,
  Shield,
  HelpCircle,
} from 'lucide-react';

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
  onNavigateTab: (tab: 'feed' | 'chores' | 'expenses' | 'chat' | 'members') => void;
  onOpenChoreReveal: () => void;
  onOpenDraftPicks: () => void;
  onSelectExpense: (expenseId: string) => void;
  onSelectJoinRequest: (req: JoinRequest) => void;
  onToggleHomeStatus: () => void;
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
}) => {
  // My chore for today
  const myTodayAssignment = assignments.find(
    (a) => a.userId === currentUser.id && !a.completedToday
  );
  const myTodayChore = myTodayAssignment
    ? chores.find((c) => c.id === myTodayAssignment.choreId)
    : null;

  // Recent 5 activities
  const recentActivities = [...activityMessages]
    .filter((m) => m.type === 'activity')
    .slice(-6)
    .reverse();

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* 1. HERO MASCOT GREETING */}
      <Card
        padding="md"
        className="bg-linear-to-br from-[#FFF0ED] via-[#FFFFFF] to-[#FFF8E6] border-2 border-[#FFD7CF] relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF6B4A]">
                {household.name}
              </span>
              <span className="text-xs text-[#6B7280]">•</span>
              <button
                type="button"
                onClick={onToggleHomeStatus}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer"
                style={{
                  backgroundColor: currentUser.isHome ? '#EBF9F0' : '#F1F3F9',
                  color: currentUser.isHome ? '#2CA358' : '#6B7280',
                  borderColor: currentUser.isHome ? '#B8ECC8' : '#E6E8EE',
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentUser.isHome ? 'bg-[#3DBE6D]' : 'bg-[#9CA3AF]'
                  }`}
                />
                <span>{currentUser.isHome ? "I'm home" : "I'm out"}</span>
              </button>
            </div>

            <h2 className="text-2xl font-heading font-black text-[#1F2430] mt-1 leading-snug">
              Hey, {currentUser.name.split(' ')[0]}! 👋
            </h2>
            <p className="text-xs text-[#6B7280] font-medium mt-0.5">
              Roomie is keeping Apartment 4B running peacefully today.
            </p>

            <div className="flex items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-xs font-extrabold">
                <Flame className="w-4 h-4 text-[#FF6B4A] fill-[#FF6B4A]" />
                {currentUser.streakDays} Day Streak!
              </span>
              <span className="text-xs font-bold text-[#6B7280]">
                {currentUser.points} pts
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <MascotView state="idle" size="lg" bubbleText="Good day, roomie!" />
          </div>
        </div>
      </Card>

      {/* 2. PENDING JOIN REQUEST NOTIFICATION IF ANY */}
      {pendingJoinRequests.length > 0 && (
        <Card
          padding="sm"
          interactive
          onClick={() => onSelectJoinRequest(pendingJoinRequests[0])}
          className="bg-[#EEF0FD] border-2 border-[#D3D5F9] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#5B5BD6] text-white flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1F2430]">
                {pendingJoinRequests[0].userName} wants to join Apartment 4B!
              </p>
              <p className="text-[10px] text-[#5B5BD6] font-semibold">
                Tap to give your opinion (OK / Not sure)
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#5B5BD6]" />
        </Card>
      )}

      {/* 3. QUICK STATS CARDS: TODAY'S CHORE & BALANCES */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Today's Chore */}
        <Card
          padding="md"
          interactive
          onClick={() => onNavigateTab('chores')}
          className="bg-white flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-[#6B7280]">
                Your Chore Today
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#19B5A5]" />
            </div>
            <h4 className="font-heading font-black text-sm text-[#1F2430] mt-1 line-clamp-1">
              {myTodayChore ? myTodayChore.name : 'Kitchen Sparkling! ✨'}
            </h4>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              {myTodayChore ? `${myTodayAssignment?.scheduledTime}` : 'All done today!'}
            </p>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-bold text-[#19B5A5] flex items-center gap-1">
              Open schedule <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Card>

        {/* Balance Snapshot */}
        <Card
          padding="md"
          interactive
          onClick={() => onNavigateTab('expenses')}
          className="bg-white flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-[#6B7280]">
                Your Balance
              </span>
              <HandCoins className="w-3.5 h-3.5 text-[#FF6B4A]" />
            </div>
            <div className="font-heading font-black text-lg mt-1 text-[#1F2430]">
              {netBalance > 0.5 ? (
                <span className="text-[#3DBE6D]">+₺{netBalance.toFixed(2)}</span>
              ) : netBalance < -0.5 ? (
                <span className="text-[#FF6B4A]">-₺{Math.abs(netBalance).toFixed(2)}</span>
              ) : (
                '₺0.00'
              )}
            </div>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              {netBalance > 0.5 ? 'You are owed' : netBalance < -0.5 ? 'You owe others' : 'Settled'}
            </p>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-bold text-[#FF6B4A] flex items-center gap-1">
              View balances <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Card>
      </div>

      {/* 4. WHO IS HOME AVATAR STRIP */}
      <Card padding="sm" className="bg-white">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-[#1F2430]">Flatmates</span>
          <span className="text-[11px] text-[#3DBE6D] font-bold">
            {roommates.filter((r) => r.isHome).length} of {roommates.length} at home
          </span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1 px-1">
          {roommates.map((r) => (
            <div key={r.id} className="flex flex-col items-center shrink-0 text-center">
              <Avatar
                src={r.avatar}
                name={r.name}
                flag={r.flag}
                isHome={r.isHome}
                showStatus
                size="md"
              />
              <span className="text-[11px] font-bold text-[#1F2430] mt-1 max-w-[60px] truncate">
                {r.id === currentUser.id ? 'You' : r.name.split(' ')[0]}
              </span>
              <span className="text-[9px] text-[#6B7280]">
                {r.isHome ? 'Home' : 'Away'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. LIVE HOUSEHOLD FEED (Activity Messages) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-[#1F2430]">
            Apartment Feed
          </h3>
          <button
            onClick={() => onNavigateTab('chat')}
            className="text-xs font-bold text-[#5B5BD6] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Open Group Chat
          </button>
        </div>

        <div className="space-y-2">
          {recentActivities.length === 0 ? (
            <Card padding="md" className="text-center text-xs text-[#6B7280] bg-white">
              No recent household updates. Start by drafting chores or sharing an expense!
            </Card>
          ) : (
            recentActivities.map((act) => {
              const isChore = act.body.toLowerCase().includes('chore');
              const isExpense = act.body.toLowerCase().includes('expense') || act.body.toLowerCase().includes('₺');

              return (
                <Card
                  key={act.id}
                  padding="sm"
                  interactive={Boolean(act.linkTarget)}
                  onClick={() => {
                    sound.playTap();
                    if (act.linkTarget?.screen === 'expenses') {
                      onNavigateTab('expenses');
                      if (act.linkTarget.id) onSelectExpense(act.linkTarget.id);
                    } else if (act.linkTarget?.screen === 'chores') {
                      onNavigateTab('chores');
                    } else if (act.linkTarget?.screen === 'chore-reveal') {
                      onOpenChoreReveal();
                    } else {
                      onNavigateTab('chat');
                    }
                  }}
                  className="bg-white flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                        isChore
                          ? 'bg-[#E6FAF8] text-[#19B5A5]'
                          : isExpense
                          ? 'bg-[#FFF0ED] text-[#FF6B4A]'
                          : 'bg-[#EEF0FD] text-[#5B5BD6]'
                      }`}
                    >
                      {isChore ? (
                        <Sparkles className="w-4 h-4" />
                      ) : isExpense ? (
                        <Receipt className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1F2430] leading-snug">
                        {act.body}
                      </p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {new Date(act.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {act.linkTarget && (
                    <ArrowRight className="w-4 h-4 text-[#6B7280] shrink-0" />
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
