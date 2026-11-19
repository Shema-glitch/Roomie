import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MascotView } from '../../components/common/MascotView';
import { Chore, DraftPick, User, MascotState } from '../../types';
import { calculateDraftProgressPercent } from '../../utils/stateTable';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import {
  Heart,
  Prohibit,
  UsersThree,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Shuffle,
  Sparkle,
} from '@phosphor-icons/react';
import { Icon } from '@iconify/react';
import { useToast } from '../../components/common/Toast';
import { useBackHandler } from '../../utils/useBackHandler';

interface SecretDraftScreenProps {
  chores: Chore[];
  roommates: User[];
  currentUser: User;
  onSubmitPicks: (picks: DraftPick[]) => Promise<void>;
  onCancel: () => void;
}

export const SecretDraftScreen: React.FC<SecretDraftScreenProps> = ({
  chores,
  roommates,
  currentUser,
  onSubmitPicks,
  onCancel,
}) => {
  const { showToast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  useEffect(() => () => clearAutoAdvance(), []);

  useBackHandler(showSummary && !submitting, 60, () => {
    sound.playTap();
    setShowSummary(false);
  });

  useBackHandler(currentIndex > 0 && !suggestModalOpen && !showSummary, 55, () => {
    clearAutoAdvance();
    sound.playTap();
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  });

  useBackHandler(currentIndex === 0 && !suggestModalOpen && !showSummary, 50, () => {
    clearAutoAdvance();
    sound.playTap();
    onCancel();
  });

  const activeChores = chores.filter((c) => c.active);
  const currentChore = activeChores[currentIndex];
  const otherRoommates = roommates.filter((r) => r.id !== currentUser.id);
  const existingPick = picks.find((p) => p.choreId === currentChore?.id);

  const preferredCount = picks.filter((p) => p.pickType === 'want').length;
  const avoidCount = picks.filter((p) => p.pickType === 'avoid').length;
  const suggestCount = picks.filter((p) => p.pickType === 'suggest_for').length;

  const scheduleStepTransition = (isLastChore: boolean) => {
    clearAutoAdvance();
    autoAdvanceTimerRef.current = setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      if (isLastChore) {
        sound.awardCelebrate();
        haptics.awardCelebrate();
        setShowSummary(true);
      } else {
        setCurrentIndex((prev) => Math.min(activeChores.length - 1, prev + 1));
      }
    }, 420);
  };

  const handleSelectPick = (type: 'want' | 'avoid', targetUserId?: string) => {
    if (!currentChore) return;
    sound.tokenClink();
    haptics.tokenClink();

    const updated = picks.filter((p) => p.choreId !== currentChore.id);
    updated.push({
      userId: currentUser.id,
      choreId: currentChore.id,
      pickType: type,
      targetUserId,
    });
    setPicks(updated);
    scheduleStepTransition(currentIndex === activeChores.length - 1);
  };

  const handleSuggest = (targetUserId: string) => {
    if (!currentChore) return;
    sound.tokenClink();
    haptics.tokenClink();

    const updated = picks.filter((p) => p.choreId !== currentChore.id);
    updated.push({
      userId: currentUser.id,
      choreId: currentChore.id,
      pickType: 'suggest_for',
      targetUserId,
    });
    setPicks(updated);
    setSuggestModalOpen(false);
    scheduleStepTransition(currentIndex === activeChores.length - 1);
  };

  const handleConfirmSummary = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      sound.playSuccess();
      haptics.swapAccept();
      await onSubmitPicks(picks);
      showToast('Weekly chore picks locked in!', 'reward');
    } catch {
      showToast('Error submitting picks', 'error');
      setSubmitting(false);
    }
  };

  if (!currentChore) {
    return null;
  }

  const getCoachFeedback = (): { state: MascotState; text: string } => {
    if (!existingPick) {
      return { state: 'thinking', text: 'How do you feel about this chore?' };
    }
    if (existingPick.pickType === 'want') {
      return { state: 'cheering', text: 'Awesome! Easy points for you.' };
    }
    if (existingPick.pickType === 'avoid') {
      return { state: 'calm', text: "Got it — we'll keep things fair." };
    }
    return { state: 'idle', text: 'Noted! Passing this one along.' };
  };

  const coach = getCoachFeedback();
  const progressPercent = calculateDraftProgressPercent(
    currentIndex,
    activeChores.length,
    showSummary
  );

  if (showSummary) {
    return (
      <div className="min-h-[100dvh] bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe max-w-md mx-auto select-none">
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                sound.playTap();
                setShowSummary(false);
              }}
              className="type-label text-[#64748B] hover:text-[#1F2430] flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Review
            </button>
            <span className="type-label text-[#FF6B4A] flex items-center gap-1">
              <Sparkle weight="fill" className="w-3.5 h-3.5" /> Weekly Picks
            </span>
          </div>

          <ProgressBar
            value={100}
            color="success"
            label={`${activeChores.length} of ${activeChores.length} ranked`}
            showPercent
          />
        </div>

        <div className="my-auto py-6">
          <div className="spring-pop rounded-3xl bg-white border-2 border-b-4 border-[#E5E9F0] p-6 shadow-md text-center space-y-5">
            <div className="flex justify-center">
              <MascotView
                state="celebrating"
                size="lg"
                bubbleText="Fair week incoming!"
              />
            </div>

            <div className="space-y-1">
              <h2 className="font-heading font-black text-2xl text-[#1F2430]">
                Picks Locked In!
              </h2>
              <p className="text-sm font-medium text-[#64748B]">
                Your secret preferences are ready for Sunday&apos;s chore match.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
                <div className="text-xl font-heading font-black text-[#0F7A3D]">
                  {preferredCount}
                </div>
                <div className="text-xs font-bold text-[#0F7A3D]">Preferred</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-200">
                <div className="text-xl font-heading font-black text-[#9A6700]">
                  {avoidCount}
                </div>
                <div className="text-xs font-bold text-[#9A6700]">Not fave</div>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border-2 border-indigo-200">
                <div className="text-xl font-heading font-black text-[#3B4BC4]">
                  {suggestCount}
                </div>
                <div className="text-xs font-bold text-[#3B4BC4]">Passed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            onClick={handleConfirmSummary}
            icon={<Check weight="bold" className="w-4 h-4" />}
          >
            {submitting ? 'Saving picks...' : 'Done & Save Picks'}
          </Button>
        </div>
      </div>
    );
  }

  const suggestedRoomieName =
    existingPick?.pickType === 'suggest_for'
      ? roommates.find((r) => r.id === existingPick.targetUserId)?.name.split(' ')[0] || 'a roomie'
      : null;

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe max-w-md mx-auto select-none">
      {/* Top Progress + Live Mascot Coach Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              clearAutoAdvance();
              onCancel();
            }}
            className="type-label text-[#64748B] hover:text-[#1F2430] flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <span className="type-label text-[#FF6B4A] flex items-center gap-1">
            <Shuffle className="w-3.5 h-3.5" /> Weekly Picks
          </span>
        </div>

        <ProgressBar
          value={progressPercent}
          color="primary"
          label={`Chore ${currentIndex + 1} of ${activeChores.length}`}
          showPercent
        />

        {/* Live Mascot Coach Row */}
        <div className="flex items-center gap-3 pt-1">
          <div className="shrink-0">
            <MascotView state={coach.state} size="sm" />
          </div>
          <div
            key={`${currentIndex}-${existingPick?.pickType ?? 'none'}`}
            className="spring-pop relative flex-1 px-3.5 py-2.5 rounded-2xl bg-white border-2 border-b-4 border-[#E5E9F0] text-[13px] font-bold text-[#1F2430] shadow-2xs leading-snug"
          >
            {coach.text}
          </div>
        </div>
      </div>

      {/* Focused Chore Stage */}
      <div className="flex-1 flex flex-col justify-center py-4">
        <Card
          key={currentChore.id}
          padding="lg"
          className="spring-pop bg-white space-y-5 shadow-md border-2 border-b-4 border-[#E5E9F0] rounded-3xl text-center"
        >
          <div className="flex justify-between items-center gap-2">
            <Chip
              label={currentChore.frequency === 'daily' ? 'Daily' : 'Weekly'}
              variant="outline"
              size="sm"
            />
            <Chip
              label={
                currentChore.effortLevel === 'heavy'
                  ? 'Heavy (3 pts)'
                  : currentChore.effortLevel === 'medium'
                  ? 'Medium (2 pts)'
                  : 'Light (1 pt)'
              }
              effort={currentChore.effortLevel}
              size="sm"
            />
          </div>

          <div className="py-1 space-y-2.5">
            <div className="w-16 h-16 rounded-2xl bg-[#E6FAF8] border-2 border-[#B6EFEA] flex items-center justify-center mx-auto shadow-2xs">
              <Icon icon="fluent-emoji-flat:broom" className="w-9 h-9" />
            </div>
            <div>
              <h2 className="font-heading font-black text-2xl text-[#1F2430] leading-tight">
                {currentChore.name}
              </h2>
              {currentChore.description && (
                <p className="type-secondary text-xs sm:text-sm mt-1 max-w-xs mx-auto leading-relaxed">
                  {currentChore.description}
                </p>
              )}
            </div>
          </div>

          {/* Tactile Color-Coded Choice Cards */}
          <div className="grid grid-cols-1 gap-2.5 pt-1 text-start">
            <button
              type="button"
              onClick={() => handleSelectPick('want')}
              className={`tactile-press w-full p-3.5 rounded-2xl border-2 border-b-4 text-[14px] font-bold flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                existingPick?.pickType === 'want'
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-xs'
                  : 'border-[#E6E8EE] bg-white hover:border-emerald-400 text-[#1F2430]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    existingPick?.pickType === 'want'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <Heart weight="fill" className="w-4 h-4" />
                </span>
                <span className="truncate">I&apos;ll happily do this</span>
              </span>
              {existingPick?.pickType === 'want' && (
                <CheckCircle
                  weight="fill"
                  className="spring-pop w-5 h-5 text-emerald-600 shrink-0"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectPick('avoid')}
              className={`tactile-press w-full p-3.5 rounded-2xl border-2 border-b-4 text-[14px] font-bold flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                existingPick?.pickType === 'avoid'
                  ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-xs'
                  : 'border-[#E6E8EE] bg-white hover:border-amber-400 text-[#1F2430]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    existingPick?.pickType === 'avoid'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Prohibit weight="fill" className="w-4 h-4" />
                </span>
                <span className="truncate">Not my favorite</span>
              </span>
              {existingPick?.pickType === 'avoid' && (
                <CheckCircle
                  weight="fill"
                  className="spring-pop w-5 h-5 text-amber-600 shrink-0"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                clearAutoAdvance();
                sound.playTap();
                setSuggestModalOpen(true);
              }}
              className={`tactile-press w-full p-3.5 rounded-2xl border-2 border-b-4 text-[14px] font-bold flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                existingPick?.pickType === 'suggest_for'
                  ? 'border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-xs'
                  : 'border-[#E6E8EE] bg-white hover:border-indigo-400 text-[#1F2430]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    existingPick?.pickType === 'suggest_for'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <UsersThree weight="fill" className="w-4 h-4" />
                </span>
                <span className="truncate">
                  {suggestedRoomieName
                    ? `Better for ${suggestedRoomieName}`
                    : 'Better for a roomie'}
                </span>
              </span>
              {existingPick?.pickType === 'suggest_for' && (
                <CheckCircle
                  weight="fill"
                  className="spring-pop w-5 h-5 text-indigo-600 shrink-0"
                />
              )}
            </button>
          </div>
        </Card>
      </div>

      {/* Bottom Nav / Submit */}
      <div className="pt-2">
        <div className="flex gap-2">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                clearAutoAdvance();
                sound.playTap();
                setCurrentIndex((prev) => prev - 1);
              }}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Prev
            </Button>
          )}

          {currentIndex < activeChores.length - 1 ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!existingPick}
              className={!existingPick ? 'opacity-50 pointer-events-none' : ''}
              onClick={() => {
                clearAutoAdvance();
                sound.playTap();
                setCurrentIndex((prev) => prev + 1);
              }}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!existingPick}
              className={!existingPick ? 'opacity-50 pointer-events-none' : ''}
              onClick={() => {
                clearAutoAdvance();
                sound.awardCelebrate();
                haptics.awardCelebrate();
                setShowSummary(true);
              }}
              icon={<Check className="w-4 h-4" />}
            >
              Lock In Picks
            </Button>
          )}
        </div>
      </div>

      {/* Suggest for Roommate Dialog */}
      {suggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <Card padding="lg" className="spring-pop w-full max-w-xs bg-white space-y-3 rounded-3xl border-2 border-[#E5E9F0]">
            <h4 className="type-section-heading">Better for a roomie</h4>
            <p className="type-secondary">
              Who might be a great match for &quot;{currentChore.name}&quot;?
            </p>
            <div className="space-y-2 pt-2">
              {otherRoommates.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSuggest(r.id)}
                  className="tactile-press w-full p-2.5 rounded-2xl border-2 border-b-4 border-[#E6E8EE] hover:border-indigo-500 bg-white flex items-center gap-3 text-start cursor-pointer transition-colors"
                >
                  <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                  <span className="type-body font-bold">{r.name}</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setSuggestModalOpen(false)}
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};
