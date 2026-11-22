-- ==============================================================================
-- ROOMIE MIGRATION: Core Reliability & Persistence
-- 1. Persists weekly duty_schedules across household members (with Realtime sync)
-- 2. Stores user feedback in app_feedback with strict owner-scoped RLS
-- 3. Adds atomic server RPCs:
--    - award_favor_tokens (row-locked MAX_FAVOR_TOKENS = 10 enforcement)
--    - notify_household_reminder (safe cross-member expense reminder notifications)
--    - delete_my_account (leaves all active flats, promotes admins, scrubs PII)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. WEEKLY DUTY SCHEDULES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.duty_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (household_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_schedules_household_week
  ON public.duty_schedules (household_id, week_start_date DESC);

DROP TRIGGER IF EXISTS trg_duty_schedules_version ON public.duty_schedules;
CREATE TRIGGER trg_duty_schedules_version
  BEFORE UPDATE ON public.duty_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_and_version();

ALTER TABLE public.duty_schedules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.duty_schedules TO authenticated;

DROP POLICY IF EXISTS "Duty schedules viewable by members" ON public.duty_schedules;
DROP POLICY IF EXISTS "Duty schedules insertable by members" ON public.duty_schedules;
DROP POLICY IF EXISTS "Duty schedules updatable by members" ON public.duty_schedules;

CREATE POLICY "Duty schedules viewable by members" ON public.duty_schedules
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Duty schedules insertable by members" ON public.duty_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Duty schedules updatable by members" ON public.duty_schedules
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duty_schedules;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END
$$;

-- ------------------------------------------------------------------------------
-- 2. IN-APP FEEDBACK SUBMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NULL REFERENCES public.households(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('rate', 'problem', 'feature')),
  rating INTEGER NULL CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 2000),
  app_version TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_feedback_user_created
  ON public.app_feedback (user_id, created_at DESC);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.app_feedback TO authenticated;

DROP POLICY IF EXISTS "Users can view own feedback" ON public.app_feedback;
DROP POLICY IF EXISTS "Users can submit own feedback" ON public.app_feedback;

CREATE POLICY "Users can view own feedback" ON public.app_feedback
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can submit own feedback" ON public.app_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 3. ATOMIC RPC: award_favor_tokens
-- Enforces MAX_FAVOR_TOKENS = 10 cap and records transaction history safely
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_favor_tokens(
  p_household_id UUID,
  p_target_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'streak_milestone',
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_cur_balance INTEGER;
  v_new_balance INTEGER;
  v_tokens_added INTEGER;
  v_overflow_kudos INTEGER;
  v_clean_reason TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT public.is_household_member(p_household_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active household membership required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE household_id = p_household_id
      AND user_id = p_target_user_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user is not an active household member');
  END IF;

  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token award amount');
  END IF;

  v_clean_reason := CASE
    WHEN p_reason IN ('streak_milestone', 'weekly_award', 'roommate_favor') THEN p_reason
    ELSE 'streak_milestone'
  END;

  INSERT INTO public.favor_tokens (household_id, user_id, balance)
  VALUES (p_household_id, p_target_user_id, 5)
  ON CONFLICT (household_id, user_id) DO NOTHING;

  SELECT balance INTO v_cur_balance
  FROM public.favor_tokens
  WHERE household_id = p_household_id
    AND user_id = p_target_user_id
  FOR UPDATE;

  v_new_balance := LEAST(10, v_cur_balance + p_amount);
  v_tokens_added := GREATEST(0, v_new_balance - v_cur_balance);
  v_overflow_kudos := GREATEST(0, (v_cur_balance + p_amount) - 10);

  UPDATE public.favor_tokens
  SET
    balance = v_new_balance,
    history = history || jsonb_build_array(
      jsonb_build_object(
        'type', 'earn',
        'amount', v_tokens_added,
        'overflowKudos', v_overflow_kudos,
        'reason', v_clean_reason,
        'fromUserId', v_uid,
        'note', p_note,
        'createdAt', NOW()
      )
    )
  WHERE household_id = p_household_id
    AND user_id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance,
    'tokensAdded', v_tokens_added,
    'overflowConvertedToKudos', v_overflow_kudos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_favor_tokens(UUID, UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_favor_tokens(UUID, UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC RPC: notify_household_reminder
-- Dispatches in-app notification rows to active flatmates for expense reminders
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_household_reminder(
  p_household_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_link_target JSONB DEFAULT '{"screen":"expenses"}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_member RECORD;
  v_count INTEGER := 0;
  v_clean_title TEXT := left(coalesce(nullif(trim(p_title), ''), 'Expense Reminder'), 120);
  v_clean_body TEXT := left(trim(coalesce(p_body, '')), 500);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT public.is_household_member(p_household_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active household membership required');
  END IF;

  IF char_length(v_clean_body) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reminder body required');
  END IF;

  FOR v_member IN
    SELECT user_id
    FROM public.memberships
    WHERE household_id = p_household_id
      AND status = 'active'
      AND user_id <> v_uid
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link_target)
    VALUES (
      v_member.user_id,
      'expense',
      v_clean_title,
      v_clean_body,
      coalesce(p_link_target, '{"screen":"expenses"}'::jsonb)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'notifiedCount', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_household_reminder(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_household_reminder(UUID, TEXT, TEXT, JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC RPC: delete_my_account
-- Leaves all active households safely (promoting oldest member if admin),
-- declines pending swap offers, removes personal notifications/tokens, and
-- scrubs profile PII while preserving shared expense ledger referential integrity.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_membership RECORD;
  v_next_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  FOR v_membership IN
    SELECT household_id, role
    FROM public.memberships
    WHERE user_id = v_uid AND status = 'active'
  LOOP
    UPDATE public.memberships
    SET status = 'left', role = 'member', left_at = NOW(), updated_at = NOW()
    WHERE household_id = v_membership.household_id AND user_id = v_uid AND status = 'active';

    IF v_membership.role = 'admin' THEN
      SELECT id INTO v_next_id
      FROM public.memberships
      WHERE household_id = v_membership.household_id
        AND user_id <> v_uid
        AND status = 'active'
      ORDER BY joined_at ASC
      LIMIT 1;

      IF v_next_id IS NOT NULL THEN
        UPDATE public.memberships SET role = 'admin', updated_at = NOW() WHERE id = v_next_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.chore_swap_requests
  SET status = 'declined', updated_at = NOW()
  WHERE status = 'pending'
    AND (requester_user_id = v_uid OR target_user_id = v_uid);

  DELETE FROM public.notifications WHERE user_id = v_uid;
  DELETE FROM public.favor_tokens WHERE user_id = v_uid;

  UPDATE public.profiles
  SET
    name = 'Former Roomie',
    email = 'deleted_' || replace(v_uid::text, '-', '') || '@deleted.roomie.app',
    avatar = '',
    country = '',
    country_code = 'XX',
    flag = '🌐',
    is_home = false,
    streak_days = 0,
    points = 0,
    away_until = NULL,
    dietary_tags = '{}',
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object('success', true, 'message', 'Account scrubbed and memberships left');
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
