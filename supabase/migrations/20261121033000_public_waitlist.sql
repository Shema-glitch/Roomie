-- ==============================================================================
-- ROOMIE: Public Waitlist Signups (Early Access, iOS TestFlight & Release Alerts)
-- Strict insert-only RLS so public visitors cannot read/enumerate emails.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL CHECK (char_length(trim(email)) BETWEEN 5 AND 254),
  platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('ios', 'android', 'web')),
  city_or_university TEXT NOT NULL DEFAULT '' CHECK (char_length(city_or_university) <= 120),
  flatmate_count INTEGER NOT NULL DEFAULT 3 CHECK (flatmate_count BETWEEN 1 AND 20),
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'tr', 'fr', 'ar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_lower
  ON public.waitlist (lower(trim(email)));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.waitlist FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.waitlist TO anon, authenticated;

DROP POLICY IF EXISTS "Public waitlist signup insert only" ON public.waitlist;
CREATE POLICY "Public waitlist signup insert only" ON public.waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
