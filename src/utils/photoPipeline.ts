/**
 * Roomie Photo Pipeline
 * Matching Roomie Data Handling and Offline Spec (Section 9)
 * - Resizes images to max 1200px on long edge
 * - Compresses to JPEG/WebP (< 300 KB budget)
 * - Generates small ~200px thumbnail (< 20 KB budget)
 * - Completely client-side via canvas, zero external dependencies
 */

import { debugLog } from './debugLog';

export interface ProcessedPhoto {
  fullDataUrl: string;
  fullBlob: Blob;
  thumbnailDataUrl: string;
  thumbnailBlob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  contentHash?: string;
}

const photoHashCache = new Map<string, string>();

/**
 * Computes a fast hex hash of an image blob for egress deduplication.
 */
export async function computeBlobHash(blob: Blob): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(digest));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  return `${blob.size}_${blob.type}_${Date.now()}`;
}

export function getCachedUploadUrl(hash: string): string | undefined {
  if (!hash) return undefined;
  if (photoHashCache.has(hash)) return photoHashCache.get(hash);
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(`roomie_photo_hash_${hash}`) || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function setCachedUploadUrl(hash: string, url: string): void {
  if (!hash || !url) return;
  photoHashCache.set(hash, url);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`roomie_photo_hash_${hash}`, url);
    } catch {
      // ignore storage quota
    }
  }
}

export async function processPhoto(fileOrBlob: File | Blob): Promise<ProcessedPhoto> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const inputBytes = fileOrBlob.size;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      const err = new Error('Failed to read image file');
      debugLog.error('storage', 'compress_photo', err.message, { inputBytes });
      reject(err);
    };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        const err = new Error('Failed to decode image data');
        debugLog.error('storage', 'compress_photo', err.message, { inputBytes });
        reject(err);
      };
      img.onload = () => {
        try {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          // Full compressed image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Could not get canvas context'));
          }
          ctx.drawImage(img, 0, 0, width, height);
          const fullDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          // Thumbnail (~200px on long edge)
          const thumbMaxDim = 200;
          let thumbWidth = img.width;
          let thumbHeight = img.height;
          if (thumbWidth > thumbHeight) {
            thumbHeight = Math.round((thumbHeight * thumbMaxDim) / thumbWidth);
            thumbWidth = thumbMaxDim;
          } else {
            thumbWidth = Math.round((thumbWidth * thumbMaxDim) / thumbHeight);
            thumbHeight = thumbMaxDim;
          }

          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (!thumbCtx) {
            return reject(new Error('Could not get thumbnail canvas context'));
          }
          thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
          const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

          // Convert Data URLs to Blobs for background upload
          canvas.toBlob(
            (fullBlob) => {
              thumbCanvas.toBlob(
                (thumbnailBlob) => {
                  if (!fullBlob || !thumbnailBlob) {
                    const err = new Error('Canvas blob generation failed');
                    debugLog.error('storage', 'compress_photo', err.message, { inputBytes });
                    return reject(err);
                  }
                  const durationMs =
                    (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
                  debugLog.info(
                    'storage',
                    'compress_photo',
                    `Compressed ${Math.round(inputBytes / 1024)} KB -> ${Math.round(fullBlob.size / 1024)} KB (${width}x${height})`,
                    {
                      inputBytes,
                      outputBytes: fullBlob.size,
                      thumbBytes: thumbnailBlob.size,
                      width,
                      height,
                    },
                    durationMs
                  );
                  computeBlobHash(fullBlob).then((contentHash) => {
                    resolve({
                      fullDataUrl,
                      fullBlob,
                      thumbnailDataUrl,
                      thumbnailBlob,
                      width,
                      height,
                      sizeBytes: fullBlob.size,
                      contentHash,
                    });
                  }).catch(() => {
                    resolve({
                      fullDataUrl,
                      fullBlob,
                      thumbnailDataUrl,
                      thumbnailBlob,
                      width,
                      height,
                      sizeBytes: fullBlob.size,
                    });
                  });
                },
                'image/jpeg',
                0.7
              );
            },
            'image/jpeg',
            0.82
          );
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
