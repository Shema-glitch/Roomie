import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { MascotView } from '../../components/common/MascotView';
import { sound } from '../../services/sound';
import { User, Chore, ChoreAssignment } from '../../types';
import {
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Award,
  Check,
  Edit2,
  X,
} from 'lucide-react';

interface ChoreRevealScreenProps {
  assignments: ChoreAssignment[];
  chores: Chore[];
  users: User[];
  onFinish: (updatedAssignments?: ChoreAssignment[]) => void;
  reducedMotion?: boolean;
}

const TIME_PRESETS = ['09:30', '13:00', '18:30', '20:00', '21:30'];
const DAY_PRESETS = [
  { label: 'Mon & Thu', days: ['Mon', 'Thu'] },
  { label: 'Tue & Fri', days: ['Tue', 'Fri'] },
  { label: 'Wed & Sat', days: ['Wed', 'Sat'] },
  { label: 'Weekend', days: ['Sat', 'Sun'] },
];

export const ChoreRevealScreen: React.FC<ChoreRevealScreenProps> = ({
  assignments,
  chores,
  users,
  onFinish,
  reducedMotion = false,
}) => {
  const [phase, setPhase] = useState<'countdown' | 'revealing' | 'summary'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [currentMemberIndex, setCurrentMemberIndex] = useState<number>(0);
  const [confettiActive, setConfettiActive] = useState(false);

  // Self-scheduling state
  const [scheduleState, setScheduleState] = useState<
    Record<string, { days: string[]; time: string }>
  >(() => {
    const init: Record<string, { days: string[]; time: string }> = {};
    assignments.forEach((a) => {
      init[a.choreId] = {
        days: a.scheduledDays || ['Mon', 'Thu'],
        time: a.scheduledTime || '19:00',
      };
    });
    return init;
  });

  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);

  // Filter to roommates who have assignments
  const activeMembers = users.filter((u) =>
    assignments.some((a) => a.userId === u.id)
  );

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown > 1) {
      sound.playPop();
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, reducedMotion ? 300 : 850);
      return () => clearTimeout(timer);
    } else {
      sound.playPop();
      const timer = setTimeout(() => {
        setPhase('revealing');
        sound.playCelebration();
      }, reducedMotion ? 300 : 850);
      return () => clearTimeout(timer);
    }
  }, [phase, countdown, reducedMotion]);

  // Confetti on summary
  useEffect(() => {
    if (phase === 'summary') {
      sound.playCelebration();
      if (!reducedMotion) {
        setConfettiActive(true);
        const timer = setTimeout(() => setConfettiActive(false), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, reducedMotion]);

  const handleNextMember = () => {
    sound.playTap();
    setEditingChoreId(null);
    if (currentMemberIndex < activeMembers.length - 1) {
      setCurrentMemberIndex((prev) => prev + 1);
    } else {
      setPhase('summary');
    }
  };

  const currentMember = activeMembers[currentMemberIndex] || activeMembers[0];
  const currentMemberAssignments = assignments.filter((a) => a.userId === currentMember?.id);

  // Calculate effort score
  const getChoreEffort = (choreId: string) => {
    const c = chores.find((item) => item.id === choreId);
    if (!c) return 1;
    return c.effortLevel === 'heavy' ? 3 : c.effortLevel === 'medium' ? 2 : 1;
  };

  const totalEffort = currentMemberAssignments.reduce(
    (sum, a) => sum + getChoreEffort(a.choreId),
    0
  );

  const handleUpdateTime = (choreId: string, time: string) => {
    sound.playTap();
    setScheduleState((prev) => ({
      ...prev,
      [choreId]: {
        ...(prev[choreId] || { days: ['Mon', 'Thu'], time: '19:00' }),
        time,
      },
    }));
  };

  const handleUpdateDays = (choreId: string, days: string[]) => {
    sound.playTap();
    setScheduleState((prev) => ({
      ...prev,
      [choreId]: {
        ...(prev[choreId] || { days: ['Mon', 'Thu'], time: '19:00' }),
        days,
      },
    }));
  };

  const handleSaveAll = () => {
    sound.playSuccess();
    const updated = assignments.map((a) => {
      const sch = scheduleState[a.choreId];
      if (sch) {
        return {
          ...a,
          scheduledDays: sch.days,
          scheduledTime: sch.time,
        };
      }
      return a;
    });
    onFinish(updated);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto relative overflow-hidden select-none">
      {/* Confetti Particles on Summary */}
      {confettiActive && !reducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {Array.from({ length: 36 }).map((_, i) => {
            const colors = ['#FF6B4A', '#19B5A5', '#FFC93C', '#5B5BD6', '#3DBE6D'];
            const color = colors[i % colors.length];
            const left = `${(i * 2.8) % 100}%`;
            const delay = `${(i * 0.08) % 1.5}s`;
            const duration = `${1.6 + ((i * 0.15) % 1.2)}s`;
            return (
              <div
                key={i}
                className="absolute top-0 w-2.5 h-2.5 rounded-xs animate-bounce"
                style={{
                  left,
                  backgroundColor: color,
                  animationDelay: delay,
                  animationDuration: duration,
                  transform: `rotate(${i * 24}deg)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* 1. COUNTDOWN PHASE */}
      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <MascotView state="cheering" size="xl" bubbleText="Here comes the reveal!" />
          <h2 className="type-section-heading mt-6 uppercase">
            Revealing Chores In
          </h2>
          <div className="relative my-6 flex items-center justify-center">
            {!reducedMotion && (
              <div className="absolute w-32 h-32 rounded-full border-4 border-[#FF6B4A]/30 animate-ping pointer-events-none" />
            )}
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#FF8F73] flex items-center justify-center shadow-lg text-white">
              <span className="type-big-number text-5xl font-black text-white">
                {countdown}
              </span>
            </div>
          </div>
          <p className="type-secondary max-w-xs leading-relaxed">
            Secret preferences, avoidances, and effort are all balanced for a fair week.
          </p>
        </div>
      )}

      {/* 2. REVEALING PHASE (Member by Member) */}
      {phase === 'revealing' && currentMember && (
        <div className="flex-1 flex flex-col justify-between py-2">
          {/* Header step counter */}
          <div>
            <div className="flex justify-between items-center type-label mb-2">
              <span>
                Roomie {currentMemberIndex + 1} of {activeMembers.length}
              </span>
              <span className="text-[#19B5A5] font-bold">Chore Reveal</span>
            </div>
            {/* Progress segment indicator */}
            <div className="flex gap-1.5 w-full mb-4">
              {activeMembers.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full flex-1 transition-all ${
                    idx === currentMemberIndex
                      ? 'bg-[#FF6B4A]'
                      : idx < currentMemberIndex
                      ? 'bg-[#19B5A5]'
                      : 'bg-[#E6E8EE]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Member Card Flip/Slide */}
          <div className="my-auto space-y-4">
            <Card
              padding="lg"
              className={`space-y-4 border-2 border-[#E6E8EE] bg-white transition-all ${
                reducedMotion ? '' : 'animate-in fade-in slide-in-from-right-6 duration-300'
              }`}
            >
              {/* Member profile header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E8EE]">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={currentMember.avatar}
                    name={currentMember.name}
                    flag={currentMember.flag}
                    size="lg"
                  />
                  <div>
                    <h3 className="type-section-heading">
                      {currentMember.name}
                    </h3>
                    <p className="type-secondary">
                      {currentMember.country} {currentMember.flag}
                    </p>
                  </div>
                </div>

                {/* Effort Badge */}
                <div className="text-right">
                  <span className="type-label block mb-0.5">
                    Effort load
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-[14px] font-bold">
                    <Award className="w-3.5 h-3.5 text-[#FFC93C]" />
                    {totalEffort} pts
                  </span>
                </div>
              </div>

              {/* Assigned Chores List with Self-Scheduling */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="type-label">Assigned Chores This Week</span>
                  <span className="text-[14px] text-[#64748B] font-medium">Self-schedule times</span>
                </div>

                {currentMemberAssignments.length === 0 ? (
                  <p className="type-secondary italic py-2">
                    Rest week! No primary chores assigned.
                  </p>
                ) : (
                  currentMemberAssignments.map((a) => {
                    const chore = chores.find((c) => c.id === a.choreId);
                    if (!chore) return null;
                    const sch = scheduleState[chore.id] || {
                      days: a.scheduledDays,
                      time: a.scheduledTime,
                    };
                    const isEditing = editingChoreId === chore.id;

                    return (
                      <div
                        key={chore.id}
                        className="p-3.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="type-section-heading text-[16px]">
                              {chore.name}
                            </h4>
                            <p className="type-secondary mt-0.5 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#FF6B4A]" />
                              <span>
                                {sch.days.join(', ')} • {sch.time}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Chip
                              label={
                                chore.effortLevel === 'heavy'
                                  ? 'Heavy (3p)'
                                  : chore.effortLevel === 'medium'
                                  ? 'Medium (2p)'
                                  : 'Light (1p)'
                              }
                              effort={chore.effortLevel}
                              size="sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditingChoreId(isEditing ? null : chore.id)
                              }
                              className="p-1.5 rounded-xl border border-[#E6E8EE] bg-white hover:border-[#FF6B4A] text-[#64748B] hover:text-[#FF6B4A] cursor-pointer transition-colors"
                              title="Self-schedule preferred time"
                              aria-label="Self-schedule time"
                            >
                              {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Interactive Self-Scheduling Drawer */}
                        {isEditing && (
                          <div className="pt-2.5 border-t border-[#E6E8EE] space-y-2.5 bg-white p-3 rounded-xl border">
                            <div>
                              <span className="type-label block text-xs mb-1">
                                Choose Days
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {DAY_PRESETS.map((dp) => {
                                  const isSelected =
                                    JSON.stringify(sch.days) === JSON.stringify(dp.days);
                                  return (
                                    <button
                                      type="button"
                                      key={dp.label}
                                      onClick={() => handleUpdateDays(chore.id, dp.days)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#FF6B4A] text-white'
                                          : 'bg-[#F1F3F9] text-[#475569] hover:bg-[#E2E8F0]'
                                      }`}
                                    >
                                      {dp.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <span className="type-label block text-xs mb-1">
                                Choose Preferred Time
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {TIME_PRESETS.map((t) => (
                                  <button
                                    type="button"
                                    key={t}
                                    onClick={() => handleUpdateTime(chore.id, t)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      sch.time === t
                                        ? 'bg-[#19B5A5] text-white'
                                        : 'bg-[#F1F3F9] text-[#475569] hover:bg-[#E2E8F0]'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                                <input
                                  type="time"
                                  value={sch.time}
                                  onChange={(e) =>
                                    handleUpdateTime(chore.id, e.target.value)
                                  }
                                  className="px-2 py-0.5 rounded-lg border border-[#E6E8EE] text-xs font-bold bg-white"
                                />
                              </div>
                            </div>

                            <Button
                              variant="secondary"
                              size="sm"
                              fullWidth
                              onClick={() => setEditingChoreId(null)}
                              icon={<Check className="w-3.5 h-3.5" />}
                            >
                              Done scheduling
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Roomie Mascot Reaction */}
              <div className="pt-2 flex items-center gap-3 bg-[#FFF0ED]/40 p-3 rounded-2xl border border-[#FFD7CF]">
                <MascotView
                  state={totalEffort >= 5 ? 'calm' : 'cheering'}
                  size="sm"
                />
                <p className="type-secondary leading-relaxed text-[#1F2430]">
                  {totalEffort >= 5
                    ? `Big week for ${currentMember.name.split(' ')[0]}! Roomies will cheer them on.`
                    : `Balanced load for ${currentMember.name.split(' ')[0]}. Everyone's effort is fair!`}
                </p>
              </div>
            </Card>
          </div>

          {/* Action button */}
          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleNextMember}
              icon={
                currentMemberIndex < activeMembers.length - 1 ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )
              }
            >
              {currentMemberIndex < activeMembers.length - 1
                ? `Next: ${activeMembers[currentMemberIndex + 1]?.name.split(' ')[0]}`
                : 'View schedule'}
            </Button>
          </div>
        </div>
      )}

      {/* 3. SUMMARY CARD PHASE */}
      {phase === 'summary' && (
        <div className="flex-1 flex flex-col justify-between py-2">
          <div className="text-center">
            <MascotView state="celebrating" size="lg" bubbleText="All set for the week!" />
            <h2 className="type-title mt-2">
              Weekly Apartment Schedule
            </h2>
            <p className="type-secondary">
              Effort and times are evenly spread across the apartment.
            </p>
          </div>

          <Card padding="md" className="my-4 space-y-3 bg-white max-h-[50vh] overflow-y-auto">
            {activeMembers.map((member) => {
              const mAssignments = assignments.filter((a) => a.userId === member.id);
              const mEffort = mAssignments.reduce(
                (sum, a) => sum + getChoreEffort(a.choreId),
                0
              );
              return (
                <div
                  key={member.id}
                  className="p-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={member.avatar}
                        name={member.name}
                        flag={member.flag}
                        size="sm"
                      />
                      <span className="type-section-heading">
                        {member.name}
                      </span>
                    </div>
                    <span className="text-[14px] font-bold text-[#8A6200] bg-[#FFF8E6] px-2.5 py-0.5 rounded-full border border-[#FFE8A3]">
                      {mEffort} pts
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-8">
                    {mAssignments.map((a) => {
                      const c = chores.find((item) => item.id === a.choreId);
                      const sch = scheduleState[a.choreId] || {
                        days: a.scheduledDays,
                        time: a.scheduledTime,
                      };
                      return (
                        <div
                          key={a.choreId}
                          className="flex items-center justify-between text-[14px] font-medium bg-white border border-[#E6E8EE] px-2.5 py-1 rounded-xl text-[#1F2430]"
                        >
                          <span className="font-bold">{c?.name}</span>
                          <span className="type-secondary text-xs">
                            {sch.days.join(', ')} • {sch.time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>

          <div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSaveAll}
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              Save schedule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
