-- =====================================================================
-- MEGA⁸⁰ Phase A — Termin-Erinnerungen-Cron
-- File: supabase-migrations/55_mega80_termin_erinnerungen_cron.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply-Path: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--             name=mega80_termin_erinnerungen_cron query=<dieser Inhalt>
--
-- Schema-Wahrheit (per MCP 2026-05-15 verifiziert):
--   termin_status: geplant | bestaetigt | durchgefuehrt | verschoben | abgesagt | kein_zustandekommen
--   termine: datum date, uhrzeit_von time, erinnerung_minuten int (Override),
--            erinnerung_gesendet_at timestamptz (Idempotenz),
--            assigned_to_user_id uuid (Owner-Notification-Empfänger)
--
-- Modes:
--   'pre'       — Pre-Termin-Push 15+30 Min vor uhrzeit_von ODER custom erinnerung_minuten
--   'tagesplan' — Morgens-Übersicht 1× pro User pro Tag
-- =====================================================================

CREATE OR REPLACE FUNCTION public.process_termin_erinnerungen(p_mode text DEFAULT 'pre')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_processed         int := 0;
  v_skipped_disabled  int := 0;
  v_today_berlin      date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  v_now_time_berlin   time := (now() AT TIME ZONE 'Europe/Berlin')::time;
  v_now_berlin        timestamp := (now() AT TIME ZONE 'Europe/Berlin');
  r                   record;
  user_ns             jsonb;
  diff_min            int;
  custom_min          int;
  v_titel             text;
  v_body              text;
