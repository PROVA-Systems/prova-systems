-- ============================================================================
-- PROVA Systems — RLS-Audit-Findings Fix-Migration (PLANNED)
-- Sprint S6 Phase 2 Audit 3 — 02.05.2026
--
-- ⚠ PLANNED — NICHT auf Production applizieren ohne Marcel-Test in Dev!
-- Vorschlag-Sequenz: Dev-Branch → Tests grün → Production
--
-- Behandelt 4 Findings aus docs/audit/2026-05-02-supabase-rls-coverage.md:
--   HIGH-1   audit_trail INSERT ohne workspace_id-Konsistenz-Check
--   MEDIUM-1 stripe_events MODIFY zu permissiv
--   MEDIUM-2 workflow_errors MODIFY zu permissiv
--   MEDIUM-3 feature_events INSERT zu permissiv
--   MEDIUM-4 ki_feedback workspace_id ohne Index (Performance)
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- HIGH-1: audit_trail.audit_insert
--   user_id MUSS auth.uid() sein, workspace_id MUSS in eigenen Workspaces.
--   Verhindert Audit-Trail-Pollution durch authentifizierte User.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS audit_insert ON public.audit_trail;
CREATE POLICY audit_insert ON public.audit_trail
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT public.get_user_workspaces())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- MEDIUM-1: stripe_events MODIFY auf founder-only.
--   stripe-webhook.js Function nutzt service_role (RLS-Bypass) — keine
--   Frontend-INSERTs. Defense-in-Depth Lock.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS stripe_events_modify ON public.stripe_events;
CREATE POLICY stripe_events_modify ON public.stripe_events
  FOR ALL
  USING (public.is_founder())
  WITH CHECK (public.is_founder());

-- ─────────────────────────────────────────────────────────────────────────
-- MEDIUM-2: workflow_errors MODIFY auf founder + workspace-bound.
--   User dürfen Errors aus eigenem Workspace einsehen + ggf. updaten,
--   aber kein Cross-Workspace-INSERT.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS wf_errors_modify ON public.workflow_errors;
CREATE POLICY wf_errors_modify ON public.workflow_errors
  FOR ALL
  USING (
    public.is_founder()
    OR workspace_id IN (SELECT public.get_user_workspaces())
  )
  WITH CHECK (
    public.is_founder()
    OR (
      auth.uid() IS NOT NULL
      AND workspace_id IN (SELECT public.get_user_workspaces())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- MEDIUM-3: feature_events INSERT user_id + workspace_id-konsistent.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS events_insert ON public.feature_events;
CREATE POLICY events_insert ON public.feature_events
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR workspace_id IN (SELECT public.get_user_workspaces())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- MEDIUM-4: ki_feedback workspace_id-Index (Performance, RLS-Filter).
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ki_feedback_workspace_id
  ON public.ki_feedback(workspace_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Rollback (Marcel kann jeden Block einzeln revertieren wenn Funktions-
-- Tests Fail-Cases zeigen):
--
-- ROLLBACK audit_trail:
--   DROP POLICY audit_insert ON public.audit_trail;
--   CREATE POLICY audit_insert ON public.audit_trail
--     FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
--
-- ROLLBACK stripe_events:
--   DROP POLICY stripe_events_modify ON public.stripe_events;
--   CREATE POLICY stripe_events_modify ON public.stripe_events
--     FOR ALL USING (public.is_founder())
--     WITH CHECK (public.is_founder() OR (auth.uid() IS NOT NULL));
--
-- ROLLBACK workflow_errors:
--   DROP POLICY wf_errors_modify ON public.workflow_errors;
--   CREATE POLICY wf_errors_modify ON public.workflow_errors
--     FOR ALL USING (public.is_founder())
--     WITH CHECK (public.is_founder() OR (auth.uid() IS NOT NULL));
--
-- ROLLBACK feature_events:
--   DROP POLICY events_insert ON public.feature_events;
--   CREATE POLICY events_insert ON public.feature_events
--     FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
--
-- ROLLBACK ki_feedback Index:
--   DROP INDEX IF EXISTS public.idx_ki_feedback_workspace_id;
-- ─────────────────────────────────────────────────────────────────────────

-- Marcel-Pflicht-Test nach Apply (Production):
--   1. Audit-Trail-Test: Frontend-Direct-INSERT mit fremder workspace_id
--      muss 403/Policy-Violation liefern
--   2. Stripe-Webhook-Test: Webhook von Stripe muss weiter funktionieren
--      (service_role-Key bypass RLS)
--   3. Workflow-Errors-Test: User kann eigene Workflow-Errors einsehen
--   4. Feature-Events-Test: Frontend-Tracking-Calls funktionieren weiter
--   5. ki_feedback-Performance: SELECT mit 100+ Records bleibt < 200ms

COMMIT;

-- ============================================================================
-- ENDE PLANNED_2026-05-02_rls_audit_findings.sql
-- ============================================================================
