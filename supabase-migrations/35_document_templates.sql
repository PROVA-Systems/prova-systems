-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁴⁰ P7 — document_templates (Vorlagen-System)
-- Datum: 2026-05-08
-- Status: PLANNED — Marcel apply via Supabase MCP
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,                             -- NULL = global (PROVA-Default)
  user_id UUID,                                  -- NULL = global
  titel TEXT NOT NULL,
  beschreibung TEXT,
  kategorie TEXT,                                -- z.B. 'F-04', 'F-09', 'gutachten', etc.
  weg TEXT NOT NULL DEFAULT 'weg_a',
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'user',           -- 'user' | 'prova_default' | 'docx_import'
  is_global BOOLEAN NOT NULL DEFAULT FALSE,      -- TRUE = workspace_id IS NULL = global
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_doc_templates_workspace
  ON public.document_templates(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_templates_global
  ON public.document_templates(is_global) WHERE deleted_at IS NULL AND is_global = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_templates_kat
  ON public.document_templates(kategorie) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_templates_use_count
  ON public.document_templates(use_count DESC, last_used_at DESC NULLS LAST) WHERE deleted_at IS NULL;

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT global OR own-workspace
DROP POLICY IF EXISTS doc_templates_select ON public.document_templates;
CREATE POLICY doc_templates_select ON public.document_templates
  FOR SELECT USING (
    is_global = TRUE OR
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

-- Policy: INSERT nur in eigenen Workspace (kein Global-Insert via Frontend)
DROP POLICY IF EXISTS doc_templates_insert ON public.document_templates;
CREATE POLICY doc_templates_insert ON public.document_templates
  FOR INSERT WITH CHECK (
    is_global = FALSE AND
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

-- Policy: UPDATE nur eigene (kein Update an Global)
DROP POLICY IF EXISTS doc_templates_update ON public.document_templates;
CREATE POLICY doc_templates_update ON public.document_templates
  FOR UPDATE USING (
    is_global = FALSE AND
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

-- Policy: DELETE nur eigene
DROP POLICY IF EXISTS doc_templates_delete ON public.document_templates;
CREATE POLICY doc_templates_delete ON public.document_templates
  FOR DELETE USING (
    is_global = FALSE AND
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════
-- 5 PROVA-Default-Vorlagen (Seed-Daten — global lesbar)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.document_templates
  (workspace_id, user_id, titel, beschreibung, kategorie, weg, content_json, source, is_global)
VALUES
  (NULL, NULL, 'Beweisbeschluss-Antwort (F-04)',
   'Standard-Antwortschreiben für gerichtliche Beweisbeschlüsse — mit §404a-Compliance-Block.',
   'F-04', 'weg_c',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Beweisbeschluss-Antwort"}]},{"type":"paragraph","content":[{"type":"text","text":"Sehr geehrte Damen und Herren,"}]},{"type":"paragraph","content":[{"type":"text","text":"in obiger Sache nehme ich Bezug auf den Beweisbeschluss vom {{Beweisbeschluss_Datum}} und bestätige die Übernahme des Auftrags."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Auftragsumfang"}]},{"type":"paragraph","content":[{"type":"text","text":"{{Beweisfragen}}"}]}]}'::jsonb,
   'prova_default', TRUE),

  (NULL, NULL, 'Stellungnahme-Kurz (F-09)',
   'Kurze Sachverständigenstellungnahme — typisch ≤5 Seiten.',
   'F-09', 'weg_a',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Stellungnahme"}]},{"type":"paragraph","content":[{"type":"text","text":"Aktenzeichen: {{Aktenzeichen}}"}]},{"type":"paragraph","content":[{"type":"text","text":"Datum: {{Datum}}"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"§ 1 Sachverhalt"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"§ 6 Fachurteil"}]},{"type":"paragraph"}]}'::jsonb,
   'prova_default', TRUE),

  (NULL, NULL, 'Schadens-Kurzgutachten (F-10)',
   'Schaden A — Bauwerk-Schaden, Soll-Ist-Vergleich, Mängel-Liste.',
   'F-10', 'weg_a',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Schadens-Kurzgutachten"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"§ 1 Auftrag und Sachverhalt"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"§ 2 Ortstermin"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"§ 3 Befund"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Mangel 1: …"}]}]}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"§ 6 Fachurteil"}]},{"type":"paragraph"}]}'::jsonb,
   'prova_default', TRUE),

  (NULL, NULL, 'Wertgutachten Kompakt (F-15)',
   'Flow B — Sachwert + Vergleichswert, kompakt für Standard-Fälle.',
   'F-15', 'weg_c',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Verkehrswertgutachten (kompakt)"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"1. Auftraggeber + Bewertungsobjekt"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"2. Sachwertverfahren"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"3. Vergleichswertverfahren"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"4. Verkehrswertfeststellung"}]},{"type":"paragraph"}]}'::jsonb,
   'prova_default', TRUE),

  (NULL, NULL, 'Beratungs-Begutachtung (F-19)',
   'Flow C — Beratungs-Stellungnahme, technische Klärung ohne fachgerichtlichen Anspruch.',
   'F-19', 'weg_a',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Beratungs-Begutachtung"}]},{"type":"paragraph","content":[{"type":"text","text":"Hinweis: Diese Begutachtung erfolgt im Rahmen einer beratenden Tätigkeit (§ 407a ZPO ist nicht einschlägig)."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Fragestellung"}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Fachliche Einordnung"}]},{"type":"paragraph"}]}'::jsonb,
   'prova_default', TRUE)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.document_templates IS 'MEGA⁴⁰ P7: Vorlagen-System; is_global=TRUE = PROVA-Default (workspace_id NULL), sonst workspace-isoliert.';
