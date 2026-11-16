import React, { useState } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { HouseholdInfoCard } from '../../../types';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';
import {
  WifiHigh,
  Eye,
  EyeSlash,
  Copy,
  MapPin,
  Trash,
  PhoneCall,
  PencilSimple,
  ShieldWarning,
  Check,
} from '@phosphor-icons/react';

export interface ApartmentInfoCardProps {
  infoCard?: HouseholdInfoCard | null;
  onUpdateInfoCard: (params: {
    wifiSsid?: string;
    wifiPassword?: string;
    trashSchedule?: string;
    deliveryAddress?: string;
    emergencyNote?: string;
  }) => Promise<void>;
}

export const ApartmentInfoCard: React.FC<ApartmentInfoCardProps> = ({
  infoCard,
  onUpdateInfoCard,
}) => {
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Edit form states
  const [ssid, setSsid] = useState(infoCard?.wifiSsid || 'SunnyFlat_5G');
  const [password, setPassword] = useState(infoCard?.wifiPassword || 'LemonTree992!');
  const [trash, setTrash] = useState(infoCard?.trashSchedule || 'Tuesdays & Fridays 08:00');
  const [address, setAddress] = useState(infoCard?.deliveryAddress || 'Bedreddin Demirel Cad. No 44, Daire 4B');
  const [emergency, setEmergency] = useState(infoCard?.emergencyNote || 'Main shutoff valve behind kitchen sink');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const activeSsid = infoCard?.wifiSsid || ssid;
  const activePassword = infoCard?.wifiPassword || password;
  const activeTrash = infoCard?.trashSchedule || trash;
  const activeAddress = infoCard?.deliveryAddress || address;
  const activeEmergency = infoCard?.emergencyNote || emergency;

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      sound.tokenClink();
      haptics.tokenClink();
      showToast(`${label} copied to clipboard!`, 'success');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const combinedText = `${address} ${emergency}`.toLowerCase();
    if (
      combinedText.includes('passport') ||
      combinedText.includes('national id') ||
      combinedText.includes('ssn')
    ) {
      setEditError('For security, identity document numbers (passports, national IDs) are strictly prohibited.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateInfoCard({
        wifiSsid: ssid,
        wifiPassword: password,
        trashSchedule: trash,
        deliveryAddress: address,
        emergencyNote: emergency,
      });
      sound.playSuccess();
      haptics.swapAccept();
      setIsEditOpen(false);
      showToast('Apartment info card updated!', 'success');
    } catch {
      setEditError('Could not save apartment info. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Title & Edit button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="type-title text-base text-[#1F2430] flex items-center gap-2">
            <WifiHigh weight="duotone" className="w-5 h-5 text-[#3B82F6]" />
            <span>Apartment Utilities & Wi-Fi Card</span>
          </h3>
          <p className="text-xs text-[#64748B]">
            Members-only details for flatmates and delivery drivers
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            sound.playTap();
            haptics.tokenClink();
            setIsEditOpen(true);
          }}
          icon={<PencilSimple weight="bold" className="w-3.5 h-3.5" />}
        >
          Edit Card
        </Button>
      </div>

      {/* Grid of Info Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Wi-Fi Details Card */}
        <Card padding="md" className="bg-[#EFF6FF] border-2 border-[#BFDBFE] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-[#1E40AF]">
              <WifiHigh weight="duotone" className="w-4 h-4 text-[#3B82F6]" />
              <span>Apartment Wi-Fi</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(activePassword, 'Wi-Fi password')}
              className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <Copy weight="bold" className="w-3 h-3" />
              <span>Copy Password</span>
            </button>
          </div>

          <div className="space-y-1 bg-white p-2.5 rounded-xl border border-[#DBEAFE]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748B] font-medium">Network (SSID):</span>
              <span className="font-bold text-[#1F2430] font-mono">{activeSsid}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
              <span className="text-[#64748B] font-medium">Password:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#1F2430] font-mono">
                  {showPassword ? activePassword : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[#64748B] hover:text-[#1F2430]"
                >
                  {showPassword ? (
                    <EyeSlash weight="duotone" className="w-4 h-4" />
                  ) : (
                    <Eye weight="duotone" className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery Address Card */}
        <Card padding="md" className="bg-[#F0FDFA] border-2 border-[#99F6E4] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-[#0F766E]">
              <MapPin weight="duotone" className="w-4 h-4 text-[#14B8A6]" />
              <span>Delivery Address</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(activeAddress, 'Delivery address')}
              className="text-[11px] font-bold text-[#0D9488] hover:underline flex items-center gap-1"
            >
              <Copy weight="bold" className="w-3 h-3" />
              <span>Copy Address</span>
            </button>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#CCFBF1] text-xs font-semibold text-[#1F2430] leading-relaxed">
            {activeAddress}
          </div>
        </Card>

        {/* Trash & Recycling Schedule */}
        <Card padding="md" className="bg-[#FEFCE8] border-2 border-[#FEF08A] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black text-[#854D0E]">
            <Trash weight="duotone" className="w-4 h-4 text-[#EAB308]" />
            <span>Trash & Recycling Schedule</span>
          </div>
          <p className="text-xs text-[#713F12] leading-relaxed bg-white p-2.5 rounded-xl border border-[#FEF08A]">
            {activeTrash}
          </p>
        </Card>

        {/* Emergency & Maintenance */}
        <Card padding="md" className="bg-[#FFF1F2] border-2 border-[#FECDD3] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black text-[#9F1239]">
            <PhoneCall weight="duotone" className="w-4 h-4 text-[#F43F5E]" />
            <span>Emergency & Superintendent</span>
          </div>
          <p className="text-xs text-[#881337] leading-relaxed bg-white p-2.5 rounded-xl border border-[#FECDD3]">
            {activeEmergency}
          </p>
        </Card>
      </div>

      {/* Safety Warning Banner */}
      <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2 text-[11px] text-[#64748B]">
        <ShieldWarning weight="duotone" className="w-4 h-4 text-[#F59E0B] shrink-0" />
        <span>
          Strict Privacy Rule: Identity documents (passports, visas, national IDs) must never be stored here.
        </span>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Apartment Details"
          subtitle="Update Wi-Fi credentials, delivery address, and schedules"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3.5 py-1">
            {editError && (
              <div className="p-2.5 rounded-xl bg-[#FFF5F5] border border-[#FEB2B2] text-xs text-[#E53E3E] font-bold">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="type-label block mb-1">Wi-Fi Network (SSID)</label>
                <input
                  type="text"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1F2430] focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
              <div>
                <label className="type-label block mb-1">Wi-Fi Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1F2430] focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="type-label block mb-1">Delivery Address (TRNC format)</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={300}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1F2430] focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <div>
              <label className="type-label block mb-1">Trash & Recycling Schedule</label>
              <input
                type="text"
                value={trash}
                onChange={(e) => setTrash(e.target.value)}
                maxLength={250}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1F2430] focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <div>
              <label className="type-label block mb-1">Emergency & Superintendent Note</label>
              <textarea
                value={emergency}
                onChange={(e) => setEmergency(e.target.value)}
                maxLength={300}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1F2430] focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                icon={<Check weight="bold" className="w-4 h-4" />}
              >
                Save Details
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
