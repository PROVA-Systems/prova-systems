-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁹ P5 — user_favoriten (Bibliothek-Pattern)
-- Datum: 2026-05-08
-- Status: APPLIED via Supabase MCP (m39_p5_user_favoriten)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_favoriten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID,
  kategorie TEXT NOT NULL,            -- 'normen' | 'textbausteine' | 'floskeln' | 'paragraphen' | 'kontakte' | 'positionen'
  item_id TEXT NOT NULL,              -- freier String (DIN-Nr, UUID, etc.)
  item_label TEXT,                    -- Display-Label (für Quick-Access ohne 2nd-Lookup)
  reihenfolge INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_favoriten ON public.user_favoriten(user_id, kategorie, item_id);
CREATE INDEX IF NOT EXISTS ix_user_favoriten_user_kat ON public.user_favoriten(user_id, kategorie);

ALTER TABLE public.user_favoriten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_favoriten_self ON public.user_favoriten;
CREATE POLICY user_favoriten_self ON public.user_favoriten
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_favoriten_service ON public.user_favoriten;
CREATE POLICY user_favoriten_service ON public.user_favoriten
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.user_favoriten IS
  'M³⁹ P5 — Bibliothek-Pattern: User-spezifische Favoriten pro Kategorie.';
