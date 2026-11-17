-- ==============================================================================
-- ROOMIE: App Releases Metadata & Public APK Storage Bucket
-- Enables in-app "Update Available" prompts without Play Store or USB/Bluetooth.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'web')),
  version_name TEXT NOT NULL,
  version_code INTEGER NOT NULL CHECK (version_code > 0),
  download_url TEXT NOT NULL DEFAULT '',
  release_notes TEXT NOT NULL DEFAULT '',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_releases_platform_active
  ON public.app_releases (platform, is_active, version_code DESC);

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.app_releases TO anon, authenticated;

DROP POLICY IF EXISTS "Active app releases readable by everyone" ON public.app_releases;
CREATE POLICY "Active app releases readable by everyone" ON public.app_releases
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Public storage bucket for hosted Roomie APK files (service-role write, public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('releases', 'releases', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Roomie releases public read" ON storage.objects;
CREATE POLICY "Roomie releases public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'releases');

-- Seed current baseline version (no download prompt fires until a higher version_code with download_url is added)
INSERT INTO public.app_releases (platform, version_name, version_code, download_url, release_notes, is_mandatory, is_active)
SELECT 'android', '2.1.0', 210, '', 'Current Roomie release.', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_releases WHERE platform = 'android' AND version_code = 210
);
