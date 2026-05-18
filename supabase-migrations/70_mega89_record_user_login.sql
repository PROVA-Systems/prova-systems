-- =====================================================================
-- MEGA⁸⁹ Block C — record_user_login() Function für Session-Tracking
-- File: supabase-migrations/70_mega89_record_user_login.sql
-- =====================================================================
-- Status: VORBEREITET — Marcel applied via MCP.
--
-- Atomarer Login-Tracking-Insert: user_sessions + users.last_login_at +
-- audit_trail in einer Transaction. Wird vom Frontend nach erfolgreichem
-- signInWithPassword/mfa.verify aufgerufen.
--
-- VORAUSSETZUNG: users.last_login_at + users.last_active_at existieren.
-- Falls nicht: zuerst per ALTER TABLE ergänzen.
-- =====================================================================

-- Defensive: Spalten anlegen falls sie nicht existieren
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE OR REPLACE FUNCTION public.record_user_login(
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_typ text DEFAULT 'unknown',
  p_ip_country text DEFAULT NULL,
  p_ip_city text DEFAULT NULL,
  p_device_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_ws_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'record_user_login: auth.uid() ist NULL — Function nur fuer authenticated User';
  END IF;

  -- Letzten aktiven Workspace ermitteln
  SELECT workspace_id INTO v_ws_id
  FROM public.workspace_memberships
  WHERE user_id = v_user_id AND is_active = true
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  -- users.last_login_at updaten
  UPDATE public.users
    SET last_login_at = NOW(),
        last_active_at = NOW()
  WHERE id = v_user_id;

  -- user_sessions Eintrag
  INSERT INTO public.user_sessions (
    user_id, device_typ, device_name,
    user_agent, ip_address, ip_country, ip_city,
    started_at, last_activity_at
  ) VALUES (
    v_user_id,
    COALESCE(p_device_typ, 'unknown'),
    p_device_name,
    p_user_agent, p_ip_address, p_ip_country, p_ip_city,
    NOW(), NOW()
  ) RETURNING id INTO v_session_id;

  -- Audit-Trail
  INSERT INTO public.audit_trail (workspace_id, user_id, action, entity_typ, entity_id, payload, ip_address, user_agent, created_at)
  VALUES (
    v_ws_id, v_user_id, 'login'::audit_action, 'user', v_user_id,
    jsonb_build_object(
      'session_id', v_session_id,
      'device', p_device_typ,
      'country', p_ip_country,
      'source', 'record_user_login'
    ),
    p_ip_address, p_user_agent, NOW()
  );

  RETURN v_session_id;
END;
$$;

COMMENT ON FUNCTION public.record_user_login(inet, text, text, text, text, text) IS
  'MEGA89 Block C: Atomarer Login-Tracking-Insert. Aufruf nach signInWithPassword + mfa.verify. '
  || 'Updates users.last_login_at + Inserts user_sessions + audit_trail in einer Transaction.';

REVOKE ALL ON FUNCTION public.record_user_login(inet, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_user_login(inet, text, text, text, text, text) TO authenticated, service_role;
