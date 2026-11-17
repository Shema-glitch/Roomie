-- ==============================================================================
-- ROOMIE REALTIME PUBLICATION: Join Requests, Memberships, Notifications & Flat Tools
-- Ensures instant cross-device delivery when a flatmate requests to join,
-- is approved, or receives live updates.
-- ==============================================================================

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'join_requests',
    'memberships',
    'notifications',
    'shopping_items',
    'move_out_inspections'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = v_table
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      EXCEPTION
        WHEN duplicate_object THEN
          NULL;
        WHEN undefined_object THEN
          NULL;
      END;
    END IF;
  END LOOP;
END
$$;
