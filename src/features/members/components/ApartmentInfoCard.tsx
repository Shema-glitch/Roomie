import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { BottomSheet } from '../../../components/ui/overlays';
import { HouseholdInfoCard } from '../../../types';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { copyTextToClipboard } from '../../../utils/clipboard';
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
  CaretDown,
} from '@phosphor-icons/react';

import {
  IDENTITY_DOCUMENT_REGEX,
  containsIdentityDocument,
} from '../../../utils/privacyGuards';

export { IDENTITY_DOCUMENT_REGEX, containsIdentityDocument };

export interface ApartmentInfoCardProps {
  infoCard?: HouseholdInfoCard | null;
  defaultExpanded?: boolean;
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
  defaultExpanded = true,
  onUpdateInfoCard,
}) => {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
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

  // Real-time client-side sensitive document pattern detection
  const detectedInAddress = containsIdentityDocument(address);
  const detectedInEmergency = containsIdentityDocument(emergency);
  const detectedInTrash = containsIdentityDocument(trash);
  const detectedInNotes = detectedInAddress || detectedInEmergency || detectedInTrash;

  const handleCopy = async (text: string, label: string) => {
    const success = await copyTextToClipboard(text);
    if (success) {
      sound.tokenClink();
      haptics.tokenClink();
      showToast(`${label} copied to clipboard!`, 'success');
    } else {
      showToast(`Unable to copy ${label}. Please copy manually.`, 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (detectedInNotes) {
      sound.softReject();
      haptics.softReject();
      setEditError(
        'For flat security and privacy, identity documents (passports, national IDs, visas) are strictly prohibited. Please remove them before saving.'
      );
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
    <div className="rounded-[24px] border-2 border-[#E5E9F0] bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header with Accordion Toggle & Edit button */}
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setIsExpanded((prev) => !prev);
          }}
          aria-expanded={isExpanded}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-start cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] shrink-0">
            <WifiHigh weight="duotone" className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-black text-base text-[#1F2430] truncate">
              Apartment Info
            </h3>
            <p className="text-xs text-[#64748B] truncate">
              {isExpanded
                ? 'Wi-Fi, delivery pin, trash & emergency'
                : `${activeSsid} · Tap to view details`}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {isExpanded && (
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap shrink-0"
              onClick={() => {
                sound.playTap();
                haptics.tokenClink();
                setIsEditOpen(true);
              }}
              icon={<PencilSimple weight="bold" className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
          )}
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setIsExpanded((prev) => !prev);
            }}
            aria-label={isExpanded ? 'Collapse apartment info' : 'Expand apartment info'}
            aria-expanded={isExpanded}
            className="w-9 h-9 rounded-full bg-[#F7F8FB] border border-[#E6E8EE] text-[#475569] hover:text-[#1F2430] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <CaretDown
              weight="bold"
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
      <div className="space-y-2.5">
        {/* Wi-Fi Details Row */}
        <div className="rounded-2xl bg-[#F0F7FF] border border-[#DBEAFE] p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#1E40AF] min-w-0">
              <WifiHigh weight="duotone" className="w-4 h-4 text-[#3B82F6] shrink-0" />
              <span className="whitespace-nowrap">Wi-Fi</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(activePassword, 'Wi-Fi password')}
              className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Copy weight="bold" className="w-3 h-3" />
              <span>Copy Password</span>
            </button>
          </div>

          <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-[#DBEAFE]">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-[#64748B] font-medium shrink-0">Network (SSID)</span>
              <span className="font-bold text-[#1F2430] font-mono truncate">{activeSsid}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9] gap-2">
              <span className="text-[#64748B] font-medium shrink-0">Password</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[#1F2430] font-mono truncate">
                  {showPassword ? activePassword : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[#64748B] hover:text-[#1F2430] shrink-0 cursor-pointer"
                  aria-label={showPassword ? 'Hide Wi-Fi password' : 'Show Wi-Fi password'}
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
        </div>

        {/* Delivery Address Row */}
        <div className="rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#0F766E]">
              <MapPin weight="duotone" className="w-4 h-4 text-[#14B8A6] shrink-0" />
              <span className="whitespace-nowrap">Delivery Address</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(activeAddress, 'Delivery address')}
              className="text-[11px] font-bold text-[#0D9488] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Copy weight="bold" className="w-3 h-3" />
              <span>Copy Address</span>
            </button>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#CCFBF1] text-xs font-semibold text-[#1F2430] leading-relaxed">
            {activeAddress}
          </div>
        </div>

        {/* Trash & Recycling Schedule Row */}
        <div className="rounded-2xl bg-[#FEFCE8] border border-[#FEF08A] p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black text-[#854D0E]">
            <Trash weight="duotone" className="w-4 h-4 text-[#EAB308] shrink-0" />
            <span>Trash &amp; Recycling Schedule</span>
          </div>
          <p className="text-xs text-[#713F12] leading-relaxed bg-white p-2.5 rounded-xl border border-[#FEF08A]">
            {activeTrash}
          </p>
        </div>

        {/* Emergency & Superintendent Row */}
        <div className="rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black text-[#9F1239]">
            <PhoneCall weight="duotone" className="w-4 h-4 text-[#F43F5E] shrink-0" />
            <span>Emergency &amp; Superintendent</span>
          </div>
          <p className="text-xs text-[#881337] leading-relaxed bg-white p-2.5 rounded-xl border border-[#FECDD3]">
            {activeEmergency}
          </p>
        </div>
      </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <BottomSheet
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Apartment Details"
          subtitle="Update Wi-Fi credentials, delivery address, and schedules"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3.5 py-1">
            {/* Privacy Rule Notice shown inside Edit modal */}
            <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-2 text-[11px] text-[#92400E] font-medium">
              <ShieldWarning weight="duotone" className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>
                Strict Privacy Rule: Identity documents (passports, visas, national IDs) must never be stored here.
              </span>
            </div>
            {/* Live Friendly Warning Banner for Sensitive Identity Documents */}
            {detectedInNotes && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE68A] text-[#92400E] flex items-start gap-3 shadow-xs transition-all duration-200"
              >
                <ShieldWarning weight="fill" className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-heading font-black text-[#78350F]">
                    Sensitive Document Number Detected
                  </p>
                  <p className="leading-relaxed text-[#92400E]">
                    For your apartment&apos;s privacy and security, passport numbers, national IDs, and visa numbers must never be stored in apartment notes. Please remove sensitive document numbers before saving.
                  </p>
                </div>
              </div>
            )}

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
                variant={detectedInNotes ? 'outline' : 'primary'}
                size="sm"
                loading={isSubmitting}
                disabled={detectedInNotes || isSubmitting}
                icon={<Check weight="bold" className="w-4 h-4" />}
              >
                {detectedInNotes ? 'Remove ID to Save' : 'Save Details'}
              </Button>
            </div>
          </form>
        </BottomSheet>
      )}
    </div>
  );
};
