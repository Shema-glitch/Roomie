import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { Chore, User, ChoreSwapRequest } from '../../types';
import { ArrowsLeftRight, Check } from '@phosphor-icons/react';
import { Icon } from '@iconify/react';
import { useToast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';

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
    if (!isOpen) {
      setSelectedRoommateId('');
      setTokenCost(1);
      setNote('');
      setLoading(false);
      return;
    }

    api.getFavorTokenBalance().then(setUserTokens).catch(() => {});
    api.auth.getCurrentUser().then((currentUser) => {
      api.getSwapRequests().then((reqs) => {
        const incoming = reqs.filter(
          (r) => r.targetUserId === currentUser.id && r.status === 'pending'
        );
        setPendingSwaps(incoming);
      }).catch(() => {});
    }).catch(() => {});
  }, [isOpen]);

  if (!chore) return null;

  const handleConfirm = async () => {
    if (loading || !selectedRoommateId) return;
    if (userTokens < tokenCost) {
      showToast('Not enough favor tokens for this swap offer', 'error');
      return;
    }

    setLoading(true);
    try {
      await onSwap(chore.id, selectedRoommateId, tokenCost, note);
      haptics.tokenClink();
      sound.tokenClink();
      const target = roommates.find((r) => r.id === selectedRoommateId);
      showToast(
        `Chore swap offered to ${target?.name.split(' ')[0]} with ${tokenCost} Favor Token!`,
        'success'
      );
      onClose();
    } catch {
      haptics.warning();
      showToast('Swap request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncoming = async (requestId: string, action: 'accept' | 'decline') => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.resolveSwapRequest(requestId, action);
      if (!res.success) {
        haptics.softReject();
        sound.softReject();
        showToast('Could not complete swap: Requester no longer has enough tokens', 'error');
        return;
      }

      if (action === 'accept') {
        haptics.swapAccept();
        sound.swapAccept();
      } else {
        haptics.softReject();
        sound.softReject();
      }

      showToast(
        action === 'accept'
          ? 'Swap accepted! You earned a Favor Token'
          : 'Swap declined',
        action === 'accept' ? 'reward' : 'info'
      );

      // Refresh
      const updatedTokens = await api.getFavorTokenBalance();
      setUserTokens(updatedTokens);
      setPendingSwaps((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      haptics.warning();
      showToast('Action failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Favor Tokens & Chore Swap"
      subtitle={`Find someone to take "${chore.name}"`}
      footer={
        <div className="grid grid-cols-2 gap-2">
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
            {loading ? (
              'Offering...'
            ) : (
              <span className="inline-flex items-center gap-1">
                <span>Offer (-{tokenCost}</span>
                <Icon icon="fluent-emoji-flat:coin" className="w-3.5 h-3.5 inline" />
                <span>)</span>
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Token Balance Header */}
        <div className="p-3.5 rounded-2xl bg-[#FFF8E6] border-2 border-b-3 border-[#F59E0B]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="fluent-emoji-flat:coin" className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-[#854D0E] uppercase tracking-wider">
                Your Favor Tokens
              </div>
              <div className="text-sm font-heading font-black text-[#1F2430]">
                <AnimatedNumber value={userTokens} /> {userTokens === 1 ? 'Token' : 'Tokens'} available
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#9A6700] bg-[#FFF8E6] px-2.5 py-1 rounded-full border border-[#FDE68A]">
            Social currency
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
                  <span className="text-xs font-black text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    +{req.tokenCost} <Icon icon="fluent-emoji-flat:coin" className="w-3.5 h-3.5 shrink-0" />
                  </span>
                </div>
                <div className="text-xs font-medium text-[#1F2430]">
                  Trade <span className="font-bold">"{req.requesterChoreName}"</span> for your task
                </div>
                {req.note && (
                  <p className="text-xs text-[#4B5063] italic bg-white/70 p-2 rounded-xl">
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
                    className="flex-1 py-1.5 px-3 rounded-xl bg-[#19B5A5] text-white text-xs font-black border-2 border-b-2 border-[#138E82] active:translate-y-[1px] inline-flex items-center justify-center gap-1"
                  >
                    <span>Accept (+{req.tokenCost}</span>
                    <Icon icon="fluent-emoji-flat:coin" className="w-3.5 h-3.5 shrink-0 inline" />
                    <span>)</span>
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
                sound.playTap();
                setSelectedRoommateId(r.id);
              }}
              className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all text-left active:translate-y-[1px] ${
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
                  haptics.tokenClink();
                  sound.tokenClink();
                  setTokenCost(amount);
                }}
                className={`py-2 px-3 rounded-xl border-2 font-heading font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-[1px] ${
                  tokenCost === amount
                    ? 'border-[#F59E0B] bg-[#FFF8E6] text-[#B45309] border-b-3'
                    : 'border-[#CBD5E1] bg-white text-[#64748B]'
                }`}
              >
                <Icon icon="fluent-emoji-flat:coin" className="w-4 h-4 shrink-0" />
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
          <p className="text-xs font-semibold text-[#9A6700] bg-[#FFF8E6] p-2.5 rounded-xl border border-[#FDE68A] leading-snug flex items-start gap-1.5">
            <Icon icon="fluent-emoji-flat:coin" className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <span className="font-bold">Need more tokens?</span> Complete tasks on time, maintain streaks, or accept chore swaps for flatmates to earn Favor Tokens!
            </span>
          </p>
        )}
      </div>
    </Modal>
  );
};
