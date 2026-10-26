import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { THEME } from '../../theme/tokens';
import {
  Sparkles,
  Smartphone,
  BellRing,
  Share,
  PlusSquare,
  MoreVertical,
  Check,
  ArrowRight,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<number>(0);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  const slides = [
    {
      title: 'How Roomie works',
      mascotState: 'cheering' as const,
      bubble: 'Living together made fun!',
      content: (
        <div className="space-y-3.5 my-2">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF0ED] border border-[#FFD7CF]">
            <div className="w-8 h-8 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center shrink-0 font-bold text-sm">
              1
            </div>
            <div>
              <h4 className="type-section-heading">Secret Chore Draft</h4>
              <p className="type-secondary mt-0.5">
                Pick what you want or avoid. Roomie balances the effort and reveals everyone's tasks on Sunday.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#E6FAF8] border border-[#BBEFEA]">
            <div className="w-8 h-8 rounded-full bg-[#19B5A5] text-white flex items-center justify-center shrink-0 font-bold text-sm">
              2
            </div>
            <div>
              <h4 className="type-section-heading">Calm Expense Splits</h4>
              <p className="type-secondary mt-0.5">
                Log groceries or bills. Roomies agree before anything counts, and balances stay crystal clear.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF8E6] border border-[#FFE8A3]">
            <div className="w-8 h-8 rounded-full bg-[#FFC93C] text-[#1F2430] flex items-center justify-center shrink-0 font-bold text-sm">
              3
            </div>
            <div>
              <h4 className="type-section-heading">Kudos & Streaks</h4>
              <p className="type-secondary mt-0.5">
                Say thanks when a roomie cleans. Celebrate streaks without nagging or awkward confrontations.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Add to Home Screen',
      mascotState: 'idle' as const,
      bubble: 'Instant access anytime!',
      content: (
        <div className="space-y-3.5 my-2">
          <p className="type-secondary leading-relaxed">
            Roomie is a Progressive Web App (PWA). Adding it to your phone gives you full-screen mode and instant chore reminders!
          </p>

          <Card padding="sm" className="space-y-2 bg-[#F7F8FB]">
            <div className="flex items-center gap-2 type-label text-[#1F2430]">
              <Smartphone className="w-4 h-4 text-[#FF6B4A]" />
              <span>iPhone & iPad (Safari)</span>
            </div>
            <p className="type-secondary pl-6">
              Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-[#5B5BD6]" /> <strong>Share</strong> button, scroll down, and tap <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-[#19B5A5]" /> <strong>Add to Home Screen</strong>.
            </p>
          </Card>

          <Card padding="sm" className="space-y-2 bg-[#F7F8FB]">
            <div className="flex items-center gap-2 type-label text-[#1F2430]">
              <Smartphone className="w-4 h-4 text-[#19B5A5]" />
              <span>Android (Chrome)</span>
            </div>
            <p className="type-secondary pl-6">
              Tap the <MoreVertical className="w-3.5 h-3.5 inline mx-1 text-[#5B5BD6]" /> <strong>three dots</strong> in Chrome, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
          </Card>
        </div>
      ),
    },
    {
      title: 'Gentle Reminders',
      mascotState: 'calm' as const,
      bubble: 'Never naggy, always caring',
      content: (
        <div className="space-y-4 my-2 text-center">
          <p className="type-secondary leading-relaxed">
            We only send friendly reminders at the exact time you chose for your chores, plus notifications when a roomie adds a receipt or gives you kudos.
          </p>

          <div className="p-4 rounded-2xl bg-[#EEF0FD] border border-[#D3D5F9] text-left flex items-start gap-3">
            <BellRing className="w-6 h-6 text-[#5B5BD6] shrink-0 mt-0.5" />
            <div>
              <p className="type-body font-bold text-[#1F2430]">
                "Time for the bathroom. Roomie's cheering you on!"
              </p>
              <p className="type-secondary mt-1">
                You can snooze or reschedule in one tap anytime.
              </p>
            </div>
          </div>

          <div className="pt-2">
            {notificationsAllowed ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EBF9F0] text-[#3DBE6D] text-[14px] font-bold">
                <Check className="w-4 h-4" /> Notifications enabled!
              </div>
            ) : (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setNotificationsAllowed(true)}
                icon={<BellRing className="w-4 h-4" />}
              >
                Allow Notifications
              </Button>
            )}
          </div>
        </div>
      ),
    },
  ];

  const current = slides[step];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onComplete} showClose={true}>
      <div className="flex flex-col items-center">
        {/* Step dots */}
        <div className="flex gap-1.5 mb-3">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-[#FF6B4A]' : 'w-2 bg-[#E6E8EE]'
              }`}
            />
          ))}
        </div>

        <MascotView state={current.mascotState} size="lg" bubbleText={current.bubble} />

        <h3 className="type-title mt-2">
          {current.title}
        </h3>

        <div className="w-full mt-3">{current.content}</div>

        <div className="w-full mt-6 flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            className="flex-1"
            icon={step === slides.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          >
            {step === slides.length - 1 ? 'Get started' : 'Continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
