import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { Chore } from '../../types';
import { sound } from '../../services/sound';
import { Camera, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface DoneActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore: Chore | null;
  onComplete: (choreId: string, photoUrl?: string) => Promise<void>;
}

export const DoneActionModal: React.FC<DoneActionModalProps> = ({
  isOpen,
  onClose,
  chore,
  onComplete,
}) => {
  const { showToast } = useToast();
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!chore) return null;

  const handleSimulatePhoto = () => {
    // Simulated photo of clean surface
    const samplePhotos = [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=80',
    ];
    setPhotoUrl(samplePhotos[Math.floor(Math.random() * samplePhotos.length)]);
    setHasPhoto(true);
    sound.playPop();
    showToast('Photo proof attached', 'info');
  };

  const handleDone = async () => {
    setLoading(true);
    try {
      sound.playSuccess();
      await onComplete(chore.id, photoUrl || undefined);
      showToast('Chore completed! Streak +1', 'reward');
      onClose();
    } catch {
      showToast('Could not record chore completion', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Finish Chore"
      subtitle={`Mark "${chore.name}" as done`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <MascotView state="cheering" size="md" bubbleText="Streak power!" />

        <Card padding="md" className="w-full bg-[#F7F8FB] space-y-3">
          <p className="type-secondary leading-relaxed">
            Optionally attach a quick photo proof to show off the clean result to your roomies.
          </p>

          {hasPhoto ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#E6E8EE] max-h-48 mx-auto">
              <img src={photoUrl} alt="Chore proof" className="w-full h-36 object-cover" />
              <button
                type="button"
                onClick={() => {
                  setHasPhoto(false);
                  setPhotoUrl('');
                }}
                className="absolute top-2 right-2 px-2.5 py-1 bg-black/60 text-white rounded-lg text-[14px] font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSimulatePhoto}
              className="w-full p-4 border-2 border-dashed border-[#CBD5E1] rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-[#FF6B4A] hover:bg-[#FFF0ED]/20 cursor-pointer transition-all"
            >
              <Camera className="w-6 h-6 text-[#FF6B4A]" />
              <span className="type-section-heading">
                Add Photo Proof
              </span>
              <span className="type-secondary">
                Tap to simulate camera snap
              </span>
            </button>
          )}
        </Card>

        <div className="w-full grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={loading}
            onClick={handleDone}
            icon={<Check className="w-4 h-4" />}
          >
            {loading ? 'Saving...' : 'Done'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
