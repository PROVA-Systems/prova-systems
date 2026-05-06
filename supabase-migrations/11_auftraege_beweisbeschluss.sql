-- PROVA Systems · Migration 11 · MEGA²¹+²² W111
-- Beweisbeschluss-PDF-Foundation (Marcel-Decision J1)
--
-- STATUS: VERSIONIERT (kopiert aus db/PLANNED-auftraege-beweisbeschluss.sql)
-- DATUM: 2026-05-08
-- VORGAENGER: 10_users_persona_onboarding.sql
--
-- ANWENDUNG (Marcel-Pflicht):
--   1. Marcel reviewed
--   2. Marcel approved
--   3. Apply via Supabase-CLI ODER Dashboard SQL Editor
--   4. Smoke-Test:
--      SELECT beweisbeschluss_pdf_storage_path, beweisbeschluss_pdf_extrakt,
--             beweisbeschluss_pdf_extrakt_version, beweisbeschluss_pdf_uploaded_at
--      FROM auftraege LIMIT 1;
--
-- ROLLBACK:
--   ALTER TABLE auftraege
--     DROP COLUMN beweisbeschluss_pdf_storage_path,
--     DROP COLUMN beweisbeschluss_pdf_extrakt,
--     DROP COLUMN beweisbeschluss_pdf_extrakt_version,
--     DROP COLUMN beweisbeschluss_pdf_uploaded_at;
--   DROP INDEX IF EXISTS idx_auftraege_beweisbeschluss;

ALTER TABLE public.auftraege
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_extrakt JSONB
    NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_extrakt_version INTEGER
    NOT NULL DEFAULT 1
    CHECK (beweisbeschluss_pdf_extrakt_version >= 1 AND beweisbeschluss_pdf_extrakt_version <= 5),
  ADD COLUMN IF NOT EXISTS beweisbeschluss_pdf_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.auftraege.beweisbeschluss_pdf_storage_path IS
  'Marcel-J1: Pfad zu hochgeladenem Beweisbeschluss-PDF im Supabase-Storage (sv-files Bucket)';

COMMENT ON COLUMN public.auftraege.beweisbeschluss_pdf_extrakt IS
  'Marcel-C1 Pattern-Matching-Resultate: { aktenzeichen, frist_datum, hauptfragen[], parteien[], ... }';

COMMENT ON COLUMN public.auftraege.beweisbeschluss_pdf_extrakt_version IS
  'v1 = manuell + Pattern-Matching (Marcel-C1), v2 = KI-strukturiert (Post-Pilot August)';

CREATE INDEX IF NOT EXISTS idx_auftraege_beweisbeschluss
  ON public.auftraege(beweisbeschluss_pdf_uploaded_at DESC)
  WHERE beweisbeschluss_pdf_storage_path IS NOT NULL AND deleted_at IS NULL;
