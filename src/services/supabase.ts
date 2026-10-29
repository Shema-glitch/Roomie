import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Upload a photo blob to Supabase Storage with graceful fallback to data URL.
 */
export async function uploadPhotoToStorage(
  bucket: 'receipts' | 'chore-proof' | 'snapshots' | 'avatars',
  fileName: string,
  blob: Blob,
  fallbackDataUrl?: string
): Promise<string> {
  if (!supabase) {
    return fallbackDataUrl || '';
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
      upsert: true,
      contentType: blob.type || 'image/jpeg',
    });

    if (error) {
      console.warn('Storage upload error, falling back:', error.message);
      return fallbackDataUrl || '';
    }

    if (bucket === 'avatars') {
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return pubData.publicUrl;
    }

    // For private buckets (receipts, chore-proof, snapshots), get a signed URL (valid for 1 year)
    const { data: signData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    if (signError || !signData) {
      return fallbackDataUrl || '';
    }

    return signData.signedUrl;
  } catch (err) {
    console.warn('Exception during photo upload:', err);
    return fallbackDataUrl || '';
  }
}
