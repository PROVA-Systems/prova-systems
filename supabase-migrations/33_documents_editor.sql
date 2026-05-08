-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁴⁰ P1 — documents + documents_versions (Editor-Foundation)
-- Datum: 2026-05-08
-- Status: APPLIED via Supabase MCP (m40_p1_documents_editor)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  auftrag_id UUID,
  user_id UUID NOT NULL,
  titel TEXT NOT NULL DEFAULT 'Unbenanntes Dokument',
  weg TEXT NOT NULL DEFAULT 'weg_a',          -- weg_a | weg_b | weg_c
  content_json JSONB DEFAULT '{}'::jsonb,     -- TipTap-JSON
  locked_sections JSONB DEFAULT '[]'::jsonb,  -- nur weg_c
  template_id UUID,
  status TEXT DEFAULT 'draft',
  current_version INTEGER DEFAULT 0,
  imported_from_docx BOOLEAN DEFAULT FALSE,
  imported_filename TEXT,
  imported_warnings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON public.documents(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_auftrag ON public.documents(auftrag_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON public.documents(user_id, status) WHERE deleted_at IS NULL;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_workspace ON public.documents;
CREATE POLICY documents_workspace ON public.documents
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS documents_service ON public.documents;
CREATE POLICY documents_service ON public.documents
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.documents_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  version_nr INTEGER NOT NULL,
  content_json JSONB NOT NULL,
  saved_by_user_id UUID NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  byte_size INTEGER,
  notiz TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_versions ON public.documents_versions(document_id, version_nr);
CREATE INDEX IF NOT EXISTS idx_documents_versions_doc ON public.documents_versions(document_id, saved_at DESC);

ALTER TABLE public.documents_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_versions_workspace ON public.documents_versions;
CREATE POLICY documents_versions_workspace ON public.documents_versions
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS documents_versions_service ON public.documents_versions;
CREATE POLICY documents_versions_service ON public.documents_versions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.documents IS
  'M⁴⁰ P1 — Editor-Dokumente (3-Wege-System). content_json = TipTap-JSON.';
COMMENT ON TABLE public.documents_versions IS
  'M⁴⁰ P1 — Versions-History pro Save (kein Diff, komplettes content_json gespeichert).';
