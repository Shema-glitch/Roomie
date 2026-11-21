import { supabase } from './supabase';
import { validateEmail } from '../utils/authValidation';
import { debugLog } from '../utils/debugLog';
import type { SupportedLanguage } from '../i18n/types';

export type WaitlistPlatform = 'ios' | 'android' | 'web';

export interface WaitlistSignupPayload {
  email: string;
  platform: WaitlistPlatform;
  cityOrUniversity?: string;
  flatmateCount: number;
  locale: SupportedLanguage;
}

export type WaitlistSubmitResult =
  | { ok: true; status: 'created' | 'already_registered' }
  | { ok: false; error: string };

/**
 * Submits an early-access waitlist signup to Supabase `public.waitlist`.
 * Uses insert-only RLS and handles Postgres unique violation (23505) as a friendly already-registered state.
 */
export async function submitWaitlistSignup(
  payload: WaitlistSignupPayload
): Promise<WaitlistSubmitResult> {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.valid) {
    return { ok: false, error: emailCheck.error || 'Please enter a valid email address.' };
  }

  const clampedFlatmates = Math.min(20, Math.max(1, Math.round(payload.flatmateCount || 3)));
  const cleanedCity = (payload.cityOrUniversity || '').trim().slice(0, 120);

  if (!supabase) {
    // Graceful local offline/unconfigured fallback so preview environments still work smoothly
    try {
      const key = 'roomie_local_waitlist';
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      const existing: string[] = raw ? JSON.parse(raw) : [];
      if (existing.includes(normalizedEmail)) {
        return { ok: true, status: 'already_registered' };
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify([...existing, normalizedEmail]));
      }
      return { ok: true, status: 'created' };
    } catch {
      return { ok: true, status: 'created' };
    }
  }

  try {
    const { error } = await supabase.from('waitlist').insert({
      email: normalizedEmail,
      platform: payload.platform,
      city_or_university: cleanedCity,
      flatmate_count: clampedFlatmates,
      locale: payload.locale,
    });

    if (!error) {
      return { ok: true, status: 'created' };
    }

    if (error.code === '23505') {
      return { ok: true, status: 'already_registered' };
    }

    debugLog.warn('auth', 'waitlist_insert_error', error.message, { code: error.code });
    return { ok: false, error: 'Could not save your signup right now. Please try again.' };
  } catch (err) {
    debugLog.warn(
      'auth',
      'waitlist_insert_exception',
      err instanceof Error ? err.message : 'Waitlist signup failed'
    );
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}
