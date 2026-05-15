-- =====================================================================
-- MEGA⁸⁰ Phase B — Mahnwesen-Vorbereitungs-Cron (LIVE-SYNC MEGA⁸¹)
-- File: supabase-migrations/56_mega80_mahnwesen_vorbereitung_cron.sql
-- =====================================================================
-- Status: LIVE in Production. Diese Datei spiegelt den Live-DB-Stand wider,
-- wie er via `pg_get_functiondef` am 2026-05-15 (MEGA⁸¹ Phase A) verifiziert wurde.
--
-- Abweichungen vom MEGA80-Entwurf:
--   - Verzugszinsen: BGB §288(2) 9% B2B (statt 5% wie im Entwurf — SV-Honorare
--     sind in der Regel B2B → höherer Satz)
--   - Mahngebühr-Vorschlag: Stufe 1 = 0€ (kostenlos), 2 = 5€, 3 = 10€
--     (statt 5/10/15 wie im Entwurf — Stufe 1 ohne Gebühr ist üblicher)
--   - Stufe-Schwellen: 14/21/35 Tage (Stufe 1 ab 14T, Stufe 2 ab 21T, Stufe 3 ab 35T)
--   - Idempotenz via Notification-Existenz-Check (statt mahn_datum_letzte-Update)
--   - Achtung-Prio nur ab Stufe 3 (statt > 30 Tage)
--
-- §407a-Direktive: KEIN Auto-Increment von mahn_stufe, KEIN Auto-Brief.
-- Cron erstellt nur tägliche Notification — SV klickt im UI → erst dann
-- mahn_stufe inkrementiert + Brief generiert.
--
-- Schema-Wahrheit (per MCP verifiziert):
--   dokument_status: entwurf|in_generation|generiert|versendet|gelesen|bezahlt|
--                    ueberfaellig|storniert|archiviert
--   dokument_typ enthält: rechnung|rechnung_jveg|rechnung_stunden + mahnung_1..3
-- =====================================================================

CREATE OR REPLACE FUNCTION public.prepare_mahnwesen_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_processed         int := 0;
  v_skipped_disabled  int := 0;
  v_skipped_already   int := 0;
  v_today             date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  r                   record;
  user_ns             jsonb;
  v_tage_ueberfaellig int;
  v_vorschlag_stufe   int;
  v_vorschlag_gebuehr numeric;
  v_kategorie         notification_kategorie;
  v_basiszinssatz     numeric := 0.025;  -- Stand 2026-H1 (Bundesbank), Default
  v_verzugszinsen     numeric;
