-- ════════════════════════════════════════════════════════════════════════
-- MEGA³⁰ D1 — Mahnwesen 3-Stufen Foundation
-- Datum: 2026-05-07
-- Apply'd via Supabase-MCP.
-- Quellen: docs/audit/MEGA-30-D1-MAHNWESEN-SOURCES.md (12 Quellen)
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS mahn_datum_letzte TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_dokumente_mahn_due
  ON public.dokumente(faelligkeit, mahn_stufe)
  WHERE bezahlt_at IS NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.dokumente.mahn_datum_letzte IS
  'MEGA³⁰ D1: Letzter Mahn-Versand-Timestamp für Idempotenz-Check (Cron-Lambda).';

-- mahn_stufe + mahn_gebuehr existieren bereits in dokumente — kein Schema-Touch nötig.
