-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁴¹ P1 — import_logs (Daten-Import-Audit + Rollback)
-- Datum: 2026-05-08
-- Status: PLANNED — Marcel apply via Supabase MCP
-- ═══════════════════════════════════════════════════════════════════
--
-- Zweck: Audit-Trail + Rollback-Token für Mass-Imports (Kontakte/Aufträge/Rechnungen).
-- Rollback-Frist: 24h. Nach 24h läuft der Token ab, Daten bleiben.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  source_format TEXT NOT NULL,                  -- 'gutachten_manager' | 'gutachten_agent' | 'bauexpert' | 'generic_csv' | 'json'
  target_entity TEXT NOT NULL,                  -- 'kontakte' | 'auftraege' | 'rechnungen' | 'mixed'
  filename TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending' | 'success' | 'partial' | 'failed' | 'rolled_back'
  rollback_token TEXT,                          -- UUID-Hash; NULL nach Rollback oder Ablauf
  rollback_expires_at TIMESTAMPTZ,
  inserted_ids JSONB DEFAULT '[]'::jsonb,       -- Array of {entity, id} für Rollback
  errors JSONB DEFAULT '[]'::jsonb,             -- Array of {row, col, msg}
  mapping JSONB,                                -- Spalten-Mapping fremde-Spalte → PROVA-Field
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rolled_back_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_logs_workspace
  ON public.import_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_user
  ON public.import_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_rollback_token
  ON public.import_logs(rollback_token) WHERE rollback_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_import_logs_status
  ON public.import_logs(status, created_at DESC);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS import_logs_workspace_select ON public.import_logs;
CREATE POLICY import_logs_workspace_select ON public.import_logs
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

-- Insert + Update + Delete nur via Service-Role (Lambdas) — nicht via Frontend
DROP POLICY IF EXISTS import_logs_workspace_insert ON public.import_logs;
CREATE POLICY import_logs_workspace_insert ON public.import_logs
  FOR INSERT WITH CHECK (false);  -- Service-Role bypasses RLS

DROP POLICY IF EXISTS import_logs_workspace_update ON public.import_logs;
CREATE POLICY import_logs_workspace_update ON public.import_logs
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS import_logs_workspace_delete ON public.import_logs;
CREATE POLICY import_logs_workspace_delete ON public.import_logs
  FOR DELETE USING (false);

COMMENT ON TABLE public.import_logs IS 'MEGA⁴¹ P1: Daten-Import-Audit + Rollback. Frist 24h. inserted_ids[] für atomares Rollback.';
COMMENT ON COLUMN public.import_logs.inserted_ids IS 'JSONB-Array: [{entity:"kontakte", id:"uuid"}, ...] — fuer Rollback-DELETE';
COMMENT ON COLUMN public.import_logs.rollback_token IS 'NULL nach Rollback oder Ablauf 24h. UUID-Hash beim Insert.';