BEGIN
  FOR r IN
    SELECT
      d.id              AS doc_id,
      d.workspace_id,
      d.auftrag_id,
      d.doc_nummer,
      d.faelligkeit,
      d.bezahlt_at,
      d.mahn_stufe,
      d.mahn_gebuehr,
      d.betrag_brutto,
      d.kontakt_id,
      u.id              AS user_id,
      u.notification_settings
    FROM public.dokumente d
    JOIN public.workspace_memberships wm
      ON wm.workspace_id = d.workspace_id AND wm.is_active = true
    JOIN public.users u
      ON u.id = wm.user_id
     AND u.deleted_at IS NULL
    WHERE d.deleted_at IS NULL
      AND d.typ IN ('rechnung','rechnung_jveg','rechnung_stunden')
      AND d.status IN ('versendet','gelesen','ueberfaellig')
      AND d.bezahlt_at IS NULL
      AND d.faelligkeit IS NOT NULL
      AND d.faelligkeit < v_today
      AND COALESCE(d.mahn_stufe, 0) < 3
  LOOP
    user_ns := COALESCE(r.notification_settings, '{}'::jsonb);

    IF NOT COALESCE((user_ns->>'zahlung_erinnerung_enabled')::boolean, true) THEN
      v_skipped_disabled := v_skipped_disabled + 1;
      CONTINUE;
    END IF;

    -- Idempotenz: heute schon eine Mahn-Notification für diese Rechnung an diesen User?
    IF EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = r.user_id
        AND n.link_typ = 'dokument'
        AND n.link_id = r.doc_id
        AND n.created_at::date = v_today
    ) THEN
      v_skipped_already := v_skipped_already + 1;
      CONTINUE;
    END IF;

    v_tage_ueberfaellig := v_today - r.faelligkeit;

    v_vorschlag_stufe := CASE
      WHEN v_tage_ueberfaellig >= 35 AND COALESCE(r.mahn_stufe, 0) < 3 THEN 3
      WHEN v_tage_ueberfaellig >= 21 AND COALESCE(r.mahn_stufe, 0) < 2 THEN 2
      WHEN v_tage_ueberfaellig >= 14 AND COALESCE(r.mahn_stufe, 0) < 1 THEN 1
      ELSE NULL
    END;

    IF v_vorschlag_stufe IS NULL THEN CONTINUE; END IF;

    v_vorschlag_gebuehr := CASE v_vorschlag_stufe
      WHEN 1 THEN 0
      WHEN 2 THEN 5
      WHEN 3 THEN 10
    END;

    -- BGB §288(2): 9% über Basiszinssatz für B2B
    v_verzugszinsen := COALESCE(r.betrag_brutto, 0)
                       * (0.09 + v_basiszinssatz)
                       * v_tage_ueberfaellig / 365.0;
    v_verzugszinsen := ROUND(v_verzugszinsen, 2);

    v_kategorie := CASE
      WHEN v_vorschlag_stufe >= 3 THEN 'achtung'::notification_kategorie
      ELSE 'aufgaben'::notification_kategorie
    END;

    INSERT INTO public.notifications (user_id, workspace_id, kategorie, titel, body, link_typ, link_id, link_url)
    VALUES (
      r.user_id,
      r.workspace_id,
      v_kategorie,
      'Mahnung Stufe ' || v_vorschlag_stufe || ' vorbereiten: ' || COALESCE(r.doc_nummer, 'Rechnung'),
      'Rechnung ' || COALESCE(r.doc_nummer, '') ||
      ' über ' || COALESCE(r.betrag_brutto::text, '?') || ' € ist seit ' ||
      v_tage_ueberfaellig || ' Tagen überfällig (' || r.faelligkeit::text || ').' ||
      ' Vorgeschlagene Mahngebühr: ' || v_vorschlag_gebuehr || ' €. ' ||
      'Verzugszinsen-Vorschlag (BGB §288 II, 9% über Basiszinssatz): ' || v_verzugszinsen || ' €. ' ||
      'Aktuelle Stufe: ' || COALESCE(r.mahn_stufe, 0) || '. ' ||
      'Bitte im Mahnwesen-Modul prüfen + Mahnbrief generieren.',
      'dokument',
      r.doc_id,
      '/mahnwesen.html?id=' || r.doc_id::text
    );

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'skipped_disabled', v_skipped_disabled,
    'skipped_already', v_skipped_already,
    'run_at', now(),
    'run_date_berlin', v_today
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.prepare_mahnwesen_notifications() FROM public;
GRANT EXECUTE ON FUNCTION public.prepare_mahnwesen_notifications() TO postgres, service_role;

COMMENT ON FUNCTION public.prepare_mahnwesen_notifications() IS
  'MEGA80 B — Mahnwesen-Vorbereitungs-Cron. KEIN Auto-Increment (§407a). Stufe 1/2/3 ab 14/21/35 Tagen. BGB §288(2) 9% B2B-Verzugszinsen. Idempotenz via Notification-Existenz-Check.';

-- Cron-Job (LIVE: jobid 9, schedule '0 6 * * *' = 07:00 Berlin Winter / 08:00 Sommer)
SELECT cron.schedule(
  'mahnwesen-vorbereitungen-daily',
  '0 6 * * *',
  $SCHED$ SELECT public.prepare_mahnwesen_notifications(); $SCHED$
);
