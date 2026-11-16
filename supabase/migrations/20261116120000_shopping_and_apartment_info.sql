-- ==============================================================================
-- ROOMIE MIGRATION: Shared Shopping List & Members-Only Apartment Info
-- Multi-tenant shopping checklist with running-low tags, supermarket ping,
-- and members-only apartment Wi-Fi & utilities info card.
-- ==============================================================================

-- 1. SHARED SHOPPING LIST
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  category TEXT NOT NULL DEFAULT 'groceries' CHECK (category IN ('groceries', 'household', 'cleaning', 'pantry', 'other')),
  quantity_label TEXT NOT NULL DEFAULT '' CHECK (char_length(quantity_label) <= 30),
  is_low BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'in_cart', 'purchased')),
  added_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Ensure all columns exist if table previously existed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_items' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_items' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.shopping_items RENAME COLUMN name TO title;
  END IF;
END $$;

ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Item' CHECK (char_length(title) BETWEEN 1 AND 80),
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'groceries' CHECK (category IN ('groceries', 'household', 'cleaning', 'pantry', 'other')),
  ADD COLUMN IF NOT EXISTS quantity_label TEXT NOT NULL DEFAULT '' CHECK (char_length(quantity_label) <= 30),
  ADD COLUMN IF NOT EXISTS is_low BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'in_cart', 'purchased')),
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Composite query index for windowed shopping list retrieval
CREATE INDEX IF NOT EXISTS idx_shopping_items_household_status
  ON public.shopping_items(household_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- Version & Updated trigger
DROP TRIGGER IF EXISTS trg_shopping_items_version ON public.shopping_items;
CREATE TRIGGER trg_shopping_items_version
  BEFORE UPDATE ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_and_version();

-- Multi-tenant RLS for shopping items
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shopping items viewable by household members" ON public.shopping_items;
DROP POLICY IF EXISTS "Shopping items insertable by household members" ON public.shopping_items;
DROP POLICY IF EXISTS "Shopping items updatable by household members" ON public.shopping_items;
DROP POLICY IF EXISTS "Shopping items deletable by household members" ON public.shopping_items;

CREATE POLICY "Shopping items viewable by household members" ON public.shopping_items
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Shopping items insertable by household members" ON public.shopping_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_household_member(household_id)
    AND added_by = (SELECT auth.uid())
  );

CREATE POLICY "Shopping items updatable by household members" ON public.shopping_items
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Shopping items deletable by household members" ON public.shopping_items
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- 2. MEMBERS-ONLY APARTMENT INFO & WI-FI CARD
CREATE TABLE IF NOT EXISTS public.household_info_cards (
  household_id UUID PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  wifi_ssid TEXT NOT NULL DEFAULT '' CHECK (char_length(wifi_ssid) <= 100),
  wifi_password TEXT NOT NULL DEFAULT '' CHECK (char_length(wifi_password) <= 100),
  trash_schedule TEXT NOT NULL DEFAULT '' CHECK (char_length(trash_schedule) <= 250),
  delivery_address TEXT NOT NULL DEFAULT '' CHECK (char_length(delivery_address) <= 300),
  emergency_note TEXT NOT NULL DEFAULT '' CHECK (char_length(emergency_note) <= 300),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT no_identity_documents CHECK (
    NOT (delivery_address ~* '(passport|national[ _-]?id|visa[ _-]?num|ssn|social security)' OR
         emergency_note ~* '(passport|national[ _-]?id|visa[ _-]?num|ssn|social security)')
  )
);

-- Version trigger for info cards
DROP TRIGGER IF EXISTS trg_household_info_cards_version ON public.household_info_cards;
CREATE TRIGGER trg_household_info_cards_version
  BEFORE UPDATE ON public.household_info_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_and_version();

-- Strict RLS: visible strictly to active household members (never pending join requests)
ALTER TABLE public.household_info_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apartment info viewable by active members only" ON public.household_info_cards;
DROP POLICY IF EXISTS "Apartment info insertable by active members" ON public.household_info_cards;
DROP POLICY IF EXISTS "Apartment info updatable by active members" ON public.household_info_cards;

CREATE POLICY "Apartment info viewable by active members only" ON public.household_info_cards
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Apartment info insertable by active members" ON public.household_info_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Apartment info updatable by active members" ON public.household_info_cards
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));
