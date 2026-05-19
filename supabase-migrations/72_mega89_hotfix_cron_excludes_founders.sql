-- =====================================================================
-- MEGA⁸⁹ Hotfix — cron_lock_expired_trials() excludes Super-Admins
-- File: supabase-migrations/72_mega89_hotfix_cron_excludes_founders.sql
-- =====================================================================
-- Incident 19.05.2026: Erster Cron-Run hat Marcel's 2 eigene Workspaces
-- (56e8ea96-* + 65b25a13-*) auf abo_status='pausiert' + max_auftraege=0
-- gesetzt, weil ihre abo_trial_endet_am < NOW() war.
--
-- Fix: Function ergänzt um Founder-Exclude — Workspaces deren Owner
-- users.is_founder=true ist, werden NIE auto-gelockt.
--
-- Restore manuell:
--   UPDATE public.workspaces SET abo_status='aktiv', max_auftraege_pro_monat=999
--     WHERE id IN ('56e8ea96-...', '65b25a13-...');
--   UPDATE public.users SET is_founder=true WHERE id='68b27e9e-...';
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cron_lock_expired_trials()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result jsonb;
BEGIN
  WITH locked AS (
    UPDATE public.workspaces
    SET abo_status = 'pausiert',
        max_auftraege_pro_monat = 0,
        kuendigung_grund_kategorie = 'trial_expired_no_payment',
        updated_at = NOW()
    WHERE abo_status = 'trial'
      AND abo_trial_endet_am < NOW()
      AND deleted_at IS NULL
      -- HOTFIX: Super-Admin/Founder-Workspaces ausschliessen
      AND id NOT IN (
        SELECT wm.workspace_id FROM public.workspace_memberships wm
        JOIN public.users u ON u.id = wm.user_id
        WHERE wm.rolle = 'owner'
          AND wm.is_active = true
          AND COALESCE(u.is_founder, false) = true
      )
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

  INSERT INTO public.audit_trail (workspace_id, user_id, action, entity_typ, entity_id, payload, created_at)
  SELECT (val->>'id')::uuid, NULL, 'update'::audit_action, 'workspace', (val->>'id')::uuid,
    jsonb_build_object(
      'automated', true,
      'trigger', 'cron_lock_expired_trials',
      'workspace_name', val->>'name',
      'reason', 'trial_expired_no_payment',
      'excludes', 'super_admin_founders'
    ), NOW()
  FROM jsonb_array_elements(COALESCE(result->'workspaces', '[]'::jsonb)) AS val;

  RETURN result;
END; $$;

COMMENT ON FUNCTION public.cron_lock_expired_trials() IS
  'MEGA89 Hotfix 19.05.2026: Super-Admin-Workspaces (owner.is_founder=true) werden NIE gelockt — '
  || 'Marcel hatte einen Auto-Lock seiner eigenen 2 Workspaces erlitten beim ersten cron-Run. '
  || 'Schedule via cron.schedule(''lock-expired-trials'', ''0 2 * * *'', ...) — siehe Marcel-Checklist.';
