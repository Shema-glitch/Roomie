-- ==============================================================================
-- ROOMIE PHASE 4A: Tenant Transition, Move-Out Inspection & Deposit Return
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.move_out_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  move_in_snapshot_id uuid REFERENCES public.move_in_snapshots(id) ON DELETE SET NULL,
  room_name text NOT NULL CHECK (char_length(room_name) <= 60),
  condition_note text NOT NULL CHECK (char_length(condition_note) <= 1000),
  photo_urls text[] DEFAULT '{}'::text[],
  is_damage_reported boolean NOT NULL DEFAULT false,
  damage_deduction_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (damage_deduction_amount >= 0),
  deposit_paid_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (deposit_paid_amount >= 0),
  deposit_refund_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (deposit_refund_amount >= 0),
  confirmed_by_user_ids uuid[] DEFAULT '{}'::uuid[],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'agreed', 'settled')),
  settlement_expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT move_out_no_id_docs CHECK (
    condition_note !~* '(passport|identity card|id card|national id|kimlik|tckn|ikamet)' AND
    room_name !~* '(passport|identity card|id card|national id|kimlik|tckn|ikamet)'
  )
);

CREATE INDEX IF NOT EXISTS idx_move_out_inspections_household_created 
  ON public.move_out_inspections (household_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_move_out_inspections_user_created 
  ON public.move_out_inspections (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Enable Row-Level Security
ALTER TABLE public.move_out_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view household move_out_inspections"
  ON public.move_out_inspections
  FOR SELECT
  USING (
    household_id IN (
      SELECT m.household_id FROM public.memberships m 
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE POLICY "Members create household move_out_inspections"
  ON public.move_out_inspections
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT m.household_id FROM public.memberships m 
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

CREATE POLICY "Members update household move_out_inspections"
  ON public.move_out_inspections
  FOR UPDATE
  USING (
    household_id IN (
      SELECT m.household_id FROM public.memberships m 
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

-- Atomic confirmation RPC
CREATE OR REPLACE FUNCTION public.confirm_move_out_inspection(
  p_inspection_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_household_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT household_id INTO v_household_id
  FROM public.move_out_inspections
  WHERE id = p_inspection_id AND deleted_at IS NULL;

  IF v_household_id IS NULL THEN
    RETURN false;
  END IF;

  -- Ensure caller is an active member
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE household_id = v_household_id AND user_id = v_caller_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User not active member of this household';
  END IF;

  UPDATE public.move_out_inspections
  SET confirmed_by_user_ids = array_append(
    array_remove(confirmed_by_user_ids, v_caller_id),
    v_caller_id
  ),
  updated_at = now()
  WHERE id = p_inspection_id;

  RETURN true;
END;
$$;
