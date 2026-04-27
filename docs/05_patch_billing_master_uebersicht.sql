-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Patch 05: Billing + Master-Uebersicht
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Inhalt:        Yearly-Plan-Foundation + Master-Cockpit-View 
--                + Tabellarische Kundenliste + Time-Series
-- Voraussetzung: Phase 1+2+3+4 ausgefuehrt
-- 
-- AUSFUEHRUNG:   SQL-Editor → New Query → einfuegen → Run
--                Erfolg: "Success. No rows returned"
-- 
-- INHALT:
--   §1  ENUM abrechnungs_intervall
--   §2  ALTER TABLE workspaces (neue Billing-Felder)
--   §3  Aktualisierung v_cockpit_mrr (mit Yearly-Beruecksichtigung)
--   §4  Neue View: v_cockpit_master_uebersicht
--   §5  Neue View: v_cockpit_kunden_liste (tabellarisch)
--   §6  Neue View: v_cockpit_monats_verlauf
--   §7  Neue View: v_cockpit_jahres_verlauf
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 ENUM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE abrechnungs_intervall AS ENUM (
    'monatlich',     -- Standard: 149/279 EUR pro Monat
    'jaehrlich',     -- Mit Rabatt: z.B. 17% = 2 Monate gratis
    'einmalig'       -- z.B. fuer Pilot-Tester / Sonderfaelle
);


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 ALTER TABLE workspaces — Billing-Details ergaenzen
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.workspaces
    -- Abrechnungs-Modus
    ADD COLUMN abrechnungs_intervall abrechnungs_intervall NOT NULL DEFAULT 'monatlich',
    
    -- Echter MRR-Wert (kann durch Rabatte/Custom-Pricing abweichen)
    ADD COLUMN mrr_eur_snapshot NUMERIC(10,2),
    
    -- Yearly-Plan-Rabatt
    ADD COLUMN jahresabo_rabatt_pct NUMERIC(5,2) DEFAULT 0,
    
    -- Stripe-Synchronisation
    ADD COLUMN stripe_price_id TEXT,
    
    -- Zahlungsstatus & -historie
    ADD COLUMN naechste_zahlung_am DATE,
    ADD COLUMN letzte_zahlung_am DATE,
    ADD COLUMN letzte_zahlung_betrag_eur NUMERIC(10,2),
    ADD COLUMN gesamtzahlungen_lifetime_eur NUMERIC(12,2) DEFAULT 0,
    
    -- Kuendigung-Tracking
    ADD COLUMN kuendigung_zum_am DATE,
    ADD COLUMN kuendigung_grund_kategorie TEXT,
    
    -- Billing-Kontakt (kann abweichen von User-Email)
    ADD COLUMN billing_email TEXT,
    ADD COLUMN billing_kontakt_name TEXT,
    
    -- Zahlungsmethode
    ADD COLUMN zahlungsmethode TEXT,                          -- 'card', 'sepa', 'invoice'
    ADD COLUMN zahlungsmethode_letzte_4 TEXT;                  -- nur die letzten 4 Stellen


-- Index fuer Cockpit-Queries
CREATE INDEX idx_workspaces_intervall ON public.workspaces(abrechnungs_intervall, abo_status);
CREATE INDEX idx_workspaces_naechste_zahlung ON public.workspaces(naechste_zahlung_am) 
    WHERE abo_status = 'aktiv' AND deleted_at IS NULL;
