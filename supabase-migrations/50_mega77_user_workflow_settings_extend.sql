-- MEGA⁷⁷ — user_workflow_settings extend für ehrliche Settings-Page
-- Datum: 2026-05-15
-- Zweck: 4 neue Felder für KI-&-Diktat-Toggles die ihre Wirkung tatsächlich
--        entfalten (Marcel-Direktive: keine UI-Lügen mehr).

-- 4 neue Spalten (idempotent über DO-Block damit Re-Run möglich)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name = 'user_workflow_settings'
                   AND column_name = 'diktat_sprache') THEN
    ALTER TABLE public.user_workflow_settings
      ADD COLUMN diktat_sprache text NOT NULL DEFAULT 'de-DE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name = 'user_workflow_settings'
                   AND column_name = 'inline_ki_suggestions_enabled') THEN
    ALTER TABLE public.user_workflow_settings
      ADD COLUMN inline_ki_suggestions_enabled boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name = 'user_workflow_settings'
                   AND column_name = 'ki_lernpool_einwilligung') THEN
    ALTER TABLE public.user_workflow_settings
      ADD COLUMN ki_lernpool_einwilligung boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name = 'user_workflow_settings'
                   AND column_name = 'persoenlicher_ki_kontext') THEN
    ALTER TABLE public.user_workflow_settings
      ADD COLUMN persoenlicher_ki_kontext text NULL;
  END IF;
END $$;

-- Sprach-Constraint (zukunftssicher, aber strikt valide Werte)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_name = 'user_workflow_settings'
                   AND constraint_name = 'user_workflow_settings_diktat_sprache_check') THEN
    ALTER TABLE public.user_workflow_settings
      ADD CONSTRAINT user_workflow_settings_diktat_sprache_check
      CHECK (diktat_sprache IN ('de-DE', 'de-AT', 'de-CH'));
  END IF;
END $$;

COMMENT ON COLUMN public.user_workflow_settings.diktat_sprache IS
  'MEGA77: Whisper language-Parameter. Default de-DE.';
COMMENT ON COLUMN public.user_workflow_settings.inline_ki_suggestions_enabled IS
  'MEGA77: Wenn false → Editor zeigt keine automatischen KI-Vorschläge, nur on-demand via Slash.';
COMMENT ON COLUMN public.user_workflow_settings.ki_lernpool_einwilligung IS
  'MEGA77: DSGVO-Opt-In. Wenn false → "Andere Ursache"-Einträge fließen NICHT in ki_lernpool.';
COMMENT ON COLUMN public.user_workflow_settings.persoenlicher_ki_kontext IS
  'MEGA77: SV-Spezialisierung (z.B. "Feuchteschäden, DIN 4108, WTA"). Wird an system_prompt aller KI-Calls angehängt.';

-- notification_settings-Schema angleichen (MEGA77 C.2): existing defaults
-- enthielten falsche Keys. Wir setzen ein ehrliches "in Vorbereitung"-Default,
-- existierende Rows werden NICHT überschrieben (lass Marcel's evtl. Settings
-- in Ruhe). Nur das DEFAULT für neue Rows korrigieren.
ALTER TABLE public.users
  ALTER COLUMN notification_settings SET DEFAULT '{
    "push_aktiv": true,
    "fristen_alarm_enabled": true,
    "fristen_alarm_tage_vor": [7, 3, 1],
    "zahlung_erinnerung_enabled": true,
    "termin_erinnerung_enabled": true,
    "quiet_hours_enabled": false,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
    "kanal_email": true,
    "kanal_push": true
  }'::jsonb;
