import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { MascotView } from '../../components/common/MascotView';
import { User, Chore, KudosType } from '../../types';
import { sound } from '../../services/sound';
import { Heart, Sparkles, AlertCircle, Send } from 'lucide-react';
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
          : `Kudos sent to ${targetUser.name.split(' ')[0]}! 🌟`,
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
      title="Give Roommate Kudos"
      subtitle={`For completing "${chore.name}"`}
    >
      <div className="space-y-4">
        {/* Recipient Profile */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7F8FB] border border-[#E6E8EE]">
          <Avatar src={targetUser.avatar} name={targetUser.name} flag={targetUser.flag} size="md" />
          <div>
            <h4 className="font-heading font-bold text-base text-[#1F2430]">
              {targetUser.name}
            </h4>
            <p className="text-xs text-[#6B7280]">
              Streak: {targetUser.streakDays} days 🔥 • {targetUser.points} points
            </p>
          </div>
        </div>

        {/* 3 Response Options from Spec */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1F2430]">
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
                : 'border-[#E6E8EE] bg-white text-[#6B7280]'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F2430]">Thanks! 💖</p>
              <p className="text-[11px] text-[#6B7280]">Warm appreciation (+10 pts to housemate)</p>
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
                : 'border-[#E6E8EE] bg-white text-[#6B7280]'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#FFC93C] text-[#8A6200] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F2430]">Great job! 🌟</p>
              <p className="text-[11px] text-[#6B7280]">Super clean result (+10 pts)</p>
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
                : 'border-[#E6E8EE] bg-white text-[#6B7280]'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#EEF0FD] text-[#5B5BD6] flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F2430]">Needs another look 👀</p>
              <p className="text-[11px] text-[#6B7280]">
                Private note between you two (never publicly shames)
              </p>
            </div>
          </button>
        </div>

        {/* Optional or required Note */}
        <div>
          <label className="block text-xs font-bold text-[#1F2430] mb-1.5">
            {selectedType === 'needs_look' ? 'Private gentle note (helpful suggestions):' : 'Add a sweet note (optional):'}
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
            className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-white text-xs focus:outline-none focus:border-[#FF6B4A]"
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
            {loading ? 'Sending...' : 'Send Kudos'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