CREATE INDEX idx_workspaces_kuendigung ON public.workspaces(kuendigung_zum_am) 
    WHERE kuendigung_zum_am IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 v_cockpit_mrr — Aktualisierung mit Yearly-Beruecksichtigung
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Yearly-Aboennements werden auf Monatsbasis runtergerechnet
-- (z.B. 1490€/Jahr Solo = 124,17€/Monat MRR-Aequivalent)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_cockpit_mrr AS
SELECT 
    date_trunc('month', NOW()) AS monat,
    
    -- User-Counts (Snapshot heute)
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'solo')                                              AS solo_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'team')                                              AS team_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv')                                                                     AS aktive_kunden_total,
    COUNT(*) FILTER (WHERE abo_status = 'trial')                                                                     AS trial_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'gekuendigt')                                                                AS gechurnde_kunden,
    
    -- Monatsabos
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abrechnungs_intervall = 'monatlich')                            AS monatsabo_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abrechnungs_intervall = 'jaehrlich')                            AS jahresabo_kunden,
    
    -- MRR (alles auf Monatsbasis runtergerechnet)
    -- Solo monatlich = 149, Solo jaehrlich = 1490/12 = 124.17 (~17% Rabatt)
    -- Team monatlich = 279, Team jaehrlich = 2790/12 = 232.50
    COALESCE(SUM(
        CASE 
            WHEN abo_status = 'aktiv' AND abo_tier = 'solo' AND abrechnungs_intervall = 'monatlich' THEN 149
            WHEN abo_status = 'aktiv' AND abo_tier = 'solo' AND abrechnungs_intervall = 'jaehrlich' THEN 124.17
            WHEN abo_status = 'aktiv' AND abo_tier = 'team' AND abrechnungs_intervall = 'monatlich' THEN 279
            WHEN abo_status = 'aktiv' AND abo_tier = 'team' AND abrechnungs_intervall = 'jaehrlich' THEN 232.50
            ELSE 0
        END
    ), 0)::NUMERIC(10,2)                                                                                              AS mrr_eur,
    
    -- ARR = MRR x 12
    COALESCE(SUM(
        CASE 
            WHEN abo_status = 'aktiv' AND abo_tier = 'solo' AND abrechnungs_intervall = 'monatlich' THEN 149 * 12
            WHEN abo_status = 'aktiv' AND abo_tier = 'solo' AND abrechnungs_intervall = 'jaehrlich' THEN 1490
            WHEN abo_status = 'aktiv' AND abo_tier = 'team' AND abrechnungs_intervall = 'monatlich' THEN 279 * 12
            WHEN abo_status = 'aktiv' AND abo_tier = 'team' AND abrechnungs_intervall = 'jaehrlich' THEN 2790
            ELSE 0
        END
    ), 0)::NUMERIC(12,2)                                                                                              AS arr_eur
FROM public.workspaces
WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- §4 v_cockpit_master_uebersicht — DAS Cockpit-Dashboard
-- 
-- Alles auf einen Blick: User, MRR, ARR, Health, Support, KI-Kosten, Wachstum
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_cockpit_master_uebersicht AS
WITH 
mrr_data AS (SELECT * FROM public.v_cockpit_mrr),

kosten_aktueller_monat AS (
    SELECT 
        COALESCE(SUM(kosten_eur), 0)::NUMERIC(10,2) AS ki_kosten_aktuell_eur,
        COUNT(id) AS ki_calls_aktuell
    FROM public.ki_protokoll
    WHERE created_at > date_trunc('month', NOW())
),

support_aktiv AS (
    SELECT 
        COUNT(*) FILTER (WHERE status NOT IN ('geloest', 'closed')) AS tickets_offen,
        COUNT(*) FILTER (WHERE status NOT IN ('geloest', 'closed') AND prioritaet IN ('hoch', 'kritisch')) AS tickets_dringend,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS tickets_24h
    FROM public.support_tickets
),

wachstum AS (
    SELECT 
        COUNT(*) FILTER (WHERE created_at > date_trunc('month', NOW())) AS neue_signups_monat,
        COUNT(*) FILTER (WHERE created_at > date_trunc('year', NOW())) AS neue_signups_jahr,
        COUNT(*) FILTER (WHERE abo_aktiv_seit > date_trunc('month', NOW())) AS neue_paid_monat,
        COUNT(*) FILTER (WHERE abo_aktiv_seit > date_trunc('year', NOW())) AS neue_paid_jahr,
        COUNT(*) FILTER (WHERE kuendigung_zum_am IS NOT NULL AND kuendigung_zum_am > NOW() - INTERVAL '30 days') AS pending_churn_30d
    FROM public.workspaces
    WHERE deleted_at IS NULL
),

einnahmen_historisch AS (
    SELECT 
        COALESCE(SUM(letzte_zahlung_betrag_eur) FILTER (WHERE letzte_zahlung_am > date_trunc('month', NOW())), 0) AS einnahmen_aktueller_monat,
        COALESCE(SUM(letzte_zahlung_betrag_eur) FILTER (WHERE letzte_zahlung_am > date_trunc('year', NOW())), 0) AS einnahmen_aktuelles_jahr,
        COALESCE(SUM(gesamtzahlungen_lifetime_eur), 0) AS einnahmen_lifetime
    FROM public.workspaces
    WHERE deleted_at IS NULL
)

