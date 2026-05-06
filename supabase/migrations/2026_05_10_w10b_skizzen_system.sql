-- ════════════════════════════════════════════════════════════════════════
-- MEGA³⁰ W10b-I5 — Skizzen-System Foundation (Audit-Blocker B)
-- Datum: 2026-05-10
-- Quellen: docs/sprint-status/MEGA-30-W10-I0-RECHERCHE.md
-- Compliance: § 412 ZPO Augenscheinsobjekt + DIN ISO 5455 (Maßstäbe)
-- ════════════════════════════════════════════════════════════════════════

-- Tabelle: skizzen
CREATE TABLE IF NOT EXISTS public.skizzen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schadensfall_id UUID NOT NULL,
  workspace_id UUID NOT NULL,            -- für RLS
  titel TEXT NOT NULL,                    -- z.B. "Skizze Erdgeschoss"
  svg_data TEXT NOT NULL,                 -- inline SVG (max ~200KB)
  foto_ref TEXT NULL,                     -- optionale Foto-Referenz (URL oder Storage-Path)
  massstab TEXT NULL,                     -- z.B. "1:50" (DIN ISO 5455)
  notiz TEXT NULL,
  erstellt_von UUID NOT NULL,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  geaendert_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skizzen_schadensfall ON public.skizzen(schadensfall_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skizzen_workspace ON public.skizzen(workspace_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.skizzen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skizzen_workspace_select" ON public.skizzen;
CREATE POLICY "skizzen_workspace_select" ON public.skizzen
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "skizzen_workspace_insert" ON public.skizzen;
CREATE POLICY "skizzen_workspace_insert" ON public.skizzen
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "skizzen_workspace_update" ON public.skizzen;
CREATE POLICY "skizzen_workspace_update" ON public.skizzen
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid())
  );

-- Comments
COMMENT ON TABLE public.skizzen IS
  'Sprint 11 B7 — Skizzen-System: Native SVG-Editor + DIN ISO 5455 Maßstäbe. MEGA³⁰ W10b-I5.';
COMMENT ON COLUMN public.skizzen.svg_data IS
  'Inline-SVG (max ~200KB). Wird in PDF-Templates via PDFMonkey-Hook injiziert.';
COMMENT ON COLUMN public.skizzen.massstab IS
  'Maßstab nach DIN ISO 5455: 1:1, 1:5, 1:10, 1:20, 1:50, 1:100, 1:200, 1:500.';
