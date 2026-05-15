-- MEGA⁷⁹ Phase E.1+E.2+E.3 — pg_cron + Fristen-Erinnerungen-Function
-- Datum: 2026-05-15
-- Status: VORBEREITET, NICHT auf Production applied.
--
-- Apply-Pfad (Marcel-Entscheidung):
--   (a) via Supabase-Dev-Branch: create_branch → apply hier → test → production
--   (b) direkt auf Production: nach explizitem OK in MEGA79-MARCEL-CHECKLIST
--
-- Schema-Wahrheit verifiziert via MCP 2026-05-15:
--   notifications: id, user_id, workspace_id, kategorie (notification_kategorie enum:
--                  aufgaben|termine|achtung|system), titel NOT NULL, body NULL,
--                  link_typ TEXT, link_id UUID, link_url TEXT, read_at, dismissed_at,
--                  pushed_at, expires_at, created_at
--   fristen: workspace_id, auftrag_id, frist_typ, datum_soll, status (frist_status:
--            offen|erledigt|verfallen|verlaengert), erinnerung_tage_vor int[],
--            erinnerung_letzte_versendet_am date, notiz, rechtsgrundlage, deleted_at
--   Owner-Lookup: über workspace_memberships (rolle='owner')

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.process_fristen_erinnerungen()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed int := 0;
  v_skipped_disabled int := 0;
  v_skipped_quiet int := 0;
  v_today date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  v_now_time time := (now() AT TIME ZONE 'Europe/Berlin')::time;
  r record;
  user_ns jsonb;
  tage_vor_array int[];
  tage_bis_frist int;
BEGIN
  FOR r IN
    SELECT
      f.id            AS frist_id,
      f.workspace_id  AS workspace_id,
      f.auftrag_id    AS auftrag_id,
      f.frist_typ::text AS frist_typ,
      f.datum_soll    AS datum_soll,
      f.notiz         AS notiz,
      f.erinnerung_tage_vor AS frist_tage_vor,
      u.id            AS user_id,
      u.notification_settings AS notification_settings
    FROM public.fristen f
    JOIN public.workspace_memberships wm ON wm.workspace_id = f.workspace_id AND wm.rolle = 'owner'
    JOIN public.users u ON u.id = wm.user_id AND u.deleted_at IS NULL
    WHERE f.deleted_at IS NULL
      AND f.status IN ('offen', 'verlaengert')
      AND f.datum_soll IS NOT NULL
      AND (f.erinnerung_letzte_versendet_am IS NULL OR f.erinnerung_letzte_versendet_am < v_today)
  LOOP
    user_ns := COALESCE(r.notification_settings, '{}'::jsonb);
    tage_bis_frist := r.datum_soll - v_today;

    -- Welche Tage-Vor-Trigger? Per-Frist-Override, sonst User-Setting, sonst Default
    tage_vor_array := COALESCE(
      r.frist_tage_vor,
      (SELECT array_agg(value::int) FROM jsonb_array_elements_text(user_ns->'fristen_alarm_tage_vor')),
      ARRAY[7, 3, 1]
    );

    -- Nur triggern wenn heute exakt einer der tage-vor-Werte ist
    IF NOT (tage_bis_frist = ANY(tage_vor_array)) THEN
      CONTINUE;
    END IF;

    -- Setting-Check
    IF NOT COALESCE((user_ns->>'fristen_alarm_enabled')::boolean, true) THEN
      v_skipped_disabled := v_skipped_disabled + 1;
      CONTINUE;
    END IF;

    -- Quiet-Hours-Check
    IF COALESCE((user_ns->>'quiet_hours_enabled')::boolean, false) THEN
      DECLARE
        qs time := COALESCE((user_ns->>'quiet_hours_start')::time, '22:00'::time);
        qe time := COALESCE((user_ns->>'quiet_hours_end')::time, '07:00'::time);
      BEGIN
        IF qs > qe THEN
          -- Cross-Midnight (z.B. 22:00 → 07:00)
          IF v_now_time >= qs OR v_now_time < qe THEN
            v_skipped_quiet := v_skipped_quiet + 1;
            CONTINUE;
          END IF;
        ELSE
          IF v_now_time >= qs AND v_now_time < qe THEN
            v_skipped_quiet := v_skipped_quiet + 1;
            CONTINUE;
          END IF;
        END IF;
      END;
    END IF;

    -- Notification erzeugen
    INSERT INTO public.notifications (
      user_id, workspace_id, kategorie, titel, body, link_typ, link_id
    ) VALUES (
      r.user_id,
      r.workspace_id,
      'achtung'::notification_kategorie,
      'Frist in ' || tage_bis_frist || ' Tag(en): ' || r.frist_typ,
      COALESCE(r.notiz, 'Frist zum ' || r.datum_soll::text || ' — bitte rechtzeitig bearbeiten.'),
      'frist',
      r.frist_id
    );

    UPDATE public.fristen SET erinnerung_letzte_versendet_am = v_today WHERE id = r.frist_id;
    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'skipped_disabled', v_skipped_disabled,
    'skipped_quiet', v_skipped_quiet,
    'run_at', now(),
    'tz', 'Europe/Berlin'
  );
END;
$$;

COMMENT ON FUNCTION public.process_fristen_erinnerungen IS
  'MEGA79 E.2 — Cron-tauglicher Fristen-Erinnerungs-Job. Berücksichtigt notification_settings, Quiet-Hours, Per-Frist tage_vor-Array. Idempotent via erinnerung_letzte_versendet_am.';

-- E.3: Cron-Schedule — 07:00 UTC täglich (= 08:00 Winter / 09:00 Sommer Berlin)
SELECT cron.schedule(
  'fristen-erinnerungen-daily',
  '0 7 * * *',
  $SCHED$ SELECT public.process_fristen_erinnerungen(); $SCHED$
);