SELECT 
    NOW() AS stand_am,
    
    -- ═══ KUNDEN-STAND ═══
    mrr_data.aktive_kunden_total                          AS kunden_aktiv,
    mrr_data.trial_kunden                                 AS kunden_trial,
    mrr_data.gechurnde_kunden                             AS kunden_gechurned,
    mrr_data.solo_kunden                                  AS solo_kunden,
    mrr_data.team_kunden                                  AS team_kunden,
    mrr_data.monatsabo_kunden                             AS monatsabo_kunden,
    mrr_data.jahresabo_kunden                             AS jahresabo_kunden,
    
    -- ═══ UMSAETZE ═══
    mrr_data.mrr_eur                                      AS mrr_eur,
    mrr_data.arr_eur                                      AS arr_eur,
    einnahmen_historisch.einnahmen_aktueller_monat::NUMERIC(10,2)        AS einnahmen_aktueller_monat_eur,
    einnahmen_historisch.einnahmen_aktuelles_jahr::NUMERIC(12,2)         AS einnahmen_aktuelles_jahr_eur,
    einnahmen_historisch.einnahmen_lifetime::NUMERIC(12,2)               AS einnahmen_lifetime_eur,
    
    -- ═══ KOSTEN ═══
    kosten_aktueller_monat.ki_kosten_aktuell_eur          AS ki_kosten_monat_eur,
    kosten_aktueller_monat.ki_calls_aktuell               AS ki_calls_monat,
    
    -- Margin (vereinfacht)
    (mrr_data.mrr_eur - kosten_aktueller_monat.ki_kosten_aktuell_eur)::NUMERIC(10,2)  AS marge_monat_eur,
    CASE WHEN mrr_data.mrr_eur > 0
         THEN ROUND(100 - (kosten_aktueller_monat.ki_kosten_aktuell_eur / mrr_data.mrr_eur * 100), 2)
         ELSE NULL END                                                                 AS marge_pct,
    
    -- ═══ WACHSTUM ═══
    wachstum.neue_signups_monat                           AS neue_signups_monat,
    wachstum.neue_signups_jahr                            AS neue_signups_jahr,
    wachstum.neue_paid_monat                              AS neue_paid_monat,
    wachstum.neue_paid_jahr                               AS neue_paid_jahr,
    wachstum.pending_churn_30d                            AS pending_churn_30d,
    
    -- Conversion Trial→Paid (aktuelles Jahr)
    CASE WHEN wachstum.neue_signups_jahr > 0
         THEN ROUND((wachstum.neue_paid_jahr::NUMERIC / wachstum.neue_signups_jahr * 100), 2)
         ELSE 0 END                                                                    AS conversion_jahr_pct,
    
    -- ═══ SUPPORT-STAND ═══
    support_aktiv.tickets_offen                           AS support_tickets_offen,
    support_aktiv.tickets_dringend                        AS support_tickets_dringend,
    support_aktiv.tickets_24h                             AS support_tickets_24h
    
FROM mrr_data
CROSS JOIN kosten_aktueller_monat
CROSS JOIN support_aktiv
CROSS JOIN wachstum
CROSS JOIN einnahmen_historisch;


