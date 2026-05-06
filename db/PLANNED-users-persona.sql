-- PROVA Systems · Migration 10 (PLANNED) · MEGA²⁰ W83
-- Onboarding-Persona + Welcome-Wizard-Marker
--
-- Marcel-Decision B1: ALTER TABLE public.users (NICHT user_profile —
-- existiert nicht. existing Tabelle public.users hat bereits
-- onboarding_completed_at TIMESTAMPTZ.)
--
-- ZWECK:
--   persona_size:      Buero-Groesse-Klassifikation (solo/small/large)
--   persona_types:     Auftragsarten als JSONB-Array
--                      (z.B. ["schadensgutachten", "wertgutachten"])
--   persona_volume:    Gutachten/Monat (Slider 1-50)
--   welcome_wizard_completed: Wizard-Done-Marker (vs onboarding_completed_at
--                      welches der ALTE Flag ist — wir behalten beide
--                      damit existing Code nicht bricht)
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS (kann mehrfach ausgeführt werden)

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

-- Partial-Index fuer wizard-noch-nicht-fertig (User-Filter im Backend)
CREATE INDEX IF NOT EXISTS idx_users_wizard_pending
  ON public.users(welcome_wizard_completed)
  WHERE welcome_wizard_completed = FALSE AND deleted_at IS NULL;
