import React, { useState } from 'react';
import {
  User,
  PhoneCall,
  WhatsappLogo,
  Wrench,
  PencilSimple,
  ShieldWarning,
  Plus,
  Clock,
  CheckCircle,
  Megaphone,
  Copy,
  Check,
} from '@phosphor-icons/react';
import { LandlordProfile, MaintenanceIssue, MaintenanceIssueStatus } from '../../../types';
import { copyTextToClipboard } from '../../../utils/clipboard';
import { containsIdentityDocument } from '../../../utils/privacyGuards';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';

export interface LandlordHubCardProps {
  landlordProfile?: LandlordProfile | null;
  maintenanceIssues: MaintenanceIssue[];
  householdId: string;
  onUpdateProfile: (params: {
    householdId: string;
    landlordName: string;
    roleLabel: string;
    phoneOrWhatsapp: string;
    emergencyNote?: string;
  }) => Promise<LandlordProfile>;
  onOpenReportIssue: () => void;
  onSelectIssue: (issue: MaintenanceIssue) => void;
  onOpenMoveInSnapshot?: () => void;
  onOpenMoveOutSnapshot?: () => void;
  onOpenExportPdf?: () => void;
}

export const LandlordHubCard: React.FC<LandlordHubCardProps> = ({
  landlordProfile,
  maintenanceIssues,
  householdId,
  onUpdateProfile,
  onOpenReportIssue,
  onSelectIssue,
  onOpenMoveInSnapshot,
  onOpenMoveOutSnapshot,
  onOpenExportPdf,
}) => {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(landlordProfile?.landlordName || 'Kemal Özkan');
  const [role, setRole] = useState(landlordProfile?.roleLabel || 'Property Owner / Landlord');
  const [phone, setPhone] = useState(landlordProfile?.phoneOrWhatsapp || '+90 533 855 4321');
  const [emergencyNote, setEmergencyNote] = useState(
    landlordProfile?.emergencyNote ||
      'For urgent plumbing or power emergencies, call Kemal directly or contact building superintendent Hasan.'
  );
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [saving, setSaving] = useState(false);

  const isProhibited =
    containsIdentityDocument(name) ||
    containsIdentityDocument(role) ||
    containsIdentityDocument(phone) ||
    containsIdentityDocument(emergencyNote);

  const cleanPhoneForWa = phone.replace(/[^0-9]/g, '');

  const handleCopyPhone = async () => {
    sound.playTap();
    haptics.light();
    const ok = await copyTextToClipboard(phone);
    if (ok) {
      setCopiedPhone(true);
      showToast('Landlord phone copied to clipboard!', 'success');
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleCall = async () => {
    sound.playTap();
    haptics.medium();
    await copyTextToClipboard(phone);
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  };

  const handleWhatsApp = async () => {
    sound.playTap();
    haptics.medium();
    await copyTextToClipboard(phone);
    window.open(`https://wa.me/${cleanPhoneForWa}`, '_blank', 'noopener,noreferrer');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProhibited) {
      sound.playPop();
      haptics.warning();
      showToast('Identity documents, passports, and IDs are strictly prohibited.', 'error');
      return;
    }

    try {
      setSaving(true);
      await onUpdateProfile({
        householdId,
        landlordName: name.trim(),
        roleLabel: role.trim(),
        phoneOrWhatsapp: phone.trim(),
        emergencyNote: emergencyNote.trim(),
      });
      sound.playSuccess();
      haptics.success();
      showToast('Landlord contact details updated!', 'success');
      setIsEditing(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update landlord info', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeIssues = maintenanceIssues.filter((i) => !i.deletedAt && i.status !== 'fixed');
  const fixedIssues = maintenanceIssues.filter((i) => !i.deletedAt && i.status === 'fixed');

  return (
    <div className="bg-surface rounded-3xl p-5 border border-border shadow-card mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Wrench weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="type-h3 text-text-primary text-[16px]">Landlord & Maintenance Hub</h3>
            <p className="type-caption text-text-secondary">
              Direct landlord contacts, emergencies & repairs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setIsEditing(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-elevated text-text-secondary font-medium text-[12px] hover:text-text-primary border border-border/80 transition-colors"
            >
              <PencilSimple weight="bold" className="w-3.5 h-3.5" />
              <span>Edit Contact</span>
            </button>
          )}
        </div>
      </div>

      {/* EDIT MODE */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-elevated/40 border border-border mb-4">
          {isProhibited && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[12px]"
            >
              <ShieldWarning weight="fill" className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>Prohibited: Passports, national IDs, and driver licenses are not allowed.</span>
            </div>
          )}

          <div>
            <label className="type-caption text-text-secondary block mb-1">Landlord / Agent Name</label>
            <input
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] text-text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="type-caption text-text-secondary block mb-1">Role / Company</label>
              <input
                type="text"
                maxLength={40}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] text-text-primary"
              />
            </div>
            <div>
              <label className="type-caption text-text-secondary block mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                maxLength={50}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="type-caption text-text-secondary block mb-1">Emergency Instructions</label>
            <textarea
              rows={2}
              maxLength={300}
              value={emergencyNote}
              onChange={(e) => setEmergencyNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-xl text-[12px] text-text-secondary hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isProhibited}
              className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-[12px] font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Landlord Info'}
            </button>
          </div>
        </form>
      ) : (
        /* CONTACT CARD */
        <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/80 flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[15px] text-text-primary">
                  {landlordProfile?.landlordName || name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-medium">
                  {landlordProfile?.roleLabel || role}
                </span>
              </div>
              <span className="type-caption text-text-secondary mt-0.5 block">
                {landlordProfile?.phoneOrWhatsapp || phone}
              </span>
            </div>

            {/* Quick Action Dial Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-text-primary hover:text-brand-primary text-[12px] font-semibold active:scale-95 transition-all shadow-xs"
              >
                <PhoneCall weight="bold" className="w-3.5 h-3.5 text-brand-primary" />
                <span>Call</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-[12px] font-semibold hover:bg-green-500/20 active:scale-95 transition-all shadow-xs"
              >
                <WhatsappLogo weight="fill" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPhone}
                aria-label="Copy phone number"
                className="p-2 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary active:scale-95 transition-all"
              >
                {copiedPhone ? (
                  <Check weight="bold" className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy weight="bold" className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {(landlordProfile?.emergencyNote || emergencyNote) && (
            <p className="text-[12px] text-text-secondary bg-surface p-2.5 rounded-xl border border-border/60 leading-relaxed">
              <span className="font-semibold text-text-primary">Emergency Instructions: </span>
              {landlordProfile?.emergencyNote || emergencyNote}
            </p>
          )}
        </div>
      )}

      {/* MAINTENANCE ISSUES LIST */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="type-caption font-semibold text-text-primary uppercase tracking-wider text-[11px]">
              Apartment Maintenance ({activeIssues.length} Active)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onOpenReportIssue();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-primary/10 text-brand-primary font-semibold text-[12px] hover:bg-brand-primary/20 active:scale-95 transition-all"
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>Report Issue</span>
          </button>
        </div>

        {activeIssues.length === 0 && fixedIssues.length === 0 ? (
          <div className="p-3.5 rounded-2xl bg-surface-elevated/30 border border-border/60 text-center">
            <p className="type-caption text-text-muted">
              All flat fixtures working properly. Tap "Report Issue" if plumbing or AC needs attention.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => {
                  sound.playTap();
                  onSelectIssue(issue);
                }}
                className="p-3 rounded-2xl bg-surface-elevated/50 border border-border/80 flex items-center justify-between gap-3 cursor-pointer hover:border-brand-primary/40 active:scale-99 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                    <Wrench weight="duotone" className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="type-body font-semibold text-[13px] text-text-primary truncate">
                      {issue.title}
                    </h5>
                    <p className="type-caption text-text-muted line-clamp-1">
                      {issue.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {issue.status === 'notified_landlord' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
                      <Megaphone weight="fill" className="w-3 h-3" />
                      <span>Notified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                      <Clock weight="fill" className="w-3 h-3" />
                      <span>Reported</span>
                    </span>
                  )}
                </div>
              </div>
            ))}

            {fixedIssues.slice(0, 2).map((issue) => (
              <div
                key={issue.id}
                onClick={() => {
                  sound.playTap();
                  onSelectIssue(issue);
                }}
                className="p-2.5 rounded-2xl bg-surface border border-border/40 flex items-center justify-between opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle weight="fill" className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-[12px] text-text-secondary truncate line-through">
                    {issue.title}
                  </span>
                </div>
                <span className="text-[11px] text-green-600 font-medium shrink-0">Fixed</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK SHORTCUTS FOR CONDITION SNAPSHOT, MOVE-OUT & PDF EXPORT */}
      {(onOpenMoveInSnapshot || onOpenMoveOutSnapshot || onOpenExportPdf) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60">
          {onOpenMoveInSnapshot && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenMoveInSnapshot();
              }}
              className="py-2 px-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary text-[11px] sm:text-[12px] font-medium text-center transition-colors"
            >
              Move-In Baseline
            </button>
          )}
          {onOpenMoveOutSnapshot && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenMoveOutSnapshot();
              }}
              className="py-2 px-2.5 rounded-xl bg-surface border border-sky-200 text-sky-700 hover:bg-sky-50 text-[11px] sm:text-[12px] font-semibold text-center transition-colors"
            >
              Move-Out & Deposit
            </button>
          )}
          {onOpenExportPdf && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenExportPdf();
              }}
              className="py-2 px-2.5 rounded-xl bg-surface border border-border text-brand-primary hover:bg-brand-primary/10 text-[11px] sm:text-[12px] font-medium text-center transition-colors"
            >
              Export Agreement
            </button>
          )}
        </div>
      )}
    </div>
  );
};
