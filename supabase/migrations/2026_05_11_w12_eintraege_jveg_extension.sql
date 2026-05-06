-- ════════════════════════════════════════════════════════════════════════
-- MEGA³² W12-I1 — Eintraege JVEG-Extension
-- Datum: 2026-05-11
-- Zweck: 3 Spalten ergänzen für JVEG-Stundenzettel + Soft-Delete.
-- Existing 'eintraege'-Tabelle bleibt unverändert (W12-I0 Schema-Audit).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.eintraege
  ADD COLUMN IF NOT EXISTS dauer_min INTEGER NULL,
  ADD COLUMN IF NOT EXISTS abrechenbar BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_eintraege_jveg ON public.eintraege(auftrag_id, datum)
  WHERE deleted_at IS NULL AND abrechenbar = TRUE;

COMMENT ON COLUMN public.eintraege.dauer_min IS
  'JVEG-Stundenzettel-Foundation (W12-I1): Dauer in Minuten für § 8/12 JVEG-Abrechnung';
COMMENT ON COLUMN public.eintraege.abrechenbar IS
  'JVEG-Stundenzettel-Foundation: nur abrechenbare Einträge fließen in Stundenrechnung';
COMMENT ON COLUMN public.eintraege.deleted_at IS
  'Soft-Delete-Pattern: gelöschte Einträge bleiben für Audit-Trail (DSGVO Art. 5 Lit. e)';
