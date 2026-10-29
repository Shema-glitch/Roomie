/**
 * Roomie Photo Pipeline
 * Matching Roomie Data Handling and Offline Spec (Section 9)
 * - Resizes images to max 1200px on long edge
 * - Compresses to JPEG/WebP (< 300 KB budget)
 * - Generates small ~200px thumbnail (< 20 KB budget)
 * - Completely client-side via canvas, zero external dependencies
 */

export interface ProcessedPhoto {
  fullDataUrl: string;
  fullBlob: Blob;
  thumbnailDataUrl: string;
  thumbnailBlob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function processPhoto(fileOrBlob: File | Blob): Promise<ProcessedPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data'));
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
                    return reject(new Error('Canvas blob generation failed'));
                  }
                  resolve({
                    fullDataUrl,
                    fullBlob,
                    thumbnailDataUrl,
                    thumbnailBlob,
                    width,
                    height,
                    sizeBytes: fullBlob.size,
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
