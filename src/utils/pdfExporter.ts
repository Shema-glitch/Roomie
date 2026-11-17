/**
 * Roomie Zero-Dependency Agreement & Condition Snapshot Document Exporter
 * - Formats house agreements, rules, and move-in condition snapshots into a print-ready document.
 * - Uses standard browser print API (`window.print()`), HTML Blob download, and Web Share API.
 * - Zero heavy external dependencies (< 4 KB gzipped), fully offline-capable, crisp typography.
 */

import { HouseAgreement, MoveInSnapshot, MoveOutInspection, User, Household } from '../types';

export interface AgreementExportData {
  household: Household;
  agreements: HouseAgreement[];
  members: User[];
  generatedAt?: string;
}

export interface ConditionSnapshotExportData {
  household: Household;
  snapshots: MoveInSnapshot[];
  members: User[];
  generatedAt?: string;
}

export interface MoveOutCertificateExportData {
  household: Household;
  inspection: MoveOutInspection;
  moveInSnapshot?: MoveInSnapshot | null;
  departingTenant: User;
  confirmingMembers: User[];
  allMembers: User[];
  generatedAt?: string;
}

/**
 * Builds HTML markup for House Agreements & Living Norms
 */
export function generateAgreementsHtml(data: AgreementExportData): string {
  const dateStr = data.generatedAt || new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const categories = Array.from(new Set(data.agreements.map((a) => a.category || 'General')));

  const agreementsByCategory = categories
    .map((cat) => {
      const items = data.agreements.filter((a) => (a.category || 'General') === cat);
      const itemsHtml = items
        .map(
          (item, idx) => `
          <li class="agreement-item">
            <span class="num">${idx + 1}.</span>
            <div class="content">
              <p class="text">${escapeHtml(item.text)}</p>
              ${
                item.agreedAt
                  ? `<span class="date">Agreed on ${new Date(item.agreedAt).toLocaleDateString()}</span>`
                  : ''
              }
            </div>
          </li>
        `
        )
        .join('');

      return `
        <div class="category-section">
          <h2 class="category-title">${escapeHtml(cat)}</h2>
          <ul class="agreement-list">${itemsHtml}</ul>
        </div>
      `;
    })
    .join('');

  const membersHtml = data.members
    .map(
      (m) => `
      <div class="member-badge">
        <div class="member-dot"></div>
        <span class="member-name">${escapeHtml(m.name)}</span>
        <span class="member-country">${escapeHtml(m.country || '')}</span>
      </div>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>House Agreements — ${escapeHtml(data.household.name)}</title>
  <style>
    ${getBasePrintStyles()}
  </style>
</head>
<body>
  <div class="page-container">
    <header class="doc-header">
      <div class="header-badge">ROOMIE FLAT COMPACT</div>
      <h1 class="doc-title">${escapeHtml(data.household.name)}</h1>
      <p class="doc-subtitle">House Agreements, Norms & Quiet Hours Protocol</p>
      <div class="doc-meta">
        <span>Exported: ${escapeHtml(dateStr)}</span> • <span>${data.agreements.length} Active Rules</span>
      </div>
    </header>

    <div class="members-strip">
      <div class="strip-label">Flatmate Sign-Off:</div>
      <div class="strip-items">${membersHtml}</div>
    </div>

    <main class="doc-body">
      ${agreementsByCategory || '<p class="empty-text">No formal agreements documented yet.</p>'}
    </main>

    <footer class="doc-footer">
      <div class="footer-signatures">
        ${data.members
          .map(
            (m) => `
          <div class="sig-block">
            <div class="sig-line"></div>
            <span class="sig-name">${escapeHtml(m.name)}</span>
            <span class="sig-role">Flat Resident</span>
          </div>
        `
          )
          .join('')}
      </div>
      <p class="disclaimer">Document created and timestamped via Roomie Flat Co-living System.</p>
    </footer>
  </div>
</body>
</html>
  `;
}

/**
 * Builds HTML markup for Move-In Condition Snapshot
 */
export function generateConditionSnapshotHtml(data: ConditionSnapshotExportData): string {
  const dateStr = data.generatedAt || new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const snapshotsHtml = data.snapshots
    .map((snap) => {
      const confirmedNames = snap.confirmedByUserIds
        .map((uid) => data.members.find((m) => m.id === uid)?.name || uid)
        .join(', ');

      const photosHtml = snap.photoUrls && snap.photoUrls.length > 0
        ? `<div class="photo-grid">
            ${snap.photoUrls
              .map(
                (url) => `
              <div class="photo-cell">
                <img src="${escapeHtml(url)}" alt="${escapeHtml(snap.roomName)}" />
              </div>
            `
              )
              .join('')}
          </div>`
        : '';

      return `
        <div class="snapshot-card">
          <div class="snapshot-card-header">
            <h3 class="room-title">${escapeHtml(snap.roomName)}</h3>
            <span class="date-badge">Logged: ${new Date(snap.createdAt).toLocaleDateString()}</span>
          </div>
          <p class="condition-note">${escapeHtml(snap.conditionNote)}</p>
          ${photosHtml}
          <div class="confirmation-strip">
            <span class="confirm-label">Confirmed by:</span>
            <span class="confirm-names">${escapeHtml(confirmedNames || 'Pending flatmate confirmation')}</span>
          </div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Move-In Condition Snapshot — ${escapeHtml(data.household.name)}</title>
  <style>
    ${getBasePrintStyles()}
    .snapshot-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      break-inside: avoid;
      background: #fafafc;
    }
    .snapshot-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .room-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .date-badge {
      font-size: 12px;
      color: #64748b;
    }
    .condition-note {
      font-size: 14px;
      line-height: 1.5;
      color: #334155;
      margin-bottom: 12px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    .photo-cell img {
      width: 100%;
      height: 140px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    .confirmation-strip {
      font-size: 12px;
      color: #059669;
      background: #ecfdf5;
      padding: 6px 10px;
      border-radius: 6px;
      display: flex;
      gap: 6px;
    }
    .confirm-label {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <header class="doc-header">
      <div class="header-badge">MOVE-IN CONDITION RECORD</div>
      <h1 class="doc-title">${escapeHtml(data.household.name)}</h1>
      <p class="doc-subtitle">Apartment Initial Condition & Handover Snapshot</p>
      <div class="doc-meta">
        <span>Recorded: ${escapeHtml(dateStr)}</span> • <span>${data.snapshots.length} Documented Rooms</span>
      </div>
    </header>

    <main class="doc-body">
      ${snapshotsHtml || '<p class="empty-text">No room condition records documented yet.</p>'}
    </main>

    <footer class="doc-footer">
      <div class="footer-signatures">
        ${data.members
          .map(
            (m) => `
          <div class="sig-block">
            <div class="sig-line"></div>
            <span class="sig-name">${escapeHtml(m.name)}</span>
            <span class="sig-role">Co-Tenant</span>
          </div>
        `
          )
          .join('')}
      </div>
      <p class="disclaimer">Timestamped verification record for deposit protection and lease inventory.</p>
    </footer>
  </div>
</body>
</html>
  `;
}

/**
 * Builds HTML markup for Move-Out Inspection & Deposit Settlement Certificate
 */
export function generateMoveOutCertificateHtml(data: MoveOutCertificateExportData): string {
  const dateStr =
    data.generatedAt ||
    new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const inspectionDate = new Date(data.inspection.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const currency = data.household.currency || 'TRY';
  const formatAmt = (amt: number) =>
    currency === 'TRY' ? `₺${amt.toFixed(2)}` : currency === 'EUR' ? `€${amt.toFixed(2)}` : `$${amt.toFixed(2)}`;

  const moveInPhotosHtml =
    data.moveInSnapshot && data.moveInSnapshot.photoUrls.length > 0
      ? `<div class="photo-grid">${data.moveInSnapshot.photoUrls
          .map((url) => `<div class="photo-cell"><img src="${escapeHtml(url)}" alt="Move-In Condition" /></div>`)
          .join('')}</div>`
      : '<p class="empty-subtext">No move-in photos attached.</p>';

  const moveOutPhotosHtml =
    data.inspection.photoUrls.length > 0
      ? `<div class="photo-grid">${data.inspection.photoUrls
          .map((url) => `<div class="photo-cell"><img src="${escapeHtml(url)}" alt="Move-Out Condition" /></div>`)
          .join('')}</div>`
      : '<p class="empty-subtext">No move-out photos attached.</p>';

  const confirmingNames = data.confirmingMembers.map((m) => escapeHtml(m.name)).join(', ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Move-Out Certificate — ${escapeHtml(data.inspection.roomName)}</title>
  <style>
    ${getBasePrintStyles()}
    .tenant-hero {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .tenant-info h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: #0f172a;
    }
    .tenant-info p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-agreed { background: #dcfce7; color: #15803d; }
    .status-settled { background: #dbeafe; color: #1d4ed8; }
    .status-pending { background: #fef3c7; color: #b45309; }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    @media print {
      .comparison-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .comparison-col {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      background: #ffffff;
    }
    .col-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      color: #0284c7;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .col-note {
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
      margin-bottom: 12px;
      min-height: 48px;
    }
    .settlement-card {
      background: #fafafa;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 28px;
    }
    .settlement-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .settlement-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 14px;
      color: #475569;
    }
    .settlement-row.total {
      border-top: 2px solid #cbd5e1;
      margin-top: 8px;
      padding-top: 10px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .deduction {
      color: #dc2626;
      font-weight: 600;
    }
    .refund-highlight {
      color: #059669;
      font-weight: 800;
    }
    .empty-subtext {
      color: #94a3b8;
      font-size: 12px;
      font-style: italic;
    }
    .confirmation-alert {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
      color: #166534;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <header class="doc-header">
      <div class="header-badge">ROOMIE DEPOSIT PROTECTION & MOVE-OUT CERTIFICATE</div>
      <h1 class="doc-title">${escapeHtml(data.household.name)}</h1>
      <p class="doc-subtitle">Official Move-Out Inspection, Condition Delta & Deposit Settlement</p>
      <div class="doc-meta">
        <span>Certified: ${escapeHtml(dateStr)}</span> • <span>Room: ${escapeHtml(data.inspection.roomName)}</span>
      </div>
    </header>

    <div class="tenant-hero">
      <div class="tenant-info">
        <h3>Departing Tenant: ${escapeHtml(data.departingTenant.name)}</h3>
        <p>Inspection Filed: ${escapeHtml(inspectionDate)} • Apartment: ${escapeHtml(data.household.name)}</p>
      </div>
      <div>
        <span class="status-badge ${
          data.inspection.status === 'settled'
            ? 'status-settled'
            : data.inspection.status === 'agreed'
            ? 'status-agreed'
            : 'status-pending'
        }">${escapeHtml(data.inspection.status)}</span>
      </div>
    </div>

    <section class="comparison-grid">
      <div class="comparison-col">
        <div class="col-title">
          <span>Initial Move-In Baseline</span>
          ${data.moveInSnapshot ? `<span style="font-size:11px;color:#64748b;">${new Date(data.moveInSnapshot.createdAt).toLocaleDateString()}</span>` : ''}
        </div>
        <p class="col-note">${data.moveInSnapshot ? escapeHtml(data.moveInSnapshot.conditionNote) : 'No baseline snapshot recorded at move-in.'}</p>
        ${moveInPhotosHtml}
      </div>

      <div class="comparison-col">
        <div class="col-title">
          <span>Final Move-Out State</span>
          <span style="font-size:11px;color:#64748b;">${inspectionDate}</span>
        </div>
        <p class="col-note">${escapeHtml(data.inspection.conditionNote)}</p>
        ${moveOutPhotosHtml}
      </div>
    </section>

    <section class="settlement-card">
      <div class="settlement-title">Deposit Settlement & Deductions Breakdown</div>
      <div class="settlement-row">
        <span>Security Deposit Originally Paid:</span>
        <span>${formatAmt(data.inspection.depositPaidAmount)}</span>
      </div>
      <div class="settlement-row">
        <span>Agreed Damage / Cleaning Deductions:</span>
        <span class="deduction">-${formatAmt(data.inspection.damageDeductionAmount)}</span>
      </div>
      <div class="settlement-row total">
        <span>Net Refund Due to Departing Tenant:</span>
        <span class="refund-highlight">${formatAmt(data.inspection.depositRefundAmount)}</span>
      </div>
    </section>

    ${
      confirmingNames
        ? `<div class="confirmation-alert"><strong>Verified by Flatmates:</strong> Confirmed by ${confirmingNames} as an accurate condition assessment.</div>`
        : ''
    }

    <footer class="doc-footer">
      <div class="footer-signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <span class="sig-name">${escapeHtml(data.departingTenant.name)}</span>
          <span class="sig-role">Departing Tenant</span>
        </div>
        ${data.confirmingMembers
          .filter((m) => m.id !== data.departingTenant.id)
          .map(
            (m) => `
          <div class="sig-block">
            <div class="sig-line"></div>
            <span class="sig-name">${escapeHtml(m.name)}</span>
            <span class="sig-role">Co-Tenant Witness</span>
          </div>
        `
          )
          .join('')}
      </div>
      <p class="disclaimer">Official Roomie Verification Record for Deposit Return & Lease Clearance. Timestamped & Cryptographically Structured.</p>
    </footer>
  </div>
</body>
</html>
  `;
}

/**
 * Exports Move-Out Certificate via Print, Download, or Web Share
 */
export async function exportMoveOutCertificate(
  data: MoveOutCertificateExportData,
  mode: 'print' | 'download' | 'share' = 'print'
): Promise<boolean> {
  const html = generateMoveOutCertificateHtml(data);
  const filename = `roomie-moveout-${data.inspection.roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`;

  if (mode === 'print') {
    openPrintDialog(html);
    return true;
  }

  if (mode === 'share') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([html], filename, { type: 'text/html' });
        await navigator.share({
          title: `Move-Out Certificate — ${data.inspection.roomName}`,
          text: `Move-Out Inspection & Deposit Settlement for ${data.departingTenant.name} at ${data.household.name}`,
          files: [file],
        });
        return true;
      } catch {
        // Fallback to download on share cancel/failure
        downloadHtmlBlob(html, filename);
        return true;
      }
    }
  }

  downloadHtmlBlob(html, filename);
  return true;
}

/**
 * Triggers native print preview dialog or returns downloadable Blob
 */
export function openPrintDialog(htmlContent: string): void {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Delay slightly to ensure styles render
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    // If pop-ups are blocked, download HTML file
    downloadHtmlBlob(htmlContent, 'roomie-document.html');
  }
}

/**
 * Downloads formatted document as standalone HTML file
 */
export function downloadHtmlBlob(htmlContent: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBasePrintStyles(): string {
  return `
    @page {
      size: A4;
      margin: 1.5cm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    .doc-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #0284c7;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .doc-subtitle {
      font-size: 14px;
      color: #475569;
      margin: 0 0 8px 0;
    }
    .doc-meta {
      font-size: 12px;
      color: #64748b;
    }
    .members-strip {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .strip-label {
      font-weight: 700;
      font-size: 12px;
      color: #334155;
    }
    .strip-items {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .member-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #0f172a;
    }
    .member-dot {
      width: 6px;
      height: 6px;
      background: #0284c7;
      border-radius: 50%;
    }
    .member-country {
      color: #64748b;
      font-size: 11px;
    }
    .category-section {
      margin-bottom: 22px;
      break-inside: avoid;
    }
    .category-title {
      font-size: 16px;
      font-weight: 700;
      color: #0369a1;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 0 0 10px 0;
    }
    .agreement-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .agreement-item {
      display: flex;
      gap: 8px;
      padding: 6px 0;
    }
    .agreement-item .num {
      font-weight: 700;
      color: #0284c7;
      width: 22px;
    }
    .agreement-item .content {
      flex: 1;
    }
    .agreement-item .text {
      margin: 0 0 2px 0;
      color: #1e293b;
    }
    .agreement-item .date {
      font-size: 11px;
      color: #94a3b8;
    }
    .doc-footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #cbd5e1;
      break-inside: avoid;
    }
    .footer-signatures {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .sig-block {
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px dashed #94a3b8;
      height: 36px;
      margin-bottom: 6px;
    }
    .sig-name {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .sig-role {
      display: block;
      font-size: 11px;
      color: #64748b;
    }
    .disclaimer {
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      margin: 0;
    }
    .empty-text {
      color: #94a3b8;
      font-style: italic;
      padding: 12px 0;
    }
  `;
}
