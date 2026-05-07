-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁶ W5.3 — dokument_templates SEED
-- Datum: 2026-05-07
-- Idempotent: ON CONFLICT (name) DO NOTHING.
--
-- Tabelle dokument_templates existiert bereits aus Migration 04.
-- Diese Migration befüllt sie mit den heute genutzten Templates:
--  • 11 Korrespondenz-Briefe (K-01 bis K-09 + Mahnung-Trio)
--  • 3 Gutachten-Templates (F-04 Kurzstellung, F-09 Kurzgutachten,
--    F-10 Beweissicherung)
--
-- → ENV-Konsolidierung W6.1: Frontend kann via DB-Lookup statt ENV
--   die Template-IDs holen (data-store.dokumentTemplates.byCode).
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 11 Korrespondenz-Briefe (PROVA K-XX-Codes)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.dokument_templates (
    name, typ, sprache, version, pdfmonkey_template_id, pdfmonkey_template_name,
    rechtlicher_hinweis, aktiv, importiert_aus_airtable, notizen
) VALUES
  (
    'K-01 Auftragsbestätigung',
    'auftragsbestaetigung'::dokument_typ,
    'de-DE', '1.0',
    'K-01',
    'PROVA-BRIEF',
    'DIN 5008',
    TRUE, FALSE,
    'Brief an Auftraggeber bei Annahme des Gutachten-Auftrags. PDFMonkey-Template PROVA-BRIEF mit Slot vorlage_key=auftragsbestaetigung.'
  ),
  (
    'K-02 Termin-Mitteilung',
    'termin_bestaetigung'::dokument_typ,
    'de-DE', '1.0',
    'K-02',
    'PROVA-BRIEF',
    'DIN 5008',
    TRUE, FALSE,
    'Vorab-Information an Auftraggeber zum geplanten Ortstermin. Slot vorlage_key=einladung-ortstermin.'
  ),
  (
    'K-03 Mehrparteien-Termin',
    'termin_bestaetigung'::dokument_typ,
    'de-DE', '1.0',
    'K-03',
    'PROVA-BRIEF',
    'DIN 5008',
    TRUE, FALSE,
    'Termin-Mitteilung bei Beweissicherung mit mehreren Parteien. Slot vorlage_key=einladung-ortstermin-multi.'
  ),
  (
    'K-04 Anforderung Unterlagen',
    'brief'::dokument_typ,
    'de-DE', '1.0',
    'K-04',
    'PROVA-BRIEF',
    'DIN 5008',
    TRUE, FALSE,
    'Standardisierte Anforderung von Dokumenten beim Auftraggeber. Slot vorlage_key=nachforderung-unterlagen.'
  ),
  (
    'K-05 Übergabe Gutachten',
    'anschreiben'::dokument_typ,
    'de-DE', '1.0',
    'K-05',
    'PROVA-BRIEF',
    'DIN 5008',
    TRUE, FALSE,
    'Anschreiben mit PDF-Anhang bei Gutachten-Versand. Slot vorlage_key=uebergabe-gutachten.'
  ),
  (
    'K-06A Mahnung 1 (Erinnerung)',
    'mahnung_1'::dokument_typ,
    'de-DE', '1.0',
    'F-06',
    'F-06-MAHNUNG-1',
    '§286 BGB',
    TRUE, FALSE,
    'Erste Zahlungserinnerung — freundlich, ohne Mahngebühr. Erstes K-06-Stück, mappt auf PDFMonkey F-06.'
  ),
  (
    'K-06B Mahnung 2',
    'mahnung_2'::dokument_typ,
    'de-DE', '1.0',
    'F-07',
    'F-07-MAHNUNG-2',
    '§286 BGB',
    TRUE, FALSE,
    'Zweite Mahnung mit Mahngebühr und Verzugszinsen. Mappt auf PDFMonkey F-07.'
  ),
  (
    'K-06C Mahnung 3 (letzte Frist)',
    'mahnung_3'::dokument_typ,
    'de-DE', '1.0',
    'F-08',
    'F-08-MAHNUNG-3-LETZTE',
    '§286 BGB',
    TRUE, FALSE,
    'Dritte Mahnung mit Vorrechtsklausel und Inkasso-Androhung. Mappt auf PDFMonkey F-08.'
  ),
  (
    'K-07 Akteneinsicht-Antrag',
    'brief'::dokument_typ,
    'de-DE', '1.0',
    'K-07',
    'PROVA-BRIEF',
    '§299 ZPO',
    TRUE, FALSE,
    'Antrag auf Akteneinsicht beim Gericht zur Gutachten-Vorbereitung. Slot vorlage_key=akteneinsicht.'
  ),
  (
    'K-08 Befangenheits-Anzeige',
    'brief'::dokument_typ,
    'de-DE', '1.0',
    'K-08',
    'PROVA-BRIEF',
    '§406 ZPO',
    TRUE, FALSE,
    'Eigenständige Anzeige von Befangenheits-Gründen an das Gericht. Slot vorlage_key=befangenheit.'
  ),
  (
    'K-09 Auftragsablehnung',
    'brief'::dokument_typ,
    'de-DE', '1.0',
    'K-09',
    'PROVA-BRIEF',
    'BGB',
    TRUE, FALSE,
    'Höfliche Ablehnung eines Auftrags mit Begründung. Slot vorlage_key=auftragsablehnung.'
  )
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Gutachten-Templates (F-XX, PDFMonkey)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.dokument_templates (
    name, typ, sprache, version, pdfmonkey_template_id, pdfmonkey_template_name,
    din_referenzen, aktiv, is_default_for_typ, importiert_aus_airtable, notizen
) VALUES
  (
    'F-04 Kurzstellungnahme',
    'kurzstellungnahme_pdf'::dokument_typ,
    'de-DE', '1.0',
    'F-04', 'F-04-KURZSTELLUNGNAHME',
    ARRAY['DIN 5008'],
    TRUE, TRUE, FALSE,
    '6-12 Seiten, 1-3 zentrale Beweisfragen. Default für typ=kurzstellungnahme_pdf.'
  ),
  (
    'F-09 Kurzgutachten',
    'gutachten_pdf'::dokument_typ,
    'de-DE', '1.0',
    'F-09', 'F-09-KURZGUTACHTEN',
    ARRAY['DIN 5008', 'DIN 277'],
    TRUE, TRUE, FALSE,
    '15-30 Seiten Standard-Gutachten Flow A. Default für typ=gutachten_pdf.'
  ),
  (
    'F-10 Beweissicherung',
    'beweissicherung_pdf'::dokument_typ,
    'de-DE', '1.0',
    'F-10', 'F-10-BEWEISSICHERUNG',
    ARRAY['DIN 5008'],
    TRUE, TRUE, FALSE,
    'Selbständiges Beweisverfahren §485 ZPO. Tatsachen-Doku ohne Beweisfragen-Beantwortung. Default für typ=beweissicherung_pdf.'
  )
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Sanity-Check
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_count INT;
    v_k_count INT;
    v_f_count INT;
BEGIN
    SELECT count(*) INTO v_count FROM public.dokument_templates;
    SELECT count(*) INTO v_k_count FROM public.dokument_templates WHERE pdfmonkey_template_id LIKE 'K-%';
    SELECT count(*) INTO v_f_count FROM public.dokument_templates WHERE pdfmonkey_template_id LIKE 'F-%';

    RAISE NOTICE 'M³⁶ W5.3 SEED-Status:';
    RAISE NOTICE '  dokument_templates total:                 %', v_count;
    RAISE NOTICE '  Korrespondenz-Briefe (K-XX, eigene IDs):  %', v_k_count;
    RAISE NOTICE '  PDFMonkey-Templates (F-XX):               %', v_f_count;
    RAISE NOTICE '  → Erwartung: 14 Einträge (8x K-XX, 3x F-XX-Mahnungen, 3x F-XX-Gutachten)';
END $$;
