-- PROVA Systems · Migration 10 · MEGA²⁰ W83
-- Onboarding-Persona + Welcome-Wizard-Marker
--
-- STATUS: VERSIONIERT (kopiert aus db/PLANNED-users-persona.sql)
-- DATUM: 2026-05-08
-- VORGAENGER: 09_auftraege_vorlage.sql
--
-- Marcel-Decision B1 (MEGA²⁰ Audit): ALTER TABLE public.users
-- — KEINE neue user_profile-Tabelle (existiert nicht).
--
-- ANWENDUNG (Marcel-Pflicht — CLAUDE.md Regel 5+35):
--   1. Marcel reviewed
--   2. Marcel approved
--   3. Apply via Supabase-CLI ODER Dashboard SQL Editor (Staging-Test pflicht!)
--   4. Smoke-Test:
--      SELECT persona_size, persona_types, persona_volume,
--             welcome_wizard_completed, onboarding_completed_at
--      FROM users LIMIT 1;
--
-- ROLLBACK (notfall):
--   ALTER TABLE users
--     DROP COLUMN persona_size, DROP COLUMN persona_types,
--     DROP COLUMN persona_volume, DROP COLUMN welcome_wizard_completed;
--   DROP INDEX IF EXISTS idx_users_wizard_pending;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS persona_size TEXT
    CHECK (persona_size IS NULL OR persona_size IN ('solo', 'small', 'large')),
  ADD COLUMN IF NOT EXISTS persona_types JSONB
    NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS persona_volume INTEGER
    CHECK (persona_volume IS NULL OR (persona_volume >= 0 AND persona_volume <= 200)),
  ADD COLUMN IF NOT EXISTS welcome_wizard_completed BOOLEAN
    NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.persona_size IS
  'MEGA²⁰: Buero-Groesse-Klassifikation. Pilot-Phase: alle 3 Werte sind Solo-Tier.';

COMMENT ON COLUMN public.users.persona_types IS
  'MEGA²⁰: Auftragsarten-Multiselect als JSONB-Array (z.B. ["schadensgutachten", "wertgutachten"]).';

COMMENT ON COLUMN public.users.persona_volume IS
  'MEGA²⁰: Geschaetzte Gutachten/Monat (Slider 1-50, validiert 0-200).';

COMMENT ON COLUMN public.users.welcome_wizard_completed IS
  'MEGA²⁰: Welcome-Wizard-Done-Marker. Existing onboarding_completed_at bleibt fuer Backwards-Compat.';

CREATE INDEX IF NOT EXISTS idx_users_wizard_pending
  ON public.users(welcome_wizard_completed)
  WHERE welcome_wizard_completed = FALSE AND deleted_at IS NULL;
