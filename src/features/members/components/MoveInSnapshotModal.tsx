import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import {
  X,
  Camera,
  CheckCircle,
  FileText,
  Plus,
  ShieldWarning,
  HouseLine,
} from '@phosphor-icons/react';
import { MoveInSnapshot, User, Household } from '../../../types';
import { processPhoto } from '../../../utils/photoPipeline';
import { containsIdentityDocument } from '../../../utils/privacyGuards';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';

export interface MoveInSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household;
  snapshots: MoveInSnapshot[];
  roommates: User[];
  currentUser: User;
  onAddSnapshot: (params: {
    householdId: string;
    roomName: string;
    conditionNote: string;
    photoUrls?: string[];
  }) => Promise<MoveInSnapshot>;
  onConfirmSnapshot: (snapshotId: string, userId: string) => Promise<MoveInSnapshot | null>;
  onOpenExport?: () => void;
}

const COMMON_ROOMS = ['Living Room', 'Kitchen', 'Bathroom', 'Balcony', 'Bedroom 1', 'Bedroom 2', 'Entrance Hall'];

export const MoveInSnapshotModal: React.FC<MoveInSnapshotModalProps> = ({
  isOpen,
  onClose,
  household,
  snapshots,
  roommates,
  currentUser,
  onAddSnapshot,
  onConfirmSnapshot,
  onOpenExport,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  const [roomName, setRoomName] = useState('Living Room');
  const [customRoom, setCustomRoom] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isProhibited =
    containsIdentityDocument(roomName === 'Custom' ? customRoom : roomName) ||
    containsIdentityDocument(conditionNote);

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoom = (roomName === 'Custom' ? customRoom : roomName).trim();
    const cleanNote = conditionNote.trim();

    if (!finalRoom) {
      showToast('Please specify a room name', 'error');
      return;
    }
    if (!cleanNote) {
      showToast('Please enter condition details', 'error');
      return;
    }
    if (isProhibited) {
      sound.playPop();
      haptics.warning();
      showToast('Identity documents and passports are strictly prohibited for privacy.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await onAddSnapshot({
        householdId: household.id,
        roomName: finalRoom,
        conditionNote: cleanNote,
        photoUrls: photos,
      });
      sound.playSuccess();
      haptics.success();
      showToast(`Snapshot added for ${finalRoom}!`, 'success');
      // Reset form
      setConditionNote('');
      setPhotos([]);
      setActiveTab('view');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save snapshot', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (snapId: string) => {
    try {
      setConfirmingId(snapId);
      sound.playSuccess();
      haptics.success();
      await onConfirmSnapshot(snapId, currentUser.id);
      showToast('You confirmed this room condition!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to confirm condition', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move-In Condition Snapshot"
      subtitle="Document apartment condition at move-in for deposit safety"
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4 py-1">

        {/* Tab Switcher & Export Action */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex p-1 bg-surface-elevated/50 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => {
                setActiveTab('view');
                sound.playTap();
              }}
              className={`py-1.5 px-3 rounded-xl text-[13px] font-semibold transition-all ${
                activeTab === 'view'
                  ? 'bg-surface text-brand-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Documented Rooms ({snapshots.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('add');
                sound.playTap();
              }}
              className={`py-1.5 px-3 rounded-xl text-[13px] font-semibold transition-all ${
                activeTab === 'add'
                  ? 'bg-surface text-brand-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              + Add Room Record
            </button>
          </div>

          {onOpenExport && (
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenExport();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-surface-elevated text-brand-primary font-semibold text-[13px] hover:bg-surface-elevated/80 border border-border transition-colors"
            >
              <FileText weight="duotone" className="w-4 h-4" />
              <span>Export Record</span>
            </button>
          )}
        </div>

        {/* VIEW TAB */}
        {activeTab === 'view' && (
          <div className="flex flex-col gap-4">
            {snapshots.length === 0 ? (
              <div className="p-8 rounded-3xl bg-surface-elevated/30 border border-border/80 text-center flex flex-col items-center gap-2">
                <HouseLine weight="duotone" className="w-10 h-10 text-brand-primary/60" />
                <h4 className="type-body font-semibold text-text-primary">No Room Records Yet</h4>
                <p className="type-caption text-text-secondary max-w-sm">
                  Take photos and record condition of the living room, kitchen, and bathroom when moving in.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="mt-2 px-4 py-2 rounded-2xl bg-brand-primary text-white text-[13px] font-semibold shadow-sm hover:bg-brand-primary/90"
                >
                  Document First Room
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {snapshots.map((snap) => {
                  const isConfirmedByMe = snap.confirmedByUserIds.includes(currentUser.id);
                  const confirmedMembers = snap.confirmedByUserIds
                    .map((uid) => roommates.find((r) => r.id === uid)?.name || uid)
                    .join(', ');

                  return (
                    <div
                      key={snap.id}
                      className="p-4 rounded-2xl bg-surface-elevated/40 border border-border flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[15px] text-text-primary">
                            {snap.roomName}
                          </span>
                          <span className="type-caption text-text-muted">
                            {new Date(snap.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {isConfirmedByMe ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                            <span>You Confirmed</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConfirm(snap.id)}
                            disabled={confirmingId === snap.id}
                            className="px-3 py-1 rounded-xl bg-brand-primary text-white text-[12px] font-semibold hover:bg-brand-primary/90 active:scale-95 transition-all shadow-sm"
                          >
                            {confirmingId === snap.id ? 'Confirming...' : 'Co-sign & Confirm'}
                          </button>
                        )}
                      </div>

                      <p className="text-[13px] text-text-secondary leading-relaxed">
                        {snap.conditionNote}
                      </p>

                      {snap.photoUrls && snap.photoUrls.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {snap.photoUrls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`${snap.roomName} condition ${i + 1}`}
                              className="w-24 h-24 object-cover rounded-xl border border-border shrink-0"
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[12px] text-text-muted pt-2 border-t border-border/50">
                        <span className="font-medium text-text-secondary">Confirmed by:</span>
                        <span>{confirmedMembers || 'Pending co-tenants'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ADD TAB */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
            {/* Privacy Warning Banner */}
            {isProhibited && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[13px]"
              >
                <ShieldWarning weight="fill" className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <span className="font-semibold block">Sensitive document detected</span>
                  <span>Passports, IDs, and driver licenses are strictly disallowed for privacy.</span>
                </div>
              </div>
            )}

            {/* Room Selector Chips */}
            <div>
              <label className="type-label block text-text-secondary mb-1.5">Select Room</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ROOMS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRoomName(r);
                      sound.playTap();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[13px] border transition-all ${
                      roomName === r
                        ? 'bg-brand-primary text-white border-brand-primary font-medium shadow-sm'
                        : 'bg-surface-elevated/50 text-text-secondary border-border hover:border-brand-primary/40'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setRoomName('Custom');
                    sound.playTap();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[13px] border transition-all ${
                    roomName === 'Custom'
                      ? 'bg-brand-primary text-white border-brand-primary font-medium shadow-sm'
                      : 'bg-surface-elevated/50 text-text-secondary border-border hover:border-brand-primary/40'
                  }`}
                >
                  Other / Custom
                </button>
              </div>

              {roomName === 'Custom' && (
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Enter custom room or area name"
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  className="mt-2 w-full px-4 py-2 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary text-[14px]"
                  required
                />
              )}
            </div>

            {/* Condition Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="cond-note" className="type-label text-text-secondary">
                  Condition Notes & Inventory
                </label>
                <span className="text-[11px] text-text-muted">{conditionNote.length}/400</span>
              </div>
              <textarea
                id="cond-note"
                rows={3}
                maxLength={400}
                placeholder="Note any scuffs, existing appliance issues, wall paint status, or included inventory..."
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-surface-elevated/50 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary text-[13px]"
              />
            </div>

            {/* Photo Attachment via Photo Pipeline */}
            <div>
              <label className="type-label block text-text-secondary mb-1.5">
                Room Photos (Compressed & Deduplicated)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-elevated border border-border hover:border-brand-primary text-brand-primary font-medium text-[13px] cursor-pointer active:scale-95 transition-all">
                  <Camera weight="bold" className="w-4 h-4" />
                  <span>{processingPhoto ? 'Compressing...' : 'Attach Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={processingPhoto}
                    className="hidden"
                  />
                </label>
                <span className="type-caption text-text-muted">
                  Auto-compressed to &lt;300 KB JPEG
                </span>
              </div>

              {photos.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative group shrink-0">
                      <img
                        src={p}
                        alt={`Upload ${idx + 1}`}
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

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
              <button
                type="button"
                onClick={() => setActiveTab('view')}
                className="px-4 py-2 rounded-2xl text-[14px] text-text-secondary hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || isProhibited}
                className="px-5 py-2.5 rounded-2xl bg-brand-primary text-white font-semibold text-[14px] hover:bg-brand-primary/90 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus weight="bold" className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : 'Save Room Record'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
