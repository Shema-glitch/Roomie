/**
 * Roomie Zero-Dependency HTML5 Canvas Story Exporter
 * Generates a high-definition 1080x1920 (9:16 Instagram/WhatsApp story) celebration card
 * strictly devoid of any monetary figures, financial debts, or private user IDs.
 */

import { RoomieWrappedMetrics } from '../types';
import { debugLog } from './debugLog';

export interface ShareCardOptions {
  metrics: RoomieWrappedMetrics;
  householdName?: string;
  semesterLabel?: string;
}

/**
 * Draws rounded rectangle path on CanvasRenderingContext2D
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Generates an offscreen 1080x1920 story card as a PNG Blob.
 */
export async function generateShareCardBlob(options: ShareCardOptions): Promise<Blob> {
  const { metrics, householdName = 'Our Sunny Flat', semesterLabel = 'Fall Semester 2026' } = options;

  const width = 1080;
  const height = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Background Gradient (Roomie Brand Palette: Warm Coral -> Emerald Teal)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FF6B4A'); // Roomie Coral
  bgGrad.addColorStop(0.45, '#E25536');
  bgGrad.addColorStop(0.75, '#149B8D');
  bgGrad.addColorStop(1, '#0E7A6E'); // Deep Teal
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative ambient circles
  ctx.fillStyle = 'rgba(255, 201, 60, 0.12)'; // Gold ambient
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.15, 340, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(25, 181, 165, 0.18)'; // Teal ambient
  ctx.beginPath();
  ctx.arc(width * 0.15, height * 0.75, 420, 0, Math.PI * 2);
  ctx.fill();

  // 2. Header Pill (Top)
  const pillY = 160;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  roundRect(ctx, width / 2 - 240, pillY, 480, 72, 36);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ ROOMIE RECAP · B-LABS ✨', width / 2, pillY + 48);

  // 3. Main Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 76px system-ui, -apple-system, sans-serif';
  ctx.fillText(householdName, width / 2, 330);

  ctx.fillStyle = '#FFE5B4';
  ctx.font = '600 36px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${semesterLabel} Milestones`, width / 2, 390);

  // 4. Central Stat Feature Card (Harmony Score)
  const cardX = 90;
  const cardW = width - cardX * 2; // 900px wide
  const harmonyCardY = 460;
  const harmonyCardH = 340;

  // Outer border & shadow
  ctx.fillStyle = '#1F2430'; // Dark Slate Base
  roundRect(ctx, cardX, harmonyCardY, cardW, harmonyCardH, 44);
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#FFC93C'; // Gold accent border
  roundRect(ctx, cardX, harmonyCardY, cardW, harmonyCardH, 44);
  ctx.stroke();

  // Harmony title
  ctx.fillStyle = '#A0AEC0';
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FLAT HARMONY RATING', width / 2, harmonyCardY + 80);

  // Score highlight
  ctx.fillStyle = '#FFC93C';
  ctx.font = '900 130px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${metrics.flatHarmonyScore}%`, width / 2, harmonyCardY + 215);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 32px system-ui, -apple-system, sans-serif';
  ctx.fillText('Peaceful & Unified Apartment Living', width / 2, harmonyCardY + 285);

  // 5. Grid of 4 Milestones
  const gridY = 850;
  const colGap = 36;
  const colW = (cardW - colGap) / 2; // 432px each
  const rowH = 260;
  const rowGap = 30;

  interface GridTile {
    x: number;
    y: number;
    label: string;
    value: string;
    subtitle: string;
    accentColor: string;
  }

  const tiles: GridTile[] = [
    {
      x: cardX,
      y: gridY,
      label: 'CHORES COMPLETED',
      value: `${metrics.totalChoresTogether}+`,
      subtitle: 'Team effort tasks',
      accentColor: '#34D399', // Emerald
    },
    {
      x: cardX + colW + colGap,
      y: gridY,
      label: 'PEACEFUL STREAK',
      value: `${metrics.disputeFreeStreakDays}d`,
      subtitle: 'Zero bill disputes',
      accentColor: '#60A5FA', // Sky Blue
    },
    {
      x: cardX,
      y: gridY + rowH + rowGap,
      label: 'TOP FLAT CHEF',
      value: metrics.topChefName || 'Housemate',
      subtitle: `${metrics.culturalDinnersHosted} dinners shared`,
      accentColor: '#F59E0B', // Amber
    },
    {
      x: cardX + colW + colGap,
      y: gridY + rowH + rowGap,
      label: 'MOST APPRECIATED',
      value: metrics.mostAppreciatedFlatmateName || 'Roomie',
      subtitle: `${metrics.totalKudosExchanged} kudos received`,
      accentColor: '#F472B6', // Rose
    },
  ];

  tiles.forEach((tile) => {
    // Tile Background
    ctx.fillStyle = 'rgba(31, 36, 48, 0.92)';
    roundRect(ctx, tile.x, tile.y, colW, rowH, 36);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = tile.accentColor;
    roundRect(ctx, tile.x, tile.y, colW, rowH, 36);
    ctx.stroke();

    ctx.textAlign = 'center';
    const tileCenterX = tile.x + colW / 2;

    // Tile Label
    ctx.fillStyle = '#A0AEC0';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(tile.label, tileCenterX, tile.y + 60);

    // Tile Value
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 60px system-ui, -apple-system, sans-serif';
    ctx.fillText(tile.value, tileCenterX, tile.y + 145);

    // Tile Subtitle
    ctx.fillStyle = tile.accentColor;
    ctx.font = '600 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(tile.subtitle, tileCenterX, tile.y + 205);
  });

  // 6. Highlight Banner Card
  const bannerY = 1460;
  const bannerH = 180;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  roundRect(ctx, cardX, bannerY, cardW, bannerH, 36);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  roundRect(ctx, cardX, bannerY, cardW, bannerH, 36);
  ctx.stroke();

  ctx.fillStyle = '#FFC93C';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STANDOUT APARTMENT HONOR', width / 2, bannerY + 65);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(`🏆 ${metrics.topAwardTitle || 'Supreme Clean Team'}`, width / 2, bannerY + 130);

  // 7. Footer Branding
  const footerY = 1760;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Roomie · Stress-Free Flatmate Living', width / 2, footerY);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '500 26px system-ui, -apple-system, sans-serif';
  ctx.fillText('No drama. Fair splits. Clean home.', width / 2, footerY + 50);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create PNG blob from canvas'));
      }
    }, 'image/png');
  });
}

/**
 * Triggers native Web Share API (Android WebView / Capacitor) with PNG file,
 * falling back seamlessly to an automatic browser download.
 */
export async function shareRoomieStoryCard(options: ShareCardOptions): Promise<boolean> {
  try {
    const blob = await generateShareCardBlob(options);
    const fileName = `roomie-wrapped-${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `${options.householdName || 'Our Flat'} · Roomie Wrapped`,
        text: 'Check out our flat milestones this semester on Roomie! 🏠✨',
        files: [file],
      });
      debugLog.info('social', 'share_card_shared', 'Shared wrapped story card via Web Share API');
      return true;
    }

    // Fallback: Automatic download link
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    debugLog.info('social', 'share_card_downloaded', 'Downloaded wrapped story card PNG fallback');
    return true;
  } catch (err: unknown) {
    debugLog.warn('social', 'share_card_error', 'Error sharing story card', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
