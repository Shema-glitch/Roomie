import React, { useState } from 'react';
import { ActionCard } from '../../components/common/ActionCard';
import { InfoCard } from '../../components/common/InfoCard';
import { IconTile } from '../../components/common/IconTile';
import { Button } from '../../components/common/Button';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { Modal } from '../../components/common/Modal';
import { DoneFlowModal } from './DoneFlowModal';
import { KudosModal } from './KudosModal';
import { ChoreSwapModal } from './ChoreSwapModal';
import { AwayModeModal } from './AwayModeModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Chore, ChoreAssignment, DraftRound, User, KudosType } from '../../types';
import { getChoreDraftState, isAssignmentDueToday, CHORE_REWARD_POINTS } from '../../utils/stateTable';
import { sound } from '../../services/sound';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  ArrowLeftRight,
  Plane,
  Plus,
  Heart,
  Calendar,
  ClipboardCheck,
  Shuffle,
  Trophy,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ChoresScreenProps {
  chores: Chore[];
  assignments: ChoreAssignment[];
  draftRound: DraftRound;
  roommates: User[];
  currentUser: User;
  onOpenDraftPicks: () => void;
  onOpenReveal: () => void;
  onCompleteChore: (choreId: string, photoUrl?: string) => Promise<void>;
  onGiveKudos: (
    choreId: string,
    targetUserId: string,
    type: KudosType,
    note?: string
  ) => Promise<void>;
  onSwapChore: (choreId: string, toUserId: string) => Promise<void>;
  onSetAway: (days: number | null) => Promise<void>;
  onAddChore: (
    name: string,
    frequency: 'daily' | 'weekly',
    effort: 'light' | 'medium' | 'heavy',
    desc: string
  ) => Promise<Chore>;
}

