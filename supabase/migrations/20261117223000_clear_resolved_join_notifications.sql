-- ==============================================================================
-- ROOMIE NOTIFICATIONS: Auto-clear Join Request cards once admitted or declined
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_join_request_status_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_name TEXT;
  v_existing_member RECORD;
BEGIN
  SELECT name INTO v_household_name FROM public.households WHERE id = NEW.household_id;

  -- New pending request -> notify all active members
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    FOR v_existing_member IN
      SELECT user_id FROM public.memberships
      WHERE household_id = NEW.household_id
        AND status = 'active'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link_target)
      VALUES (
        v_existing_member.user_id,
        'household',
        'Join Request: ' || coalesce(NEW.user_name, 'New Applicant'),
        coalesce(NEW.user_name, 'Someone') || ' wants to join ' || coalesce(v_household_name, 'your apartment') || '. Tap to review & approve.',
        jsonb_build_object('screen', 'apartment', 'id', NEW.id)
      );
    END LOOP;
  END IF;

  -- Resolved request (approved or rejected) -> dismiss stale Join Request cards for all flat members
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    UPDATE public.notifications
    SET deleted_at = now(), read = true
    WHERE deleted_at IS NULL
      AND type = 'household'
      AND title ILIKE '%join request%'
      AND title NOT ILIKE '%join request update%'
      AND (
        link_target->>'id' = NEW.id::text
        OR link_target->>'requestId' = NEW.id::text
        OR (
          user_id IN (
            SELECT m.user_id FROM public.memberships m
            WHERE m.household_id = NEW.household_id AND m.status = 'active'
          )
          AND body ILIKE '%' || coalesce(NEW.user_name, '') || '%'
        )
      );
  END IF;

  -- Declined request -> notify applicant
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'rejected' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link_target)
    VALUES (
      NEW.user_id,
      'household',
      'Join Request Update',
      'Your request to join ' || coalesce(v_household_name, 'the apartment') || ' was not approved.',
      jsonb_build_object('screen', 'setup')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- One-time cleanup: soft-delete any already-resolved Join Request notifications
UPDATE public.notifications n
SET deleted_at = now(), read = true
WHERE n.deleted_at IS NULL
  AND n.type = 'household'
  AND n.title ILIKE '%join request%'
  AND n.title NOT ILIKE '%join request update%'
  AND NOT EXISTS (
    SELECT 1 FROM public.join_requests jr
    WHERE jr.status = 'pending'
      AND jr.deleted_at IS NULL
      AND (
        jr.id::text = n.link_target->>'id'
        OR jr.id::text = n.link_target->>'requestId'
        OR n.body ILIKE '%' || jr.user_name || '%'
      )
  );
