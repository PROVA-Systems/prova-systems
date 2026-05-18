-- =====================================================================
-- MEGA⁸⁹ Block B — Auto-Trial-Expiry pg_cron-Function + Schedule
-- File: supabase-migrations/69_mega89_cron_lock_expired_trials.sql
-- =====================================================================
-- Status: VORBEREITET — Marcel applied via MCP.
-- Apply: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--         name=mega89_cron_lock_expired_trials query=<dieser Inhalt>
--
-- Cron-Function locked alle Trials mit abo_trial_endet_am < NOW():
--   - abo_status: trial → pausiert
--   - max_auftraege_pro_monat: 0
--   - kuendigung_grund_kategorie: trial_expired_no_payment
--   - audit_trail-Eintrag pro Workspace
--
-- Schedule: täglich 02:00 UTC (04:00 MEZ) via pg_cron (Extension aktiv).
-- =====================================================================

-- 1. Function
CREATE OR REPLACE FUNCTION public.cron_lock_expired_trials()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH locked AS (
    UPDATE public.workspaces
    SET
      abo_status = 'pausiert',
      max_auftraege_pro_monat = 0,
      kuendigung_grund_kategorie = 'trial_expired_no_payment',
      updated_at = NOW()
    WHERE abo_status = 'trial'
      AND abo_trial_endet_am < NOW()
      AND deleted_at IS NULL
    RETURNING id, name
  ),
  result_calc AS (
    SELECT jsonb_build_object(
      'locked_count', COUNT(*),
      'workspaces', COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb),
      'executed_at', NOW()
    ) AS r FROM locked
  )
  SELECT r INTO result FROM result_calc;

  -- Audit-Log-Eintrag pro gelocktem Workspace
  INSERT INTO public.audit_trail (workspace_id, user_id, action, entity_typ, entity_id, payload, created_at)
  SELECT
    (val->>'id')::uuid,
    NULL,
    'update'::audit_action,
    'workspace',
    (val->>'id')::uuid,
    jsonb_build_object(
      'automated', true,
      'trigger', 'cron_lock_expired_trials',
      'workspace_name', val->>'name',
      'reason', 'trial_expired_no_payment'
    ),
    NOW()
  FROM jsonb_array_elements(COALESCE(result->'workspaces', '[]'::jsonb)) AS val;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.cron_lock_expired_trials() IS
  'MEGA89 Block B: Täglich 02:00 UTC via pg_cron. Locked alle trial-Workspaces deren '
  || 'abo_trial_endet_am < NOW(). Setzt abo_status=pausiert + max_auftraege=0 + '
  || 'kuendigung_grund_kategorie=trial_expired_no_payment + audit_trail-Eintrag.';

REVOKE ALL ON FUNCTION public.cron_lock_expired_trials() FROM public;
GRANT EXECUTE ON FUNCTION public.cron_lock_expired_trials() TO service_role;

-- 2. Schedule via pg_cron (idempotent — unschedule first)
DO $$
BEGIN
  PERFORM cron.unschedule('lock-expired-trials');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Job existiert noch nicht, weiter
END $$;

SELECT cron.schedule(
  'lock-expired-trials',
  '0 2 * * *',  -- täglich 02:00 UTC = 04:00 MEZ
  $$ SELECT public.cron_lock_expired_trials(); $$
);
