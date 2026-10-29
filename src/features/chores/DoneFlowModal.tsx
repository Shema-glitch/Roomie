import React, { useState, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { MascotView } from '../../components/common/MascotView';
import { Chore, User } from '../../types';
import { sound } from '../../services/sound';
import { IconTile } from '../../components/common/IconTile';
import { processPhoto } from '../../utils/photoPipeline';
import { uploadPhotoToStorage } from '../../services/supabase';
import { Camera, Check, Flame, ArrowRight, ArrowLeft, Upload } from 'lucide-react';
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
  const [compressing, setCompressing] = useState<boolean>(false);
  const [photoDetails, setPhotoDetails] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!chore) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompressing(true);
      const processed = await processPhoto(file);
      const sizeKb = Math.round(processed.sizeBytes / 1024);
      setPhotoDetails(`${processed.width}×${processed.height} px • ${sizeKb} KB`);

      const fileName = `chore_${chore.id}_${Date.now()}.jpg`;
      const finalUrl = await uploadPhotoToStorage('chore-proof', fileName, processed.fullBlob, processed.fullDataUrl);
      setPhotoUrl(finalUrl);
      sound.playPop();
      showToast(`Proof compressed (${sizeKb} KB) & attached!`, 'info');
    } catch {
      showToast('Could not process proof photo', 'error');
    } finally {
      setCompressing(false);
    }
  };

  const handleSamplePhoto = () => {
    sound.playPop();
    const photos = [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=80',
    ];
    setPhotoUrl(photos[Math.floor(Math.random() * photos.length)]);
    setPhotoDetails('Sample preview');
    showToast('Proof photo attached', 'info');
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
      title={step === 3 ? 'Kudos & Celebration' : 'Finish Chore'}
      subtitle={
        step === 1
          ? `Completing "${chore.name}"`
          : step === 2
          ? 'Attach clean proof photo'
          : `Streak extended to ${currentUser.streakDays + 1} days`
      }
    >
      <div className="space-y-4">
        {/* STEP 1: CHORE DETAILS & INSTRUCTIONS */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <MascotView state="cheering" size="md" bubbleText="You got this! 💪" />

            <div className="text-left space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="type-section-heading">
                  {chore.name}
                </h4>
                <Chip
                  label={chore.effortLevel}
                  effort={chore.effortLevel}
                  size="sm"
                />
              </div>
              <p className="type-secondary leading-relaxed">
                {chore.description}
              </p>
            </div>

            <Card padding="sm" className="bg-[#FFF8E6] border border-[#FFE8A3] text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF6B4A]" />
                <div>
                  <span className="type-label block mb-0.5">
                    Daily Streak Bonus
                  </span>
                  <span className="type-secondary">
                    Earns +20 points & streak day
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 type-section-heading text-[#8A6200]">
                <span>{currentUser.streakDays}</span>
                <ArrowRight className="w-4 h-4 text-[#FF6B4A]" />
                <span>{currentUser.streakDays + 1}</span>
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
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PHOTO PROOF (OPTIONAL) */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="text-left">
              <h4 className="type-section-heading">
                Add clean proof?
              </h4>
              <p className="type-secondary mt-0.5">
                Share a photo of your clean work with your roomies.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {photoUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#19B5A5] shadow-xs max-h-52">
                  <img
                    src={photoUrl}
                    alt="Chore proof"
                    className="w-full h-44 object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/70 text-white text-[14px] font-bold">
                    {photoDetails || 'Proof attached'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl('');
                    setPhotoDetails('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="min-h-[44px] px-3 py-1.5 type-secondary text-[#E5484D] font-bold hover:underline cursor-pointer"
                >
                  Remove or Retake
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  onClick={() => !compressing && fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-[#CBD5E1] rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-[#19B5A5] hover:bg-[#E6FAF8]/30 cursor-pointer transition-all bg-[#F7F8FB] min-h-[44px]"
                >
                  <IconTile icon={compressing ? <Upload className="w-6 h-6 animate-bounce" /> : <Camera className="w-6 h-6" />} color="teal" size="md" />
                  <h4 className="type-section-heading">
                    {compressing ? 'Compressing proof photo...' : 'Snap or Upload Proof'}
                  </h4>
                  <p className="type-secondary">
                    {compressing ? 'Auto-optimizing under 300 KB' : 'Tap to take clean photo or choose from library'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSamplePhoto}
                  className="type-secondary font-bold text-[#19B5A5] hover:underline cursor-pointer text-center w-full"
                >
                  Or use sample proof preview
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={loading}
                onClick={handleFinish}
              >
                Skip
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={loading}
                onClick={handleFinish}
                icon={<Check className="w-4 h-4" />}
              >
                {loading ? 'Saving...' : 'Complete'}
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
              <h3 className="type-title">
                Chore Completed
              </h3>
              <p className="type-secondary leading-relaxed max-w-xs">
                Your apartment feed has been updated. Roomies can now send you kudos.
              </p>
            </div>

            <Card padding="md" className="w-full bg-[#FFF8E6] border border-[#FFE8A3] space-y-1.5">
              <div className="flex items-center justify-center gap-2 type-section-heading text-[#8A6200]">
                <Flame className="w-5 h-5 text-[#FF6B4A]" />
                <span>Streak: {currentUser.streakDays + 1} Days Active</span>
              </div>
              <p className="type-secondary">
                +20 reward points added to your roomie score
              </p>
            </Card>

            <div className="w-full pt-2">
              <Button variant="primary" size="lg" fullWidth onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
