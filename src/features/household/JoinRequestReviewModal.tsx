import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { ActionCard } from '../../components/common/ActionCard';
import { Button } from '../../components/common/Button';
import { Chip } from '../../components/common/Chip';
import { Avatar } from '../../components/common/Avatar';
import { JoinRequest, User, Membership } from '../../types';
import { Check, HelpCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface JoinRequestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinRequest: JoinRequest | null;
  currentUser: User;
  currentMembership: Membership | null;
  roommates?: User[];
  onVote: (requestId: string, vote: 'ok' | 'unsure') => Promise<void>;
  onDecide: (requestId: string, approve: boolean) => Promise<void>;
}

export const JoinRequestReviewModal: React.FC<JoinRequestReviewModalProps> = ({
  isOpen,
  onClose,
  joinRequest,
  currentUser,
  currentMembership,
  roommates = [],
  onVote,
  onDecide,
}) => {
  const { showToast } = useToast();
  const [confirmOverride, setConfirmOverride] = useState<boolean>(false);
  if (!joinRequest) return null;

  const isAdmin = currentMembership?.role === 'admin';

  const okVotes = joinRequest.votes.filter((v) => v.vote === 'ok');
  const unsureVotes = joinRequest.votes.filter((v) => v.vote === 'unsure');
  const okCount = okVotes.length;
  const unsureCount = unsureVotes.length;
  const myVote = joinRequest.votes?.find((v) => v.userId === currentUser.id)?.vote;

  const handleVote = async (vote: 'ok' | 'unsure') => {
    try {
      await onVote(joinRequest.id, vote);
      showToast(`You voted "${vote === 'ok' ? 'OK' : 'Not sure'}"`, 'info');
    } catch {
      showToast('Could not register vote', 'error');
    }
  };

  const handleDecide = async (approve: boolean) => {
    if (approve && unsureCount > 0 && !confirmOverride) {
      setConfirmOverride(true);
      return;
    }
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
      subtitle="Review applicant for your apartment"
    >
      <div className="space-y-4">
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="type-label">Roomies' opinions</span>
            <div className="flex items-center gap-2">
              <Chip variant="neutral" size="xs" label={`${okCount} OK`} />
              <Chip variant={unsureCount > 0 ? 'danger' : 'neutral'} size="xs" label={`${unsureCount} not sure`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2.5">
            <Button
              variant={myVote === 'ok' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleVote('ok')}
              icon={<Check className="w-4 h-4" />}
            >
              {myVote === 'ok' ? 'Voted OK' : 'OK'}
            </Button>
            <Button
              variant={myVote === 'unsure' ? 'danger-outline' : 'secondary'}
              size="md"
              onClick={() => handleVote('unsure')}
              icon={<HelpCircle className="w-4 h-4" />}
            >
              {myVote === 'unsure' ? 'Voted Not sure' : 'Not sure'}
            </Button>
          </div>

          {/* Transparent list of votes */}
          {joinRequest.votes.length > 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-[#F7F8FB] border border-[#E6E8EE] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
                Recorded Roomie Votes ({joinRequest.votes.length})
              </span>
              <div className="space-y-1">
                {joinRequest.votes.map((v) => {
                  const voter = roommates.find((r) => r.id === v.userId) || (v.userId === currentUser.id ? currentUser : null);
                  return (
                    <div key={v.userId} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar
                          src={voter?.avatar || ''}
                          name={voter?.name || 'Roommate'}
                          flag={voter?.flag || ''}
                          size="xs"
                        />
                        <span className="font-medium text-[#1F2430]">
                          {voter?.name || 'Roommate'} {v.userId === currentUser.id && '(You)'}
                        </span>
                      </div>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          v.vote === 'ok'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {v.vote === 'ok' ? 'Approved' : 'Not sure'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Privacy & Anti-Surveillance Consent Warning */}
        {unsureCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Privacy & Flatmate Consent Alert</span>
              <p className="leading-relaxed">
                {unsureCount} flatmate{unsureCount > 1 ? 's have' : ' has'} voiced concerns (&ldquo;Not sure&rdquo;). Once approved, this person receives immediate access to all apartment rules, expenses, chores, and chat. Confirm consensus before adding.
              </p>
            </div>
          </div>
        )}

        {/* Admin Decision Section */}
        {isAdmin ? (
          <div className="pt-3 border-t border-[#E6E8EE]">
            <span className="type-label block mb-1">Admin decision</span>
            <p className="type-secondary mb-3">
              As admin, approve or decline to admit the applicant to the apartment.
            </p>

            {confirmOverride && unsureCount > 0 ? (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Confirm Admission Against Roomie Votes?</span>
                </div>
                <p className="leading-relaxed">
                  {unsureCount} flatmate(s) voted &ldquo;Not sure&rdquo;. Are you sure you want to approve this applicant without unanimous consent?
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setConfirmOverride(false)}>
                    Go Back
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDecide(true)}>
                    Approve Anyway
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-[#E6E8EE] text-center space-y-1">
            <p className="type-secondary text-xs">
              The apartment admin makes the final decision after reviewing flatmate votes.
            </p>
          </div>
        )}

        {/* Universal Privacy Notice */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-[#64748B]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Every member will be instantly notified with a privacy alert if this applicant is admitted.
          </span>
        </div>
      </div>
    </Modal>
  );
};
