-- MEGA⁷⁸ B.1 + B.3 — Backfill bestehender User-Rows
-- Datum: 2026-05-15
-- Zweck:
--   1. notification_settings auf neues Schema (Legacy-Keys gemappt)
--   2. user_workflow_settings Default-Row für jeden existing User
--   3. UNIQUE-Constraint auf user_workflow_settings.user_id für sauberen UPSERT
-- Applied via Supabase MCP apply_migration am 2026-05-15.

-- B.1 — notification_settings Backfill
UPDATE public.users
SET notification_settings = jsonb_build_object(
  'push_aktiv', COALESCE((notification_settings->>'push_aktiv')::boolean, true),
  'fristen_alarm_enabled', COALESCE((notification_settings->>'fristen_alarm_enabled')::boolean, true),
  'fristen_alarm_tage_vor', COALESCE(notification_settings->'fristen_alarm_tage_vor', '[7, 3, 1]'::jsonb),
  'zahlung_erinnerung_enabled', COALESCE(
    (notification_settings->>'zahlung_erinnerung_enabled')::boolean,
    (notification_settings->>'email_rechnung_bezahlt')::boolean,
    true
  ),
  'termin_erinnerung_enabled', COALESCE(
    (notification_settings->>'termin_erinnerung_enabled')::boolean,
    (notification_settings->>'email_termin_erinnerung')::boolean,
    true
  ),
  'quiet_hours_enabled', COALESCE((notification_settings->>'quiet_hours_enabled')::boolean, false),
  'quiet_hours_start', COALESCE(notification_settings->>'quiet_hours_start', '22:00'),
  'quiet_hours_end', COALESCE(notification_settings->>'quiet_hours_end', '07:00'),
  'kanal_email', COALESCE((notification_settings->>'kanal_email')::boolean, true),
  'kanal_push', COALESCE((notification_settings->>'kanal_push')::boolean, true)
)
WHERE deleted_at IS NULL;

-- B.3 — user_workflow_settings Default-Row für User ohne Row
INSERT INTO public.user_workflow_settings (
  user_id, default_mode, ki_autosuggest_enabled, editor_compact_mode,
  diktat_sprache, inline_ki_suggestions_enabled, ki_lernpool_einwilligung
)
SELECT u.id, 'A', true, false, 'de-DE', true, false
FROM public.users u
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_workflow_settings ws WHERE ws.user_id = u.id);

-- UNIQUE-Constraint user_workflow_settings.user_id (für UPSERT-Conflict)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_name = 'user_workflow_settings'
                   AND constraint_name = 'user_workflow_settings_user_id_unique') THEN
    ALTER TABLE public.user_workflow_settings
      ADD CONSTRAINT user_workflow_settings_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
