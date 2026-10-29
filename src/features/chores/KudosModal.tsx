import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { IconTile } from '../../components/common/IconTile';
import { User, Chore, KudosType } from '../../types';
import { sound } from '../../services/sound';
import { Heart, AlertCircle, Send, Flame } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface KudosModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore: Chore | null;
  targetUser: User | null;
  onGiveKudos: (
    choreId: string,
    targetUserId: string,
    type: KudosType,
    note?: string
  ) => Promise<void>;
}

export const KudosModal: React.FC<KudosModalProps> = ({
  isOpen,
  onClose,
  chore,
  targetUser,
  onGiveKudos,
}) => {
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<KudosType>('thanks');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!chore || !targetUser) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (selectedType === 'needs_look') {
        sound.playCalmNotice();
      } else {
        sound.playCelebration();
      }
      await onGiveKudos(chore.id, targetUser.id, selectedType, note.trim() || undefined);
      showToast(
        selectedType === 'needs_look'
          ? `Private note sent to ${targetUser.name.split(' ')[0]}.`
          : `Kudos sent to ${targetUser.name.split(' ')[0]}!`,
        'reward'
      );
      setNote('');
      onClose();
    } catch {
      showToast('Could not send feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Give Roomie Kudos"
      subtitle={`For completing "${chore.name}"`}
    >
      <div className="space-y-4">
        {/* Recipient Profile */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE]">
          <Avatar src={targetUser.avatar} name={targetUser.name} flag={targetUser.flag} size="md" />
          <div>
            <h4 className="type-section-heading">
              {targetUser.name}
            </h4>
            <p className="type-secondary flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 font-bold text-[#FF6B4A]">
                <Flame className="w-3.5 h-3.5 fill-[#FF6B4A]" />
                {targetUser.streakDays} days
              </span>
              <span>•</span>
              <span>{targetUser.points} points</span>
            </p>
          </div>
        </div>

        {/* 3 Response Options from Spec */}
        <div className="space-y-2">
          <label className="type-label block mb-1">
            Choose a reaction:
          </label>

          <button
            type="button"
            onClick={() => {
              setSelectedType('thanks');
              sound.playPop();
            }}
            className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left cursor-pointer transition-all ${
              selectedType === 'thanks'
                ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#1F2430]'
                : 'border-[#E6E8EE] bg-white text-[#64748B]'
            }`}
          >
            <IconTile icon={<Heart className="w-5 h-5 fill-white" />} color="coral" size="sm" />
            <div>
              <p className="type-body font-bold">Thanks!</p>
              <p className="type-secondary">Warm appreciation (+10 pts)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('great_job');
              sound.playPop();
            }}
            className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left cursor-pointer transition-all ${
              selectedType === 'great_job'
                ? 'border-[#FFC93C] bg-[#FFF8E6] text-[#1F2430]'
                : 'border-[#E6E8EE] bg-white text-[#64748B]'
            }`}
          >
            <IconTile icon={<Heart className="w-5 h-5 fill-white" />} color="amber" size="sm" />
            <div>
              <p className="type-body font-bold">Great job!</p>
              <p className="type-secondary">Super clean result (+10 pts)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('needs_look');
              sound.playTap();
            }}
            className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left cursor-pointer transition-all ${
              selectedType === 'needs_look'
                ? 'border-[#5B5BD6] bg-[#EEF0FD] text-[#1F2430]'
                : 'border-[#E6E8EE] bg-white text-[#64748B]'
            }`}
          >
            <IconTile icon={<AlertCircle className="w-5 h-5" />} color="indigo" size="sm" />
            <div>
              <p className="type-body font-bold">Needs another look</p>
              <p className="type-secondary">
                Private note between you two
              </p>
            </div>
          </button>
        </div>

        {/* Optional or required Note */}
        <div>
          <label className="type-label block mb-1">
            {selectedType === 'needs_look' ? 'Private gentle note:' : 'Add a note (optional):'}
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              selectedType === 'needs_look'
                ? 'e.g. Could you wipe the mirror too? Thanks!'
                : 'e.g. The kitchen smells amazing!'
            }
            className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-white type-body focus:outline-none focus:border-[#FF6B4A]"
          />
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={loading}
            onClick={handleSubmit}
            icon={<Send className="w-4 h-4" />}
          >
            {loading ? 'Sending...' : 'Send kudos'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
