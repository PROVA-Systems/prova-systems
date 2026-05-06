-- ════════════════════════════════════════════════════════════════════════
-- MEGA³⁰ W10-I5 — Einträge-System Foundation (Audit-Blocker A)
-- Datum: 2026-05-10
-- Quellen: docs/sprint-status/MEGA-30-W10-I0-RECHERCHE.md (11 Quellen)
-- Compliance: DSGVO Art. 5/32, HGB § 257, AO § 147, JVEG § 8/12, IHK-SVO § 10
-- ════════════════════════════════════════════════════════════════════════

-- ENUM eintrag_typ (8 Werte aus W10-I0-Recherche)
DO $$ BEGIN
  CREATE TYPE eintrag_typ AS ENUM (
    'ortstermin',
    'telefonat',
    'email',
    'recherche',
    'gutachten-arbeit',
    'akteneinsicht',
    'korrespondenz',
    'sonstiges'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabelle: eintraege (gerichtsfeste Chronologie + JVEG-Stundenzettel)
CREATE TABLE IF NOT EXISTS public.eintraege (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schadensfall_id UUID NOT NULL,  -- FK zu auftraege/schadensfaelle, je nach Schema
  workspace_id UUID NOT NULL,      -- für RLS
  eintrag_typ eintrag_typ NOT NULL,
  datum DATE NOT NULL,
  uhrzeit_von TIME NULL,
  dauer_min INTEGER NOT NULL DEFAULT 0,  -- für JVEG § 12 Stundenabrechnung
  beschreibung_text TEXT NOT NULL,
  anhang_files JSONB DEFAULT '[]',        -- Array von {url, name, size, mime}
  abrechenbar BOOLEAN NOT NULL DEFAULT TRUE, -- JVEG-relevant
  abgerechnet BOOLEAN NOT NULL DEFAULT FALSE, -- Marker nach Rechnung
  rechnung_id UUID NULL,                  -- FK zu rechnungen (nach Abrechnung)
  erstellt_von UUID NOT NULL,             -- FK zu users
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  geaendert_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL              -- Soft-Delete (DSGVO Art. 17)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eintraege_schadensfall ON public.eintraege(schadensfall_id, datum DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eintraege_workspace ON public.eintraege(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eintraege_abrechenbar ON public.eintraege(workspace_id, abrechenbar, abgerechnet) WHERE deleted_at IS NULL AND abrechenbar = TRUE;

-- RLS: workspace-bezogen
ALTER TABLE public.eintraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eintraege_workspace_select" ON public.eintraege
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.user_workspaces
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "eintraege_workspace_insert" ON public.eintraege
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.user_workspaces
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "eintraege_workspace_update" ON public.eintraege
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.user_workspaces
      WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE public.eintraege IS
  'Sprint 06 B1 — Einträge-System: gerichtsfeste Chronologie pro Schadensfall + JVEG-Stundenzettel-Foundation. MEGA³⁰ W10-I5.';
COMMENT ON COLUMN public.eintraege.dauer_min IS
  'Dauer in Minuten für JVEG § 12 Stundenabrechnung. 0 = nicht-abrechenbar (z.B. interne Notiz).';
COMMENT ON COLUMN public.eintraege.abrechenbar IS
  'TRUE = Eintrag fließt in Honorarrechnung (JVEG § 8). FALSE = interne Doku ohne Abrechnungs-Relevanz.';
COMMENT ON COLUMN public.eintraege.deleted_at IS
  'Soft-Delete für DSGVO Art. 17 + Compliance HGB § 257 (10 Jahre Aufbewahrung). Cron-Job purged nach Aufbewahrungsfrist.';