export const ChoresScreen: React.FC<ChoresScreenProps> = ({
  chores,
  assignments,
  draftRound,
  roommates,
  currentUser,
  onOpenDraftPicks,
  onOpenReveal,
  onCompleteChore,
  onGiveKudos,
  onSwapChore,
  onSetAway,
  onAddChore,
}) => {
  const { showToast } = useToast();
  const [scheduleFilter, setScheduleFilter] = useState<'my' | 'all'>('my');

  // Modals state
  const [doneModalChore, setDoneModalChore] = useState<Chore | null>(null);
  const [kudosModalData, setKudosModalData] = useState<{ chore: Chore; target: User } | null>(null);
  const [swapModalChore, setSwapModalChore] = useState<Chore | null>(null);
  const [awayModalOpen, setAwayModalOpen] = useState(false);
  const [newChoreModalOpen, setNewChoreModalOpen] = useState(false);

  // New chore form state
  const [newChoreName, setNewChoreName] = useState('');
  const [newChoreFreq, setNewChoreFreq] = useState<'daily' | 'weekly'>('daily');
  const [newChoreEffort, setNewChoreEffort] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [newChoreDesc, setNewChoreDesc] = useState('');

  // Helper to pick chore icon - all chores use ClipboardCheck per Section 18
  const getChoreIcon = (_name: string) => {
    return <ClipboardCheck className="w-6 h-6" />;
  };

  const handleCreateChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoreName.trim()) return;
    try {
      await onAddChore(newChoreName.trim(), newChoreFreq, newChoreEffort, newChoreDesc.trim());
      showToast(`Chore "${newChoreName}" added to the apartment pool!`, 'success');
      setNewChoreName('');
      setNewChoreDesc('');
      setNewChoreModalOpen(false);
    } catch {
      showToast('Could not add chore', 'error');
    }
  };

  const getEffortPoints = (level: 'light' | 'medium' | 'heavy') => {
    return CHORE_REWARD_POINTS[level] || 20;
  };

  // Current user's assignments
  const myAssignments = assignments.filter((a) => a.userId === currentUser.id);

  // Grouped tasks strictly using single-source state:
  // 1. Today's Due (incomplete AND actually due today)
  const todayDueAssignments = (scheduleFilter === 'my' ? myAssignments : assignments).filter(
    (a) => isAssignmentDueToday(a) && !a.completedToday
  );
  // 2. Completed Today (completed today)
  const todayCompletedAssignments = (scheduleFilter === 'my' ? myAssignments : assignments).filter(
    (a) => isAssignmentDueToday(a) && a.completedToday
  );
  // 3. Upcoming Later This Week (weekly tasks not due today)
  const upcomingAssignments = (scheduleFilter === 'my' ? myAssignments : assignments).filter(
    (a) => !isAssignmentDueToday(a)
  );

  const maxStreak = Math.max(...roommates.map((r) => r.streakDays), 0);
  const sortedRoomiesByStreak = [...roommates].sort((a, b) => b.streakDays - a.streakDays || b.points - a.points);

  // Single-source draft state across Banner, Notifications, and Chat
  const draftState = getChoreDraftState(draftRound, currentUser.id);

  return (
    <div className="w-full select-none pb-28 md:pb-8">
      {/* Responsive Desktop 12-Column Grid */}
      <div className="w-full lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* ================= LEFT COLUMN: Draft Hero & Grouped Chores ================= */}
        <div className="w-full lg:col-span-7 self-start space-y-6">
          {/* 1. SUNDAY CHORE DRAFT HERO BANNER (Single-source draft state) */}
          <ActionCard
            tint={
              draftState.state === 'reveal_ready'
                ? 'coral'
                : draftState.state === 'reveal_done'
                ? 'teal'
                : 'indigo'
            }
            iconTile={
              <IconTile
                icon={
                  draftState.state === 'reveal_ready' || draftState.state === 'reveal_done' ? (
                    <Sparkles className="w-6 h-6" />
                  ) : (
                    <Shuffle className="w-6 h-6" />
                  )
                }
                color={
                  draftState.state === 'reveal_ready'
                    ? 'coral'
                    : draftState.state === 'reveal_done'
                    ? 'teal'
                    : 'indigo'
                }
                size="md"
              />
            }
            title={draftState.bannerTitle}
            subtitle={draftState.bannerSubtitle}
            badge={
              <Chip
                status={draftState.state === 'reveal_done' ? 'agreed' : 'pending'}
                label={draftState.badgeLabel}
                size="sm"
              />
            }
            actions={
              <div className="w-full flex items-center gap-3">
                {draftState.state === 'reveal_ready' ? (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={onOpenReveal}
                    icon={<Sparkles className="w-4 h-4" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                ) : draftState.state === 'reveal_done' ? (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={onOpenReveal}
                    icon={<Sparkles className="w-4 h-4 text-[#19B5A5]" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                ) : (
                  <Button
                    variant="teal"
                    size="md"
                    fullWidth
                    onClick={onOpenDraftPicks}
                    icon={<Shuffle className="w-4 h-4" />}
                  >
                    {draftState.actionLabel}
                  </Button>
                )}
              </div>
            }
          />

          {/* Section Header & Segmented Tab Filters */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <SectionTitle
                title="Chores schedule"
                subtitle="Equitably distributed across your apartment"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewChoreModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                New chore
              </Button>
            </div>

            {/* Segmented Filter Buttons */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-[#E6E8EE]/70 max-w-md">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setScheduleFilter('my');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-[14px] font-heading font-black transition-all cursor-pointer ${
                  scheduleFilter === 'my'
                    ? 'bg-white text-[#1F2430] shadow-sm'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                My schedule ({myAssignments.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setScheduleFilter('all');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-[14px] font-heading font-black transition-all cursor-pointer ${
                  scheduleFilter === 'all'
                    ? 'bg-white text-[#1F2430] shadow-sm'
                    : 'text-[#475569] hover:text-[#1F2430]'
                }`}
              >
                All apartment chores ({assignments.length})
              </button>
            </div>
          </div>

          {/* EMPTY CHORES STATE */}
          {chores.length === 0 && (
            <EmptyState
              title="No chores in rotation"
              description="Add household chores like kitchen cleaning, bathroom, or trash to start the rotation."
              mascotState="calm"
              bubbleText="Add your first chore!"
              actionLabel="Add chore"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={() => setNewChoreModalOpen(true)}
            />
          )}

          {/* SEMANTIC GROUP 1: TODAY'S DUE TASKS */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="type-section-heading">Today's due tasks</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FFF0ED] text-[#FF6B4A] text-[14px] font-black">
                  {todayDueAssignments.length} Remaining
                </span>
              </div>
              <span className="type-secondary text-[14px]">Complete on time to protect streak</span>
            </div>

            {todayDueAssignments.length === 0 ? (
              <InfoCard padding="md" className="text-center type-secondary bg-white">
                All due tasks for today have been completed
              </InfoCard>
            ) : (
              todayDueAssignments.map((a) => {
                const chore = chores.find((c) => c.id === a.choreId);
                const assignedUser = roommates.find((r) => r.id === a.userId);
                if (!chore) return null;
                const isMe = a.userId === currentUser.id;

                const scheduleLabel =
                  chore.frequency === 'daily'
                    ? `Daily at ${a.scheduledTime}`
                    : `Weekly • ${a.scheduledDays.join(', ')} at ${a.scheduledTime}`;

                return (
                  <ActionCard
                    key={chore.id}
                    tint="teal"
                    iconTile={
                      <IconTile
                        icon={getChoreIcon(chore.name)}
                        color="teal"
                        size="md"
                      />
                    }
                    title={chore.name}
                    subtitle={scheduleLabel}
                    detail={
                      <div className="space-y-1.5">
                        <p className="text-[14px] text-[#475569]">{chore.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Chip effort={chore.effortLevel} size="sm" />
                          <span className="type-secondary text-[14px]">
                            Assigned to: <strong className="text-[#1F2430]">{isMe ? 'You' : assignedUser?.name}</strong>
                          </span>
                        </div>
                      </div>
                    }
                    actions={
                      isMe ? (
                        <div className="grid grid-cols-2 gap-3 w-full">
                          <Button
                            variant="teal"
                            size="md"
                            onClick={() => setDoneModalChore(chore)}
                            icon={<CheckCircle2 className="w-4 h-4" />}
                          >
                            Done
                          </Button>
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() => setSwapModalChore(chore)}
                            icon={<ArrowLeftRight className="w-4 h-4 text-[#475569]" />}
                          >
                            Swap
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="type-secondary text-[14px] font-bold">
                            Pending {assignedUser?.name.split(' ')[0]}'s completion
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSwapModalChore(chore)}
                          >
                            Reassign
                          </Button>
                        </div>
                      )
                    }
                  />
                );
              })
            )}
          </div>

          {/* SEMANTIC GROUP 2: COMPLETED TODAY */}
          {todayCompletedAssignments.length > 0 && (
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="type-section-heading text-[#2CA358]">Completed today</span>
                  <Chip status="agreed" label={`${todayCompletedAssignments.length} Done`} size="sm" />
                </div>
                <span className="type-secondary text-[14px]">Streaks updated</span>
              </div>

              {todayCompletedAssignments.map((a) => {
                const chore = chores.find((c) => c.id === a.choreId);
                const assignedUser = roommates.find((r) => r.id === a.userId);
                if (!chore) return null;
                const isMe = a.userId === currentUser.id;

                return (
                  <ActionCard
                    key={chore.id}
                    tint="green"
                    iconTile={
                      <IconTile
                        icon={<CheckCircle2 className="w-6 h-6" />}
                        color="green"
                        size="md"
                      />
                    }
                    title={chore.name}
                    subtitle={`Completed by ${isMe ? 'You' : assignedUser?.name}`}
                    detail={
                      <div className="space-y-1.5">
                        <p className="text-[14px] text-[#475569]">{chore.description}</p>
                        <div className="flex items-center gap-2">
                          <Chip effort={chore.effortLevel} size="sm" />
                          <span className="text-[14px] font-bold text-[#2CA358]">
                            +{getEffortPoints(chore.effortLevel)} streak points awarded
                          </span>
                        </div>
                      </div>
                    }
                    badge={
                      <Chip status="agreed" label="Completed" size="sm" />
                    }
                    actions={
                      !isMe ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="type-secondary text-[14px]">
                            Praise your roomie's contribution!
                          </span>
                          <Button
                            variant="reward"
                            size="sm"
                            onClick={() => assignedUser && setKudosModalData({ chore, target: assignedUser })}
                            icon={<Heart className="w-4 h-4 text-[#1F2430]" />}
                          >
                            Send kudos
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[14px] font-bold text-[#2CA358]">
                            Streak protected for today
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSwapModalChore(chore)}
                          >
                            Reassign
                          </Button>
                        </div>
                      )
                    }
                  >
                    {/* Kudos received for this chore */}
                    {a.kudos.length > 0 && (
                      <div className="pt-2.5 border-t border-black/5 flex flex-wrap gap-2 items-center">
                        <span className="text-[14px] font-bold text-[#8A6200]">
                          Roomie Kudos:
                        </span>
                        {a.kudos.map((k) => {
                          const sender = roommates.find((r) => r.id === k.fromUser);
                          return (
                            <span
                              key={k.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-[14px] font-bold"
                            >
                              <Heart className="w-3.5 h-3.5 fill-[#FF6B4A] text-[#FF6B4A]" />
                              <span>{sender?.name.split(' ')[0] || 'Roomie'}</span>
                              {k.note && <span className="font-semibold italic">"{k.note}"</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </ActionCard>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: Leaderboard & Away Mode ================= */}
        <div className="w-full lg:col-span-5 self-start h-fit space-y-6 mt-6 lg:mt-0 lg:sticky lg:top-0">
          {/* 1. ROOMIE STREAKS LEADERBOARD */}
          <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="type-section-heading flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#FF6B4A] fill-[#FF6B4A]" />
                  Roomie streaks and kudos
                </h3>
                <p className="type-secondary text-[14px]">
                  Apartment chore streaks and consistency
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-[14px] font-bold flex items-center gap-1">
                ⭐ Top streak: {maxStreak}d
              </span>
            </div>

            {/* Equal Streak Cards (No Numbered Rankings) */}
            <div className="space-y-2.5">
              {roommates.map((r) => {
                const isMe = r.id === currentUser.id;
                const isTopStreak = r.streakDays === maxStreak && maxStreak > 0;
                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                      isTopStreak
                        ? 'bg-linear-to-r from-[#FFF8E6] to-white border-[#FFE8A3] shadow-xs'
                        : isMe
                        ? 'bg-[#F7F8FB] border-[#E2E5EC]'
                        : 'bg-white border-[#E6E8EE]'
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[14px] font-bold text-[#1F2430]">
                            {r.name}
                          </p>
                          {isMe && <span className="text-[14px] font-bold text-[#FF6B4A] normal-case tracking-normal">(You)</span>}
                          {isTopStreak && (
                            <span className="px-2 py-0.5 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-[14px] font-bold inline-flex items-center gap-1 shadow-2xs">
                              Streak star
                            </span>
                          )}
                        </div>
                        <p className="type-secondary text-[14px]">
                          {r.points} reward points
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF0ED] text-[#FF6B4A] border border-[#FFD7CF] text-[14px] font-bold">
                        <Flame className="w-3.5 h-3.5 fill-[#FF6B4A]" />
                        {r.streakDays}d
                      </span>
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => setKudosModalData({ chore: chores[0], target: r })}
                          className="min-h-[36px] px-2.5 py-1 rounded-xl bg-[#FFF8E6] hover:bg-[#FFE8A3] text-[#8A6200] border border-[#FFE8A3] text-[14px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]"
                          title={`Send kudos to ${r.name}`}
                          aria-label={`Send kudos to ${r.name}`}
                        >
                          <Heart className="w-3.5 h-3.5 fill-[#FFC93C] text-[#8A6200]" />
                          <span>Kudos</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </InfoCard>

          {/* 2. AWAY MODE MANAGER (Flat InfoCard with quiet Secondary button per Section 17) */}
          <InfoCard padding="md" className="bg-white border-2 border-[#E6E8EE] shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <IconTile icon={<Plane className="w-5 h-5" />} color="slate" size="sm" />
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="type-card-title text-[#1F2430]">
                  {currentUser.awayUntil ? 'Away mode active' : 'Going on vacation?'}
                </h4>
                <p className="type-secondary text-[14px]">
                  {currentUser.awayUntil
                    ? `Your chores are paused until ${currentUser.awayUntil}. Streak is protected.`
                    : 'Protect your streak and notify roomies when traveling or during exam breaks.'}
                </p>
                {currentUser.awayUntil && (
                  <div className="inline-block mt-1 px-2.5 py-1 rounded-xl bg-[#F1F3F9] border border-[#E2E5EC] text-[14px] font-bold text-[#475569]">
                    Active until: {currentUser.awayUntil}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => setAwayModalOpen(true)}
              icon={<Plane className="w-4 h-4 text-[#475569]" />}
            >
              {currentUser.awayUntil ? 'Manage away mode' : 'Set away mode'}
            </Button>
          </InfoCard>
        </div>
      </div>

      {/* NEW CHORE MODAL */}
      <Modal
        isOpen={newChoreModalOpen}
        onClose={() => setNewChoreModalOpen(false)}
        title="Add apartment chore"
        subtitle="Introduce a recurring task to the pool"
        size="md"
      >
        <form onSubmit={handleCreateChore} className="space-y-4">
          <div>
            <label className="type-label block mb-1">Chore Name</label>
            <input
              type="text"
              value={newChoreName}
              onChange={(e) => setNewChoreName(e.target.value)}
              placeholder="e.g. Water plants, Vacuum hallway"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[15px] font-semibold text-[#1F2430]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="type-label block mb-1">Frequency</label>
              <select
                value={newChoreFreq}
                onChange={(e) => setNewChoreFreq(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="type-label block mb-1">Effort Level</label>
              <select
                value={newChoreEffort}
                onChange={(e) => setNewChoreEffort(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430]"
              >
                <option value="light">Light (10 pts)</option>
                <option value="medium">Medium (20 pts)</option>
                <option value="heavy">Heavy (30 pts)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="type-label block mb-1">Description</label>
            <textarea
              value={newChoreDesc}
              onChange={(e) => setNewChoreDesc(e.target.value)}
              placeholder="Any details, supplies needed, or tips..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setNewChoreModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
            >
              Add to pool
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sub-modals */}
      <DoneFlowModal
        isOpen={Boolean(doneModalChore)}
        onClose={() => setDoneModalChore(null)}
        chore={doneModalChore}
        currentUser={currentUser}
        onComplete={onCompleteChore}
      />

      <KudosModal
        isOpen={Boolean(kudosModalData)}
        onClose={() => setKudosModalData(null)}
        chore={kudosModalData?.chore || null}
        targetUser={kudosModalData?.target || null}
        onGiveKudos={onGiveKudos}
      />

      <ChoreSwapModal
        isOpen={Boolean(swapModalChore)}
        onClose={() => setSwapModalChore(null)}
        chore={swapModalChore}
        roommates={roommates.filter((r) => r.id !== currentUser.id)}
        onSwap={onSwapChore}
      />

      <AwayModeModal
        isOpen={awayModalOpen}
        onClose={() => setAwayModalOpen(false)}
        isAway={Boolean(currentUser.awayUntil)}
        onSetAway={onSetAway}
      />
    </div>
  );
};
