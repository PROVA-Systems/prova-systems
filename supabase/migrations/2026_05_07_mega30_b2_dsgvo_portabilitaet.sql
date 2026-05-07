-- ════════════════════════════════════════════════════════════════════════
-- MEGA³⁰ B2 — DSGVO Art. 20 Datenportabilität
-- Datum: 2026-05-07
-- Apply'd via Supabase-MCP. Vervollständigt 3-Funktion-Trio (Regel 19).
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.dsgvo_user_portabilitaet(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_caller UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_caller := auth.uid();
  v_is_admin := EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_caller AND role IN ('admin', 'founder')
  );
  IF v_caller IS DISTINCT FROM p_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: nur eigene Daten oder Admin'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'export_meta', jsonb_build_object(
      'user_id', p_user_id,
      'exported_at', now(),
      'format_version', '1.0',
      'dsgvo_artikel', 'Art. 20 Datenportabilität'
    ),
    'profile', (SELECT row_to_json(u.*) FROM public.users u WHERE u.id = p_user_id),
    'workspaces', COALESCE((
      SELECT jsonb_agg(row_to_json(w.*))
      FROM public.workspace_memberships wm
      JOIN public.workspaces w ON w.id = wm.workspace_id
      WHERE wm.user_id = p_user_id
    ), '[]'::jsonb),
    'auftraege', COALESCE((
      SELECT jsonb_agg(row_to_json(a.*))
      FROM public.auftraege a
      WHERE a.created_by_user_id = p_user_id AND a.deleted_at IS NULL
    ), '[]'::jsonb),
    'kontakte', COALESCE((
      SELECT jsonb_agg(row_to_json(k.*))
      FROM public.kontakte k
      WHERE k.workspace_id IN (
        SELECT workspace_id FROM public.workspace_memberships
        WHERE user_id = p_user_id AND is_active = TRUE
      )
    ), '[]'::jsonb),
    'eintraege', COALESCE((
      SELECT jsonb_agg(row_to_json(e.*))
      FROM public.eintraege e
      WHERE e.created_by_user_id = p_user_id AND e.deleted_at IS NULL
    ), '[]'::jsonb),
    'einwilligungen', COALESCE((
      SELECT jsonb_agg(row_to_json(ew.*))
      FROM public.einwilligungen ew
      WHERE ew.user_id = p_user_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.dsgvo_user_portabilitaet IS
  'MEGA³⁰ B2: DSGVO Art. 20 Datenportabilität. Returns strukturiertes JSONB für Anbieter-Wechsel.';
