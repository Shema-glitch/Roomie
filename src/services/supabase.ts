import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { debugLog } from '../utils/debugLog';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const SUPABASE_AUTH_STORAGE_KEY = 'roomie_sb_auth_token';

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Clears only the active local Supabase session key without calling POST /logout,
 * preserving saved refresh tokens for Instagram/Facebook-style 1-tap device quick login.
 */
export function clearLocalSupabaseSessionStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
  } catch {
    // ignore storage restriction
  }
}

/**
 * Prefixes private bucket object paths with `<householdId>/...` when a valid UUID is present
 * so household members share read access under storage RLS policies.
 */
export function buildScopedStoragePath(householdId: string | null | undefined, fileName: string): string {
  if (householdId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(householdId)) {
    return `${householdId}/${fileName}`;
  }
  return fileName;
}

/**
 * Upload a photo blob to Supabase Storage with graceful fallback to data URL.
 */
export async function uploadPhotoToStorage(
  bucket: 'receipts' | 'chore-proof' | 'snapshots' | 'avatars',
  fileName: string,
  blob: Blob,
  fallbackDataUrl?: string
): Promise<string> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!supabase) {
    debugLog.warn('storage', 'upload_photo', `Offline/unconfigured storage fallback for ${bucket}/${fileName}`, {
      bucket,
      sizeBytes: blob.size,
      mode: 'fallback_data_url',
    });
    return fallbackDataUrl || '';
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
      upsert: true,
      contentType: blob.type || 'image/jpeg',
    });

    if (error) {
      debugLog.warn('storage', 'upload_photo', `Storage upload fallback (${bucket}): ${error.message}`, {
        bucket,
        fileName,
        sizeBytes: blob.size,
        error: error.message,
      });
      return fallbackDataUrl || '';
    }

    if (bucket === 'avatars') {
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      const durationMs =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
      debugLog.info(
        'storage',
        'upload_photo',
        `Uploaded avatar (${Math.round(blob.size / 1024)} KB) -> public URL`,
        { bucket, path: data.path, sizeBytes: blob.size },
        durationMs
      );
      return pubData.publicUrl;
    }

    // For private buckets (receipts, chore-proof, snapshots), get a signed URL (valid for 1 year)
    const { data: signData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    if (signError || !signData) {
      debugLog.warn('storage', 'signed_url', `Signed URL fallback (${bucket}): ${signError?.message || 'empty'}`, {
        bucket,
        path: data.path,
      });
      return fallbackDataUrl || '';
    }

    const durationMs =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
    debugLog.info(
      'storage',
      'upload_photo',
      `Uploaded ${bucket}/${data.path} (${Math.round(blob.size / 1024)} KB) + signed URL`,
      { bucket, path: data.path, sizeBytes: blob.size },
      durationMs
    );
    return signData.signedUrl;
  } catch (err: any) {
    debugLog.error('storage', 'upload_photo', err?.message || 'Exception during photo upload', {
      bucket,
      fileName,
      sizeBytes: blob.size,
    });
    return fallbackDataUrl || '';
  }
}
