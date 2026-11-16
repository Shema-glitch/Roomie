-- ==============================================================================
-- ROOMIE MIGRATION: Phase 3 Flat Tools
-- 1. Recurring Rent & Bills Templates
-- 2. Move-In Condition Snapshots & Room Inventory
-- 3. Landlord Profiles & Maintenance Issues Hub
-- ==============================================================================

-- 1. RECURRING RENT & BILLS
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Bill' CHECK (char_length(title) BETWEEN 1 AND 80),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('rent', 'wifi', 'utilities', 'other')),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'TRY',
  due_day INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
  split_rule TEXT NOT NULL DEFAULT 'equal' CHECK (split_rule IN ('equal', 'percentage', 'custom')),
  custom_splits JSONB NOT NULL DEFAULT '[]'::jsonb,
  paid_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_generated_cycle TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Ensure all columns exist if table previously existed
ALTER TABLE public.recurring_bills
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Bill',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS due_day INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS split_rule TEXT NOT NULL DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS custom_splits JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS paid_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_generated_cycle TEXT NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_bills_household_active
  ON public.recurring_bills(household_id, active, due_day)
  WHERE deleted_at IS NULL;

ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recurring bills viewable by household members" ON public.recurring_bills;
DROP POLICY IF EXISTS "Recurring bills insertable by household members" ON public.recurring_bills;
DROP POLICY IF EXISTS "Recurring bills updatable by household members" ON public.recurring_bills;
DROP POLICY IF EXISTS "Recurring bills deletable by household members" ON public.recurring_bills;

CREATE POLICY "Recurring bills viewable by household members" ON public.recurring_bills
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Recurring bills insertable by household members" ON public.recurring_bills
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Recurring bills updatable by household members" ON public.recurring_bills
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Recurring bills deletable by household members" ON public.recurring_bills
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));


-- 2. MOVE-IN CONDITION SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.move_in_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL CHECK (char_length(room_name) BETWEEN 1 AND 60),
  condition_note TEXT NOT NULL DEFAULT '' CHECK (char_length(condition_note) <= 400),
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_by_user_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.move_in_snapshots
  ADD COLUMN IF NOT EXISTS room_name TEXT NOT NULL DEFAULT 'General Area',
  ADD COLUMN IF NOT EXISTS condition_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_by_user_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_move_in_snapshots_household
  ON public.move_in_snapshots(household_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.move_in_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Move-in snapshots viewable by household members" ON public.move_in_snapshots;
DROP POLICY IF EXISTS "Move-in snapshots insertable by household members" ON public.move_in_snapshots;
DROP POLICY IF EXISTS "Move-in snapshots updatable by household members" ON public.move_in_snapshots;
DROP POLICY IF EXISTS "Move-in snapshots deletable by household members" ON public.move_in_snapshots;

CREATE POLICY "Move-in snapshots viewable by household members" ON public.move_in_snapshots
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Move-in snapshots insertable by household members" ON public.move_in_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Move-in snapshots updatable by household members" ON public.move_in_snapshots
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Move-in snapshots deletable by household members" ON public.move_in_snapshots
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));


-- 3. LANDLORD PROFILES & MAINTENANCE ISSUES
CREATE TABLE IF NOT EXISTS public.landlord_profiles (
  household_id UUID PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  landlord_name TEXT NOT NULL CHECK (char_length(landlord_name) BETWEEN 1 AND 80),
  role_label TEXT NOT NULL DEFAULT 'Landlord' CHECK (char_length(role_label) <= 40),
  phone_or_whatsapp TEXT NOT NULL DEFAULT '' CHECK (char_length(phone_or_whatsapp) <= 50),
  emergency_note TEXT NOT NULL DEFAULT '' CHECK (char_length(emergency_note) <= 300),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT no_identity_documents CHECK (
    NOT (landlord_name ~* '(passport|national[ _-]?id|visa[ _-]?num|ssn|social security)' OR
         emergency_note ~* '(passport|national[ _-]?id|visa[ _-]?num|ssn|social security)')
  )
);

ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlord profiles viewable by household members" ON public.landlord_profiles;
DROP POLICY IF EXISTS "Landlord profiles insertable by household members" ON public.landlord_profiles;
DROP POLICY IF EXISTS "Landlord profiles updatable by household members" ON public.landlord_profiles;

CREATE POLICY "Landlord profiles viewable by household members" ON public.landlord_profiles
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Landlord profiles insertable by household members" ON public.landlord_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Landlord profiles updatable by household members" ON public.landlord_profiles
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));


CREATE TABLE IF NOT EXISTS public.maintenance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'notified_landlord', 'fixed')),
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT no_identity_documents CHECK (
    NOT (title ~* '(passport|national[ _-]?id|visa[ _-]?num|ssn|social security)' OR
         description ~* '(passport|national[ _-]?id|visa[ _-]?num|ssn|social security)')
  )
);

ALTER TABLE public.maintenance_issues
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Issue',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'reported',
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_issues_household_status
  ON public.maintenance_issues(household_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maintenance issues viewable by household members" ON public.maintenance_issues;
DROP POLICY IF EXISTS "Maintenance issues insertable by household members" ON public.maintenance_issues;
DROP POLICY IF EXISTS "Maintenance issues updatable by household members" ON public.maintenance_issues;
DROP POLICY IF EXISTS "Maintenance issues deletable by household members" ON public.maintenance_issues;

CREATE POLICY "Maintenance issues viewable by household members" ON public.maintenance_issues
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Maintenance issues insertable by household members" ON public.maintenance_issues
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Maintenance issues updatable by household members" ON public.maintenance_issues
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Maintenance issues deletable by household members" ON public.maintenance_issues
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));
