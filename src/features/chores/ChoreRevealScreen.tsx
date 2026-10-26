import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { MascotView } from '../../components/common/MascotView';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { User, Chore, ChoreAssignment } from '../../types';
import { Sparkles, Calendar, ArrowRight, CheckCircle2, ChevronRight, Award } from 'lucide-react';

interface ChoreRevealScreenProps {
  assignments: ChoreAssignment[];
  chores: Chore[];
  users: User[];
  onFinish: () => void;
  reducedMotion?: boolean;
}

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
      }, reducedMotion ? 400 : 900);
      return () => clearTimeout(timer);
    } else {
      sound.playPop();
      const timer = setTimeout(() => {
        setPhase('revealing');
        sound.playCelebration();
      }, reducedMotion ? 300 : 900);
      return () => clearTimeout(timer);
    }
  }, [phase, countdown, reducedMotion]);

  // Confetti on summary
  useEffect(() => {
    if (phase === 'summary') {
      sound.playCelebration();
      setConfettiActive(true);
      const timer = setTimeout(() => setConfettiActive(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleNextMember = () => {
    sound.playTap();
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

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto relative overflow-hidden select-none">
      {/* Confetti Particles on Summary */}
      {confettiActive && !reducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => {
            const colors = ['#FF6B4A', '#19B5A5', '#FFC93C', '#5B5BD6', '#3DBE6D'];
            const color = colors[i % colors.length];
            const left = `${(i * 3.3) % 100}%`;
            const delay = `${(i * 0.1) % 1.5}s`;
            const duration = `${1.8 + ((i * 0.2) % 1.2)}s`;
            return (
              <div
                key={i}
                className="absolute top-0 w-3 h-3 rounded-xs animate-bounce"
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
            Revealing Chores In...
          </h2>
          <div
            key={countdown}
            className="type-big-number text-[#FF6B4A] my-4"
          >
            {countdown}
          </div>
          <p className="type-secondary max-w-xs">
            Secret wishes, avoidances, and effort balanced for a fair week.
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
              <span className="text-[#19B5A5]">Chore Reveal ✨</span>
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
          <div className="my-auto">
            <Card
              padding="lg"
              className={`space-y-4 border-2 border-[#E6E8EE] bg-white transition-all duration-300 ${
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
                      {currentMember.country}
                    </p>
                  </div>
                </div>

                {/* Effort Badge */}
                <div className="text-right">
                  <span className="type-label block mb-0.5">
                    Effort Score
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF8E6] text-[#8A6200] border border-[#FFE8A3] text-[14px] font-bold">
                    <Award className="w-3.5 h-3.5 text-[#FFC93C]" />
                    {totalEffort} pts
                  </span>
                </div>
              </div>

              {/* Assigned Chores List */}
              <div className="space-y-2.5">
                <span className="type-label block">
                  Assigned Chores This Week
                </span>
                {currentMemberAssignments.length === 0 ? (
                  <p className="type-secondary italic">
                    Rest week! No primary chores assigned.
                  </p>
                ) : (
                  currentMemberAssignments.map((a) => {
                    const chore = chores.find((c) => c.id === a.choreId);
                    if (!chore) return null;
                    return (
                      <div
                        key={chore.id}
                        className="p-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] flex items-center justify-between gap-2"
                      >
                        <div className="flex-1">
                          <h4 className="type-section-heading">
                            {chore.name}
                          </h4>
                          <p className="type-secondary mt-0.5">
                            {a.scheduledDays.join(', ')} • {a.scheduledTime}
                          </p>
                        </div>
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
            <MascotView state="celebrating" size="lg" bubbleText="All set for the week! 🎉" />
            <h2 className="type-title mt-2">
              Weekly Apartment Schedule
            </h2>
            <p className="type-secondary">
              Effort is evenly spread across the apartment.
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
                  className="p-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] space-y-1.5"
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
                  <div className="flex flex-wrap gap-1.5 pl-8">
                    {mAssignments.map((a) => {
                      const c = chores.find((item) => item.id === a.choreId);
                      return (
                        <span
                          key={a.choreId}
                          className="inline-block text-[14px] font-medium bg-white border border-[#E6E8EE] px-2.5 py-0.5 rounded-lg text-[#1F2430]"
                        >
                          {c?.name}
                        </span>
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
              onClick={() => {
                sound.playSuccess();
                onFinish();
              }}
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
