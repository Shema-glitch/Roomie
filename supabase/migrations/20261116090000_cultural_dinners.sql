-- ==============================================================================
-- ROOMIE MIGRATION: Cultural Dinners & Dietary Profile Sync
-- Multi-tenant cultural dinner hosting, RSVP management, dietary preferences,
-- length constraints, composite indexing, and multi-tenant RLS.
-- ==============================================================================

-- 1. PROFILES: Add dietary tags array
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] NOT NULL DEFAULT '{}';

-- 2. CULTURAL DINNERS TABLE
CREATE TABLE IF NOT EXISTS public.cultural_dinners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dish_title TEXT NOT NULL CHECK (char_length(dish_title) BETWEEN 1 AND 100),
  cuisine_tag TEXT NOT NULL CHECK (char_length(cuisine_tag) BETWEEN 1 AND 40),
  scheduled_date DATE NOT NULL,
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  rsvp_user_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Composite query index for windowed timeline fetching
CREATE INDEX IF NOT EXISTS idx_cultural_dinners_household_date
  ON public.cultural_dinners(household_id, scheduled_date DESC)
  WHERE deleted_at IS NULL;

-- Version & Updated trigger
DROP TRIGGER IF EXISTS trg_cultural_dinners_version ON public.cultural_dinners;
CREATE TRIGGER trg_cultural_dinners_version
  BEFORE UPDATE ON public.cultural_dinners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_and_version();

-- Multi-Tenant RLS Policies
ALTER TABLE public.cultural_dinners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cultural dinners viewable by household members" ON public.cultural_dinners;
DROP POLICY IF EXISTS "Cultural dinners insertable by household members" ON public.cultural_dinners;
DROP POLICY IF EXISTS "Cultural dinners updatable by household members" ON public.cultural_dinners;

CREATE POLICY "Cultural dinners viewable by household members" ON public.cultural_dinners
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Cultural dinners insertable by household members" ON public.cultural_dinners
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_household_member(household_id)
    AND host_user_id = (SELECT auth.uid())
  );

CREATE POLICY "Cultural dinners updatable by household members" ON public.cultural_dinners
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

-- 3. ATOMIC RSVP RPC
CREATE OR REPLACE FUNCTION public.toggle_cultural_dinner_rsvp(
  p_dinner_id UUID,
  p_household_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_rsvps UUID[];
  v_new_rsvps UUID[];
  v_is_attending BOOLEAN;
  v_dinner RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'Forbidden: Not a household member';
  END IF;

  SELECT * INTO v_dinner
  FROM public.cultural_dinners
  WHERE id = p_dinner_id
    AND household_id = p_household_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cultural dinner not found';
  END IF;

  v_current_rsvps := COALESCE(v_dinner.rsvp_user_ids, '{}');
  IF v_user_id = ANY(v_current_rsvps) THEN
    -- User is already RSVP'd; toggle off
    v_new_rsvps := array_remove(v_current_rsvps, v_user_id);
    v_is_attending := FALSE;
  ELSE
    -- User joins RSVP
    v_new_rsvps := array_append(v_current_rsvps, v_user_id);
    v_is_attending := TRUE;
  END IF;

  UPDATE public.cultural_dinners
  SET rsvp_user_ids = v_new_rsvps,
      updated_at = NOW()
  WHERE id = p_dinner_id;

  RETURN jsonb_build_object(
    'success', true,
    'dinner_id', p_dinner_id,
    'is_attending', v_is_attending,
    'rsvp_user_ids', v_new_rsvps
  );
END;
$$;
