import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Chore, User, ChoreSwapRequest } from '../../types';
import { ArrowsLeftRight, Check, Coins, Sparkle } from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import { haptics } from '../../services/haptics';

interface ChoreSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore: Chore | null;
  roommates: User[];
  onSwap: (choreId: string, toUserId: string, tokenCost?: number, note?: string) => Promise<void>;
}

export const ChoreSwapModal: React.FC<ChoreSwapModalProps> = ({
  isOpen,
  onClose,
  chore,
  roommates,
  onSwap,
}) => {
  const { showToast } = useToast();
  const [selectedRoommateId, setSelectedRoommateId] = useState<string>('');
  const [tokenCost, setTokenCost] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [userTokens, setUserTokens] = useState<number>(5);
  const [pendingSwaps, setPendingSwaps] = useState<ChoreSwapRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getFavorTokenBalance().then(setUserTokens).catch(() => {});
      api.auth.getCurrentUser().then((currentUser) => {
        api.getSwapRequests().then((reqs) => {
          const incoming = reqs.filter(
            (r) => r.targetUserId === currentUser.id && r.status === 'pending'
          );
          setPendingSwaps(incoming);
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!chore) return null;

  const handleConfirm = async () => {
    if (!selectedRoommateId) return;
    if (userTokens < tokenCost) {
      showToast('Not enough favor tokens for this swap offer', 'error');
      return;
    }

    setLoading(true);
    try {
      haptics.celebration();
      sound.playPop();
      await onSwap(chore.id, selectedRoommateId, tokenCost, note);
      const target = roommates.find((r) => r.id === selectedRoommateId);
      showToast(
        `Chore swap offered to ${target?.name.split(' ')[0]} with ${tokenCost} Favor Token!`,
        'success'
      );
      onClose();
    } catch {
      showToast('Swap request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncoming = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      if (action === 'accept') {
        haptics.celebration();
        sound.playCelebration();
      } else {
        haptics.light();
      }

      await api.resolveSwapRequest(requestId, action);
      showToast(
        action === 'accept'
          ? 'Swap accepted! You earned a Favor Token 🪙'
          : 'Swap declined',
        action === 'accept' ? 'success' : 'info'
      );

      // Refresh
      const updatedTokens = await api.getFavorTokenBalance();
      setUserTokens(updatedTokens);
      setPendingSwaps((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      showToast('Action failed', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Favor Tokens & Chore Swap"
      subtitle={`Find someone to take "${chore.name}"`}
    >
      <div className="space-y-4">
        {/* Token Balance Header */}
        <div className="p-3.5 rounded-2xl bg-[#FFF8E6] border-2 border-b-3 border-[#F59E0B]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪙</span>
            <div>
              <div className="text-xs font-bold text-[#854D0E] uppercase tracking-wider">
                Your Favor Tokens
              </div>
              <div className="text-sm font-heading font-black text-[#1F2430]">
                {userTokens} {userTokens === 1 ? 'Token' : 'Tokens'} available
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2.5 py-1 rounded-full border border-[#FDE68A]">
            Social Currency
          </span>
        </div>

        {/* Incoming Swap Requests if any */}
        {pendingSwaps.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-heading font-black text-[#1F2430] uppercase tracking-wider">
              Pending Swap Requests For You
            </div>
            {pendingSwaps.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-2xl border-2 border-[#19B5A5]/40 bg-[#E6FAF8] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#138E82]">
                    Roommate wants to trade
                  </div>
                  <span className="text-xs font-black text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                    +{req.tokenCost} 🪙
                  </span>
                </div>
                <div className="text-xs font-medium text-[#1F2430]">
                  Trade <span className="font-bold">"{req.requesterChoreName}"</span> for your task
                </div>
                {req.note && (
                  <p className="text-[11px] text-[#475569] italic bg-white/70 p-2 rounded-xl">
                    "{req.note}"
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleResolveIncoming(req.id, 'decline')}
                    className="flex-1 py-1.5 px-3 rounded-xl border-2 border-b-2 border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] active:translate-y-[1px]"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveIncoming(req.id, 'accept')}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-[#19B5A5] text-white text-xs font-black border-2 border-b-2 border-[#138E82] active:translate-y-[1px]"
                  >
                    Accept (+{req.tokenCost} 🪙)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Select Target Roommate */}
        <div className="space-y-2">
          <label className="type-label block mb-1">
            Offer this chore to:
          </label>
          {roommates.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                haptics.light();
                setSelectedRoommateId(r.id);
              }}
              className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all text-left ${
                selectedRoommateId === r.id
                  ? 'border-[#FF6B4A] bg-[#FFF0ED] border-b-4'
                  : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1] border-b-3'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                <div>
                  <h4 className="type-section-heading">{r.name}</h4>
                  <p className="text-xs font-medium text-[#64748B]">
                    Streak: {r.streakDays} days
                  </p>
                </div>
              </div>
              {selectedRoommateId === r.id && (
                <div className="w-5 h-5 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Token Incentive Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#475569] block">
            Favor Token Offer Incentive:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  haptics.light();
                  setTokenCost(amount);
                }}
                className={`py-2 px-3 rounded-xl border-2 font-heading font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                  tokenCost === amount
                    ? 'border-[#F59E0B] bg-[#FFF8E6] text-[#B45309] border-b-3'
                    : 'border-[#CBD5E1] bg-white text-[#64748B]'
                }`}
              >
                <span>🪙</span>
                <span>{amount} {amount === 1 ? 'Token' : 'Tokens'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <label className="text-xs font-bold text-[#475569] block mb-1">
            Add a quick note (optional):
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Midterm exam tomorrow morning!"
            className="w-full px-3 py-2 text-xs rounded-xl border-2 border-[#CBD5E1] focus:border-[#FF6B4A] outline-hidden"
          />
        </div>

        {/* Actions */}
        {userTokens < tokenCost && (
          <p className="text-[11px] font-semibold text-[#854D0E] bg-[#FFF8E6] p-2.5 rounded-xl border border-[#FDE68A] leading-snug">
            🪙 <span className="font-bold">Need more tokens?</span> Complete tasks on time, maintain streaks, or accept chore swaps for flatmates to earn Favor Tokens!
          </p>
        )}

        <div className="pt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!selectedRoommateId || loading || userTokens < tokenCost}
            onClick={handleConfirm}
            icon={<ArrowsLeftRight className="w-4 h-4" />}
          >
            {loading ? 'Offering...' : `Offer (-${tokenCost} 🪙)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
