import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import {
  X,
  Camera,
  CheckCircle,
  FileText,
  Plus,
  ShieldWarning,
  HouseLine,
  ArrowsLeftRight,
  CurrencyCircleDollar,
  Handshake,
  ShareNetwork,
  Printer,
  Sparkle,
} from '@phosphor-icons/react';
import { MoveOutInspection, MoveInSnapshot, User, Household } from '../../../types';
import { processPhoto } from '../../../utils/photoPipeline';
import { containsIdentityDocument } from '../../../utils/privacyGuards';
import { exportMoveOutCertificate } from '../../../utils/pdfExporter';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';

export interface MoveOutSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household;
  moveOutInspections: MoveOutInspection[];
  moveInSnapshots: MoveInSnapshot[];
  roommates: User[];
  currentUser: User;
  onAddInspection: (params: {
    householdId: string;
    userId: string;
    moveInSnapshotId?: string | null;
    roomName: string;
    conditionNote: string;
    photoUrls: string[];
    isDamageReported?: boolean;
    damageDeductionAmount?: number;
    depositPaidAmount: number;
    depositRefundAmount?: number;
  }) => Promise<MoveOutInspection>;
  onConfirmInspection: (inspectionId: string, userId?: string) => Promise<boolean>;
  onSettleRefund: (
    inspectionId: string,
    adminPayerUserId?: string
  ) => Promise<{ success: boolean; expenseId?: string }>;
}

const COMMON_ROOMS = ['Living Room', 'Kitchen', 'Bathroom', 'Balcony', 'Bedroom 1', 'Bedroom 2', 'Entrance Hall'];

