import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { CurrencyCode, Household } from '../../types';
import { THEME } from '../../theme/tokens';
import { sound } from '../../services/sound';
import { buildInviteUrl } from '../../utils/inviteLink';
import { debugLog } from '../../utils/debugLog';
import {
  Check,
  Copy,
  ArrowRight,
  Link,
  ShareNetwork,
} from '@phosphor-icons/react';
import { useToast } from '../../components/common/Toast';
import { useBackHandler } from '../../utils/useBackHandler';

interface CreateHouseholdFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    currency: CurrencyCode,
    options?: { rotationInterval?: 'weekly' | 'monthly'; starterChores?: string[] }
  ) => Promise<Household>;
  onCompleted?: (household: Household) => void;
}

export const CreateHouseholdFlowModal: React.FC<CreateHouseholdFlowModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onCompleted,
}) => {
  const { showToast } = useToast();
  // 1: Name -> 2: Currency & Rotation -> 3: Starter Chores -> 4: Complete & QR
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('TRY');
  const [rotation, setRotation] = useState<'weekly' | 'monthly'>('weekly');
  const [starterChores, setStarterChores] = useState<string[]>([
    'Deep Clean Bathroom',
    'Dishwasher & Sink',
    'Take Out Trash',
    'Kitchen Counters',
  ]);
  const [createdHousehold, setCreatedHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!createdHousehold?.inviteCode) {
      setQrDataUrl('');
      return;
    }
    let active = true;
    const inviteUrl = buildInviteUrl(createdHousehold.inviteCode);

    QRCode.toDataURL(inviteUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1F2430',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
          debugLog.info('qr_scanner', 'generate_qr', `Rendered real QR for created flat ${createdHousehold.inviteCode}`, {
            householdId: createdHousehold.id,
            inviteCode: createdHousehold.inviteCode,
          });
        }
      })
      .catch((err: any) => {
        if (active) {
          setQrDataUrl('');
          debugLog.warn('qr_scanner', 'generate_qr', err?.message || 'Failed to render QR', {
            householdId: createdHousehold.id,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [createdHousehold]);

  useBackHandler(isOpen && step > 1 && step < 4, 110, () => {
    sound.playTap();
    setStep((s) => Math.max(1, s - 1));
  });

  const availableStarterChores = [
    'Deep Clean Bathroom',
    'Dishwasher & Sink',
    'Take Out Trash',
    'Kitchen Counters',
    'Living Room Sweep & Mop',
    'Cook House Dinner',
    'Supermarket Supply Run',
  ];

  const toggleChore = (c: string) => {
    sound.playTap();
    if (starterChores.includes(c)) {
      setStarterChores(starterChores.filter((item) => item !== c));
    } else {
      setStarterChores([...starterChores, c]);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      sound.playCelebration();
      const h = await onCreate(name.trim(), currency, {
        rotationInterval: rotation,
        starterChores,
      });
      setCreatedHousehold(h);
      setStep(4);
      showToast(`Apartment "${h.name}" created!`, 'success');
    } catch {
      showToast('Could not create household', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdHousehold) return;
    navigator.clipboard.writeText(createdHousehold.inviteCode).catch(() => {});
    setCopied(true);
    showToast(`Invite code ${createdHousehold.inviteCode} copied!`, 'reward');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!createdHousehold) return;
    const url = buildInviteUrl(createdHousehold.inviteCode);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    showToast('Invite link copied!', 'reward');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareInvite = async () => {
    if (!createdHousehold) return;
    const url = buildInviteUrl(createdHousehold.inviteCode);
    try {
      await navigator.share({
        title: `Join ${createdHousehold.name} on Roomie`,
        text: `Hey! Join our shared flat "${createdHousehold.name}" on Roomie with invite code ${createdHousehold.inviteCode}:`,
        url,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const handleClose = () => {
    const completed = createdHousehold;
    setStep(1);
    setName('');
    setCreatedHousehold(null);
    onClose();
    if (completed) {
      onCompleted?.(completed);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 4 ? 'Apartment Ready!' : `Create Household (${step}/3)`}
      subtitle={
        step === 1
          ? 'Step 1: Name your shared apartment'
          : step === 2
          ? 'Step 2: Choose currency and rotation'
          : step === 3
          ? 'Step 3: Pick starter chores'
          : 'Share this QR or invite code with your roomies'
      }
    >
      <div className="space-y-4">
        {/* Progress indicator */}
        {step <= 3 && (
          <div className="flex gap-1.5 w-full">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  s === step
                    ? 'bg-[#FF6B4A]'
                    : s < step
                    ? 'bg-[#19B5A5]'
                    : 'bg-[#E6E8EE]'
                }`}
              />
            ))}
          </div>
        )}

        {/* STEP 1: APARTMENT NAME */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                What is your apartment called?
              </h4>
              <p className="type-secondary mt-0.5">
                Pick a friendly name you and your roomies recognize.
              </p>
            </div>

            <div>
              <label className="type-label block mb-1.5">
                Apartment Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lefkoşa Flat 12, Gönyeli Villa 4B"
                className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-[16px] focus:outline-none focus:border-[#FF6B4A]"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={!name.trim()}
                onClick={() => {
                  sound.playTap();
                  setStep(2);
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: CURRENCY & ROTATION */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Currency & chore schedule
              </h4>
              <p className="type-secondary mt-0.5">
                Set how expenses and chore rotations operate.
              </p>
            </div>

            {/* Currency */}
            <div>
              <label className="type-label block mb-1.5">
                Apartment Currency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['TRY', 'USD', 'EUR'] as CurrencyCode[]).map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => {
                      sound.playTap();
                      setCurrency(c);
                    }}
                    className={`py-3 px-2 rounded-2xl border text-[14px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      currency === c
                        ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                        : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                    }`}
                  >
                    <span className="text-[14px] font-bold">
                      {c === 'TRY' ? '₺ TRY' : c === 'USD' ? '$ USD' : '€ EUR'}
                    </span>
                    <span className="text-[14px] font-normal">
                      {c === 'TRY' ? 'Lira' : c === 'USD' ? 'Dollar' : 'Euro'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="type-label block mb-1.5">
                Chore Draft Rotation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'weekly', label: 'Weekly Draft' },
                  { id: 'monthly', label: 'Monthly Rotation' },
                ].map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      sound.playTap();
                      setRotation(r.id as any);
                    }}
                    className={`p-3 rounded-2xl border text-[14px] font-bold text-left cursor-pointer transition-all ${
                      rotation === r.id
                        ? 'border-[#19B5A5] bg-[#E6FAF8] text-[#138E82]'
                        : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  sound.playTap();
                  setStep(3);
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: STARTER CHORES */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="type-section-heading">
                Starter Chore Pool
              </h4>
              <p className="type-secondary mt-0.5">
                Select default chores for your apartment draft ({starterChores.length} selected).
              </p>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {availableStarterChores.map((c) => {
                const isSelected = starterChores.includes(c);
                return (
                  <div
                    key={c}
                    onClick={() => toggleChore(c)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF6B4A] bg-[#FFF0ED]/40'
                        : 'border-[#E6E8EE] bg-white opacity-60'
                    }`}
                  >
                    <span className="text-[14px] font-bold text-[#1F2430]">{c}</span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-[#FF6B4A] text-white' : 'border border-[#CBD5E1]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={loading || starterChores.length === 0}
                onClick={handleCreate}
                icon={<Check className="w-4 h-4" />}
              >
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: CREATED & INVITE QR */}
        {step === 4 && createdHousehold && (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <MascotView state="celebrating" size="md" bubbleText="Invite your roomies!" />

            <Card padding="md" variant="calm" className="w-full bg-[#F7F8FB] space-y-3">
              <div>
                <span className="type-label block">Invite Code</span>
                <div className="type-big-number tracking-widest text-[#FF6B4A] my-1">
                  {createdHousehold.inviteCode}
                </div>
              </div>

              {/* Real scannable QR code */}
              <div className="p-3.5 bg-white rounded-2xl border-2 border-[#E6E8EE] inline-block mx-auto shadow-xs">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Invite QR code for ${createdHousehold.name}`}
                    className="w-[180px] h-[180px] mx-auto rounded-xl object-contain"
                  />
                ) : (
                  <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-[#64748B]">
                    Generating QR code...
                  </div>
                )}
                <p className="type-secondary mt-1.5 text-xs font-semibold">
                  Scan with camera to join flat
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCopyCode}
                  icon={copied ? <Check className="w-4 h-4 text-[#3DBE6D]" /> : <Copy className="w-4 h-4" />}
                >
                  {copied ? 'Copied code!' : 'Copy Code'}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleCopyLink}
                  icon={copiedLink ? <Check className="w-4 h-4 text-[#3DBE6D]" /> : <Link className="w-4 h-4 text-[#5B5BD6]" />}
                >
                  {copiedLink ? 'Copied link!' : 'Copy Link'}
                </Button>
              </div>

              {canShare && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleShareInvite}
                  icon={<ShareNetwork className="w-4 h-4" />}
                >
                  Share invite to roomies
                </Button>
              )}
            </Card>

            <Button variant="primary" size="md" fullWidth onClick={handleClose}>
              {onCompleted ? 'Enter My Apartment' : 'Done'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
