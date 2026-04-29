-- ============================================================
-- PROVA Migration — PLANNED — DO NOT APPLY
-- Sprint 06b — auftraege-Tabelle Spalten fuer Wizard-Konformitaet
--
-- ⚠️ NICHT applizieren ohne Marcel-Review!
-- ⚠️ Diese Migration hat KEIN Datums-Prefix — sobald Marcel reviewt
--    und ok gibt, umbenennen zu z.B. 20260501_06b_auftraege_extend.sql
--    und via supabase db push oder Dashboard SQL-Editor anwenden.
--
-- Zweck: Sprint 06b Auftrags-Wizard erfasst Daten die in der aktuellen
--        auftraege-Tabelle nicht direkt mappen. Diese Migration fuegt
--        die minimal noetigen expliziten Spalten hinzu — typ-spezifische
--        Vorgangsdaten landen in details JSONB (existiert bereits).
--
-- Methodik: minimal-invasive Erweiterung statt grosser Schema-Refactor.
--           Die meisten Wizard-Felder mappen auf bestehende Spalten:
--           - objekt_adresse_*, objekt_typ, baujahr -> objekt JSONB
--           - schadensart -> schadensart_kategorie (existing)
--           - schadens_datum -> schadensstichtag (existing)
--           - schadensbeschreibung -> fragestellung (existing)
--           - Vorgangsdaten (schadennummer, gericht_az, ...) -> details JSONB
--           - Beteiligte (eigentuemer, klaeger, ...) -> auftrag_kontakte (existing)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUM auftraggeber_typ
-- ────────────────────────────────────────────────────────────

-- Idempotent — DO-Block faengt "type already exists" ab
DO $$
BEGIN
    CREATE TYPE auftraggeber_typ AS ENUM (
        'privatperson',
        'versicherung',
        'anwalt',
        'gericht',
        'behoerde',
        'firma'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Spalten in auftraege
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.auftraege
    ADD COLUMN IF NOT EXISTS auftraggeber_typ        auftraggeber_typ,
    ADD COLUMN IF NOT EXISTS auftraggeber_kontakt_id UUID REFERENCES public.kontakte(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.auftraege.auftraggeber_typ IS
    'Sprint 06b: Wizard-Conditional-Discriminator. Steuert welche Vorgangs-Felder in details JSONB Pflicht sind. Mirror von lib/auftrags-schema.js AUFTRAGGEBER_TYPEN.';

COMMENT ON COLUMN public.auftraege.auftraggeber_kontakt_id IS
    'Sprint 06b: Direct-FK auf den Stammdaten-Kontakt fuer schnelle Joins. Kann redundant zu auftrag_kontakte mit rolle=auftraggeber sein, aber Index-Performance besser.';

-- ────────────────────────────────────────────────────────────
-- 3. Indexe
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_typ
    ON public.auftraege(workspace_id, auftraggeber_typ)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_kontakt
    ON public.auftraege(auftraggeber_kontakt_id)
    WHERE auftraggeber_kontakt_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 4. JSONB-Schema-Hint (fuer Doku, kein DDL)
-- ────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.auftraege.details IS
    'Vorgangsdaten typ-spezifisch (Sprint 06b):
     - versicherung: { schadennummer, versicherungsnummer, versicherungsart, selbstbeteiligung_eur }
     - anwalt:       { anwalt_az, mandant_seite }
     - gericht:      { gericht_az, beweisbeschluss_datum, beweisfragen, frist_gutachten, kostenvorschuss_eur }
     - behoerde:     { behoerden_az, rechtsgrundlage }
     - firma:        { firma_az, projekt_nr }
     - privatperson: { privat_az }
     Plus Schadensart-spezifisch:
     - wasser:    { wasser_eintrittspunkt, wasser_dauer }
     - brand:     { brand_ursprungspunkt, brand_loesch_methode }
     - baumangel: { vertragsart, abnahme_datum }
     - schimmel:  { schimmel_befallene_flaeche_qm, schimmel_lokalisation }
     - elementar: { elementar_ereignis_typ, elementar_ereignis_datum }
     - setzung:   { setzung_riss_typ }
     - kombiniert:{ kombiniert_arten: [...] }
     Plus Phase 3 Ortstermin:
     - { ortstermin_datum, ortstermin_uhrzeit, anwesende, hilfsmittel: [...],
         wetterbedingungen, feuchte_messwerte, riss_messungen, russprobe_entnahme,
         probennahme }';

COMMENT ON COLUMN public.auftraege.objekt IS
    'Schadens-Objekt (Sprint 06b):
     { adresse_strasse, adresse_nr, plz, ort, typ, baujahr }';

-- ────────────────────────────────────────────────────────────
-- 5. Sanity-Output
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_typ_exists BOOLEAN;
    v_col1_exists BOOLEAN;
    v_col2_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auftraggeber_typ')
        INTO v_typ_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='auftraege' AND column_name='auftraggeber_typ')
        INTO v_col1_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='auftraege' AND column_name='auftraggeber_kontakt_id')
        INTO v_col2_exists;

    RAISE NOTICE 'PLANNED_06b_auftraege_extend complete:';
    RAISE NOTICE '  ENUM auftraggeber_typ exists: %', v_typ_exists;
    RAISE NOTICE '  Column auftraggeber_typ exists: %', v_col1_exists;
    RAISE NOTICE '  Column auftraggeber_kontakt_id exists: %', v_col2_exists;
END $$;

-- ============================================================
-- Marcel-Workflow:
--   1. Diese Datei reviewen — passt der Scope?
--   2. Falls ja: umbenennen zu 20260501_06b_auftraege_extend.sql
--      (oder anderes Datum aktuell)
--   3. Im Supabase-Dashboard SQL-Editor laufen lassen
--   4. Sanity-Output pruefen
--   5. lib/data-store.auftraege.create kann jetzt auftraggeber_typ +
--      auftraggeber_kontakt_id setzen (ist additive, bricht nichts)
--   6. auftrag-neu-logic.js (Sprint 06b) kann Live-Save aktivieren
-- ============================================================
