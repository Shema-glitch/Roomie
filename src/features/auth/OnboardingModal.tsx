import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { useBackHandler } from '../../utils/useBackHandler';
import { sound } from '../../services/sound';
import { haptics } from '../../utils/haptics';
import { requestDeviceNotificationPermission } from '../../utils/deviceNotifications';
import {
  DeviceMobile,
  BellRinging,
  Export,
  PlusSquare,
  DotsThreeVertical,
  Check,
  ArrowRight,
  Sparkle,
  Wallet,
  ShoppingCartSimple,
  ShieldCheck,
} from '@phosphor-icons/react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  currency?: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  currency = 'TRY',
}) => {
  const [step, setStep] = useState<number>(0);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const isNativeApp = Capacitor.isNativePlatform();

  useBackHandler(isOpen && step > 0, 110, () => {
    sound.playTap();
    haptics.light();
    setStep((prev) => Math.max(0, prev - 1));
  });

  const slides = [
    {
      title: 'Secret Chore Draft',
      mascotState: 'cheering' as const,
      bubble: 'Fair tasks every Sunday!',
      content: (
        <div className="space-y-3 my-1">
          <p className="type-secondary text-sm leading-relaxed text-center">
            Every weekend, roomies privately submit chores they prefer, avoid, or suggest.
          </p>
          <div className="p-3.5 rounded-2xl bg-[#FFF0ED] border-2 border-[#FFD7CF] space-y-1.5">
            <div className="flex items-center gap-2 text-[#FF6B4A] font-extrabold text-[14px]">
              <Sparkle weight="duotone" className="w-5 h-5 shrink-0" />
              <span>Balanced effort + Favor Tokens</span>
            </div>
            <p className="type-secondary text-xs leading-relaxed">
              Roomie balances heavy and light tasks automatically. Need a break during exams? Swap a chore using Favor Tokens or pause with Away Mode.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Calm Splits & Monthly Bills',
      mascotState: 'calm' as const,
      bubble: 'Zero money awkwardness',
      content: (
        <div className="space-y-3 my-1">
          <p className="type-secondary text-sm leading-relaxed text-center">
            Track groceries, rent, Wi-Fi, and utilities in your apartment&apos;s currency ({currency}).
          </p>
          <div className="p-3.5 rounded-2xl bg-[#E6FAF8] border-2 border-[#BBEFEA] space-y-1.5">
            <div className="flex items-center gap-2 text-[#138E82] font-extrabold text-[14px]">
              <Wallet weight="duotone" className="w-5 h-5 shrink-0" />
              <span>Consent before balances move</span>
            </div>
            <p className="type-secondary text-xs leading-relaxed">
              Roomies review receipts and tap Agree. Only agreed expenses affect balances, and debts simplify into the fewest possible transfers.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Supermarket Ping & Flat Hub',
      mascotState: 'celebrating' as const,
      bubble: 'Need anything from the store?',
      content: (
        <div className="space-y-3 my-1">
          <p className="type-secondary text-sm leading-relaxed text-center">
            Stop buying double milk or hunting for the Wi-Fi password in old group chats.
          </p>
          <div className="p-3.5 rounded-2xl bg-[#FFF8E6] border-2 border-[#FFE8A3] space-y-1.5">
            <div className="flex items-center gap-2 text-[#8A6200] font-extrabold text-[14px]">
              <ShoppingCartSimple weight="duotone" className="w-5 h-5 shrink-0" />
              <span>One-tap real-life flat tools</span>
            </div>
            <p className="type-secondary text-xs leading-relaxed">
              Ping flatmates when you&apos;re at the supermarket, convert your shopping cart straight into a split expense, and keep Wi-Fi, trash days, and landlord contacts handy.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Deposit Shield & Passport',
      mascotState: 'celebrating' as const,
      bubble: 'Protect your deposit!',
      content: (
        <div className="space-y-3 my-1">
          <p className="type-secondary text-sm leading-relaxed text-center">
            Built for international students moving in and out of shared flats.
          </p>
          <div className="p-3.5 rounded-2xl bg-[#F0F9FF] border-2 border-[#BAE6FD] space-y-1.5">
            <div className="flex items-center gap-2 text-[#0369A1] font-extrabold text-[14px]">
              <ShieldCheck weight="duotone" className="w-5 h-5 shrink-0" />
              <span>Side-by-side photos & portable karma</span>
            </div>
            <p className="type-secondary text-xs leading-relaxed">
              Save Move-In and Move-Out room photos side by side with printable deposit certificates, and carry your verified Flatmate Reputation Passport to your next home.
            </p>
          </div>

          <div className="pt-1">
            {notificationsAllowed ? (
              <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#EBF9F0] border border-[#BBF7D0] text-[#15803D] text-xs font-extrabold">
                <Check weight="bold" className="w-4 h-4" />
                <span>Gentle reminders & haptics ready!</span>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={async () => {
                  sound.playSuccess();
                  haptics.awardCelebrate();
                  await requestDeviceNotificationPermission();
                  setNotificationsAllowed(true);
                }}
                icon={<BellRinging weight="duotone" className="w-4 h-4 text-[#5B5BD6]" />}
              >
                Enable Gentle Flat Alerts
              </Button>
            )}
          </div>
        </div>
      ),
    },
    ...(!isNativeApp
      ? [
          {
            title: 'Install on Your Phone',
            mascotState: 'idle' as const,
            bubble: 'Instant access anytime!',
            content: (
              <div className="space-y-3 my-1">
                <p className="type-secondary text-sm leading-relaxed text-center">
                  Add Roomie to your home screen for full-screen mode and instant access.
                </p>

                <Card padding="sm" className="space-y-1.5 bg-[#F7F8FB]">
                  <div className="flex items-center gap-2 type-label text-[#1F2430]">
                    <DeviceMobile weight="duotone" className="w-4 h-4 text-[#FF6B4A]" />
                    <span>iPhone & iPad (Safari)</span>
                  </div>
                  <p className="type-secondary text-xs pl-6">
                    Tap <Export weight="duotone" className="w-3.5 h-3.5 inline mx-1 text-[#5B5BD6]" /> <strong>Share</strong>, then tap{' '}
                    <PlusSquare weight="duotone" className="w-3.5 h-3.5 inline mx-1 text-[#19B5A5]" /> <strong>Add to Home Screen</strong>.
                  </p>
                </Card>

                <Card padding="sm" className="space-y-1.5 bg-[#F7F8FB]">
                  <div className="flex items-center gap-2 type-label text-[#1F2430]">
                    <DeviceMobile weight="duotone" className="w-4 h-4 text-[#19B5A5]" />
                    <span>Android (Chrome)</span>
                  </div>
                  <p className="type-secondary text-xs pl-6">
                    Tap <DotsThreeVertical weight="bold" className="w-3.5 h-3.5 inline mx-1 text-[#5B5BD6]" /> <strong>menu</strong>, then choose{' '}
                    <strong>Install app</strong>.
                  </p>
                </Card>
              </div>
            ),
          },
        ]
      : []),
  ];

  const current = slides[Math.min(step, slides.length - 1)];
  const isLast = step >= slides.length - 1;

  const handleNext = () => {
    if (!isLast) {
      sound.playTap();
      haptics.light();
      setStep(step + 1);
    } else {
      sound.playSuccess();
      haptics.awardCelebrate();
      onComplete();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onComplete}
      showClose={true}
      footer={
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                sound.playTap();
                haptics.light();
                setStep(step - 1);
              }}
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
            icon={isLast ? <Check weight="bold" className="w-4 h-4" /> : <ArrowRight weight="bold" className="w-4 h-4" />}
          >
            {isLast ? "Let's Go!" : 'Next'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        {/* Step dots */}
        <div className="flex gap-1.5 mb-3">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                sound.playTap();
                haptics.light();
                setStep(i);
              }}
              aria-label={`Step ${i + 1}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                i === step ? 'w-6 bg-[#FF6B4A]' : 'w-2 bg-[#E6E8EE]'
              }`}
            />
          ))}
        </div>

        <MascotView state={current.mascotState} size="lg" bubbleText={current.bubble} />

        <h3 className="type-title mt-2 text-center">{current.title}</h3>

        <div className="w-full mt-3">{current.content}</div>
      </div>
    </Modal>
  );
};
