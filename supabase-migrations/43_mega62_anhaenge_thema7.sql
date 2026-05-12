-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶² Phase 0 Item 0.4-ERWEITERT — anhaenge fuer Thema 7
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega62_anhaenge_thema7
-- ═══════════════════════════════════════════════════════════════════
-- Marcel-Decision: KEINE neue externe_dokumente. anhaenge ist Single
-- Source of Truth fuer ALLE eingelesenen Dokumente (intern + extern).
-- anhang_typ-Enum deckt bereits ab: klageschrift, klageerwiderung,
-- beweisbeschluss, fremd_gutachten, korrespondenz_email/brief,
-- vertrag, rechnung_extern, bautagebuch, leistungsverzeichnis,
-- foto_extern, plan, norm_dokument, protokoll, sonstiges.
-- anhang_herkunft-Enum deckt ab: manuell_upload, email_eingang,
-- bea_eingang, scan, api, import.
-- Existierende Felder fuer KI-Pipeline: extracted_data (JSONB) +
-- extraction_at + extraction_modell, ocr_text + ocr_completed_at +
-- ocr_confidence — decken externe_dokumente.ki_extrakte +
-- ki_analyse_durchgefuehrt_at + ocr_durchgefuehrt_at vollstaendig ab.
-- Fehlten nur: absender, empfangsdatum, aktenzeichen_extern.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.anhaenge
  ADD COLUMN IF NOT EXISTS absender TEXT;

ALTER TABLE public.anhaenge
  ADD COLUMN IF NOT EXISTS empfangsdatum DATE;

ALTER TABLE public.anhaenge
  ADD COLUMN IF NOT EXISTS aktenzeichen_extern TEXT;

COMMENT ON COLUMN public.anhaenge.absender IS 'Externer Absender (Gericht/Anwalt/Gegen-SV/Mandant) bei externen Dokumenten.';
COMMENT ON COLUMN public.anhaenge.empfangsdatum IS 'Eingangsdatum/Posteingang bei externen Dokumenten.';
COMMENT ON COLUMN public.anhaenge.aktenzeichen_extern IS 'Aktenzeichen des Absenders (Gericht/Anwalt/Gegen-SV).';

CREATE INDEX IF NOT EXISTS idx_anhaenge_aktenzeichen_extern
  ON public.anhaenge(aktenzeichen_extern)
  WHERE aktenzeichen_extern IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_anhaenge_empfangsdatum
  ON public.anhaenge(empfangsdatum DESC NULLS LAST)
  WHERE empfangsdatum IS NOT NULL AND deleted_at IS NULL;

COMMENT ON TABLE public.anhaenge IS
  'Single Source of Truth fuer ALLE eingelesenen Dokumente (intern + extern). MEGA62 (2026-05-12): erweitert um absender/empfangsdatum/aktenzeichen_extern zur Vorbereitung MEGA75 (Externe Dokumente Q3 2026). Reuse statt Duplizierung — anhang_typ-Enum deckt bereits klageschrift/beweisbeschluss/fremd_gutachten/korrespondenz_*. Existierende OCR + extracted_data (JSONB) decken die KI-Analyse-Pipeline ab; spezialisierte Felder kommen via ALTER TABLE wenn echte Anforderung in Thema-7-Sprint auftritt.';
