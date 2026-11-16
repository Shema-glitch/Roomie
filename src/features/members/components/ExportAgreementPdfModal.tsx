import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import {
  X,
  FileText,
  Printer,
  DownloadSimple,
  ShareNetwork,
  CheckCircle,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Household, HouseAgreement, MoveInSnapshot, User } from '../../../types';
import {
  generateAgreementsHtml,
  generateConditionSnapshotHtml,
  openPrintDialog,
  downloadHtmlBlob,
} from '../../../utils/pdfExporter';
import { sound } from '../../../services/sound';
import { haptics } from '../../../utils/haptics';
import { useToast } from '../../../components/common/Toast';

export interface ExportAgreementPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household;
  agreements: HouseAgreement[];
  snapshots: MoveInSnapshot[];
  members: User[];
}

type ExportDocType = 'agreements' | 'condition';

export const ExportAgreementPdfModal: React.FC<ExportAgreementPdfModalProps> = ({
  isOpen,
  onClose,
  household,
  agreements,
  snapshots,
  members,
}) => {
  const { showToast } = useToast();
  const [docType, setDocType] = useState<ExportDocType>('agreements');

  if (!isOpen) return null;

  const getHtml = () => {
    if (docType === 'agreements') {
      return generateAgreementsHtml({
        household,
        agreements,
        members,
      });
    }
    return generateConditionSnapshotHtml({
      household,
      snapshots,
      members,
    });
  };

  const handlePrint = () => {
    sound.playTap();
    haptics.light();
    const html = getHtml();
    openPrintDialog(html);
    showToast('Opening print preview for PDF export...', 'info');
  };

  const handleDownload = () => {
    sound.playSuccess();
    haptics.success();
    const html = getHtml();
    const filename = `${household.name.toLowerCase().replace(/\s+/g, '-')}-${docType}.html`;
    downloadHtmlBlob(html, filename);
    showToast('Document downloaded! Open in browser to print to PDF.', 'success');
  };

  const handleShare = async () => {
    sound.playTap();
    haptics.light();
    const html = getHtml();

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const file = new File([blob], `${docType}.html`, { type: 'text/html' });
        await navigator.share({
          title: `${household.name} ${docType === 'agreements' ? 'Agreements' : 'Condition Snapshot'}`,
          text: `Official roomie document for ${household.name}`,
          files: [file],
        });
        showToast('Shared successfully!', 'success');
        return;
      } catch {
        // Fallback or user canceled
      }
    }
    // Fallback: download
    handleDownload();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Flat Documents"
      subtitle="Generate clean printable PDFs for flatmates or landlord"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5 py-1">

        {/* Document Type Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-elevated/50 rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => {
              setDocType('agreements');
              sound.playTap();
            }}
            className={`py-2 px-3 rounded-xl text-[13px] font-semibold transition-all ${
              docType === 'agreements'
                ? 'bg-surface text-brand-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            House Agreements ({agreements.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setDocType('condition');
              sound.playTap();
            }}
            className={`py-2 px-3 rounded-xl text-[13px] font-semibold transition-all ${
              docType === 'condition'
                ? 'bg-surface text-brand-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Move-In Snapshot ({snapshots.length})
          </button>
        </div>

        {/* Document Summary Preview Card */}
        <div className="p-4 rounded-2xl bg-surface-elevated/30 border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="type-caption font-semibold text-text-primary uppercase tracking-wider text-[11px]">
              Document Content
            </span>
            <div className="flex items-center gap-1 text-[12px] text-green-600 font-medium">
              <ShieldCheck weight="fill" className="w-4 h-4" />
              <span>Timestamped</span>
            </div>
          </div>

          {docType === 'agreements' ? (
            <div>
              <p className="text-[14px] text-text-primary font-medium mb-1.5">
                {agreements.length} Verified House Rules & Norms
              </p>
              <p className="type-caption text-text-secondary">
                Includes noise & quiet hours, utility rules, kitchen standards, and formal flatmate signatures.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[14px] text-text-primary font-medium mb-1.5">
                {snapshots.length} Documented Room Conditions
              </p>
              <p className="type-caption text-text-secondary">
                Includes room inventories, condition notes, verified room photos, and flatmate co-tenant sign-offs.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-border/60">
            <span className="type-caption text-text-muted block mb-1.5">Co-tenant signatories:</span>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border/80 text-[12px] text-text-secondary"
                >
                  <CheckCircle weight="fill" className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{m.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-brand-primary text-white font-semibold text-[14px] hover:bg-brand-primary/90 active:scale-98 transition-all shadow-sm"
          >
            <Printer weight="bold" className="w-5 h-5" />
            <span>Print or Save to PDF</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-surface-elevated/70 border border-border text-text-primary font-medium text-[13px] hover:bg-surface-elevated transition-colors"
            >
              <DownloadSimple weight="bold" className="w-4 h-4 text-text-secondary" />
              <span>Download HTML</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-surface-elevated/70 border border-border text-text-primary font-medium text-[13px] hover:bg-surface-elevated transition-colors"
            >
              <ShareNetwork weight="bold" className="w-4 h-4 text-text-secondary" />
              <span>Share File</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
