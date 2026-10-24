import React from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { User, DraftRound } from '../../types';
import { Sparkles, Check, Clock, ArrowRight } from 'lucide-react';

interface WaitingDraftScreenProps {
  draftRound: DraftRound;
  roommates: User[];
  onStartReveal: () => void;
  onEditPicks: () => void;
}

export const WaitingDraftScreen: React.FC<WaitingDraftScreenProps> = ({
  draftRound,
  roommates,
  onStartReveal,
  onEditPicks,
}) => {
  // Determine who has submitted picks
  const submittedUserIds = new Set(draftRound.picks.map((p) => p.userId));
  const isReady = draftRound.status === 'ready_to_reveal' || submittedUserIds.size >= roommates.length - 1;

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto text-center select-none">
      {/* Top Section */}
      <div className="pt-6">
        <MascotView
          state={isReady ? 'cheering' : 'thinking'}
          size="xl"
          bubbleText={isReady ? 'Everyone is ready!' : 'Matching in progress...'}
        />

        <h2 className="text-3xl font-heading font-black text-[#1F2430] mt-4">
          {isReady ? 'The Draft is Ready!' : 'Waiting for Roommates'}
        </h2>
        <p className="text-xs text-[#6B7280] font-semibold max-w-xs mx-auto mt-1">
          {isReady
            ? 'All secret picks are in. Everyone can gather round for the reveal animation!'
            : 'Picks stay secret until everyone is finished. No fighting over who does what.'}
        </p>
      </div>

      {/* Roommates Readiness Status */}
      <div className="my-auto py-4">
        <Card padding="md" className="bg-white space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-[#1F2430] pb-2 border-b border-[#E6E8EE]">
            <span>Roommate Status</span>
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
                    <span className="font-heading font-bold text-sm text-[#1F2430]">
                      {r.name}
                    </span>
                  </div>
                  {hasSubmitted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#3DBE6D] bg-[#EBF9F0] px-2.5 py-1 rounded-full border border-[#B8ECC8]">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6B7280] bg-[#E6E8EE] px-2.5 py-1 rounded-full">
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
          {isReady ? 'Start Chore Reveal! 🎭' : 'Reveal Chores Now'}
        </Button>
        <Button variant="ghost" size="sm" fullWidth onClick={onEditPicks}>
          Change My Secret Picks
        </Button>
      </div>
    </div>
  );
};
