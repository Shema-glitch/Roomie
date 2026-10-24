import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { CurrencyCode, Household } from '../../types';
import { THEME } from '../../theme/tokens';
import { QrCode, Copy, Check, Sparkles } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface CreateHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, currency: CurrencyCode) => Promise<Household>;
}

export const CreateHouseholdModal: React.FC<CreateHouseholdModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('TRY');
  const [createdHousehold, setCreatedHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const h = await onCreate(name.trim(), currency);
      setCreatedHousehold(h);
      showToast(`Household "${h.name}" created!`, 'success');
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

  const handleClose = () => {
    setName('');
    setCreatedHousehold(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdHousehold ? 'Apartment Ready! 🎉' : 'Create a Household'}
      subtitle={
        createdHousehold
          ? 'Share this code or QR with your flatmates'
          : 'Set up your shared apartment in seconds'
      }
    >
      {!createdHousehold ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F2430] mb-1.5">
              Apartment / Household Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lefkoşa Flat 12, Gönyeli Villa"
              className="w-full px-4 py-3 rounded-2xl border border-[#E6E8EE] bg-white text-sm focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2430] mb-1.5">
              Household Currency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['TRY', 'USD', 'EUR'] as CurrencyCode[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`py-2.5 px-3 rounded-2xl border text-sm font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                    currency === c
                      ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                      : 'border-[#E6E8EE] bg-white text-[#6B7280]'
                  }`}
                >
                  <span>{c === 'TRY' ? '₺ TRY' : c === 'USD' ? '$ USD' : '€ EUR'}</span>
                  <span className="text-[10px] font-normal">
                    {c === 'TRY' ? 'Turkish Lira' : c === 'USD' ? 'US Dollar' : 'Euro'}
                  </span>
                </button>
              ))}
            </div>
            {currency === 'TRY' && (
              <p className="text-[11px] text-[#6B7280] mt-1.5">
                💡 Perfect for TRNC universities (EMU, NEU, CIU). Settle up monthly for fair balances!
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating...' : 'Create Apartment'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center text-center space-y-4">
          <MascotView state="celebrating" size="md" bubbleText="Invite your roommates!" />

          <Card padding="md" className="w-full bg-[#F7F8FB] space-y-3">
            <div>
              <span className="text-xs text-[#6B7280] font-semibold">Invite Code</span>
              <div className="text-3xl font-heading font-black tracking-widest text-[#FF6B4A] my-1">
                {createdHousehold.inviteCode}
              </div>
            </div>

            {/* Simulated QR Code Canvas/SVG */}
            <div className="p-3 bg-white rounded-2xl border border-[#E6E8EE] inline-block mx-auto shadow-xs">
              <svg width="120" height="120" viewBox="0 0 100 100" className="mx-auto">
                <rect width="100" height="100" fill="#FFFFFF" />
                {/* QR corner patterns */}
                <rect x="10" y="10" width="28" height="28" fill="#1F2430" rx="3" />
                <rect x="15" y="15" width="18" height="18" fill="#FFFFFF" rx="2" />
                <rect x="19" y="19" width="10" height="10" fill="#FF6B4A" rx="1" />

                <rect x="62" y="10" width="28" height="28" fill="#1F2430" rx="3" />
                <rect x="67" y="15" width="18" height="18" fill="#FFFFFF" rx="2" />
                <rect x="71" y="19" width="10" height="10" fill="#FF6B4A" rx="1" />

                <rect x="10" y="62" width="28" height="28" fill="#1F2430" rx="3" />
                <rect x="15" y="67" width="18" height="18" fill="#FFFFFF" rx="2" />
                <rect x="19" y="71" width="10" height="10" fill="#FF6B4A" rx="1" />

                {/* Simulated data blocks */}
                <rect x="44" y="15" width="8" height="8" fill="#1F2430" />
                <rect x="44" y="27" width="8" height="8" fill="#1F2430" />
                <rect x="44" y="62" width="8" height="8" fill="#1F2430" />
                <rect x="56" y="44" width="8" height="8" fill="#1F2430" />
                <rect x="25" y="44" width="8" height="8" fill="#1F2430" />
                <rect x="62" y="62" width="12" height="12" fill="#1F2430" />
                <rect x="78" y="78" width="12" height="12" fill="#1F2430" />
              </svg>
              <p className="text-[10px] text-[#6B7280] mt-1 font-semibold">Scan with phone camera</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={handleCopyCode}
              icon={copied ? <Check className="w-4 h-4 text-[#3DBE6D]" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied to clipboard!' : 'Copy Code & Share Link'}
            </Button>
          </Card>

          <Button variant="primary" size="md" fullWidth onClick={handleClose}>
            Enter Apartment
          </Button>
        </div>
      )}
    </Modal>
  );
};
