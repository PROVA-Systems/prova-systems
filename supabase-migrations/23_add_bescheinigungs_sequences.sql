-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁶ W5.2 — bescheinigungs_sequences (BES-YYYY-NNN)
-- Datum: 2026-05-07
-- Idempotent + RLS aktiv.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bescheinigungs_sequences (
  workspace_id UUID NOT NULL,
  jahr         INTEGER NOT NULL,
  letzte_nr    INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, jahr)
);

ALTER TABLE public.bescheinigungs_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bescheinigungs_seq_self ON public.bescheinigungs_sequences;
DROP POLICY IF EXISTS bescheinigungs_seq_service ON public.bescheinigungs_sequences;

CREATE POLICY bescheinigungs_seq_self ON public.bescheinigungs_sequences
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY bescheinigungs_seq_service ON public.bescheinigungs_sequences
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.bescheinigungs_sequences IS
  'MEGA³⁶ W5.2 — Workspace-isolierte Sequenz für BES-YYYY-NNN-Aktenzeichen.';
