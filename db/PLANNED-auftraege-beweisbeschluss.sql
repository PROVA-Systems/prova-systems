-- PROVA Systems · Migration 11 (PLANNED) · MEGA²¹+²² W111
-- Beweisbeschluss-PDF-Foundation (Marcel-Decision J1)
--
-- ZWECK:
--   beweisbeschluss_pdf_storage_path  : Pfad zu hochgeladenem PDF
--   beweisbeschluss_pdf_extrakt       : JSONB mit Pattern-Matching-Resultaten
--                                       Schema: { aktenzeichen, frist_datum,
--                                                 hauptfragen[], parteien[], ... }
--   beweisbeschluss_pdf_extrakt_version  : v1=manuell+regex, v2=KI (Post-Pilot)
--   beweisbeschluss_pdf_uploaded_at   : TIMESTAMPTZ
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS
-- KEINE RLS-Aenderungen — auftraege-RLS deckt die neuen Spalten ab.

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
