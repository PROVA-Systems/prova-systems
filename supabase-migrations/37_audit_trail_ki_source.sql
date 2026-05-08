-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁴¹ P2 — audit_trail KI-vs-SV-Trennung (gerichtsfest)
-- Datum: 2026-05-08
-- Status: PLANNED — Marcel apply via Supabase MCP
-- ═══════════════════════════════════════════════════════════════════
--
-- Erweitert bestehende audit_trail-Tabelle (Migration 01) um:
--   - source ENUM ('ki', 'sv_eigen', 'sv_uebernommen', 'system', 'admin_impersonate')
--   - ki_model TEXT (für KI-Modell-Tracking)
--   - ki_confidence NUMERIC(3,2) (0.00-1.00)
--   - eu_ai_act_disclosed BOOLEAN (für EU AI Act Art. 50 Compliance)
--   - original_ki_ref UUID (bei sv_uebernommen: Rückreferenz zum KI-Eintrag)
--   - prev_hash TEXT (Hash-Chain für TR-ESOR-Beweissicherheit)
-- ═══════════════════════════════════════════════════════════════════

-- ENUM audit_source
DO $$ BEGIN
  CREATE TYPE audit_source AS ENUM (
    'ki',                  -- KI-generierter Inhalt (gpt-5.5/gpt-5.5-instant)
    'sv_eigen',            -- SV-direkte Eingabe
    'sv_uebernommen',      -- SV hat KI-Vorschlag akzeptiert
    'system',              -- System-Action (Rate-Limit, Auth, etc.)
    'admin_impersonate'    -- Admin als anderer User
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Spalten-Erweiterung
ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS source audit_source DEFAULT 'system';

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS ki_model TEXT;

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS ki_confidence NUMERIC(3,2)
    CHECK (ki_confidence IS NULL OR (ki_confidence >= 0 AND ki_confidence <= 1));

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS eu_ai_act_disclosed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS original_ki_ref UUID
    REFERENCES public.audit_trail(id) ON DELETE SET NULL;

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS prev_hash TEXT;

-- Indizes für Performance (Audit-Viewer + Compliance-Queries)
CREATE INDEX IF NOT EXISTS idx_audit_source
  ON public.audit_trail(source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_workspace_source
  ON public.audit_trail(workspace_id, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_eu_ai_act
  ON public.audit_trail(eu_ai_act_disclosed, created_at DESC)
  WHERE eu_ai_act_disclosed = TRUE;

CREATE INDEX IF NOT EXISTS idx_audit_original_ki_ref
  ON public.audit_trail(original_ki_ref)
  WHERE original_ki_ref IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.audit_trail.source IS 'KI-vs-SV-Trennung: ki/sv_eigen/sv_uebernommen/system/admin_impersonate';
COMMENT ON COLUMN public.audit_trail.ki_model IS 'KI-Modell-Name (gpt-5.5, gpt-5.5-instant) — NIEMALS gpt-4o (deprecated Feb 2026)';
COMMENT ON COLUMN public.audit_trail.ki_confidence IS '0.00-1.00 — Selbsteinschätzung der KI bei Bewertungs-Tasks';
COMMENT ON COLUMN public.audit_trail.eu_ai_act_disclosed IS 'EU AI Act VO 2024/1689 Art. 50: Disclosure-Stempel auf KI-Inhalt erfolgt';
COMMENT ON COLUMN public.audit_trail.original_ki_ref IS 'Bei sv_uebernommen: UUID des Original-KI-Audit-Eintrags';
COMMENT ON COLUMN public.audit_trail.prev_hash IS 'Hash-Chain (TR-ESOR): SHA256 des vorigen Eintrags zur Lückenlos-Verifikation';

-- View für Eigenleistungs-Quote pro Auftrag
CREATE OR REPLACE VIEW public.v_auftrag_eigenleistung_quote AS
SELECT
  workspace_id,
  (payload->>'auftrag_id')::uuid AS auftrag_id,
  COUNT(*) FILTER (WHERE source = 'ki')              AS ki_count,
  COUNT(*) FILTER (WHERE source = 'sv_eigen')        AS sv_eigen_count,
  COUNT(*) FILTER (WHERE source = 'sv_uebernommen')  AS sv_uebernommen_count,
  COUNT(*) FILTER (WHERE source IN ('ki', 'sv_eigen', 'sv_uebernommen')) AS total_inhalt,
  CASE
    WHEN COUNT(*) FILTER (WHERE source IN ('ki', 'sv_eigen', 'sv_uebernommen')) = 0 THEN 0
    ELSE ROUND(
      (COUNT(*) FILTER (WHERE source IN ('sv_eigen', 'sv_uebernommen'))::numeric /
       COUNT(*) FILTER (WHERE source IN ('ki', 'sv_eigen', 'sv_uebernommen'))::numeric) * 100,
      1
    )
  END AS eigenleistung_prozent
FROM public.audit_trail
WHERE payload->>'auftrag_id' IS NOT NULL
GROUP BY workspace_id, (payload->>'auftrag_id')::uuid;

COMMENT ON VIEW public.v_auftrag_eigenleistung_quote IS
  'MEGA⁴¹ P2: Eigenleistungs-Quote pro Auftrag fuer §407a ZPO Compliance.';