export const MoveOutSnapshotModal: React.FC<MoveOutSnapshotModalProps> = ({
  isOpen,
  onClose,
  household,
  moveOutInspections,
  moveInSnapshots,
  roommates,
  currentUser,
  onAddInspection,
  onConfirmInspection,
  onSettleRefund,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'view' | 'new'>('view');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [roomName, setRoomName] = useState('Living Room');
  const [customRoom, setCustomRoom] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [isDamageReported, setIsDamageReported] = useState(false);
  const [damageAmount, setDamageAmount] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(300);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('view');
      setSelectedSnapshotId('');
      setRoomName('Living Room');
      setCustomRoom('');
      setConditionNote('');
      setPhotos([]);
      setProcessingPhoto(false);
      setIsDamageReported(false);
      setDamageAmount(0);
      setDepositAmount(300);
      setSubmitting(false);
      setConfirmingId(null);
      setSettlingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currencySymbol =
    household.currency === 'TRY' ? '₺' : household.currency === 'EUR' ? '€' : '$';

  const finalRoomName = roomName === 'Custom' ? customRoom : roomName;
  const isProhibited =
    containsIdentityDocument(finalRoomName) || containsIdentityDocument(conditionNote);

  // Matched baseline snapshot for comparison
  const matchedBaseline = moveInSnapshots.find(
    (s) => s.id === selectedSnapshotId || s.roomName.toLowerCase() === finalRoomName.toLowerCase()
  );

  const calculatedRefund = Math.max(0, depositAmount - (isDamageReported ? damageAmount : 0));

  const handleRoomChange = (room: string) => {
    setRoomName(room);
    const foundSnap = moveInSnapshots.find(
      (s) => s.roomName.toLowerCase() === room.toLowerCase()
    );
    if (foundSnap) {
      setSelectedSnapshotId(foundSnap.id);
    } else {
      setSelectedSnapshotId('');
    }
    sound.playTap();
    haptics.light();
  };

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
    if (submitting) return;
    const cleanRoom = finalRoomName.trim();
    const cleanNote = conditionNote.trim();

    if (!cleanRoom) {
      showToast('Please enter or select a room name', 'error');
      return;
    }
    if (!cleanNote) {
      showToast('Please describe the final room condition', 'error');
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
      await onAddInspection({
        householdId: household.id,
        userId: currentUser.id,
        moveInSnapshotId: matchedBaseline ? matchedBaseline.id : null,
        roomName: cleanRoom,
        conditionNote: cleanNote,
        photoUrls: photos,
        isDamageReported,
        damageDeductionAmount: isDamageReported ? damageAmount : 0,
        depositPaidAmount: depositAmount,
        depositRefundAmount: calculatedRefund,
      });

      sound.playSuccess();
      haptics.awardCelebrate();
      showToast('Move-out inspection submitted for flatmate review!', 'success');
      setActiveTab('view');
      setConditionNote('');
      setPhotos([]);
      setIsDamageReported(false);
      setDamageAmount(0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit inspection', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (inspectionId: string) => {
    try {
      setConfirmingId(inspectionId);
      await onConfirmInspection(inspectionId, currentUser.id);
      sound.playSuccess();
      haptics.success();
      showToast('You confirmed this move-out condition!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not confirm inspection', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSettleRefund = async (inspection: MoveOutInspection) => {
    try {
      setSettlingId(inspection.id);
      const res = await onSettleRefund(inspection.id, currentUser.id);
      if (res.success) {
        sound.playSuccess();
        haptics.awardCelebrate();
        showToast(
          `Deposit refund of ${currencySymbol}${inspection.depositRefundAmount} logged to flat expenses!`,
          'success'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not settle refund', 'error');
    } finally {
      setSettlingId(null);
    }
  };

  const handleExport = async (
    inspection: MoveOutInspection,
    mode: 'print' | 'download' | 'share'
  ) => {
    const departingTenant =
      roommates.find((r) => r.id === inspection.userId) ||
      (currentUser.id === inspection.userId ? currentUser : roommates[0] || currentUser);

    const confirmingMembers = roommates.filter((r) =>
      inspection.confirmedByUserIds.includes(r.id)
    );

    const baseline = moveInSnapshots.find(
      (s) =>
        s.id === inspection.moveInSnapshotId ||
        s.roomName.toLowerCase() === inspection.roomName.toLowerCase()
    );

    await exportMoveOutCertificate(
      {
        household,
        inspection,
        moveInSnapshot: baseline || null,
        departingTenant,
        confirmingMembers,
        allMembers: roommates,
      },
      mode
    );

    sound.playTap();
    haptics.tokenClink();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move-Out & Deposit Protection"
      maxWidth="xl"
    >
      <div className="p-4 sm:p-5 space-y-5">
        {/* Tab Switcher */}
        <div className="flex bg-[#F1F3F9] p-1 rounded-2xl border border-[#E6E8EE]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('view');
              sound.playTap();
              haptics.light();
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'view'
                ? 'bg-white text-[#0F172A] shadow-sm border border-[#E6E8EE]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ArrowsLeftRight weight="duotone" className="w-4 h-4 text-[#0284C7]" />
            Inspections ({moveOutInspections.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('new');
              sound.playTap();
              haptics.light();
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'new'
                ? 'bg-white text-[#0F172A] shadow-sm border border-[#E6E8EE]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Plus weight="bold" className="w-4 h-4 text-[#0284C7]" />
            File Move-Out
          </button>
        </div>

        {/* VIEW TAB */}
        {activeTab === 'view' && (
          <div className="space-y-4">
            {moveOutInspections.length === 0 ? (
              <div className="p-6 text-center rounded-3xl bg-[#F8FAFC] border-2 border-dashed border-[#E2E8F0] space-y-3">
                <HouseLine weight="duotone" className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">No move-out inspections yet</h4>
                  <p className="text-xs text-[#64748B] max-w-xs mx-auto mt-1">
                    Document room conditions and compare them directly against move-in photos to safeguard your deposit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className="px-4 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#0369A1] transition-all"
                >
                  File First Move-Out Record
                </button>
              </div>
            ) : (
              moveOutInspections.map((inspection) => {
                const tenant =
                  roommates.find((r) => r.id === inspection.userId) ||
                  (currentUser.id === inspection.userId ? currentUser : null);
                const hasCurrentUserConfirmed = inspection.confirmedByUserIds.includes(
                  currentUser.id
                );
                const baseline = moveInSnapshots.find(
                  (s) =>
                    s.id === inspection.moveInSnapshotId ||
                    s.roomName.toLowerCase() === inspection.roomName.toLowerCase()
                );

                return (
                  <div
                    key={inspection.id}
                    className="p-4 rounded-3xl bg-white border-2 border-b-4 border-[#E2E8F0] space-y-3.5 shadow-2xs"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[#0F172A]">
                            {inspection.roomName}
                          </h4>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              inspection.status === 'settled'
                                ? 'bg-blue-100 text-blue-700'
                                : inspection.status === 'agreed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {inspection.status === 'settled'
                              ? 'Settled'
                              : inspection.status === 'agreed'
                              ? 'Agreed'
                              : 'Pending Review'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          Departing: <span className="font-semibold">{tenant?.name || 'Flatmate'}</span> •{' '}
                          {new Date(inspection.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Export Certificate Dropdown / Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExport(inspection, 'print')}
                          title="Print / PDF Certificate"
                          className="p-1.5 rounded-xl text-[#0284C7] bg-[#F0F9FF] border border-[#BAE6FD] hover:bg-[#E0F2FE] transition-all"
                        >
                          <Printer weight="duotone" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport(inspection, 'share')}
                          title="Share Certificate"
                          className="p-1.5 rounded-xl text-[#0284C7] bg-[#F0F9FF] border border-[#BAE6FD] hover:bg-[#E0F2FE] transition-all"
                        >
                          <ShareNetwork weight="duotone" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SIDE-BY-SIDE BASELINE VS MOVE-OUT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Move-In Baseline */}
                      <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-[#0284C7] uppercase tracking-wide">
                            Move-In Baseline
                          </span>
                          {baseline && (
                            <span className="text-[10px] text-[#94A3B8]">
                              {new Date(baseline.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#334155] leading-relaxed">
                          {baseline
                            ? baseline.conditionNote
                            : 'No move-in baseline photo/note on file.'}
                        </p>
                        {baseline && baseline.photoUrls.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto pt-1">
                            {baseline.photoUrls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt="Move-In Baseline"
                                className="w-14 h-14 object-cover rounded-xl border border-[#CBD5E1]"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Move-Out Condition */}
                      <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-[#166534] uppercase tracking-wide">
                            Move-Out Condition
                          </span>
                          {inspection.isDamageReported && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                              Damage Noted
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#1E293B] leading-relaxed">
                          {inspection.conditionNote}
                        </p>
                        {inspection.photoUrls.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto pt-1">
                            {inspection.photoUrls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt="Move-Out State"
                                className="w-14 h-14 object-cover rounded-xl border border-[#86EFAC]"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DEPOSIT REFUND BREAKDOWN */}
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[#64748B] block text-[11px]">Deposit Settlement</span>
                        <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
                          <span>Paid: {currencySymbol}{inspection.depositPaidAmount}</span>
                          {inspection.damageDeductionAmount > 0 && (
                            <span className="text-red-500">
                              - Deduct: {currencySymbol}{inspection.damageDeductionAmount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                          Net Refund
                        </span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          {currencySymbol}{inspection.depositRefundAmount}
                        </span>
                      </div>
                    </div>

                    {/* Actions & Confirmations */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9]">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {inspection.confirmedByUserIds.map((uid) => {
                            const u =
                              roommates.find((r) => r.id === uid) ||
                              (currentUser.id === uid ? currentUser : null);
                            return (
                              <img
                                key={uid}
                                src={u?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                                alt={u?.name || 'Roomie'}
                                className="w-6 h-6 rounded-full border-2 border-white object-cover"
                                title={u?.name}
                              />
                            );
                          })}
                        </div>
                        <span className="text-[11px] text-[#64748B] font-medium">
                          {inspection.confirmedByUserIds.length} verified
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!hasCurrentUserConfirmed && inspection.status !== 'settled' && (
                          <button
                            type="button"
                            disabled={confirmingId === inspection.id}
                            onClick={() => handleConfirm(inspection.id)}
                            className="px-3 py-1.5 bg-[#F0FDF4] text-[#166534] border border-[#86EFAC] rounded-xl text-xs font-bold hover:bg-[#DCFCE7] active:scale-95 transition-all flex items-center gap-1"
                          >
                            <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[#16A34A]" />
                            {confirmingId === inspection.id ? 'Confirming...' : 'Confirm Condition'}
                          </button>
                        )}

                        {inspection.status === 'agreed' && (
                          <button
                            type="button"
                            disabled={settlingId === inspection.id}
                            onClick={() => handleSettleRefund(inspection)}
                            className="px-3 py-1.5 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-[#0369A1] active:scale-95 shadow-sm transition-all flex items-center gap-1"
                          >
                            <Handshake weight="duotone" className="w-3.5 h-3.5" />
                            {settlingId === inspection.id ? 'Logging...' : 'Settle Refund'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* NEW INSPECTION TAB */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Room Selector */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Select Room / Area
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_ROOMS.map((room) => {
                  const isSelected = roomName === room;
                  return (
                    <button
                      key={room}
                      type="button"
                      onClick={() => handleRoomChange(room)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#0284C7] text-white shadow-xs'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {room}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleRoomChange('Custom')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    roomName === 'Custom'
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  Custom
                </button>
              </div>

              {roomName === 'Custom' && (
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Master Bedroom, Rooftop Terrace"
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#CBD5E1] focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              )}
            </div>

            {/* Matched Move-In Baseline Indicator */}
            {matchedBaseline && (
              <div className="p-3 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7]">
                  <Sparkle weight="fill" className="w-3.5 h-3.5" />
                  Matched Move-In Baseline Found
                </div>
                <p className="text-[11px] text-[#334155] italic">
                  "{matchedBaseline.conditionNote}"
                </p>
              </div>
            )}

            {/* Condition Note */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-[#0F172A]">
                  Final Move-Out Condition & Key Handover
                </label>
                <span className="text-[11px] text-[#94A3B8]">{conditionNote.length}/1000</span>
              </div>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="Describe cleanliness, walls, furniture state, handover of keys, and pre-existing versus new wear..."
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
                className={`w-full p-3 text-xs rounded-2xl border ${
                  isProhibited
                    ? 'border-red-400 bg-red-50/50'
                    : 'border-[#CBD5E1] bg-white'
                } focus:ring-2 focus:ring-[#0284C7] focus:outline-none`}
              />

              {isProhibited && (
                <div className="mt-1.5 p-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-[11px] text-red-700">
                  <ShieldWarning weight="fill" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Privacy Guard:</strong> Do not enter passport, national ID, or confidential document numbers.
                  </span>
                </div>
              )}
            </div>

            {/* Photos */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Proof Photos (Move-Out State)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#CBD5E1]">
                    <img src={p} alt="Room" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-[#CBD5E1] hover:border-[#0284C7] flex flex-col items-center justify-center cursor-pointer bg-[#F8FAFC] transition-colors">
                  <Camera weight="duotone" className="w-5 h-5 text-[#64748B]" />
                  <span className="text-[9px] text-[#64748B] font-bold mt-0.5">
                    {processingPhoto ? '...' : '+ Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    disabled={processingPhoto}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Damage & Deposit Calculator */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#0F172A] block">Damage or Repair Deduction?</span>
                  <span className="text-[11px] text-[#64748B]">Is any amount being withheld from deposit?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDamageReported(!isDamageReported);
                    sound.playTap();
                    haptics.light();
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative border-2 ${
                    isDamageReported ? 'bg-[#0284C7] border-[#0284C7]' : 'bg-[#E2E8F0] border-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      isDamageReported ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {isDamageReported && (
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    Deduction Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={damageAmount}
                    onChange={(e) => setDamageAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#CBD5E1] bg-white focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-xs">
                <div>
                  <label className="block text-[11px] text-[#64748B] font-bold">Deposit Paid</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-[#CBD5E1] bg-white mt-0.5"
                  />
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-emerald-600 font-bold uppercase">Net Refund Due</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {currencySymbol}{calculatedRefund}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || isProhibited}
              className="w-full py-3 bg-[#0284C7] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:bg-[#0369A1] active:scale-98 transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting Inspection...' : 'Submit Move-Out Inspection'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