-- ═══════════════════════════════════════════════════════════════════════════
-- §5 v_cockpit_kunden_liste — Tabellarisch, eine Zeile pro Kunde
-- 
-- Marcel-Wunsch: "tabellarisch darstellbar"
-- Zeigt alle Kunden mit allem was Du auf einen Blick brauchst.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_cockpit_kunden_liste AS
SELECT 
    w.id                                                  AS workspace_id,
    w.name                                                AS workspace_name,
    
    -- Owner-Info
    (SELECT u.name FROM public.users u 
     JOIN public.workspace_memberships m ON m.user_id = u.id
     WHERE m.workspace_id = w.id AND m.rolle = 'owner' LIMIT 1)                  AS owner_name,
    (SELECT u.email FROM public.users u
     JOIN public.workspace_memberships m ON m.user_id = u.id
     WHERE m.workspace_id = w.id AND m.rolle = 'owner' LIMIT 1)                  AS owner_email,
    
    -- Tier & Status
    w.abo_tier,
    w.abo_status,
    w.abrechnungs_intervall,
    
    -- Berechnung MRR pro Kunde
    CASE 
        WHEN w.abo_status != 'aktiv' THEN 0
        WHEN w.mrr_eur_snapshot IS NOT NULL THEN w.mrr_eur_snapshot
        WHEN w.abo_tier = 'solo' AND w.abrechnungs_intervall = 'monatlich' THEN 149
        WHEN w.abo_tier = 'solo' AND w.abrechnungs_intervall = 'jaehrlich' THEN 124.17
        WHEN w.abo_tier = 'team' AND w.abrechnungs_intervall = 'monatlich' THEN 279
        WHEN w.abo_tier = 'team' AND w.abrechnungs_intervall = 'jaehrlich' THEN 232.50
        ELSE 0
    END::NUMERIC(10,2)                                                            AS mrr_eur,
    
    -- Lifecycle
    w.created_at::DATE                                    AS angemeldet_am,
    w.abo_trial_endet_am::DATE                            AS trial_endet_am,
    w.abo_aktiv_seit::DATE                                AS bezahlt_seit,
    
    -- Zahlungs-Status
    w.naechste_zahlung_am,
    w.letzte_zahlung_am,
    w.letzte_zahlung_betrag_eur,
    w.gesamtzahlungen_lifetime_eur,
    
    -- Kuendigung
    w.kuendigung_zum_am,
    w.kuendigung_grund_kategorie,
    
    -- Aktivitaets-Indikatoren
    (SELECT COUNT(*) FROM public.auftraege a 
     WHERE a.workspace_id = w.id 
       AND a.created_at > NOW() - INTERVAL '30 days'
       AND a.deleted_at IS NULL)                                                  AS auftraege_30d,
    
    (SELECT COUNT(*) FROM public.dokumente d 
     WHERE d.workspace_id = w.id 
       AND d.created_at > NOW() - INTERVAL '30 days'
       AND d.deleted_at IS NULL)                                                  AS dokumente_30d,
    
    -- KI-Kosten dieses Monats
    (SELECT COALESCE(SUM(p.kosten_eur), 0)::NUMERIC(10,2) 
     FROM public.ki_protokoll p 
     WHERE p.workspace_id = w.id 
       AND p.created_at > date_trunc('month', NOW()))                             AS ki_kosten_monat_eur,
    
    -- Letzte Aktivitaet
    (SELECT MAX(u.last_active_at) FROM public.users u
     JOIN public.workspace_memberships m ON m.user_id = u.id
     WHERE m.workspace_id = w.id)                                                 AS letzte_aktivitaet_at,
    
    -- Risk-Score (vereinfacht: hoch=Churn-Gefahr)
    CASE 
        WHEN w.abo_status = 'gekuendigt' THEN 'gechurned'
        WHEN w.kuendigung_zum_am IS NOT NULL THEN 'kuendigung_pending'
        WHEN w.abo_status = 'ueberfaellig' THEN 'ueberfaellig'
        WHEN w.abo_status = 'trial' AND w.abo_trial_endet_am < NOW() + INTERVAL '3 days' THEN 'trial_endet_bald'
        WHEN (SELECT MAX(u.last_active_at) FROM public.users u 
              JOIN public.workspace_memberships m ON m.user_id = u.id
              WHERE m.workspace_id = w.id) < NOW() - INTERVAL '21 days' THEN 'inaktiv'
        ELSE 'gesund'
    END                                                                           AS risk_status,
    
    -- Stripe-Refs (fuer Click-through)
    w.stripe_customer_id,
    w.stripe_subscription_id,
    
    w.created_at,
    w.updated_at
FROM public.workspaces w
WHERE w.deleted_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- §6 v_cockpit_monats_verlauf — Time-Series Monatlich
-- 
-- Pro Monat: Wie viele Signups, Konversionen, Churns, MRR-Stand
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_cockpit_monats_verlauf AS
WITH monate AS (
    -- Generiere die letzten 24 Monate
    SELECT generate_series(
        date_trunc('month', NOW() - INTERVAL '23 months'),
        date_trunc('month', NOW()),
        '1 month'::interval
    )::DATE AS monat_start
)
SELECT 
    m.monat_start,
    to_char(m.monat_start, 'YYYY-MM')                                                 AS monat_label,
    to_char(m.monat_start, 'TMMon YYYY')                                              AS monat_label_de,
    
    -- Neuanmeldungen in diesem Monat
    COUNT(w.id) FILTER (
        WHERE date_trunc('month', w.created_at) = m.monat_start
    )                                                                                  AS signups,
    
    -- Konversionen Trial → Paid in diesem Monat
    COUNT(w.id) FILTER (
        WHERE date_trunc('month', w.abo_aktiv_seit) = m.monat_start
    )                                                                                  AS konversionen,
    
    -- Kuendigungen in diesem Monat
    COUNT(w.id) FILTER (
        WHERE w.abo_status = 'gekuendigt' 
          AND date_trunc('month', w.abo_gekuendigt_am) = m.monat_start
    )                                                                                  AS kuendigungen,
    
    -- Aktive Kunden Ende des Monats (Snapshot)
    COUNT(w.id) FILTER (
        WHERE w.abo_aktiv_seit <= (m.monat_start + INTERVAL '1 month' - INTERVAL '1 day')
          AND (w.abo_gekuendigt_am IS NULL OR w.abo_gekuendigt_am > m.monat_start + INTERVAL '1 month')
          AND w.abo_status != 'trial'
    )                                                                                  AS aktive_kunden_monatsende,
    
    -- Einnahmen in diesem Monat (aus letzte_zahlung_*)
    COALESCE(SUM(w.letzte_zahlung_betrag_eur) FILTER (
        WHERE date_trunc('month', w.letzte_zahlung_am) = m.monat_start
    ), 0)::NUMERIC(12,2)                                                              AS einnahmen_eur
