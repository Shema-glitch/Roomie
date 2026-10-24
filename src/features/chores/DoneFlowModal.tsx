import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { MascotView } from '../../components/common/MascotView';
import { Chore, User } from '../../types';
import { sound } from '../../services/sound';
import { Camera, Check, Sparkles, Flame, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface DoneFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore: Chore | null;
  currentUser: User;
  onComplete: (choreId: string, photoUrl?: string) => Promise<void>;
}

export const DoneFlowModal: React.FC<DoneFlowModalProps> = ({
  isOpen,
  onClose,
  chore,
  currentUser,
  onComplete,
}) => {
  const { showToast } = useToast();
  // 1: Details & Prompt -> 2: Optional Photo Proof -> 3: Celebration
  const [step, setStep] = useState<number>(1);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!chore) return null;

  const handleSnapPhoto = () => {
    sound.playPop();
    const photos = [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=80',
    ];
    setPhotoUrl(photos[Math.floor(Math.random() * photos.length)]);
    showToast('Sparkling proof attached! 📸', 'info');
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      sound.playCelebration();
      await onComplete(chore.id, photoUrl || undefined);
      setStep(3); // Celebration screen
    } catch {
      showToast('Could not record chore completion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setPhotoUrl('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 3 ? 'Kudos & Celebration! 🎉' : 'Finish Chore'}
      subtitle={
        step === 1
          ? `Completing "${chore.name}"`
          : step === 2
          ? 'Attach clean proof photo'
          : `Streak extended to ${currentUser.streakDays + 1} days!`
      }
    >
      <div className="space-y-4">
        {/* STEP 1: CHORE DETAILS & INSTRUCTIONS */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <MascotView state="cheering" size="md" bubbleText="You got this! 💪" />

            <div className="text-left space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-xl text-[#1F2430]">
                  {chore.name}
                </h4>
                <Chip
                  label={chore.effortLevel}
                  effort={chore.effortLevel}
                  size="sm"
                />
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {chore.description}
              </p>
            </div>

            <Card padding="sm" className="bg-[#FFF8E6] border border-[#FFE8A3] text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF6B4A]" />
                <div>
                  <span className="text-xs font-bold text-[#8A6200] block">
                    Daily Streak Bonus
                  </span>
                  <span className="text-[10px] text-[#6B7280]">
                    Completing earns +20 points & streak day!
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-heading font-black text-[#8A6200]">
                <span>{currentUser.streakDays}</span>
                <ArrowRight className="w-4 h-4 text-[#FF6B4A]" />
                <span>{currentUser.streakDays + 1} 🔥</span>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="md" onClick={onClose}>
                Later
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(2)}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Mark as Done
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PHOTO PROOF (OPTIONAL) */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="text-left">
              <h4 className="font-heading font-black text-xl text-[#1F2430]">
                Add clean proof?
              </h4>
              <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                Share a photo of your sparkling work with your flatmates.
              </p>
            </div>

            {photoUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#19B5A5] shadow-xs max-h-52">
                  <img
                    src={photoUrl}
                    alt="Chore proof"
                    className="w-full h-44 object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-bold">
                    Proof Attached ✨
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-xs text-[#E5484D] font-bold hover:underline cursor-pointer"
                >
                  Remove or Retake
                </button>
              </div>
            ) : (
              <div
                onClick={handleSnapPhoto}
                className="p-8 border-2 border-dashed border-[#CBD5E1] rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-[#19B5A5] hover:bg-[#E6FAF8]/30 cursor-pointer transition-all bg-[#F7F8FB]"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E6FAF8] text-[#19B5A5] flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <h4 className="font-heading font-bold text-sm text-[#1F2430]">
                  Snap Proof Photo
                </h4>
                <p className="text-[10px] text-[#6B7280]">
                  Optional photo for your flatmates to admire
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={loading}
                onClick={handleFinish}
              >
                Skip Photo & Complete
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={loading}
                onClick={handleFinish}
                icon={<Check className="w-4 h-4 stroke-[3]" />}
              >
                {loading ? 'Saving...' : 'Complete Chore!'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: CELEBRATION & STREAK SCREEN */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center space-y-4 py-3">
            <MascotView
              state="celebrating"
              size="lg"
              bubbleText="Kitchen's sparkling! Thanks!"
            />

            <div className="space-y-1">
              <h3 className="text-2xl font-heading font-black text-[#1F2430]">
                Chore Completed!
              </h3>
              <p className="text-xs text-[#6B7280] font-medium leading-relaxed max-w-xs">
                Your apartment feed has been updated. Roommates can now send you kudos!
              </p>
            </div>

            <Card padding="md" className="w-full bg-[#FFF8E6] border border-[#FFE8A3] space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-base font-heading font-black text-[#8A6200]">
                <Flame className="w-5 h-5 text-[#FF6B4A]" />
                <span>Streak: {currentUser.streakDays + 1} Days Active!</span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                +20 reward points added to your roomie score
              </p>
            </Card>

            <div className="w-full pt-2">
              <Button variant="primary" size="lg" fullWidth onClick={handleClose}>
                Back to Chores
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
