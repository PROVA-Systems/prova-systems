-- =====================================================================
-- MEGA⁸⁹ Block A.1 — workspace_is_writable() Helper-Function
-- File: supabase-migrations/67_mega89_workspace_is_writable.sql
-- =====================================================================
-- Status: VORBEREITET — Marcel applied via MCP.
-- Apply: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--         name=mega89_workspace_is_writable query=<dieser Inhalt>
--
-- Zentrale Helper-Function fuer RLS Read-Only-Lock. Wird in JEDER
-- INSERT/UPDATE/DELETE-Policy aller User-Content-Tabellen aufgerufen.
-- SECURITY DEFINER damit Policy auch fuer authenticated-Role evaluiert
-- werden kann ohne workspaces-SELECT-Permission auf jede Row.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.workspace_is_writable(ws_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id
      AND abo_status IN ('trial', 'aktiv')
      AND deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.workspace_is_writable(uuid) IS
  'MEGA89: Read-Only-Lock Helper. Returns true wenn Workspace Mutationen erlauben darf '
  || '(abo_status IN (trial,aktiv) AND deleted_at IS NULL). Wird in allen INSERT/UPDATE/DELETE-'
  || 'Policies aufgerufen via AND public.workspace_is_writable(workspace_id). Read-Policies '
  || 'bleiben unberuehrt — pausierte User sollen ihre Daten lesen koennen (DSGVO + Email-Versprechen).';

REVOKE ALL ON FUNCTION public.workspace_is_writable(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.workspace_is_writable(uuid) TO authenticated, service_role;
