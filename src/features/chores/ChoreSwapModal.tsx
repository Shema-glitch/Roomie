import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Chore, User } from '../../types';
import { ArrowLeftRight, Check } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface ChoreSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore: Chore | null;
  roommates: User[];
  onSwap: (choreId: string, toUserId: string) => Promise<void>;
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
  const [loading, setLoading] = useState(false);

  if (!chore) return null;

  const handleConfirm = async () => {
    if (!selectedRoommateId) return;
    setLoading(true);
    try {
      await onSwap(chore.id, selectedRoommateId);
      const target = roommates.find((r) => r.id === selectedRoommateId);
      showToast(`Chore swap offered to ${target?.name.split(' ')[0]}!`, 'info');
      onClose();
    } catch {
      showToast('Swap request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Swap a Chore"
      subtitle={`Find someone to take "${chore.name}"`}
    >
      <div className="space-y-4">
        <p className="text-xs text-[#6B7280]">
          Busy with university study or feeling unwell? Offer your chore to a roommate.
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1F2430]">
            Select who to offer to:
          </label>
          {roommates.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedRoommateId(r.id)}
              className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                selectedRoommateId === r.id
                  ? 'border-[#FF6B4A] bg-[#FFF0ED]'
                  : 'border-[#E6E8EE] bg-white hover:border-[#CBD5E1]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar src={r.avatar} name={r.name} flag={r.flag} size="sm" />
                <div>
                  <h4 className="font-bold text-sm text-[#1F2430]">{r.name}</h4>
                  <p className="text-[11px] text-[#6B7280]">
                    Streak: {r.streakDays} days 🔥
                  </p>
                </div>
              </div>
              {selectedRoommateId === r.id && (
                <div className="w-5 h-5 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!selectedRoommateId || loading}
            onClick={handleConfirm}
            icon={<ArrowLeftRight className="w-4 h-4" />}
          >
            {loading ? 'Sending...' : 'Offer Swap'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
