-- =====================================================================
-- MEGA⁸⁰ Phase B — Mahnwesen-Vorbereitungs-Cron
-- File: supabase-migrations/56_mega80_mahnwesen_vorbereitung_cron.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply-Path: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--             name=mega80_mahnwesen_vorbereitung_cron query=<dieser Inhalt>
--
-- WICHTIG: KEIN Auto-Mahn-Increment. Mahnungen sind §407a-relevant und
-- müssen vom SV bewusst freigegeben werden. Cron bereitet vor + zeigt
-- Marcel die Notification. Marcel klickt im UI → erst dann mahn_stufe + Brief.
--
-- Schema-Wahrheit (per MCP 2026-05-15 verifiziert):
--   dokument_status: entwurf|in_generation|generiert|versendet|gelesen|bezahlt|
--                    ueberfaellig|storniert|archiviert
--   dokument_typ enthält: rechnung|rechnung_jveg|rechnung_stunden + mahnung_1..3
--   dokumente: typ, status, doc_nummer, faelligkeit date, bezahlt_at,
--              mahn_stufe int, mahn_gebuehr numeric, mahn_datum_letzte timestamptz,
--              betrag_brutto numeric, zahlungsfrist_tage int
-- =====================================================================

CREATE OR REPLACE FUNCTION public.prepare_mahnwesen_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_processed         int := 0;
  v_skipped_disabled  int := 0;
  v_today             date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  r                   record;
  user_ns             jsonb;
  tage_ueberfaellig   int;
  v_kategorie         notification_kategorie;
  v_naechste_stufe    int;
  v_basiszinssatz     numeric := 0.025;  -- 2026 H1 ~2.5%, BGB §247
  v_verzugszinsen     numeric;
  v_mahn_gebuehr      numeric;
BEGIN
  FOR r IN
    SELECT
      d.id              AS dokument_id,
      d.workspace_id,
      d.doc_nummer,
      d.faelligkeit,
      d.betrag_brutto,
      d.mahn_stufe,
      d.mahn_datum_letzte,
      d.kontakt_id,
      d.auftrag_id,
      u.id              AS user_id,
      u.notification_settings
    FROM public.dokumente d
    JOIN public.workspace_memberships wm
      ON wm.workspace_id = d.workspace_id AND wm.is_active = true
    JOIN public.users u
      ON u.id = wm.user_id AND u.deleted_at IS NULL
    WHERE d.typ IN ('rechnung', 'rechnung_jveg', 'rechnung_stunden')
      AND d.deleted_at IS NULL
      AND d.status IN ('versendet', 'gelesen', 'ueberfaellig')
      AND d.bezahlt_at IS NULL
      AND d.faelligkeit IS NOT NULL
      AND d.faelligkeit < v_today
      AND COALESCE(d.mahn_stufe, 0) < 3
      AND (d.mahn_datum_letzte IS NULL OR d.mahn_datum_letzte::date < v_today)
  LOOP
    user_ns := COALESCE(r.notification_settings, '{}'::jsonb);

    -- Setting-Check
    IF NOT COALESCE((user_ns->>'zahlung_erinnerung_enabled')::boolean, true) THEN
      v_skipped_disabled := v_skipped_disabled + 1;
      CONTINUE;
    END IF;

    tage_ueberfaellig := v_today - r.faelligkeit;
    v_naechste_stufe := COALESCE(r.mahn_stufe, 0) + 1;

    -- Verzugszinsen-Vorschlag: BGB §288 = 5% über Basiszinssatz pro Jahr
    v_verzugszinsen := ROUND(
      COALESCE(r.betrag_brutto, 0) * (0.05 + v_basiszinssatz) * tage_ueberfaellig / 365.0,
      2
    );
    -- Mahngebühr-Vorschlag (BGB §286): Stufe 1: 5€, Stufe 2: 10€, Stufe 3: 15€
    v_mahn_gebuehr := CASE v_naechste_stufe
      WHEN 1 THEN 5.00
      WHEN 2 THEN 10.00
      WHEN 3 THEN 15.00
      ELSE 0.00
    END;

    -- Prio: ab 30 Tagen Verzug → 'achtung', sonst 'aufgaben'
    v_kategorie := CASE WHEN tage_ueberfaellig > 30
      THEN 'achtung'::notification_kategorie
      ELSE 'aufgaben'::notification_kategorie
    END;

    INSERT INTO public.notifications (
      user_id, workspace_id, kategorie, titel, body, link_typ, link_id, link_url
    ) VALUES (
      r.user_id, r.workspace_id, v_kategorie,
      'Mahnung Stufe ' || v_naechste_stufe || ' vorbereiten: ' || COALESCE(r.doc_nummer, 'Rechnung'),
      'Rechnung ' || COALESCE(r.doc_nummer, '—') ||
      ' über ' || COALESCE(r.betrag_brutto::text, '0,00') || ' € ist seit ' ||
      tage_ueberfaellig || ' Tagen überfällig.' ||
      E'\nAktuelle Stufe: ' || COALESCE(r.mahn_stufe, 0) ||
      E'\nVorgeschlagene Mahngebühr: ' || v_mahn_gebuehr || ' € (BGB §286)' ||
      E'\nVerzugszinsen geschätzt: ' || v_verzugszinsen || ' € (BGB §288, 5% + Basiszinssatz)' ||
      E'\n\nBitte im Mahnwesen-Modul prüfen und freigeben.',
      'dokument', r.dokument_id,
      '/mahnwesen.html?id=' || r.dokument_id
    );

    v_processed := v_processed + 1;
  END LOOP;

  -- Idempotenz: mahn_datum_letzte heute setzen für alle Rechnungen die heute
  -- benachrichtigt wurden — Wir UPDATEn 1× pro dokument, nicht pro Member.
  UPDATE public.dokumente d
  SET mahn_datum_letzte = now()
  WHERE d.typ IN ('rechnung', 'rechnung_jveg', 'rechnung_stunden')
    AND d.deleted_at IS NULL
    AND d.status IN ('versendet', 'gelesen', 'ueberfaellig')
    AND d.bezahlt_at IS NULL
    AND d.faelligkeit IS NOT NULL
    AND d.faelligkeit < v_today
    AND COALESCE(d.mahn_stufe, 0) < 3
    AND (d.mahn_datum_letzte IS NULL OR d.mahn_datum_letzte::date < v_today);

  RETURN jsonb_build_object(
    'processed', v_processed,
    'skipped_disabled', v_skipped_disabled,
    'run_at', now(),
    'today_berlin', v_today
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_mahnwesen_notifications FROM public;
GRANT EXECUTE ON FUNCTION public.prepare_mahnwesen_notifications TO postgres, service_role;

COMMENT ON FUNCTION public.prepare_mahnwesen_notifications IS
  'MEGA80 B — Mahnwesen-Vorbereitungs-Cron. KEIN Auto-Mahn-Increment (§407a-relevant). Liefert tägliche Notification mit Verzugszinsen-Vorschlag (BGB §288) + Mahngebühr (BGB §286) + Tage-Überfällig-Count. SV klickt im UI → mahn_stufe wird dort inkrementiert + Brief generiert.';

-- Cron-Schedule: 06:30 UTC = 07:30 Berlin (Winter) / 08:30 (Sommer)
-- Bewusst nach 06:00 UTC (Fristen-Cron) damit beide nicht gleichzeitig laufen.
SELECT cron.schedule(
  'mahnwesen-vorbereitungen-daily',
  '30 6 * * *',
  $SCHED$ SELECT public.prepare_mahnwesen_notifications(); $SCHED$
);
