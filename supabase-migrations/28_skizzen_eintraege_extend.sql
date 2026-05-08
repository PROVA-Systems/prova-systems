-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁹ P3 — Skizzen-Funktion (Tier 1+2) Schema-Extension
-- Datum: 2026-05-08
-- Status: APPLIED via Supabase MCP (m39_p3a_eintrag_typ_skizze_enum + m39_p3b_skizzen_columns)
-- ═══════════════════════════════════════════════════════════════════

-- 28a — ENUM eintrag_typ um 'skizze' erweitern (eigene Transaction!)
ALTER TYPE eintrag_typ ADD VALUE IF NOT EXISTS 'skizze';

-- 28b — Skizze-spezifische Spalten in eintraege
ALTER TABLE public.eintraege
  ADD COLUMN IF NOT EXISTS skizze_data JSONB,
  ADD COLUMN IF NOT EXISTS skizze_image_url TEXT,
  ADD COLUMN IF NOT EXISTS skizze_nr INTEGER;

COMMENT ON COLUMN public.eintraege.skizze_data IS
  'M³⁹ P3 — Skizze-JSON: {tier, canvas_w/h, background, strokes, markers[], scale}.';
COMMENT ON COLUMN public.eintraege.skizze_image_url IS
  'M³⁹ P3 — PNG-Render-Result in Supabase Storage. Wird im PDF eingebettet.';
COMMENT ON COLUMN public.eintraege.skizze_nr IS
  'M³⁹ P3 — Multi-Skizze pro Auftrag: 1, 2, 3 …';

CREATE INDEX IF NOT EXISTS idx_eintraege_skizze
  ON public.eintraege(auftrag_id, skizze_nr)
  WHERE typ = 'skizze';