BEGIN
  IF p_mode = 'pre' THEN
    -- Pattern 1+2: Pre-Termin-Push
    FOR r IN
      SELECT
        t.id            AS termin_id,
        t.workspace_id,
        t.auftrag_id,
        t.titel,
        t.uhrzeit_von,
        t.uhrzeit_bis,
        t.ort_name,
        t.ort_ort,
        t.erinnerung_minuten,
        u.id            AS user_id,
        u.notification_settings
      FROM public.termine t
      JOIN public.workspace_memberships wm
        ON wm.workspace_id = t.workspace_id AND wm.is_active = true
      JOIN public.users u
        ON u.id = COALESCE(t.assigned_to_user_id, wm.user_id)
       AND u.deleted_at IS NULL
      WHERE t.deleted_at IS NULL
        AND t.status IN ('geplant', 'bestaetigt')
        AND t.datum = v_today_berlin
        AND t.uhrzeit_von IS NOT NULL
        AND t.erinnerung_gesendet_at IS NULL
    LOOP
      user_ns := COALESCE(r.notification_settings, '{}'::jsonb);

      -- termin_erinnerung_enabled-Setting
      IF NOT COALESCE((user_ns->>'termin_erinnerung_enabled')::boolean, true) THEN
        v_skipped_disabled := v_skipped_disabled + 1;
        CONTINUE;
      END IF;

      -- Diff in Minuten zwischen jetzt und uhrzeit_von
      diff_min := EXTRACT(EPOCH FROM (r.uhrzeit_von - v_now_time_berlin)) / 60;
      custom_min := r.erinnerung_minuten;

      -- Custom-Override: User hat eigenen Wert gesetzt
      IF custom_min IS NOT NULL THEN
        IF custom_min = 0 THEN CONTINUE; END IF;  -- User will keine Erinnerung
        -- Trigger wenn diff_min ~= custom_min (1-Min-Toleranz)
        IF NOT (diff_min BETWEEN custom_min - 1 AND custom_min + 1) THEN CONTINUE; END IF;
      ELSE
        -- Standard 15 + 30 Min vor Termin (mit Toleranz für Cron-Drift)
        IF NOT ((diff_min BETWEEN 14 AND 16) OR (diff_min BETWEEN 29 AND 31)) THEN CONTINUE; END IF;
      END IF;

      -- Quiet-Hours bewusst NICHT für Pre-Termin (15 Min vor Ortstermin ist immer wichtig)

      v_titel := 'Termin in ' || diff_min || ' Min: ' || COALESCE(r.titel, 'Termin');
      v_body  := COALESCE(r.titel, '') ||
                 COALESCE(' · ' || r.ort_name, '') ||
                 COALESCE(' · ' || r.ort_ort, '') ||
                 COALESCE(' · ' || r.uhrzeit_von::text, '');

      INSERT INTO public.notifications (
        user_id, workspace_id, kategorie, titel, body, link_typ, link_id, link_url
      ) VALUES (
        r.user_id, r.workspace_id, 'termine'::notification_kategorie,
        v_titel, v_body, 'termin', r.termin_id,
        '/termine.html?id=' || r.termin_id
      );

      v_processed := v_processed + 1;
    END LOOP;

    -- Idempotenz-Marker setzen — 1× pro Termin pro Tag
    UPDATE public.termine te
    SET erinnerung_gesendet_at = now()
    WHERE te.deleted_at IS NULL
      AND te.status IN ('geplant', 'bestaetigt')
      AND te.datum = v_today_berlin
      AND te.uhrzeit_von IS NOT NULL
      AND te.erinnerung_gesendet_at IS NULL
      AND (
        (EXTRACT(EPOCH FROM (te.uhrzeit_von - v_now_time_berlin)) / 60) BETWEEN 14 AND 31
      );

    RETURN jsonb_build_object(
      'mode', 'pre',
      'processed', v_processed,
      'skipped_disabled', v_skipped_disabled,
      'run_at', now()
    );

  ELSIF p_mode = 'tagesplan' THEN
    -- Pattern 3: Tagesübersicht (1× pro User pro Tag)
    FOR r IN
      SELECT
        u.id AS user_id,
        wm.workspace_id,
        u.notification_settings,
        (SELECT COUNT(*) FROM public.termine te
          WHERE te.workspace_id = wm.workspace_id
            AND te.deleted_at IS NULL
            AND te.status IN ('geplant', 'bestaetigt')
            AND te.datum = v_today_berlin
            AND (te.assigned_to_user_id = u.id OR te.assigned_to_user_id IS NULL)
        ) AS termin_count,
        (SELECT string_agg(
              COALESCE(te.uhrzeit_von::text, '—') || ' ' || COALESCE(te.titel, 'Termin'),
              E'\n' ORDER BY te.uhrzeit_von
            )
          FROM public.termine te
          WHERE te.workspace_id = wm.workspace_id
            AND te.deleted_at IS NULL
            AND te.status IN ('geplant', 'bestaetigt')
            AND te.datum = v_today_berlin
            AND (te.assigned_to_user_id = u.id OR te.assigned_to_user_id IS NULL)
        ) AS termin_liste
      FROM public.workspace_memberships wm
      JOIN public.users u ON u.id = wm.user_id AND u.deleted_at IS NULL
      WHERE wm.is_active = true
    LOOP
      IF r.termin_count = 0 THEN CONTINUE; END IF;
      user_ns := COALESCE(r.notification_settings, '{}'::jsonb);

      -- termin_erinnerung_enabled-Setting
      IF NOT COALESCE((user_ns->>'termin_erinnerung_enabled')::boolean, true) THEN
        v_skipped_disabled := v_skipped_disabled + 1;
        CONTINUE;
      END IF;

      -- Quiet-Hours-Check (Tagesplan respektiert Quiet-Hours)
      IF COALESCE((user_ns->>'quiet_hours_enabled')::boolean, false) THEN
        IF (v_now_time_berlin >= COALESCE((user_ns->>'quiet_hours_start')::time, time '22:00')
            OR v_now_time_berlin < COALESCE((user_ns->>'quiet_hours_end')::time, time '07:00')) THEN
          CONTINUE;
        END IF;
      END IF;

      -- Idempotenz: nicht 2× am gleichen Tag senden
      IF EXISTS (SELECT 1 FROM public.notifications n
                 WHERE n.user_id = r.user_id
                   AND n.link_typ = 'termin_tagesplan'
                   AND n.created_at::date = v_today_berlin) THEN
        CONTINUE;
      END IF;

      INSERT INTO public.notifications (
        user_id, workspace_id, kategorie, titel, body, link_typ, link_url
      ) VALUES (
        r.user_id, r.workspace_id, 'termine'::notification_kategorie,
        r.termin_count || ' Termin' || CASE WHEN r.termin_count = 1 THEN '' ELSE 'e' END || ' heute',
        r.termin_liste,
        'termin_tagesplan',
        '/termine.html'
      );

      v_processed := v_processed + 1;
    END LOOP;

    RETURN jsonb_build_object(
      'mode', 'tagesplan',
      'processed', v_processed,
      'skipped_disabled', v_skipped_disabled,
      'run_at', now()
    );

  ELSE
    RAISE EXCEPTION 'Unknown mode: %', p_mode;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.process_termin_erinnerungen(text) FROM public;
GRANT EXECUTE ON FUNCTION public.process_termin_erinnerungen(text) TO postgres, service_role;

COMMENT ON FUNCTION public.process_termin_erinnerungen(text) IS
  'MEGA80 A — Termin-Cron mit zwei Modes: pre (15+30 Min Push oder custom) + tagesplan (morgens-Übersicht). Idempotenz via erinnerung_gesendet_at bzw. tägliche Notification-Existenz-Check.';

-- Cron-Schedules
SELECT cron.schedule(
  'termin-pre-push-minutely',
  '* * * * *',
  $SCHED$ SELECT public.process_termin_erinnerungen('pre'); $SCHED$
);

SELECT cron.schedule(
  'termin-tagesplan-daily',
  '0 7 * * *',
  $SCHED$ SELECT public.process_termin_erinnerungen('tagesplan'); $SCHED$
);