FROM monate m
LEFT JOIN public.workspaces w ON w.deleted_at IS NULL
GROUP BY m.monat_start
ORDER BY m.monat_start DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- §7 v_cockpit_jahres_verlauf — Time-Series Jaehrlich
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_cockpit_jahres_verlauf AS
WITH jahre AS (
    SELECT generate_series(
        date_trunc('year', NOW() - INTERVAL '4 years'),
        date_trunc('year', NOW()),
        '1 year'::interval
    )::DATE AS jahr_start
)
SELECT 
    EXTRACT(YEAR FROM j.jahr_start)::INTEGER                                          AS jahr,
    
    -- Signups
    COUNT(w.id) FILTER (
        WHERE EXTRACT(YEAR FROM w.created_at) = EXTRACT(YEAR FROM j.jahr_start)
    )                                                                                  AS signups,
    
    -- Konversionen
    COUNT(w.id) FILTER (
        WHERE EXTRACT(YEAR FROM w.abo_aktiv_seit) = EXTRACT(YEAR FROM j.jahr_start)
    )                                                                                  AS konversionen,
    
    -- Kuendigungen
    COUNT(w.id) FILTER (
        WHERE w.abo_status = 'gekuendigt' 
          AND EXTRACT(YEAR FROM w.abo_gekuendigt_am) = EXTRACT(YEAR FROM j.jahr_start)
    )                                                                                  AS kuendigungen,
    
    -- Aktive Ende des Jahres
    COUNT(w.id) FILTER (
        WHERE w.abo_aktiv_seit <= (j.jahr_start + INTERVAL '1 year' - INTERVAL '1 day')
          AND (w.abo_gekuendigt_am IS NULL OR w.abo_gekuendigt_am > j.jahr_start + INTERVAL '1 year')
          AND w.abo_status != 'trial'
    )                                                                                  AS aktive_kunden_jahresende,
    
    -- Einnahmen Jahr
    COALESCE(SUM(w.letzte_zahlung_betrag_eur) FILTER (
        WHERE EXTRACT(YEAR FROM w.letzte_zahlung_am) = EXTRACT(YEAR FROM j.jahr_start)
    ), 0)::NUMERIC(12,2)                                                              AS einnahmen_eur
FROM jahre j
LEFT JOIN public.workspaces w ON w.deleted_at IS NULL
GROUP BY j.jahr_start
ORDER BY j.jahr_start DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATIONS-HINWEISE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- A) Master-Uebersicht testen:
--    SELECT * FROM public.v_cockpit_master_uebersicht;
--    Erwartet: 1 Zeile mit allen KPIs (alle Werte 0 weil noch keine Daten)
-- 
-- B) Kunden-Liste testen:
--    SELECT * FROM public.v_cockpit_kunden_liste LIMIT 10;
--    Erwartet: leer (keine Workspaces) ODER 1 Zeile (wenn Du schon angemeldet bist)
-- 
-- C) Monats-Verlauf testen:
--    SELECT * FROM public.v_cockpit_monats_verlauf;
--    Erwartet: 24 Zeilen (alle 0)
-- 
-- D) Jahres-Verlauf testen:
--    SELECT * FROM public.v_cockpit_jahres_verlauf;
--    Erwartet: 5 Zeilen
-- 
-- E) workspaces neue Spalten:
--    SELECT column_name FROM information_schema.columns 
--      WHERE table_name = 'workspaces' AND table_schema = 'public'
--      AND column_name IN ('abrechnungs_intervall', 'mrr_eur_snapshot', 
--                          'naechste_zahlung_am', 'letzte_zahlung_betrag_eur',
--                          'kuendigung_zum_am', 'gesamtzahlungen_lifetime_eur')
--      ORDER BY column_name;
--    Erwartet: 6 Zeilen
-- 
-- ═══════════════════════════════════════════════════════════════════════════
-- ENDE PATCH 05
-- 
-- Schema 100% komplett mit Master-Cockpit-Foundation.
-- Naechster Schritt: Sprint K-1 Prompt fuer Claude Code.
-- ═══════════════════════════════════════════════════════════════════════════
