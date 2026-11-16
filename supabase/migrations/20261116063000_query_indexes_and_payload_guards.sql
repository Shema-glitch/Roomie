-- ==============================================================================
-- ROOMIE MIGRATION: Query Indexes & Payload Guards
-- Hardens PostgreSQL performance and memory efficiency by preventing sequential scans
-- on high-frequency tables, enforcing text column bounds, and hardening RPCs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COMPOSITE INDEXES FOR WINDOWED QUERY ACCELERATION
-- ------------------------------------------------------------------------------

-- Chat messages: Windowed fetches by household ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_chat_messages_household_created
  ON public.chat_messages(household_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Expenses: Windowed fetches by household ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_expenses_household_created
  ON public.expenses(household_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Chore logs: Windowed fetches by household ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_chore_logs_household_created
  ON public.chore_logs(household_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Vibe pulses: Filtered by household and created_at DESC
CREATE INDEX IF NOT EXISTS idx_vibe_pulses_household_created
  ON public.vibe_pulses(household_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Vibe pulses: Filtered by household and week_key
CREATE INDEX IF NOT EXISTS idx_vibe_pulses_household_week_key
  ON public.vibe_pulses(household_id, week_key)
  WHERE deleted_at IS NULL;

-- Favor tokens: Filtered by household and created_at DESC
CREATE INDEX IF NOT EXISTS idx_favor_tokens_household_created
  ON public.favor_tokens(household_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Chore swap requests: Filtered by household and created_at DESC
CREATE INDEX IF NOT EXISTS idx_chore_swap_requests_household_created
  ON public.chore_swap_requests(household_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- In-app notifications: User-specific recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. TEXT COLUMN BOUNDS (Memory & Egress Protection)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  -- Chat messages body <= 1000 characters
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_chat_messages_body_length'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chk_chat_messages_body_length
      CHECK (char_length(body) <= 1000);
  END IF;

  -- Notifications body <= 1000 characters
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_notifications_body_length'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT chk_notifications_body_length
      CHECK (char_length(body) <= 1000);
  END IF;

  -- Notifications title <= 280 characters
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_notifications_title_length'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT chk_notifications_title_length
      CHECK (char_length(title) <= 280);
  END IF;

  -- Chore swap requests note <= 280 characters
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_chore_swap_requests_note_length'
  ) THEN
    ALTER TABLE public.chore_swap_requests
      ADD CONSTRAINT chk_chore_swap_requests_note_length
      CHECK (note IS NULL OR char_length(note) <= 280);
  END IF;

  -- Expenses dispute_reason <= 280 characters
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_dispute_reason_length'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT chk_expenses_dispute_reason_length
      CHECK (dispute_reason IS NULL OR char_length(dispute_reason) <= 280);
  END IF;

  -- Chore logs note <= 280 characters
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_chore_logs_note_length'
  ) THEN
    ALTER TABLE public.chore_logs
      ADD CONSTRAINT chk_chore_logs_note_length
      CHECK (note IS NULL OR char_length(note) <= 280);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HARDENED RPC: submit_anonymous_vibe
-- Enforces input length bounds, membership validation, and rate/capacity limits
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
  v_member_count INTEGER;
  v_avg NUMERIC(4, 1);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'Active household membership required';
  END IF;

  IF p_week_key IS NULL OR char_length(p_week_key) > 30 THEN
    RAISE EXCEPTION 'Invalid week key';
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

  -- Guard against ballot-stuffing flooding:
  -- Max pulses in a given week cannot exceed the active household member count
  SELECT COUNT(*) INTO v_member_count
  FROM public.memberships
  WHERE household_id = p_household_id
    AND status = 'active'
    AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_count
  FROM public.vibe_pulses
  WHERE household_id = p_household_id
    AND week_key = p_week_key
    AND deleted_at IS NULL;

  IF v_count >= GREATEST(v_member_count, 1) THEN
    -- Return existing status cleanly without inflating votes
    SELECT ROUND(AVG(score)::numeric, 1) INTO v_avg
    FROM public.vibe_pulses
    WHERE household_id = p_household_id
      AND week_key = p_week_key
      AND deleted_at IS NULL;

    RETURN jsonb_build_object(
      'householdId', p_household_id,
      'weekKey', p_week_key,
      'submissionCount', v_count,
      'revealed', v_count >= 3,
      'minRequired', 3,
      'averageScore', CASE WHEN v_count >= 3 THEN v_avg ELSE NULL END,
      'notice', 'Weekly submissions capacity reached'
    );
  END IF;

  -- Insert anonymous pulse (unlinked from user_id)
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
-- 4. HARDENED RPC: resolve_chore_swap
-- Enforces self-swap prevention, bounds, row locks, and double-spend protection
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

  -- Requester cannot accept their own swap request
  IF p_action = 'accept' AND v_uid <> v_req.target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the target roommate can accept this swap');
  END IF;

  -- Only target or requester can decline
  IF p_action = 'decline' AND v_uid <> v_req.target_user_id AND v_uid <> v_req.requester_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to decline this swap');
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

  -- Ensure token balances are bound and validated
  IF v_req.token_cost < 1 OR v_req.token_cost > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token cost in swap request');
  END IF;

  -- Ensure both participants have favor_tokens rows initialized
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
