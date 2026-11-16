-- ==============================================================================
-- ROOMIE MIGRATION: Social Rituals (Anonymous Vibe Pulses, Favor Tokens & Chore Swaps)
-- Enforces k-anonymity (min 3 responses), MAX_FAVOR_TOKENS = 10 anti-hoarding cap,
-- multi-tenant Row-Level Security (RLS), and atomic row-locked RPCs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VIBE PULSES (Strictly Anonymous — Zero user_id storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vibe_pulses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start DATE NOT NULL DEFAULT CURRENT_DATE,
  week_key TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'IYYY-"W"IW'),
  rating TEXT NOT NULL DEFAULT 'chill' CHECK (rating IN ('fire', 'chill', 'meh', 'stressed', 'down')),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.vibe_pulses
  ADD COLUMN IF NOT EXISTS week_key TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'IYYY-"W"IW'),
  ADD COLUMN IF NOT EXISTS rating TEXT NOT NULL DEFAULT 'chill';

CREATE INDEX IF NOT EXISTS idx_vibe_pulses_household_week
  ON public.vibe_pulses(household_id, week_key)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_vibe_pulses_version ON public.vibe_pulses;
CREATE TRIGGER trg_vibe_pulses_version
  BEFORE UPDATE ON public.vibe_pulses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_and_version();

ALTER TABLE public.vibe_pulses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vibe pulses viewable by members" ON public.vibe_pulses;
DROP POLICY IF EXISTS "Vibe pulses viewable when k-anonymity threshold met" ON public.vibe_pulses;
DROP POLICY IF EXISTS "Vibe pulses insertable by members" ON public.vibe_pulses;

-- k-anonymity RLS guard: individual rows are only selectable once >= 3 pulses exist for that household & week
CREATE POLICY "Vibe pulses viewable when k-anonymity threshold met" ON public.vibe_pulses
  FOR SELECT TO authenticated
  USING (
    public.is_household_member(household_id)
    AND (
      SELECT COUNT(*)
      FROM public.vibe_pulses vp
      WHERE vp.household_id = public.vibe_pulses.household_id
        AND vp.week_key = public.vibe_pulses.week_key
        AND vp.deleted_at IS NULL
    ) >= 3
  );

CREATE POLICY "Vibe pulses insertable by members" ON public.vibe_pulses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

-- ------------------------------------------------------------------------------
-- 2. FAVOR TOKENS (Social Currency with Hard Anti-Hoarding Cap = 10)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favor_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 5 CHECK (balance >= 0 AND balance <= 10),
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_favor_tokens_household_user
  ON public.favor_tokens(household_id, user_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_favor_tokens_version ON public.favor_tokens;
CREATE TRIGGER trg_favor_tokens_version
  BEFORE UPDATE ON public.favor_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_and_version();

ALTER TABLE public.favor_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Favor tokens viewable by members" ON public.favor_tokens;
DROP POLICY IF EXISTS "Favor tokens insertable by owner" ON public.favor_tokens;
DROP POLICY IF EXISTS "Favor tokens updatable by owner" ON public.favor_tokens;

CREATE POLICY "Favor tokens viewable by members" ON public.favor_tokens
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Favor tokens insertable by owner" ON public.favor_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_household_member(household_id)
  );

CREATE POLICY "Favor tokens updatable by owner" ON public.favor_tokens
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.is_household_member(household_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_household_member(household_id)
    AND balance >= 0
    AND balance <= 10
  );

