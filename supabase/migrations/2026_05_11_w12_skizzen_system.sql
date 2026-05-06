-- ════════════════════════════════════════════════════════════════════════
-- MEGA³² W12b-I2 — Skizzen-System (Schema-Reconciled von W10b)
-- Datum: 2026-05-11
-- Quelle: docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md (W12-I0 Audit)
--
-- Pattern-Konformität:
-- - FK auf auftraege (NICHT schadensfaelle)
-- - RLS auf workspace_memberships (NICHT workspace_members)
-- - created_by_user_id (NICHT erstellt_von)
-- - DSGVO: pseudonymisiert + Soft-Delete via deleted_at
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.skizzen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  auftrag_id UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  svg_content TEXT NOT NULL CHECK (length(svg_content) > 0 AND length(svg_content) <= 200000),
  foto_referenz_id UUID NULL REFERENCES public.fotos(id),
  massstab TEXT NULL,
  notiz TEXT NULL,
  pseudonymisiert BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_skizzen_auftrag ON public.skizzen(auftrag_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skizzen_workspace ON public.skizzen(workspace_id) WHERE deleted_at IS NULL;

ALTER TABLE public.skizzen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skizzen_workspace_select" ON public.skizzen;
CREATE POLICY "skizzen_workspace_select" ON public.skizzen FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND is_active = TRUE
  ));

DROP POLICY IF EXISTS "skizzen_workspace_insert" ON public.skizzen;
CREATE POLICY "skizzen_workspace_insert" ON public.skizzen FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND is_active = TRUE
  ));

DROP POLICY IF EXISTS "skizzen_workspace_update" ON public.skizzen;
CREATE POLICY "skizzen_workspace_update" ON public.skizzen FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND is_active = TRUE
  ));

COMMENT ON TABLE public.skizzen IS
  'W12b-I2 Schema-Reconciled — Skizzen mit FK auf auftraege + DIN ISO 5455 Maßstab.';
COMMENT ON COLUMN public.skizzen.svg_content IS
  'Inline-SVG max 200KB. CHECK-Constraint enforced. XSS-Validierung im Lambda.';
COMMENT ON COLUMN public.skizzen.massstab IS
  'DIN ISO 5455 Maßstäbe: 1:1, 1:5, 1:10, 1:20, 1:50, 1:100, 1:200, 1:500.';
COMMENT ON COLUMN public.skizzen.foto_referenz_id IS
  'Optionaler FK auf fotos — Skizze auf Foto basiert.';
