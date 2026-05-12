-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶² Phase 0 Item 0.12 — audit_trail.kategorie (Notion-Pattern)
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega62_audit_trail_kategorie
-- ═══════════════════════════════════════════════════════════════════
-- Filter-Hierarchie fuer Historie-Tab. action-Enum bleibt unveraendert.
-- kategorie wird oberhalb der action-Granularitaet angesiedelt fuer UI:
--   auth | datenbearbeitung | ki_einsatz | export_versand | systemzugriff
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS kategorie TEXT
  CHECK (kategorie IN (
    'auth',
    'datenbearbeitung',
    'ki_einsatz',
    'export_versand',
    'systemzugriff'
  ));

COMMENT ON COLUMN public.audit_trail.kategorie IS 'Notion-Pattern fuer Historie-Tab-Filter: auth (Login/Logout/2FA), datenbearbeitung (Create/Update/Delete), ki_einsatz (alle KI-Calls), export_versand (PDF/Email), systemzugriff (DSGVO/Admin/Impersonate).';

-- Heuristische Migration bestehender Rows (action-Enum -> kategorie)
UPDATE public.audit_trail SET kategorie = 'auth'
  WHERE kategorie IS NULL
    AND action IN ('login','logout','login_failed');

UPDATE public.audit_trail SET kategorie = 'ki_einsatz'
  WHERE kategorie IS NULL
    AND action IN ('ki_request','ki_response');

UPDATE public.audit_trail SET kategorie = 'export_versand'
  WHERE kategorie IS NULL
    AND action IN ('export','pdf_generate','pdf_view','pdf_send');

UPDATE public.audit_trail SET kategorie = 'systemzugriff'
  WHERE kategorie IS NULL
    AND action IN ('data_export_dsgvo','data_delete_dsgvo','workspace_invite','workspace_remove_member');

UPDATE public.audit_trail SET kategorie = 'datenbearbeitung'
  WHERE kategorie IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_trail_kategorie
  ON public.audit_trail(kategorie, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_workspace_kategorie
  ON public.audit_trail(workspace_id, kategorie, created_at DESC);
