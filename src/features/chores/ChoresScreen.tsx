import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { DoneFlowModal } from './DoneFlowModal';
import { KudosModal } from './KudosModal';
import { ChoreSwapModal } from './ChoreSwapModal';
import { AwayModeModal } from './AwayModeModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Chore, ChoreAssignment, DraftRound, User, KudosType } from '../../types';
import { THEME } from '../../theme/tokens';
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
  AlertCircle,
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
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'streaks'>('my');

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

  // Current user's assignments
  const myAssignments = assignments.filter((a) => a.userId === currentUser.id);

  const handleCreateChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoreName.trim()) return;
    try {
      await onAddChore(newChoreName.trim(), newChoreFreq, newChoreEffort, newChoreDesc.trim());
      showToast(`Chore "${newChoreName}" added to the household pool!`, 'success');
      setNewChoreName('');
      setNewChoreDesc('');
      setNewChoreModalOpen(false);
    } catch {
      showToast('Could not add chore', 'error');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Draft Banner (The Game Hook) */}
      <Card
        padding="md"
        className="bg-linear-to-r from-[#FFF0ED] via-[#FFF8E6] to-[#E6FAF8] border-2 border-[#FFD7CF] relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B4A]">
              <Sparkles className="w-3.5 h-3.5" /> Secret Draft Round
            </span>
            <h3 className="text-lg font-heading font-black text-[#1F2430] leading-tight mt-0.5">
              {draftRound.status === 'ready_to_reveal'
                ? 'All Picks In! Time to Reveal 🎭'
                : 'Sunday Chore Draft'}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5 font-medium">
              {draftRound.status === 'ready_to_reveal'
                ? 'Animated weekly assignment ready for Apartment 4B!'
                : 'Select your secret preferences: Want, Avoid, or Suggest.'}
            </p>
          </div>
          <div className="shrink-0">
            {draftRound.status === 'ready_to_reveal' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenReveal}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Reveal!
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenDraftPicks}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Pick Wishes
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#E6E8EE]/60">
        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('my');
          }}
          className={`py-2 rounded-xl text-xs font-heading font-extrabold transition-all cursor-pointer ${
            activeTab === 'my'
              ? 'bg-white text-[#1F2430] shadow-xs'
              : 'text-[#6B7280] hover:text-[#1F2430]'
          }`}
        >
          My Schedule
        </button>
        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('all');
          }}
          className={`py-2 rounded-xl text-xs font-heading font-extrabold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-[#1F2430] shadow-xs'
              : 'text-[#6B7280] hover:text-[#1F2430]'
          }`}
        >
          All Chores
        </button>
        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('streaks');
          }}
          className={`py-2 rounded-xl text-xs font-heading font-extrabold transition-all cursor-pointer ${
            activeTab === 'streaks'
              ? 'bg-white text-[#1F2430] shadow-xs'
              : 'text-[#6B7280] hover:text-[#1F2430]'
          }`}
        >
          Streaks & Kudos 🔥
        </button>
      </div>

      {/* TAB 1: MY SCHEDULE */}
      {activeTab === 'my' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-[#1F2430]">
                Your Assigned Chores
              </h3>
              <p className="text-xs text-[#6B7280]">
                {currentUser.awayUntil
                  ? '🌴 Away mode is active'
                  : 'Tap "Done" when finished to keep your streak!'}
              </p>
            </div>
            <button
              onClick={() => setAwayModalOpen(true)}
              className="text-xs font-bold text-[#FF6B4A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plane className="w-3.5 h-3.5" />
              {currentUser.awayUntil ? 'Away Mode On' : "I'm away"}
            </button>
          </div>

          {myAssignments.length === 0 ? (
            <EmptyState
              title="No chores assigned!"
              description="You have no pending tasks right now. Relax or jump into the upcoming chore draft!"
              mascotState="cheering"
              bubbleText="Kitchen sparkling!"
              actionLabel="Join Draft Picks"
              onAction={onOpenDraftPicks}
            />
          ) : (
            myAssignments.map((a) => {
              const chore = chores.find((c) => c.id === a.choreId);
              if (!chore) return null;
              return (
                <Card
                  key={chore.id}
                  padding="md"
                  className={`bg-white border transition-all ${
                    a.completedToday
                      ? 'border-[#B8ECC8] bg-[#EBF9F0]/30'
                      : 'border-[#E6E8EE]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-extrabold text-base text-[#1F2430]">
                          {chore.name}
                        </h4>
                        <Chip
                          label={chore.frequency}
                          variant="outline"
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {chore.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-[#1F2430]">
                        <Clock className="w-3.5 h-3.5 text-[#FF6B4A]" />
                        <span>
                          {a.scheduledDays.join(', ')} at {a.scheduledTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {a.completedToday ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EBF9F0] text-[#3DBE6D] text-xs font-extrabold border border-[#B8ECC8]">
                          <CheckCircle2 className="w-4 h-4" /> Completed!
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDoneModalChore(chore)}
                          icon={<CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
                        >
                          Done
                        </Button>
                      )}
                      {!a.completedToday && (
                        <button
                          onClick={() => setSwapModalChore(chore)}
                          className="text-[11px] font-bold text-[#6B7280] hover:text-[#1F2430] flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3 h-3" /> Swap
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kudos received for this chore */}
                  {a.kudos.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E6E8EE] flex flex-wrap gap-2 items-center">
                      <span className="text-[11px] font-bold text-[#8A6200]">
                        Kudos received:
                      </span>
                      {a.kudos.map((k) => {
                        const sender = roommates.find((r) => r.id === k.fromUser);
                        return (
                          <span
                            key={k.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-[11px] font-bold"
                          >
                            <span>{k.type === 'thanks' ? '💖' : k.type === 'great_job' ? '🌟' : '👀'}</span>
                            <span>{sender?.name.split(' ')[0] || 'Roomie'}</span>
                            {k.note && <span className="font-normal italic">"{k.note}"</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ALL CHORES */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-[#1F2430]">
                House Chore Pool
              </h3>
              <p className="text-xs text-[#6B7280]">
                {chores.length} standard & custom chores
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewChoreModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5 text-[#FF6B4A]" />}
            >
              Add Chore
            </Button>
          </div>

          <div className="space-y-2.5">
            {chores.map((chore) => {
              const assignment = assignments.find((a) => a.choreId === chore.id);
              const assignee = assignment
                ? roommates.find((r) => r.id === assignment.userId)
                : null;

              return (
                <Card key={chore.id} padding="sm" className="bg-white flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-sm text-[#1F2430]">
                        {chore.name}
                      </h4>
                      <Chip
                        label={chore.effortLevel}
                        effort={chore.effortLevel}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">
                      {chore.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {assignee ? (
                      <div className="flex items-center gap-1.5 text-right">
                        <Avatar
                          src={assignee.avatar}
                          name={assignee.name}
                          flag={assignee.flag}
                          size="sm"
                        />
                        <div className="text-left hidden sm:block">
                          <p className="text-xs font-bold text-[#1F2430]">
                            {assignee.name.split(' ')[0]}
                          </p>
                          <p className="text-[10px] text-[#6B7280]">Assigned</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#6B7280] italic">Unassigned</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STREAKS & KUDOS */}
      {activeTab === 'streaks' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-heading font-bold text-base text-[#1F2430]">
              House Streaks & Kudos 🔥
            </h3>
            <p className="text-xs text-[#6B7280]">
              Friendly recognition keeps the apartment shining!
            </p>
          </div>

          {/* Leaderboard */}
          <Card padding="md" className="bg-white space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
              Roommate Streak Rankings
            </h4>
            <div className="space-y-2">
              {[...roommates]
                .sort((a, b) => b.streakDays - a.streakDays)
                .map((r, idx) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-extrabold text-[#6B7280]">
                        #{idx + 1}
                      </span>
                      <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                      <div>
                        <p className="font-heading font-bold text-sm text-[#1F2430]">
                          {r.name} {r.id === currentUser.id ? '(You)' : ''}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {r.points} total reward points
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-xs font-black">
                      <Flame className="w-4 h-4 text-[#FF6B4A] fill-[#FF6B4A]" />
                      <span>{r.streakDays} days</span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Kudos Feed & Send Kudos */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280]">
              Recent Flatmate Achievements
            </h4>
            {assignments
              .filter((a) => a.completedToday)
              .map((a) => {
                const chore = chores.find((c) => c.id === a.choreId);
                const user = roommates.find((r) => r.id === a.userId);
                if (!chore || !user) return null;
                const isMe = user.id === currentUser.id;

                return (
                  <Card key={a.choreId} padding="sm" className="bg-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatar} name={user.name} flag={user.flag} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-[#1F2430]">
                          {user.name.split(' ')[0]} finished <strong>{chore.name}</strong>
                        </p>
                        <p className="text-[11px] text-[#3DBE6D] font-semibold">
                          Completed on time ✨
                        </p>
                      </div>
                    </div>
                    {!isMe && (
                      <Button
                        variant="reward"
                        size="sm"
                        onClick={() => setKudosModalData({ chore, target: user })}
                        icon={<Heart className="w-3.5 h-3.5 text-[#1F2430]" />}
                      >
                        Kudos
                      </Button>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      )}

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

      {/* Add Custom Chore Modal */}
      {newChoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <Card padding="lg" className="w-full max-w-sm bg-white space-y-4">
            <h3 className="text-xl font-heading font-black text-[#1F2430]">
              Add Household Chore
            </h3>
            <form onSubmit={handleCreateChore} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1F2430] mb-1">
                  Chore Name
                </label>
                <input
                  type="text"
                  required
                  value={newChoreName}
                  onChange={(e) => setNewChoreName(e.target.value)}
                  placeholder="e.g. Balcony plant watering"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E8EE] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2430] mb-1">
                  Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChoreFreq('daily')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      newChoreFreq === 'daily'
                        ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                        : 'border-[#E6E8EE] text-[#6B7280]'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChoreFreq('weekly')}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      newChoreFreq === 'weekly'
                        ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                        : 'border-[#E6E8EE] text-[#6B7280]'
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2430] mb-1">
                  Effort Level
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['light', 'medium', 'heavy'] as const).map((eff) => (
                    <button
                      type="button"
                      key={eff}
                      onClick={() => setNewChoreEffort(eff)}
                      className={`py-2 rounded-xl text-xs font-bold border capitalize ${
                        newChoreEffort === eff
                          ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                          : 'border-[#E6E8EE] text-[#6B7280]'
                      }`}
                    >
                      {eff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2430] mb-1">
                  Description
                </label>
                <textarea
                  value={newChoreDesc}
                  onChange={(e) => setNewChoreDesc(e.target.value)}
                  placeholder="Brief instructions for roommates..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E8EE] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setNewChoreModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Chore
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
