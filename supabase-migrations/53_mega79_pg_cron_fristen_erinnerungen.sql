-- MEGA⁷⁹ Phase E (Web-Claude-Self-Audit-Patch 2026-05-15)
-- ⚠️ SUPERSEDED IN PART: Diese Function-Definition wird von Migration 54
--    (54_mega79_hotfix_frist_status_enum.sql) per CREATE OR REPLACE
--    überschrieben — `f.status NOT IN ('erledigt', ...)` ist falsch,
--    Enum heißt `erfuellt` nicht `erledigt`. Wer die Migrations frisch
--    applied, bekommt nach 54 die korrekte Version. Diese 53-Datei bleibt
--    aus Forward-Only-Migration-Pflicht unverändert.
-- Schema-Wahrheit via MCP verifiziert + Patch-Korrekturen vs Erstversion:
--   1. pg_cron 1.6.4 ist schon aktiviert (kein CREATE EXTENSION)
--   2. workspaces.owner_user_id existiert nicht → JOIN via workspace_memberships
--      mit is_active=true (alle aktiven Members, nicht nur Owner)
--   3. notifications.kategorie (enum) statt typ, link_typ/link_id/link_url statt
--      ref_table/ref_id, keine prioritaet-Spalte
--   4. Prio über kategorie: 'achtung' bei diff_days<=1, sonst 'aufgaben'
--   5. SECURITY DEFINER + SET search_path=public,pg_temp (PGsec best practice)
--   6. Per-Frist erinnerung_tage_vor Override hat Vorrang
--   7. Frist-Update separat nach Loop (1× pro Frist, nicht N× pro Member)
--   8. REVOKE FROM public + GRANT TO postgres,service_role (Function-Hardening)

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
  -- Hole alle aktiven Fristen × aktive Workspace-Members
  -- Jede Frist erzeugt ggf. mehrere Notifications (1 pro aktivem Member)
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
      AND f.status NOT IN ('erledigt', 'verfallen')
      AND f.datum_soll IS NOT NULL
      AND (
        f.erinnerung_letzte_versendet_am IS NULL OR
        f.erinnerung_letzte_versendet_am < v_today
      )
  LOOP
    user_ns := COALESCE(r.notification_settings, '{}'::jsonb);

    -- Per-Frist-Override > User-Setting > Default [7,3,1]
    tage_vor_array := COALESCE(
      r.erinnerung_tage_vor,
      ARRAY(SELECT jsonb_array_elements_text(user_ns->'fristen_alarm_tage_vor'))::int[],
      ARRAY[7, 3, 1]
    );

    diff_days := r.datum_soll - v_today;

    -- Trigger-Check: liegt diff_days in der tage_vor-Liste?
    IF NOT (diff_days = ANY(tage_vor_array)) THEN
      CONTINUE;
    END IF;

    -- User-Setting fristen_alarm_enabled
    IF NOT COALESCE((user_ns->>'fristen_alarm_enabled')::boolean, true) THEN
      v_skipped_disabled := v_skipped_disabled + 1;
      CONTINUE;
    END IF;

    -- Quiet-Hours (Cross-Midnight-Standard 22:00..07:00)
    IF COALESCE((user_ns->>'quiet_hours_enabled')::boolean, false) THEN
      IF (
        v_now_time >= COALESCE((user_ns->>'quiet_hours_start')::time, time '22:00') OR
        v_now_time <  COALESCE((user_ns->>'quiet_hours_end')::time,   time '07:00')
      ) THEN
        v_skipped_quiet := v_skipped_quiet + 1;
        CONTINUE;
      END IF;
    END IF;

    -- Prio via kategorie-Enum
    v_kategorie := CASE
      WHEN diff_days <= 1 THEN 'achtung'::notification_kategorie
      ELSE 'aufgaben'::notification_kategorie
    END;

    INSERT INTO public.notifications (
      user_id, workspace_id, kategorie, titel, body,
      link_typ, link_id, link_url
    ) VALUES (
      r.user_id,
      r.workspace_id,
      v_kategorie,
      CASE
        WHEN diff_days = 0 THEN 'Frist heute fällig: ' || COALESCE(r.frist_typ::text, 'Frist')
        WHEN diff_days = 1 THEN 'Frist morgen fällig: ' || COALESCE(r.frist_typ::text, 'Frist')
        ELSE 'Frist in ' || diff_days || ' Tagen: ' || COALESCE(r.frist_typ::text, 'Frist')
      END,
      COALESCE(r.notiz, 'Bitte rechtzeitig bearbeiten'),
      'frist',
      r.frist_id,
      CASE WHEN r.auftrag_id IS NOT NULL
           THEN '/akte.html?id=' || r.auftrag_id
           ELSE '/fristen.html?id=' || r.frist_id
      END
    );

    v_processed := v_processed + 1;
  END LOOP;

  -- Frist-Update separat: 1× pro Frist, auch wenn mehrere Member benachrichtigt wurden
  UPDATE public.fristen f
  SET erinnerung_letzte_versendet_am = v_today
  WHERE f.deleted_at IS NULL
    AND f.status NOT IN ('erledigt', 'verfallen')
    AND f.datum_soll IS NOT NULL
    AND (f.datum_soll - v_today) = ANY(
      COALESCE(f.erinnerung_tage_vor, ARRAY[7, 3, 1])
    )
    AND (
      f.erinnerung_letzte_versendet_am IS NULL OR
      f.erinnerung_letzte_versendet_am < v_today
    );

  RETURN jsonb_build_object(
    'processed', v_processed,
    'skipped_disabled', v_skipped_disabled,
    'skipped_quiet', v_skipped_quiet,
    'run_at', now(),
    'run_date_berlin', v_today
  );
END;
$$;

-- Function-Hardening: nicht aus public-Rolle exekutierbar
REVOKE ALL ON FUNCTION public.process_fristen_erinnerungen FROM public;
GRANT EXECUTE ON FUNCTION public.process_fristen_erinnerungen TO postgres, service_role;

COMMENT ON FUNCTION public.process_fristen_erinnerungen IS
  'MEGA79 E.2 (Self-Audit-Patch 2026-05-15) — Cron-tauglicher Fristen-Erinnerungs-Job. workspace_memberships.is_active-Join für Multi-Member-Workspaces, kategorie-basierte Prio (achtung bei <=1 Tag, sonst aufgaben), Quiet-Hours-Cross-Midnight, Per-Frist tage_vor-Override. Idempotent.';

-- E.3: Cron-Schedule — 06:00 UTC = 07:00 Berlin (Winter) / 08:00 Berlin (Sommer)
-- DST-pragmatisch: "morgens" reicht für Tages-Frist; pg_cron timezones sind in
-- Supabase-Edition nicht zuverlässig.
SELECT cron.schedule(
  'fristen-erinnerungen-daily',
  '0 6 * * *',
  $SCHED$ SELECT public.process_fristen_erinnerungen(); $SCHED$
);
