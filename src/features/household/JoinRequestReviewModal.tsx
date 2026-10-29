import React from 'react';
import { Modal } from '../../components/common/Modal';
import { ActionCard } from '../../components/common/ActionCard';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { JoinRequest, User, Membership } from '../../types';
import { Check, HelpCircle } from 'lucide-react';
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
          ? `${joinRequest.userName} is now a member of your apartment!`
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
      title="Roomie Join Request"
      subtitle="Review applicant for Apartment 4B"
    >
      <div className="space-y-5">
        {/* Applicant Block */}
        <ActionCard
          tint="indigo"
          iconTile={
            <Avatar
              src={joinRequest.userAvatar}
              name={joinRequest.userName}
              flag={joinRequest.userFlag}
              size="lg"
            />
          }
          title={<h4 className="type-section-heading">{joinRequest.userName}</h4>}
          subtitle={`From ${joinRequest.userCountry || 'Worldwide'}`}
          detail={<p className="type-secondary">{joinRequest.userEmail}</p>}
        />

        {/* Roomies' Opinions Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="type-label">Roomies' opinions</span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] type-secondary">
                {okCount} OK
              </span>
              <span className="px-3 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] type-secondary">
                {unsureCount} not sure
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleVote('ok')}
              icon={<Check className="w-4 h-4" />}
            >
              OK
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleVote('unsure')}
              icon={<HelpCircle className="w-4 h-4" />}
            >
              Not sure
            </Button>
          </div>
        </div>

        {/* Admin Decision Section */}
        {isAdmin ? (
          <div className="pt-4 border-t border-[#E6E8EE]">
            <span className="type-label block mb-1">Admin decision</span>
            <p className="type-secondary mb-3.5">
              As admin, approve or decline to join the apartment.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="danger-outline"
                size="md"
                onClick={() => handleDecide(false)}
              >
                Decline
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleDecide(true)}
              >
                Approve
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-[#E6E8EE] text-center">
            <p className="type-secondary">
              The apartment admin will make the final decision.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
