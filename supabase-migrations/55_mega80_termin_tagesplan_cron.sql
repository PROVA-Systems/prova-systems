-- =====================================================================
-- MEGA⁸⁰ Phase A — Termin-Tagesplan-Cron (LIVE-SYNC MEGA⁸¹)
-- File: supabase-migrations/55_mega80_termin_tagesplan_cron.sql
-- =====================================================================
-- Status: LIVE in Production. Diese Datei spiegelt den Live-DB-Stand wider,
-- wie er via `pg_get_functiondef` am 2026-05-15 (MEGA⁸¹ Phase A) verifiziert
-- wurde. Marcel hatte die Function beim Apply via MCP vom MEGA80-Entwurf
-- `process_termin_erinnerungen(p_mode)` auf `process_termin_tagesplan()`
-- umgestellt (Tagesplan-Only, kein Pre-Push-Minutely).
--
-- Live-Stand:
--   - Function: public.process_termin_tagesplan()
--   - Cron-Job: termin-tagesplan-daily, schedule '0 6 * * *' (jobid 10)
--   - KEIN termin-pre-push-minutely Job (Pre-Push verschoben auf späteren Sprint)
--
-- Schema-Wahrheit (per MCP verifiziert):
--   termin_status: geplant|bestaetigt|durchgefuehrt|verschoben|abgesagt|kein_zustandekommen
--   notification_kategorie: aufgaben|termine|achtung|system
--   notifications-Idempotenz via link_typ='termin_tagesplan' + created_at::date
-- =====================================================================

CREATE OR REPLACE FUNCTION public.process_termin_tagesplan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_processed         int := 0;
  v_skipped_disabled  int := 0;
  v_skipped_no_termin int := 0;
  v_today             date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  rec_user            record;
  user_ns             jsonb;
  v_termine_count     int;
  v_termine_text      text;
  v_first_termin_id   uuid;
BEGIN
  FOR rec_user IN
    SELECT DISTINCT usr.id AS user_id, usr.notification_settings, wm.workspace_id
    FROM public.users usr
    JOIN public.workspace_memberships wm
      ON wm.user_id = usr.id AND wm.is_active = true
    WHERE usr.deleted_at IS NULL
  LOOP
    user_ns := COALESCE(rec_user.notification_settings, '{}'::jsonb);

    IF NOT COALESCE((user_ns->>'termin_erinnerung_enabled')::boolean, true) THEN
      v_skipped_disabled := v_skipped_disabled + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = rec_user.user_id
        AND n.link_typ = 'termin_tagesplan'
        AND n.created_at::date = v_today
    ) THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*),
           STRING_AGG(
             COALESCE(t.uhrzeit_von::text, 'ganztags') || ' ' || COALESCE(t.titel, t.typ::text),
             E'\n' ORDER BY t.uhrzeit_von NULLS LAST
           )
    INTO v_termine_count, v_termine_text
    FROM public.termine t
    WHERE t.workspace_id = rec_user.workspace_id
      AND t.deleted_at IS NULL
      AND t.status NOT IN ('durchgefuehrt', 'abgesagt', 'kein_zustandekommen')
      AND t.datum = v_today
      AND (t.assigned_to_user_id IS NULL OR t.assigned_to_user_id = rec_user.user_id);

    IF v_termine_count = 0 THEN
      v_skipped_no_termin := v_skipped_no_termin + 1;
      CONTINUE;
    END IF;

    SELECT t.id INTO v_first_termin_id
    FROM public.termine t
    WHERE t.workspace_id = rec_user.workspace_id
      AND t.deleted_at IS NULL
      AND t.status NOT IN ('durchgefuehrt', 'abgesagt', 'kein_zustandekommen')
      AND t.datum = v_today
      AND (t.assigned_to_user_id IS NULL OR t.assigned_to_user_id = rec_user.user_id)
    ORDER BY t.uhrzeit_von NULLS LAST
    LIMIT 1;

    INSERT INTO public.notifications (user_id, workspace_id, kategorie, titel, body, link_typ, link_id, link_url)
    VALUES (
      rec_user.user_id,
      rec_user.workspace_id,
      'termine'::notification_kategorie,
      CASE WHEN v_termine_count = 1
           THEN 'Heute 1 Termin'
           ELSE 'Heute ' || v_termine_count || ' Termine' END,
      v_termine_text,
      'termin_tagesplan',
      v_first_termin_id,
      '/termine.html?datum=' || v_today::text
    );

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'skipped_disabled', v_skipped_disabled,
    'skipped_no_termin', v_skipped_no_termin,
    'run_at', now(),
    'run_date_berlin', v_today
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.process_termin_tagesplan() FROM public;
GRANT EXECUTE ON FUNCTION public.process_termin_tagesplan() TO postgres, service_role;

COMMENT ON FUNCTION public.process_termin_tagesplan() IS
  'MEGA80 A — Termin-Tagesplan-Cron. 1× pro User pro Tag morgens-Übersicht aller Termine heute. Idempotenz via link_typ=termin_tagesplan + created_at::date. Pre-Push-Minutely verschoben auf späteren Sprint.';

-- Cron-Job (LIVE: jobid 10, schedule '0 6 * * *' = 07:00 Berlin Winter / 08:00 Sommer)
SELECT cron.schedule(
  'termin-tagesplan-daily',
  '0 6 * * *',
  $SCHED$ SELECT public.process_termin_tagesplan(); $SCHED$
);
