import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { ActionCard } from '../../../components/common/ActionCard';
import { Button } from '../../../components/common/Button';
import { Avatar } from '../../../components/common/Avatar';
import { User, Membership, MeetingTopic, HouseAgreement } from '../../../types';
import { sound } from '../../../services/sound';
import { useToast } from '../../../components/common/Toast';
import { Check, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ProposeTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTopic: (title: string, desc: string) => Promise<MeetingTopic>;
}

export const ProposeTopicModal: React.FC<ProposeTopicModalProps> = ({
  isOpen,
  onClose,
  onCreateTopic,
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      sound.playSuccess();
      await onCreateTopic(title.trim(), desc.trim());
      showToast('Meeting topic proposed! Roomies can now vote.', 'success');
      setTitle('');
      setDesc('');
      onClose();
    } catch {
      showToast('Could not propose topic', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose Meeting Topic"
      subtitle="Bring up an apartment matter peacefully"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="type-label block mb-1.5">Topic Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Quiet hours during finals, Guest stay notice"
            className="w-full px-4 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[15px] font-semibold text-[#1F2430]"
            required
          />
        </div>

        <div>
          <label className="type-label block mb-1.5">Description & Suggestion</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Explain the background and what you're proposing..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430]"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={!title.trim() || loading}
          >
            {loading ? 'Submitting...' : 'Propose Topic'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface AddAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAgreement: (text: string, category: string) => Promise<HouseAgreement>;
}

export const AddAgreementModal: React.FC<AddAgreementModalProps> = ({
  isOpen,
  onClose,
  onAddAgreement,
}) => {
  const { showToast } = useToast();
  const [category, setCategory] = useState('quiet_hours');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      sound.playSuccess();
      await onAddAgreement(text.trim(), category);
      showToast('Apartment agreement saved to house rules!', 'success');
      setText('');
      onClose();
    } catch {
      showToast('Could not save rule', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Apartment Agreement"
      subtitle="Record a consensus rule for your flat"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="type-label block mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[15px] font-semibold text-[#1F2430]"
          >
            <option value="quiet_hours">Quiet Hours & Rest</option>
            <option value="cleaning">Kitchen & Cleaning Standards</option>
            <option value="guests">Guests & Visitors</option>
            <option value="groceries">Shared Pantry & Fridge</option>
            <option value="bills">Utilities & AC Usage</option>
            <option value="general">General Respect</option>
          </select>
        </div>

        <div>
          <label className="type-label block mb-1.5">Agreement Rule Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Headphones in common areas after 23:00 on weekdays."
            rows={3}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430]"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={!text.trim() || loading}
          >
            {loading ? 'Saving...' : 'Save Agreement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface HandoverAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: { user: User; membership: Membership }[];
  currentUserId: string;
  onHandoverAdmin: (toUserId: string) => Promise<void>;
}

export const HandoverAdminModal: React.FC<HandoverAdminModalProps> = ({
  isOpen,
  onClose,
  members,
  currentUserId,
  onHandoverAdmin,
}) => {
  const { showToast } = useToast();
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleHandover = async () => {
    if (!selectedSuccessorId) return;
    setLoading(true);
    try {
      sound.playSuccess();
      await onHandoverAdmin(selectedSuccessorId);
      showToast('Admin role handed over successfully!', 'success');
      onClose();
    } catch {
      showToast('Admin handover failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Handover Admin Role"
      subtitle="Pass the doorkeeper role to a roomie"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm font-semibold text-[#475569]">
          Select which roomie will take over reviewing join requests and refreshing apartment invite codes.
        </p>

        <div className="space-y-2.5">
          {members
            .filter((m) => m.user.id !== currentUserId)
            .map(({ user }) => (
              <ActionCard
                key={user.id}
                tint={selectedSuccessorId === user.id ? 'coral' : 'neutral'}
                iconTile={
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    flag={user.flag}
                    isHome={user.isHome}
                    statusRing={true}
                    size="sm"
                  />
                }
                title={user.name}
                subtitle={`From ${user.country}`}
                actions={
                  <Button
                    variant={selectedSuccessorId === user.id ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      sound.playTap();
                      setSelectedSuccessorId(user.id);
                    }}
                    icon={selectedSuccessorId === user.id ? <Check className="w-4 h-4" /> : undefined}
                  >
                    {selectedSuccessorId === user.id ? 'Selected' : 'Select'}
                  </Button>
                }
              />
            ))}
        </div>

        <div className="flex gap-3 pt-3">
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={!selectedSuccessorId || loading}
            onClick={handleHandover}
          >
            {loading ? 'Confirming...' : 'Confirm Handover'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface LeaveApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  netBalance: number;
  currencySymbol: string;
  onLeaveHousehold: () => Promise<void>;
}

export const LeaveApartmentModal: React.FC<LeaveApartmentModalProps> = ({
  isOpen,
  onClose,
  netBalance,
  currencySymbol,
  onLeaveHousehold,
}) => {
  const { showToast } = useToast();
  const [acknowledgeDebt, setAcknowledgeDebt] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasUnsettledDebt = Math.abs(netBalance) > 1;

  const handleLeave = async () => {
    if (hasUnsettledDebt && !acknowledgeDebt) {
      showToast('Please acknowledge your unsettled balance first', 'error');
      return;
    }
    setLoading(true);
    try {
      sound.playCalmNotice();
      await onLeaveHousehold();
      showToast('You have left the apartment.', 'info');
      onClose();
    } catch {
      showToast('Could not leave apartment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Leave Apartment"
      subtitle="Are you sure you want to disconnect from this household?"
      size="md"
    >
      <div className="space-y-4">
        {hasUnsettledDebt ? (
          <div className="p-4 rounded-2xl bg-[#FFF0ED] border-2 border-[#FFD7CF] space-y-2">
            <div className="flex items-center gap-2 text-[#E5484D] font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>
                You have an unsettled balance of {currencySymbol}
                {Math.abs(netBalance).toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-[#475569]">
              Leaving before settling up may disrupt shared expense agreements with your roomies.
            </p>
            <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acknowledgeDebt}
                onChange={(e) => setAcknowledgeDebt(e.target.checked)}
                className="w-4 h-4 rounded text-[#FF6B4A] focus:ring-[#FF6B4A]"
              />
              <span className="text-sm font-bold text-[#1F2430]">
                I will settle my shared expenses outside the app
              </span>
            </label>
          </div>
        ) : (
          <p className="text-sm text-[#475569]">
            Your apartment balances are settled! You will lose access to the chore rotation, secret drafts, and group chat.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Stay in Apartment
          </Button>
          <Button
            variant="danger"
            size="md"
            fullWidth
            disabled={hasUnsettledDebt && !acknowledgeDebt}
            onClick={handleLeave}
          >
            {loading ? 'Leaving...' : 'Yes, Leave'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface RemoveMemberModalProps {
  targetUser: User | null;
  onClose: () => void;
  onRemoveMember?: (userId: string) => Promise<void>;
}

export const RemoveMemberModal: React.FC<RemoveMemberModalProps> = ({
  targetUser,
  onClose,
  onRemoveMember,
}) => {
  const { showToast } = useToast();
  const [removing, setRemoving] = useState(false);

  if (!targetUser) return null;

  const handleConfirm = async () => {
    setRemoving(true);
    try {
      await onRemoveMember?.(targetUser.id);
      showToast(`${targetUser.name} removed from apartment`, 'info');
      onClose();
    } catch {
      showToast('Failed to remove flatmate', 'error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(targetUser)}
      onClose={onClose}
      title={`Remove ${targetUser.name}?`}
      subtitle="Apartment membership removal"
      size="md"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>WhatsApp-Style Roster Announcement</span>
          </div>
          <p className="leading-relaxed">
            Removing <strong>{targetUser.name}</strong> will immediately revoke their access to apartment chores, expenses, and chats. A system notification will be broadcast to all remaining flatmates.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={onClose} disabled={removing}>
            Cancel
          </Button>
          <Button variant="danger" size="md" disabled={removing} onClick={handleConfirm}>
            {removing ? 'Removing...' : 'Confirm Remove'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
