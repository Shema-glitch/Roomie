import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MascotView } from '../../components/common/MascotView';
import { Chore, DraftPick, User } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { Heart, Ban, Users, ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

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
  const [submitting, setSubmitting] = useState(false);

  const activeChores = chores.filter((c) => c.active);
  const currentChore = activeChores[currentIndex];

  const otherRoommates = roommates.filter((r) => r.id !== currentUser.id);

  // Current pick for this chore if already selected
  const existingPick = picks.find((p) => p.choreId === currentChore?.id);

  const handleSelectPick = (type: 'want' | 'avoid', targetUserId?: string) => {
    sound.playPop();
    const updated = picks.filter((p) => p.choreId !== currentChore.id);
    updated.push({
      userId: currentUser.id,
      choreId: currentChore.id,
      pickType: type,
      targetUserId,
    });
    setPicks(updated);

    // Auto advance if not last
    if (currentIndex < activeChores.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSuggest = (targetUserId: string) => {
    sound.playPop();
    const updated = picks.filter((p) => p.choreId !== currentChore.id);
    updated.push({
      userId: currentUser.id,
      choreId: currentChore.id,
      pickType: 'suggest_for',
      targetUserId,
    });
    setPicks(updated);
    setSuggestModalOpen(false);

    if (currentIndex < activeChores.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      sound.playSuccess();
      await onSubmitPicks(picks);
      showToast('Secret picks submitted! Ready for the reveal.', 'reward');
    } catch {
      showToast('Error submitting picks', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentChore) {
    return null;
  }

  const progressPercent = ((currentIndex + 1) / activeChores.length) * 100;

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto select-none">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onCancel}
            className="text-xs font-bold text-[#6B7280] hover:text-[#1F2430] flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel Draft
          </button>
          <span className="text-xs font-bold text-[#FF6B4A] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Secret Picks
          </span>
        </div>

        <ProgressBar
          value={progressPercent}
          color="reward"
          label={`Chore ${currentIndex + 1} of ${activeChores.length}`}
          showPercent
        />
      </div>

      {/* Chore Flashcard */}
      <div className="my-auto py-4">
        <Card
          padding="lg"
          className="bg-white space-y-4 shadow-md border-2 border-[#E6E8EE] text-center"
        >
          <div className="flex justify-between items-center">
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

          <div className="py-4">
            <div className="w-16 h-16 rounded-3xl bg-[#FFF0ED] text-[#FF6B4A] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-heading font-black text-[#1F2430]">
              {currentChore.name}
            </h2>
            <p className="text-xs text-[#6B7280] font-semibold mt-1 max-w-xs mx-auto">
              {currentChore.description}
            </p>
          </div>

          {/* Current Choice Indicator */}
          {existingPick && (
            <div className="p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE] text-xs font-bold text-[#1F2430]">
              {existingPick.pickType === 'want' && '❤️ You picked: Want'}
              {existingPick.pickType === 'avoid' && '🙅‍♂️ You picked: Avoid'}
              {existingPick.pickType === 'suggest_for' && (
                <span>
                  👥 Suggested for{' '}
                  {roommates.find((r) => r.id === existingPick.targetUserId)?.name}
                </span>
              )}
            </div>
          )}

          {/* Choice Action Buttons */}
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleSelectPick('want')}
              className={`p-3.5 rounded-2xl border-2 font-heading font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                existingPick?.pickType === 'want'
                  ? 'border-[#3DBE6D] bg-[#EBF9F0] text-[#2CA358] shadow-xs'
                  : 'border-[#E6E8EE] bg-white hover:border-[#3DBE6D] text-[#1F2430]'
              }`}
            >
              <Heart className="w-5 h-5 text-[#3DBE6D] fill-[#3DBE6D]/20" />
              <span>I don't mind / Want ❤️</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPick('avoid')}
              className={`p-3.5 rounded-2xl border-2 font-heading font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                existingPick?.pickType === 'avoid'
                  ? 'border-[#E5484D] bg-[#FDECEE] text-[#BF3337] shadow-xs'
                  : 'border-[#E6E8EE] bg-white hover:border-[#E5484D] text-[#1F2430]'
              }`}
            >
              <Ban className="w-5 h-5 text-[#E5484D]" />
              <span>Rather avoid this 🙅‍♂️</span>
            </button>

            <button
              type="button"
              onClick={() => setSuggestModalOpen(true)}
              className={`p-3.5 rounded-2xl border-2 font-heading font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                existingPick?.pickType === 'suggest_for'
                  ? 'border-[#5B5BD6] bg-[#EEF0FD] text-[#5B5BD6] shadow-xs'
                  : 'border-[#E6E8EE] bg-white hover:border-[#5B5BD6] text-[#1F2430]'
              }`}
            >
              <Users className="w-5 h-5 text-[#5B5BD6]" />
              <span>Suggest for roommate 👥</span>
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
              onClick={() => setCurrentIndex((prev) => prev - 1)}
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
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Next Chore
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={submitting}
              onClick={handleSubmitAll}
              icon={<Check className="w-4 h-4" />}
            >
              {submitting ? 'Submitting...' : 'Complete My Picks!'}
            </Button>
          )}
        </div>
      </div>

      {/* Suggest for Roommate Dialog */}
      {suggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <Card padding="lg" className="w-full max-w-xs bg-white space-y-3">
            <h4 className="font-heading font-bold text-lg text-[#1F2430]">
              Suggest for roommate:
            </h4>
            <p className="text-xs text-[#6B7280]">
              Who might be a great match for "{currentChore.name}"?
            </p>
            <div className="space-y-2 pt-2">
              {otherRoommates.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSuggest(r.id)}
                  className="w-full p-2.5 rounded-2xl border border-[#E6E8EE] hover:border-[#5B5BD6] bg-white flex items-center gap-3 text-left cursor-pointer transition-all"
                >
                  <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                  <span className="font-bold text-sm text-[#1F2430]">{r.name}</span>
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
