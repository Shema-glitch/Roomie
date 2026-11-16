import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import {
  X,
  Wrench,
  Camera,
  Plus,
  ShieldWarning,
  CheckCircle,
  Clock,
  Megaphone,
} from '@phosphor-icons/react';
import { MaintenanceIssue, MaintenanceIssueStatus, User } from '../../../types';
import { processPhoto } from '../../../utils/photoPipeline';
import { containsIdentityDocument } from '../../../utils/privacyGuards';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';

export interface MaintenanceIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  currentUser: User;
  existingIssue?: MaintenanceIssue | null;
  onReportIssue: (params: {
    householdId: string;
    title: string;
    description: string;
    photoUrls?: string[];
  }) => Promise<MaintenanceIssue>;
  onUpdateStatus?: (issueId: string, status: MaintenanceIssueStatus) => Promise<MaintenanceIssue | null>;
}

export const MaintenanceIssueModal: React.FC<MaintenanceIssueModalProps> = ({
  isOpen,
  onClose,
  householdId,
  currentUser,
  existingIssue,
  onReportIssue,
  onUpdateStatus,
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState(existingIssue?.title || '');
  const [description, setDescription] = useState(existingIssue?.description || '');
  const [status, setStatus] = useState<MaintenanceIssueStatus>(existingIssue?.status || 'reported');
  const [photos, setPhotos] = useState<string[]>(existingIssue?.photoUrls || []);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isProhibited = containsIdentityDocument(title) || containsIdentityDocument(description);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessingPhoto(true);
      const processed = await processPhoto(file);
      setPhotos((prev) => [...prev, processed.fullDataUrl]);
      sound.playPop();
      haptics.light();
    } catch {
      showToast('Could not process photo', 'error');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    if (!cleanTitle) {
      showToast('Please enter an issue title', 'error');
      return;
    }
    if (!cleanDesc) {
      showToast('Please describe the problem', 'error');
      return;
    }
    if (isProhibited) {
      sound.playPop();
      haptics.warning();
      showToast('Identity documents and passports are strictly prohibited.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (existingIssue) {
        if (onUpdateStatus && status !== existingIssue.status) {
          await onUpdateStatus(existingIssue.id, status);
          showToast(`Issue status updated to ${status.replace('_', ' ')}!`, 'success');
        }
      } else {
        await onReportIssue({
          householdId,
          title: cleanTitle,
          description: cleanDesc,
          photoUrls: photos,
        });
        sound.playSuccess();
        haptics.success();
        showToast('Maintenance issue reported to flatmates!', 'success');
      }
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save maintenance issue', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingIssue ? 'Maintenance Issue Details' : 'Report Maintenance Issue'}
      subtitle="Track broken fixtures, leaks, and landlord notifications"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
          {/* Privacy Warning */}
          {isProhibited && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[13px]"
            >
              <ShieldWarning weight="fill" className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold block">Sensitive document detected</span>
                <span>Passports, IDs, and driver licenses are strictly disallowed for roomie privacy.</span>
              </div>
            </div>
          )}

          {/* Status selector (if reviewing existing issue) */}
          {existingIssue && (
            <div>
              <label className="type-label block text-text-secondary mb-1.5">Status Progression</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'reported', label: 'Reported', icon: Clock },
                    { id: 'notified_landlord', label: 'Notified Landlord', icon: Megaphone },
                    { id: 'fixed', label: 'Fixed & Done', icon: CheckCircle },
                  ] as const
                ).map((s) => {
                  const Icon = s.icon;
                  const isCur = status === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStatus(s.id);
                        sound.playTap();
                      }}
                      className={`py-2 px-1 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                        isCur
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold shadow-sm'
                          : 'border-border bg-surface-elevated/40 text-text-secondary hover:border-text-secondary/30'
                      }`}
                    >
                      <Icon weight={isCur ? 'fill' : 'regular'} className="w-5 h-5" />
                      <span className="text-[11px] text-center">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="issue-title" className="type-label block text-text-secondary mb-1.5">
              Issue Title
            </label>
            <input
              id="issue-title"
              type="text"
              maxLength={100}
              placeholder="e.g. Bathroom sink cold tap dripping"
              value={title}
              disabled={Boolean(existingIssue)}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary text-[14px] disabled:opacity-70"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="issue-desc" className="type-label text-text-secondary">
                Problem Description
              </label>
              <span className="text-[11px] text-text-muted">{description.length}/500</span>
            </div>
            <textarea
              id="issue-desc"
              rows={3}
              maxLength={500}
              placeholder="Explain where it is located, when it started, and whether landlord action is needed..."
              value={description}
              disabled={Boolean(existingIssue)}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary text-[13px] disabled:opacity-70"
            />
          </div>

          {/* Photos */}
          {!existingIssue && (
            <div>
              <label className="type-label block text-text-secondary mb-1.5">
                Attach Photo (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-elevated border border-border hover:border-brand-primary text-brand-primary font-medium text-[13px] cursor-pointer active:scale-95 transition-all">
                  <Camera weight="bold" className="w-4 h-4" />
                  <span>{processingPhoto ? 'Compressing...' : 'Take/Choose Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={processingPhoto}
                    className="hidden"
                  />
                </label>
              </div>

              {photos.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative group shrink-0">
                      <img
                        src={p}
                        alt={`Attachment ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-xl border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-[10px]"
                      >
                        <X weight="bold" className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {existingIssue && photos.length > 0 && (
            <div>
              <span className="type-label block text-text-secondary mb-1.5">Photos</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, idx) => (
                  <img
                    key={idx}
                    src={p}
                    alt={`Attachment ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border border-border shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-2xl text-[14px] text-text-secondary hover:bg-surface-elevated font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isProhibited}
              className="px-5 py-2.5 rounded-2xl bg-brand-primary text-white font-semibold text-[14px] hover:bg-brand-primary/90 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus weight="bold" className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : existingIssue ? 'Update Status' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
    </Modal>
  );
};
