-- ════════════════════════════════════════════════════════════════════════
-- MEGA³⁰ W10-I7 — Fristen-System Foundation (Audit-Blocker C)
-- Datum: 2026-05-10
-- Quellen: docs/sprint-status/MEGA-30-W10-I0-RECHERCHE.md (11 Quellen)
-- Compliance: § 225 ZPO + DSGVO Art. 12 + § 195/199/638 BGB + VOB/B § 4/13
-- ════════════════════════════════════════════════════════════════════════

-- ENUM frist_typ (8 Werte für 5 Pipelines)
DO $$ BEGIN
  CREATE TYPE frist_typ AS ENUM (
    'gericht',
    'gutachten-erstattung',
    'honorar',
    'widerspruch',
    'akteneinsicht',
    'zeugen',
    'parteien',
    'ortstermin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ENUM frist_status
DO $$ BEGIN
  CREATE TYPE frist_status AS ENUM (
    'offen',
    'erfuellt',
    'verfallen',
    'verlaengert'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabelle: fristen
CREATE TABLE IF NOT EXISTS public.fristen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schadensfall_id UUID NOT NULL,
  workspace_id UUID NOT NULL,        -- für RLS
  frist_typ frist_typ NOT NULL,
  pipeline TEXT NULL,                 -- 'schadensgutachten' | 'wertgutachten' | 'bauabnahme' | 'schiedsgutachten' | 'beweissicherung'
  datum_soll DATE NOT NULL,
  datum_ist DATE NULL,                -- bei status='erfuellt'
  status frist_status NOT NULL DEFAULT 'offen',
  erinnerung_tage_vor INTEGER[] NOT NULL DEFAULT '{14,7,3,1}',
  erinnerung_letzte_versendet_am DATE NULL, -- für Cron-Reminder-Tracking
  notiz TEXT NULL,
  rechtsgrundlage TEXT NULL,         -- z.B. "§ 411 Abs. 1 ZPO" für Audit-Trail
  erstellt_von UUID NOT NULL,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  geaendert_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fristen_schadensfall ON public.fristen(schadensfall_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fristen_workspace_offen ON public.fristen(workspace_id, datum_soll) WHERE deleted_at IS NULL AND status = 'offen';
CREATE INDEX IF NOT EXISTS idx_fristen_reminder_due ON public.fristen(datum_soll, erinnerung_letzte_versendet_am) WHERE deleted_at IS NULL AND status = 'offen';

-- RLS: workspace-bezogen
ALTER TABLE public.fristen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fristen_workspace_select" ON public.fristen
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "fristen_workspace_insert" ON public.fristen
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "fristen_workspace_update" ON public.fristen
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM public.user_workspaces WHERE user_id = auth.uid())
  );

-- Comments
COMMENT ON TABLE public.fristen IS
  'Sprint 11 B6 — Fristen-System: 5 Pipelines + 8 Frist-Typen + Reminder-Cron. MEGA³⁰ W10-I7.';
COMMENT ON COLUMN public.fristen.erinnerung_tage_vor IS
  'Reminder-Pattern in Tagen vor datum_soll. Default: 14/7/3/1. Cron-Job sendet Reminder-Mail wenn (datum_soll - heute) IN diesem Array.';
COMMENT ON COLUMN public.fristen.pipeline IS
  '5 Pipelines: schadensgutachten, wertgutachten, bauabnahme, schiedsgutachten, beweissicherung.';
COMMENT ON COLUMN public.fristen.rechtsgrundlage IS
  'Rechts-Verweis als String z.B. "§ 411 Abs. 1 ZPO" — für Audit-Trail + Compliance-Doku.';
