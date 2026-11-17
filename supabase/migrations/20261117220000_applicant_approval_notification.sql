-- ==============================================================================
-- ROOMIE NOTIFICATIONS: Notify applicants on join approval/decline + crisp titles
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_member_joined_privacy_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_name TEXT;
  v_new_member_name TEXT;
  v_existing_member RECORD;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status <> 'active'))) THEN
    SELECT name INTO v_household_name FROM public.households WHERE id = NEW.household_id;
    SELECT coalesce(name, 'A new flatmate') INTO v_new_member_name
    FROM public.profiles WHERE id = NEW.user_id;

    -- 1. Notify ALL other active members of this household
    FOR v_existing_member IN
      SELECT user_id FROM public.memberships
      WHERE household_id = NEW.household_id
        AND user_id <> NEW.user_id
        AND status = 'active'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link_target)
      VALUES (
        v_existing_member.user_id,
        'privacy_alert',
        'New Flatmate Joined',
        v_new_member_name || ' has officially joined ' || coalesce(v_household_name, 'your apartment') || '.',
        jsonb_build_object('screen', 'apartment')
      );
    END LOOP;

    -- 2. Notify the newly admitted member herself (skip founder admin creation)
    IF NEW.role <> 'admin' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link_target)
      VALUES (
        NEW.user_id,
        'household',
        'Welcome to ' || coalesce(v_household_name, 'your apartment') || '!',
        'Your join request was approved. Tap to open your new flat.',
        jsonb_build_object('screen', 'apartment')
      );
    END IF;

    -- 3. Post public activity notice in household chat
    INSERT INTO public.chat_messages (household_id, sender_id, type, body, link_target)
    VALUES (
      NEW.household_id,
      NULL,
      'activity',
      v_new_member_name || ' has joined the apartment roster.',
      jsonb_build_object('screen', 'apartment', 'id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

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

DROP TRIGGER IF EXISTS trg_new_join_request_alert ON public.join_requests;
DROP TRIGGER IF EXISTS trg_join_request_status_alert ON public.join_requests;
CREATE TRIGGER trg_join_request_status_alert
AFTER INSERT OR UPDATE OF status ON public.join_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_join_request_status_alert();
