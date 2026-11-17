-- ==============================================================================
-- ROOMIE FIX: Align membership join/remove triggers with actual chat_messages columns
-- chat_messages uses (household_id, sender_id, type, body, link_target)
-- Fixes: column "user_id" of relation "chat_messages" does not exist during approve_join_request
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

    -- Broadcast privacy alert notification to ALL other active members of this household
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
        'Privacy Alert: New Flatmate Joined',
        v_new_member_name || ' has officially joined ' || coalesce(v_household_name, 'your apartment') || '. Review the active flatmate roster in Apartment settings.',
        jsonb_build_object('screen', 'apartment')
      );
    END LOOP;

    -- Post public activity notice in household chat using actual chat_messages columns
    INSERT INTO public.chat_messages (household_id, sender_id, type, body, link_target)
    VALUES (
      NEW.household_id,
      NULL,
      'activity',
      'Privacy Notice: ' || v_new_member_name || ' has joined the apartment roster.',
      jsonb_build_object('screen', 'apartment', 'id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_member_removed_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_name TEXT;
  v_target_name TEXT;
  v_caller_uid UUID := auth.uid();
  v_actor_name TEXT;
  v_existing_member RECORD;
  v_is_removal BOOLEAN;
  v_chat_text TEXT;
  v_notif_title TEXT;
  v_notif_body TEXT;
BEGIN
  IF OLD.status = 'active' AND (NEW.status IN ('removed', 'left') OR NEW.deleted_at IS NOT NULL) THEN
    SELECT name INTO v_household_name FROM public.households WHERE id = OLD.household_id;
    SELECT coalesce(name, 'A flatmate') INTO v_target_name FROM public.profiles WHERE id = OLD.user_id;

    IF v_caller_uid IS NOT NULL AND v_caller_uid <> OLD.user_id THEN
      v_is_removal := true;
      SELECT coalesce(name, 'The flat admin') INTO v_actor_name FROM public.profiles WHERE id = v_caller_uid;
      v_chat_text := v_actor_name || ' removed ' || v_target_name || ' from the apartment.';
      v_notif_title := 'Member Removed from Flat';
      v_notif_body := v_actor_name || ' removed ' || v_target_name || ' from ' || coalesce(v_household_name, 'your apartment') || '.';
    ELSE
      v_is_removal := false;
      v_chat_text := v_target_name || ' left the apartment.';
      v_notif_title := 'Member Left the Flat';
      v_notif_body := v_target_name || ' has left ' || coalesce(v_household_name, 'your apartment') || '.';
    END IF;

    FOR v_existing_member IN
      SELECT user_id FROM public.memberships
      WHERE household_id = OLD.household_id
        AND user_id <> OLD.user_id
        AND user_id <> coalesce(v_caller_uid, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status = 'active'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link_target)
      VALUES (
        v_existing_member.user_id,
        'privacy_alert',
        v_notif_title,
        v_notif_body,
        jsonb_build_object('screen', 'apartment')
      );
    END LOOP;

    IF v_is_removal THEN
      INSERT INTO public.notifications (user_id, type, title, body, link_target)
      VALUES (
        OLD.user_id,
        'privacy_alert',
        'Apartment Access Revoked',
        'You were removed from ' || coalesce(v_household_name, 'the apartment') || ' by ' || coalesce(v_actor_name, 'an admin') || '.',
        jsonb_build_object('screen', 'setup')
      );
    END IF;

    -- Post public activity notice in household chat using actual chat_messages columns
    INSERT INTO public.chat_messages (household_id, sender_id, type, body, link_target)
    VALUES (
      OLD.household_id,
      NULL,
      'activity',
      v_chat_text,
      jsonb_build_object('screen', 'apartment', 'id', OLD.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;
