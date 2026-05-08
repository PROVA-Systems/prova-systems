-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁴ B3 — incidents-Tabelle für Public Status-Page
-- Datum: 2026-05-07
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.incidents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service      TEXT NOT NULL,                    -- web, landing, api, db, pdf, ki, email
  severity     TEXT NOT NULL DEFAULT 'minor',    -- minor, major, critical
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  description  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.incidents
  DROP CONSTRAINT IF EXISTS incidents_severity_check;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_severity_check
  CHECK (severity IN ('minor', 'major', 'critical'));

CREATE INDEX IF NOT EXISTS idx_incidents_started
  ON public.incidents(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_unresolved
  ON public.incidents(service) WHERE resolved_at IS NULL;

COMMENT ON TABLE public.incidents IS
  'MEGA³⁴ B3 — Service-Incidents für public-status.html (Public Status-Page).';
