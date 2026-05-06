-- ════════════════════════════════════════════════════════════════════════
-- MEGA³² W12b-I3 — Fristen-System (Schema-Reconciled von W10b)
-- Datum: 2026-05-11
-- Quelle: docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md (W12-I0 Audit)
-- Compliance: § 225 ZPO + DSGVO Art. 12 + § 195/199/638 BGB + VOB/B § 4/13
--
-- Pattern-Konformität:
-- - FK auf auftraege (NICHT schadensfaelle)
-- - RLS auf workspace_memberships mit is_active (NICHT workspace_members + aktiv)
-- - created_by_user_id (NICHT erstellt_von)
-- ════════════════════════════════════════════════════════════════════════

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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE frist_status AS ENUM (
    'offen',
    'erfuellt',
    'verfallen',
    'verlaengert'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.fristen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  auftrag_id UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
  frist_typ frist_typ NOT NULL,
  pipeline TEXT NULL,
  datum_soll DATE NOT NULL,
  datum_ist DATE NULL,
  status frist_status NOT NULL DEFAULT 'offen',
  erinnerung_tage_vor INTEGER[] NOT NULL DEFAULT '{14,7,3,1}',
  erinnerung_letzte_versendet_am DATE NULL,
  notiz TEXT NULL,
  rechtsgrundlage TEXT NULL,
  created_by_user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_fristen_auftrag ON public.fristen(auftrag_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fristen_workspace_offen ON public.fristen(workspace_id, datum_soll)
  WHERE deleted_at IS NULL AND status = 'offen';
CREATE INDEX IF NOT EXISTS idx_fristen_reminder_due ON public.fristen(datum_soll, erinnerung_letzte_versendet_am)
  WHERE deleted_at IS NULL AND status = 'offen';

ALTER TABLE public.fristen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fristen_workspace_select" ON public.fristen;
CREATE POLICY "fristen_workspace_select" ON public.fristen FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND is_active = TRUE
  ));

DROP POLICY IF EXISTS "fristen_workspace_insert" ON public.fristen;
CREATE POLICY "fristen_workspace_insert" ON public.fristen FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND is_active = TRUE
  ));

DROP POLICY IF EXISTS "fristen_workspace_update" ON public.fristen;
CREATE POLICY "fristen_workspace_update" ON public.fristen FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND is_active = TRUE
  ));

COMMENT ON TABLE public.fristen IS
  'W12b-I3 Schema-Reconciled — Fristen mit FK auf auftraege + 5 Pipelines.';
COMMENT ON COLUMN public.fristen.pipeline IS
  '5 Pipelines: schadensgutachten, wertgutachten, bauabnahme, schiedsgutachten, beweissicherung.';
COMMENT ON COLUMN public.fristen.rechtsgrundlage IS
  'z.B. "§ 411 Abs. 1 ZPO" — Audit-Trail.';
