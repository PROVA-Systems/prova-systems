-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶² Phase 0 Item 0.1+0.2 — befund_fragmente (HERZSTUECK Asset-Fusion)
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega62_befund_fragmente
-- ═══════════════════════════════════════════════════════════════════
-- Session 4 NinjaAI-Konzept Ebene 2: atomare Beobachtungen + Provenance.
-- Pipeline: Assets (Diktate/Fotos/Skizzen/Notizen) -> KI-Extraktion ->
-- befund_fragmente (status=roh) -> SV-Kuratierung -> status=gepruft ->
-- fragments-to-befund-v1 -> Befund-Entwurf mit Marker [🔗fragment-uuid].
--
-- §407a-Beweiskette: jedes Fragment hat quelle_asset_id + quelle_startzeit_ms.
-- §407a / EU AI Act Art. 50: ki_generiert + ki_protokoll_id.
-- LG Darmstadt 10.11.2025 Az. 19 O 527/16: Schutz vor "Honorar 0€".
--
-- ABGRENZUNG zu Legacy-Tabelle `befunde`: jene speichert strukturierte
-- Messwerte/Daten pro Auftrag (Pre-MEGA62, ohne workspace_id, leer).
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.befund_fragmente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auftrag_id UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  quelle_typ TEXT NOT NULL CHECK (quelle_typ IN (
    'diktat', 'foto', 'skizze', 'notiz', 'manuell', 'ki_zusammenfuehrung'
  )),
  quelle_asset_id UUID,
  quelle_startzeit_ms INTEGER,
  quelle_koordinaten JSONB,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 2000),
  tags TEXT[] NOT NULL DEFAULT '{}',
  raumbezug TEXT,
  gutachten_teil TEXT CHECK (gutachten_teil IS NULL OR gutachten_teil IN (
    'sachverhalt', 'befund', 'fachurteil', 'zusammenfassung'
  )),
  beweisfrage_bezug INTEGER[],
  reihenfolge INTEGER,
  embedding vector(1536),
  status TEXT NOT NULL DEFAULT 'roh' CHECK (status IN (
    'roh', 'gepruft', 'verworfen', 'zusammengelegt'
  )),
  zusammengelegt_in UUID REFERENCES public.befund_fragmente(id) ON DELETE SET NULL,
  ki_generiert BOOLEAN NOT NULL DEFAULT false,
  ki_protokoll_id UUID REFERENCES public.ki_protokoll(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.befund_fragmente IS
  'Atomare Beobachtungs-Snippets aus Assets (Diktate/Fotos/Skizzen/Notizen) extrahiert via Pipeline asset-to-fragments-v1. Session 4 NinjaAI-Konzept (HERZSTUECK Asset-Fusion, Ebene 2). ABGRENZUNG zu Legacy-Tabelle "befunde" (Pre-MEGA62, ohne workspace_id, leer): jene speichert strukturierte Messwerte/Daten pro Auftrag. befund_fragmente ist die neue Asset-Fusion-Pipeline-Output-Tabelle.';

COMMENT ON COLUMN public.befund_fragmente.quelle_typ IS '§407a-Beweiskette: aus welchem Asset-Typ stammt das Fragment.';
COMMENT ON COLUMN public.befund_fragmente.quelle_asset_id IS 'Polymorpher FK auf audio_dateien/fotos/skizzen/notizen je nach quelle_typ. NULL erlaubt bei quelle_typ=manuell.';
COMMENT ON COLUMN public.befund_fragmente.quelle_startzeit_ms IS 'Audio-Zeitstempel bei quelle_typ=diktat (fuer Klick-back-to-Audio).';
COMMENT ON COLUMN public.befund_fragmente.quelle_koordinaten IS 'Bounding-Box {x,y,w,h} bei quelle_typ=foto.';
COMMENT ON COLUMN public.befund_fragmente.status IS 'Kuratierungs-Lebenszyklus: roh (KI-extrahiert) -> gepruft (SV-akzeptiert) | verworfen | zusammengelegt (mit zusammengelegt_in FK).';
COMMENT ON COLUMN public.befund_fragmente.ki_generiert IS '§407a / EU AI Act Art. 50: dokumentiert ob Fragment durch KI extrahiert wurde.';

CREATE INDEX IF NOT EXISTS idx_befund_fragmente_auftrag
  ON public.befund_fragmente(auftrag_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_befund_fragmente_workspace
  ON public.befund_fragmente(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_befund_fragmente_quelle
  ON public.befund_fragmente(quelle_asset_id) WHERE quelle_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_befund_fragmente_status
  ON public.befund_fragmente(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_befund_fragmente_gutachten_teil
  ON public.befund_fragmente(gutachten_teil) WHERE gutachten_teil IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_befund_fragmente_tags
  ON public.befund_fragmente USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_befund_fragmente_ki_protokoll
  ON public.befund_fragmente(ki_protokoll_id) WHERE ki_protokoll_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_befund_fragmente_updated_at ON public.befund_fragmente;
CREATE TRIGGER trg_befund_fragmente_updated_at
  BEFORE UPDATE ON public.befund_fragmente
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.befund_fragmente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS befund_fragmente_select ON public.befund_fragmente;
CREATE POLICY befund_fragmente_select ON public.befund_fragmente
  FOR SELECT
  USING ((workspace_id IN (SELECT get_user_workspaces())) OR is_founder());

DROP POLICY IF EXISTS befund_fragmente_modify ON public.befund_fragmente;
CREATE POLICY befund_fragmente_modify ON public.befund_fragmente
  FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT get_user_workspaces()));

-- ═══════════════════════════════════════════════════════════════════
-- Verifikation (nach Apply ausfuehren):
--   SELECT count(*) FROM public.befund_fragmente;   -- 0 expected
--   SELECT rowsecurity FROM pg_tables WHERE tablename='befund_fragmente';
--   SELECT policyname FROM pg_policies WHERE tablename='befund_fragmente';
-- ═══════════════════════════════════════════════════════════════════
