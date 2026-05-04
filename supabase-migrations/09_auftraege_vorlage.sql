-- PROVA Systems · Migration 09 · MEGA¹⁷ W49
-- Mode-C: Vorlage-Reference auf auftraege (Akten-Integration)
--
-- STATUS: VERSIONIERT (kopiert aus db/PLANNED-auftraege-vorlage.sql)
-- DATUM: 2026-05-08
-- VORGAENGER: 08_user_vorlagen.sql
--
-- ANWENDUNG (Marcel-Pflicht — CLAUDE.md Regel 5+35):
--   1. Marcel reviewed
--   2. Marcel approved
--   3. Apply via Supabase-CLI ODER Dashboard SQL Editor (Staging-Test pflicht!)
--   4. Smoke-Test:
--      SELECT vorlage_id, vorlage_variable_values FROM auftraege LIMIT 1;
--
-- ROLLBACK (notfall):
--   ALTER TABLE auftraege DROP COLUMN vorlage_id, DROP COLUMN vorlage_variable_values;
--   DROP INDEX IF EXISTS idx_auftraege_vorlage;

ALTER TABLE public.auftraege
  ADD COLUMN IF NOT EXISTS vorlage_id UUID
    REFERENCES public.user_vorlagen(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vorlage_variable_values JSONB
    NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.auftraege.vorlage_id IS
  'Mode C: Referenz auf user_vorlagen. NULL = Mode A oder Mode B (kein User-Template).';

COMMENT ON COLUMN public.auftraege.vorlage_variable_values IS
  'Mode C: Cache fuer aufgeloeste Mapping-Werte. Format: { "$Aktenzeichen": "SCH-2026-001", ... }';

CREATE INDEX IF NOT EXISTS idx_auftraege_vorlage
  ON public.auftraege(vorlage_id)
  WHERE vorlage_id IS NOT NULL AND deleted_at IS NULL;
