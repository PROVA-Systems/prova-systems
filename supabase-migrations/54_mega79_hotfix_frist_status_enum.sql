-- =====================================================================
-- MEGA79 Hotfix — Datum: 2026-05-15
-- File: supabase-migrations/54_mega79_hotfix_frist_status_enum.sql
-- =====================================================================
-- Status: APPLIED auf Production am 2026-05-15 13:11 via Supabase MCP
--         (Web-Claude live während MEGA79-Test gefunden + sofort gefixt)
--
-- Drift-Grund: frist_status-Enum heißt 'erfuellt' (nicht 'erledigt').
-- Migration 53 hatte 'erledigt' im Filter, was kein Match auf existierende
-- Rows produziert hätte. Function hätte stille Drift erzeugt (auch erfuellt
-- Fristen wären in der Erinnerungs-Schleife gelandet wenn datum_soll passt).
--
-- Schema-Wahrheit (per MCP 2026-05-15):
--   enum frist_status = {offen, erfuellt, verfallen, verlaengert}
--
-- Diese File macht das Repo wieder konsistent zur Live-Database.
-- Inhalt = exakte SQL die via apply_migration angewendet wurde.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.process_fristen_erinnerungen()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_processed         int := 0;
  v_skipped_disabled  int := 0;
  v_skipped_quiet     int := 0;
  v_today             date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  v_now_time          time := (now() AT TIME ZONE 'Europe/Berlin')::time;
  r                   record;
  user_ns             jsonb;
  tage_vor_array      int[];
  diff_days           int;
  v_kategorie         notification_kategorie;
BEGIN
  FOR r IN
    SELECT
      f.id            AS frist_id,
      f.workspace_id,
      f.auftrag_id,
      f.frist_typ,
      f.datum_soll,
      f.notiz,
      f.erinnerung_tage_vor,
      u.id            AS user_id,
      u.notification_settings
    FROM public.fristen f
    JOIN public.workspace_memberships wm
      ON wm.workspace_id = f.workspace_id AND wm.is_active = true
    JOIN public.users u
      ON u.id = wm.user_id
     AND u.deleted_at IS NULL
    WHERE f.deleted_at IS NULL
      AND f.status NOT IN ('erfuellt', 'verfallen')      -- HOTFIX: erfuellt statt erledigt
      AND f.datum_soll IS NOT NULL
      AND (
        f.erinnerung_letzte_versendet_am IS NULL OR
        f.erinnerung_letzte_versendet_am < v_today
      )
  LOOP
    user_ns := COALESCE(r.notification_settings, '{}'::jsonb);
    tage_vor_array := COALESCE(
      r.erinnerung_tage_vor,
      ARRAY(SELECT jsonb_array_elements_text(user_ns->'fristen_alarm_tage_vor'))::int[],
      ARRAY[7, 3, 1]
    );
    diff_days := r.datum_soll - v_today;
    IF NOT (diff_days = ANY(tage_vor_array)) THEN CONTINUE; END IF;
    IF NOT COALESCE((user_ns->>'fristen_alarm_enabled')::boolean, true) THEN
      v_skipped_disabled := v_skipped_disabled + 1; CONTINUE;
    END IF;
    IF COALESCE((user_ns->>'quiet_hours_enabled')::boolean, false) THEN
      IF (v_now_time >= COALESCE((user_ns->>'quiet_hours_start')::time, time '22:00')
          OR v_now_time < COALESCE((user_ns->>'quiet_hours_end')::time, time '07:00')) THEN
        v_skipped_quiet := v_skipped_quiet + 1; CONTINUE;
      END IF;
    END IF;
    v_kategorie := CASE WHEN diff_days <= 1 THEN 'achtung'::notification_kategorie
                        ELSE 'aufgaben'::notification_kategorie END;
    INSERT INTO public.notifications (user_id, workspace_id, kategorie, titel, body, link_typ, link_id, link_url)
    VALUES (r.user_id, r.workspace_id, v_kategorie,
      CASE WHEN diff_days = 0 THEN 'Frist heute fällig: ' || COALESCE(r.frist_typ::text, 'Frist')
           WHEN diff_days = 1 THEN 'Frist morgen fällig: ' || COALESCE(r.frist_typ::text, 'Frist')
           ELSE 'Frist in ' || diff_days || ' Tagen: ' || COALESCE(r.frist_typ::text, 'Frist') END,
      COALESCE(r.notiz, 'Bitte rechtzeitig bearbeiten'),
      'frist', r.frist_id,
      CASE WHEN r.auftrag_id IS NOT NULL THEN '/akte.html?id=' || r.auftrag_id
           ELSE '/fristen.html?id=' || r.frist_id END);
    v_processed := v_processed + 1;
  END LOOP;

  UPDATE public.fristen f SET erinnerung_letzte_versendet_am = v_today
  WHERE f.deleted_at IS NULL
    AND f.status NOT IN ('erfuellt', 'verfallen')         -- HOTFIX: erfuellt statt erledigt
    AND f.datum_soll IS NOT NULL
    AND (f.datum_soll - v_today) = ANY(COALESCE(f.erinnerung_tage_vor, ARRAY[7,3,1]))
    AND (f.erinnerung_letzte_versendet_am IS NULL OR f.erinnerung_letzte_versendet_am < v_today);

  RETURN jsonb_build_object(
    'processed', v_processed,
    'skipped_disabled', v_skipped_disabled,
    'skipped_quiet', v_skipped_quiet,
    'run_at', now(),
    'run_date_berlin', v_today
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_fristen_erinnerungen FROM public;
GRANT EXECUTE ON FUNCTION public.process_fristen_erinnerungen TO postgres, service_role;

COMMENT ON FUNCTION public.process_fristen_erinnerungen IS
  'MEGA79 E.2 + Hotfix 54 (2026-05-15) — Cron-tauglicher Fristen-Erinnerungs-Job. workspace_memberships.is_active-Join, kategorie-basierte Prio (achtung bei <=1 Tag, sonst aufgaben), Quiet-Hours-Cross-Midnight, Per-Frist tage_vor-Override. Idempotent. Hotfix-Korrektur: frist_status-Enum-Wert ist erfuellt (nicht erledigt).';
