import React from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { User, DraftRound } from '../../types';
import { Sparkles, Check, Clock, ArrowLeft } from 'lucide-react';
import { useBackHandler } from '../../utils/useBackHandler';

interface WaitingDraftScreenProps {
  draftRound: DraftRound;
  roommates: User[];
  onStartReveal: () => void;
  onEditPicks: () => void;
  onClose?: () => void;
}

export const WaitingDraftScreen: React.FC<WaitingDraftScreenProps> = ({
  draftRound,
  roommates,
  onStartReveal,
  onEditPicks,
  onClose,
}) => {
  // Determine who has submitted picks
  useBackHandler(Boolean(onClose), 50, () => {
    onClose?.();
  });

  const submittedUserIds = new Set(draftRound.picks.map((p) => p.userId));
  const isReady = draftRound.status === 'ready_to_reveal' || submittedUserIds.size >= roommates.length - 1;

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe max-w-md mx-auto text-center select-none">
      {/* Top Section */}
      <div className="pt-2">
        {onClose && (
          <div className="flex justify-start mb-4">
            <button
              type="button"
              onClick={onClose}
              className="type-label text-[#64748B] hover:text-[#1F2430] flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to apartment
            </button>
          </div>
        )}

        <MascotView
          state={isReady ? 'cheering' : 'thinking'}
          size="xl"
          bubbleText={isReady ? 'Everyone is ready!' : 'Matching in progress...'}
        />

        <h2 className="type-title mt-4">
          {isReady ? 'The Draft is Ready' : 'Waiting for Roomies'}
        </h2>
        <p className="type-secondary max-w-xs mx-auto mt-1">
          {isReady
            ? 'All secret picks are in. Everyone can gather round for the reveal animation!'
            : 'Picks stay secret until everyone is finished. No fighting over who does what.'}
        </p>
      </div>

      {/* Roommates Readiness Status */}
      <div className="my-auto py-4">
        <Card padding="md" className="bg-white space-y-3">
          <div className="flex justify-between items-center type-label pb-2 border-b border-[#E6E8EE]">
            <span>Roomie Status</span>
            <span className="text-[#19B5A5]">
              {submittedUserIds.size} of {roommates.length} submitted
            </span>
          </div>

          <div className="space-y-2">
            {roommates.map((r) => {
              const hasSubmitted = submittedUserIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE]"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                    <span className="type-section-heading">
                      {r.name}
                    </span>
                  </div>
                  {hasSubmitted ? (
                    <span className="inline-flex items-center gap-1 text-[14px] font-bold text-[#3DBE6D] bg-[#EBF9F0] px-2.5 py-1 rounded-full border border-[#B8ECC8]">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[14px] font-bold text-[#64748B] bg-[#E6E8EE] px-2.5 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> Picking...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="space-y-2.5 pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStartReveal}
          icon={<Sparkles className="w-5 h-5 text-yellow-200" />}
        >
          {isReady ? 'Start reveal' : 'Reveal now'}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" fullWidth onClick={onEditPicks}>
            Edit picks
          </Button>
          {onClose && (
            <Button variant="secondary" size="sm" fullWidth onClick={onClose}>
              Back to flat
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
