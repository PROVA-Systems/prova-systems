-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁴⁰ P2 — document_images (Editor-Bild-Tracking)
-- Datum: 2026-05-08
-- Status: PLANNED — Marcel apply via Supabase MCP nach Sprint-Review
-- ═══════════════════════════════════════════════════════════════════
--
-- Zweck: Bilder, die im TipTap-Editor eingefügt werden, separat
-- tracken (nicht als TipTap-JSON-Inline) für:
--   - DSGVO-Audit (welche Bilder pro workspace/user existieren)
--   - Storage-Cleanup (orphaned-image-detection nach 30 Tagen)
--   - Re-Use über mehrere Dokumente
--   - exif_stripped-Tracking pro Datei
--
-- Storage: 'sv-files/editor-images/<workspace_id>/<uuid>.<ext>'
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.document_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  document_id UUID,                              -- optional, beim Insert via Editor leer
  storage_path TEXT NOT NULL,                    -- editor-images/<wsid>/<uuid>.jpg
  url TEXT,                                      -- public URL (Supabase Storage)
  mime_type TEXT NOT NULL,
  byte_size BIGINT,
  alt TEXT,                                      -- Alt-Text (Accessibility-Pflicht)
  caption TEXT,                                  -- Bildunterschrift
  filename TEXT,                                 -- Original-Dateiname
  width INTEGER,
  height INTEGER,
  exif_stripped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_document_images_workspace
  ON public.document_images(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_images_document
  ON public.document_images(document_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_images_user_created
  ON public.document_images(user_id, created_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE public.document_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_images_workspace_select ON public.document_images;
CREATE POLICY document_images_workspace_select ON public.document_images
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS document_images_workspace_insert ON public.document_images;
CREATE POLICY document_images_workspace_insert ON public.document_images
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS document_images_workspace_update ON public.document_images;
CREATE POLICY document_images_workspace_update ON public.document_images
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS document_images_workspace_delete ON public.document_images;
CREATE POLICY document_images_workspace_delete ON public.document_images
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.document_images IS 'MEGA⁴⁰ P2: Editor-Bild-Tracking; storage_path zeigt auf sv-files Bucket; exif_stripped=TRUE für JPEG-Uploads';
