import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Chip } from '../../components/common/Chip';
import { MascotView } from '../../components/common/MascotView';
import { JoinRequest, User, Membership } from '../../types';
import { THEME } from '../../theme/tokens';
import { Check, HelpCircle, UserCheck, UserX, Shield } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface JoinRequestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinRequest: JoinRequest | null;
  currentUser: User;
  currentMembership: Membership | null;
  onVote: (requestId: string, vote: 'ok' | 'unsure') => Promise<void>;
  onDecide: (requestId: string, approve: boolean) => Promise<void>;
}

export const JoinRequestReviewModal: React.FC<JoinRequestReviewModalProps> = ({
  isOpen,
  onClose,
  joinRequest,
  currentUser,
  currentMembership,
  onVote,
  onDecide,
}) => {
  const { showToast } = useToast();
  if (!joinRequest) return null;

  const isAdmin = currentMembership?.role === 'admin';
  const myVote = joinRequest.votes.find((v) => v.userId === currentUser.id);

  const okCount = joinRequest.votes.filter((v) => v.vote === 'ok').length;
  const unsureCount = joinRequest.votes.filter((v) => v.vote === 'unsure').length;

  const handleVote = async (vote: 'ok' | 'unsure') => {
    try {
      await onVote(joinRequest.id, vote);
      showToast(`You voted "${vote === 'ok' ? 'OK' : 'Not sure'}"`, 'info');
    } catch {
      showToast('Could not register vote', 'error');
    }
  };

  const handleDecide = async (approve: boolean) => {
    try {
      await onDecide(joinRequest.id, approve);
      showToast(
        approve
          ? `${joinRequest.userName} is now a member of your flat!`
          : `Join request declined.`,
        approve ? 'success' : 'info'
      );
      onClose();
    } catch {
      showToast('Action failed', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Roommate Join Request"
      subtitle="Review applicant for Apartment 4B"
    >
      <div className="space-y-4">
        {/* Applicant Card */}
        <Card padding="md" variant="calm" className="flex items-center gap-4">
          <Avatar
            src={joinRequest.userAvatar}
            name={joinRequest.userName}
            flag={joinRequest.userFlag}
            size="lg"
          />
          <div>
            <h4 className="font-heading font-extrabold text-lg text-[#1F2430]">
              {joinRequest.userName}
            </h4>
            <p className="text-xs text-[#6B7280]">{joinRequest.userEmail}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-[#1F2430]">
              <span>From {joinRequest.userCountry}</span>
              <span>{joinRequest.userFlag}</span>
            </div>
          </div>
        </Card>

        {/* Household Poll Status */}
        <Card padding="sm" className="bg-[#F7F8FB] space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-[#1F2430]">
            <span>Flatmates' opinions:</span>
            <div className="flex gap-2">
              <span className="text-[#3DBE6D]">👍 {okCount} OK</span>
              <span className="text-[#E5484D]">🤔 {unsureCount} Not sure</span>
            </div>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Every roommate's opinion is visible to everyone so life stays fair and transparent.
          </p>
        </Card>

        {/* Voting section for all members */}
        <div>
          <label className="block text-xs font-bold text-[#1F2430] mb-2">
            Your opinion on {joinRequest.userName.split(' ')[0]}:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleVote('ok')}
              className={`py-2.5 px-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                myVote?.vote === 'ok'
                  ? 'border-[#3DBE6D] bg-[#EBF9F0] text-[#3DBE6D]'
                  : 'border-[#E6E8EE] bg-white text-[#6B7280]'
              }`}
            >
              <Check className="w-4 h-4" /> I'm OK with it
            </button>
            <button
              type="button"
              onClick={() => handleVote('unsure')}
              className={`py-2.5 px-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                myVote?.vote === 'unsure'
                  ? 'border-[#FFC93C] bg-[#FFF8E6] text-[#8A6200]'
                  : 'border-[#E6E8EE] bg-white text-[#6B7280]'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Not sure yet
            </button>
          </div>
        </div>

        {/* Admin official action (if admin) */}
        {isAdmin ? (
          <div className="pt-3 border-t border-[#E6E8EE] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF6B4A]">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Decision (You are Household Admin)</span>
            </div>
            <p className="text-[11px] text-[#6B7280]">
              The admin makes it official after considering flatmate feedback.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDecide(false)}
                icon={<UserX className="w-4 h-4" />}
              >
                Decline
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleDecide(true)}
                icon={<UserCheck className="w-4 h-4" />}
              >
                Approve Roommate
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-2 text-center text-xs text-[#6B7280]">
            The admin will finalize the decision based on everyone's input.
          </div>
        )}
      </div>
    </Modal>
  );
};