-- ------------------------------------------------------------------------------
-- 3. CHORE SWAP REQUESTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chore_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_chore_name TEXT NOT NULL,
  target_chore_name TEXT NOT NULL DEFAULT 'Chore Duty',
  token_cost INTEGER NOT NULL DEFAULT 1 CHECK (token_cost BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_chore_swap_requests_household_status
  ON public.chore_swap_requests(household_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chore_swap_requests_target_pending
  ON public.chore_swap_requests(target_user_id, status)
  WHERE status = 'pending' AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_chore_swap_requests_version ON public.chore_swap_requests;
CREATE TRIGGER trg_chore_swap_requests_version
  BEFORE UPDATE ON public.chore_swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_and_version();

ALTER TABLE public.chore_swap_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chore swap requests viewable by members" ON public.chore_swap_requests;
DROP POLICY IF EXISTS "Chore swap requests insertable by requester" ON public.chore_swap_requests;
DROP POLICY IF EXISTS "Chore swap requests updatable by participants" ON public.chore_swap_requests;

CREATE POLICY "Chore swap requests viewable by members" ON public.chore_swap_requests
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Chore swap requests insertable by requester" ON public.chore_swap_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_user_id = (SELECT auth.uid())
    AND public.is_household_member(household_id)
  );

CREATE POLICY "Chore swap requests updatable by participants" ON public.chore_swap_requests
  FOR UPDATE TO authenticated
  USING (
    (target_user_id = (SELECT auth.uid()) OR requester_user_id = (SELECT auth.uid()))
    AND public.is_household_member(household_id)
  )
  WITH CHECK (
    (target_user_id = (SELECT auth.uid()) OR requester_user_id = (SELECT auth.uid()))
    AND public.is_household_member(household_id)
  );

-- ------------------------------------------------------------------------------
-- 4. ATOMIC RPC: submit_anonymous_vibe
-- Inserts an unlinked anonymous pulse and returns aggregate summary only when count >= 3
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_anonymous_vibe(
  p_household_id UUID,
  p_week_key TEXT,
  p_rating TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_score INTEGER;
  v_count INTEGER;
  v_avg NUMERIC(4, 1);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'Active household membership required';
  END IF;

  v_score := CASE p_rating
    WHEN 'fire' THEN 5
    WHEN 'chill' THEN 4
    WHEN 'meh' THEN 3
    WHEN 'stressed' THEN 2
    WHEN 'down' THEN 1
    ELSE NULL
  END;

  IF v_score IS NULL THEN
    RAISE EXCEPTION 'Invalid vibe rating: %', p_rating;
  END IF;

  INSERT INTO public.vibe_pulses (household_id, week_start, week_key, rating, score)
  VALUES (p_household_id, CURRENT_DATE, p_week_key, p_rating, v_score);

  SELECT COUNT(*), ROUND(AVG(score)::numeric, 1)
  INTO v_count, v_avg
  FROM public.vibe_pulses
  WHERE household_id = p_household_id
    AND week_key = p_week_key
    AND deleted_at IS NULL;

  IF v_count < 3 THEN
    RETURN jsonb_build_object(
      'householdId', p_household_id,
      'weekKey', p_week_key,
      'submissionCount', v_count,
      'revealed', false,
      'minRequired', 3
    );
  END IF;

  RETURN jsonb_build_object(
    'householdId', p_household_id,
    'weekKey', p_week_key,
    'submissionCount', v_count,
    'revealed', true,
    'minRequired', 3,
    'averageScore', v_avg
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_anonymous_vibe(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_anonymous_vibe(UUID, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC RPC: resolve_chore_swap
-- Row-locks swap request & token balances, prevents double-spend, enforces MAX_FAVOR_TOKENS = 10
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_chore_swap(
  p_request_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_req public.chore_swap_requests%ROWTYPE;
  v_req_balance INTEGER;
  v_target_balance INTEGER;
  v_new_target_balance INTEGER;
  v_overflow_kudos INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  SELECT *
  INTO v_req
  FROM public.chore_swap_requests
  WHERE id = p_request_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Swap request not found');
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Swap request already resolved');
  END IF;

  IF v_uid <> v_req.target_user_id AND v_uid <> v_req.requester_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to resolve this swap');
  END IF;

  IF p_action = 'decline' THEN
    UPDATE public.chore_swap_requests
    SET status = 'declined'
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'declined',
      'transferred', false
    );
  END IF;

  -- Ensure both participants have favor_tokens rows initialized (default 5)
  INSERT INTO public.favor_tokens (household_id, user_id, balance)
  VALUES
    (v_req.household_id, v_req.requester_user_id, 5),
    (v_req.household_id, v_req.target_user_id, 5)
  ON CONFLICT (household_id, user_id) DO NOTHING;

  SELECT balance INTO v_req_balance
  FROM public.favor_tokens
  WHERE household_id = v_req.household_id AND user_id = v_req.requester_user_id
  FOR UPDATE;

  SELECT balance INTO v_target_balance
  FROM public.favor_tokens
  WHERE household_id = v_req.household_id AND user_id = v_req.target_user_id
  FOR UPDATE;

  IF v_req_balance < v_req.token_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requester has insufficient favor tokens');
  END IF;

  v_new_target_balance := LEAST(10, v_target_balance + v_req.token_cost);
  v_overflow_kudos := GREATEST(0, (v_target_balance + v_req.token_cost) - 10);

  UPDATE public.favor_tokens
  SET
    balance = v_req_balance - v_req.token_cost,
    history = history || jsonb_build_array(
      jsonb_build_object(
        'type', 'spend',
        'amount', v_req.token_cost,
        'reason', 'chore_swap',
        'requestId', v_req.id,
        'createdAt', NOW()
      )
    )
  WHERE household_id = v_req.household_id AND user_id = v_req.requester_user_id;

  UPDATE public.favor_tokens
  SET
    balance = v_new_target_balance,
    history = history || jsonb_build_array(
      jsonb_build_object(
        'type', 'earn',
        'amount', v_new_target_balance - v_target_balance,
        'overflowKudos', v_overflow_kudos,
        'reason', 'chore_swap',
        'requestId', v_req.id,
        'createdAt', NOW()
      )
    )
  WHERE household_id = v_req.household_id AND user_id = v_req.target_user_id;

  UPDATE public.chore_swap_requests
  SET status = 'accepted'
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'accepted',
    'transferred', true,
    'requesterBalance', v_req_balance - v_req.token_cost,
    'targetBalance', v_new_target_balance,
    'overflowConvertedToKudos', v_overflow_kudos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_chore_swap(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_chore_swap(UUID, TEXT) TO authenticated;
