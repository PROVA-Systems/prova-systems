-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Patch 05 v2: Billing + Master-Übersicht (FIXED)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Inhalt:        Yearly-Plan-Foundation + Master-Cockpit-View 
--                + Tabellarische Kundenliste + Time-Series
-- Voraussetzung: Phase 1+2+3+4 ausgeführt
-- 
-- FIX:           DROP VIEW v_cockpit_mrr CASCADE am Anfang
--                Loest "cannot change name of view column" Error
-- 
-- AUSFÜHRUNG:    SQL-Editor → New Query → einfügen → Run
--                Erfolg: "Success. No rows returned"
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §0 RESET: Alte Views droppen
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- v_cockpit_mrr existiert bereits aus Phase 4 mit anderen Spalten.
-- CREATE OR REPLACE VIEW kann Spalten-Namen nicht aendern → DROP noetig.
-- CASCADE = abhaengige Views auch droppen (werden weiter unten neu erstellt).
-- ═══════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.v_cockpit_master_uebersicht CASCADE;
DROP VIEW IF EXISTS public.v_cockpit_kunden_liste CASCADE;
DROP VIEW IF EXISTS public.v_cockpit_monats_verlauf CASCADE;
DROP VIEW IF EXISTS public.v_cockpit_jahres_verlauf CASCADE;
DROP VIEW IF EXISTS public.v_cockpit_mrr CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 ENUM
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE abrechnungs_intervall AS ENUM (
        'monatlich',
        'jaehrlich',
        'einmalig'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 ALTER TABLE workspaces — Billing-Details ergänzen
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- IF NOT EXISTS-Pattern: macht das Skript idempotent (kann mehrfach laufen)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS abrechnungs_intervall abrechnungs_intervall NOT NULL DEFAULT 'monatlich',
    ADD COLUMN IF NOT EXISTS mrr_eur_snapshot NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS jahresabo_rabatt_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
    ADD COLUMN IF NOT EXISTS naechste_zahlung_am DATE,
    ADD COLUMN IF NOT EXISTS letzte_zahlung_am DATE,
    ADD COLUMN IF NOT EXISTS letzte_zahlung_betrag_eur NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS gesamtzahlungen_lifetime_eur NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS kuendigung_zum_am DATE,
    ADD COLUMN IF NOT EXISTS kuendigung_grund_kategorie TEXT,
    ADD COLUMN IF NOT EXISTS billing_email TEXT,
    ADD COLUMN IF NOT EXISTS billing_kontakt_name TEXT,
    ADD COLUMN IF NOT EXISTS zahlungsmethode TEXT,
    ADD COLUMN IF NOT EXISTS zahlungsmethode_letzte_4 TEXT;


-- Indices (mit IF NOT EXISTS — idempotent)
CREATE INDEX IF NOT EXISTS idx_workspaces_intervall ON public.workspaces(abrechnungs_intervall, abo_status);
CREATE INDEX IF NOT EXISTS idx_workspaces_naechste_zahlung ON public.workspaces(naechste_zahlung_am) 
    WHERE abo_status = 'aktiv' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_kuendigung ON public.workspaces(kuendigung_zum_am) 
    WHERE kuendigung_zum_am IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 v_cockpit_mrr — Aktualisierung mit Yearly-Berücksichtigung
-- ═══════════════════════════════════════════════════════════════════════════

CREATE VIEW public.v_cockpit_mrr AS
SELECT 
    date_trunc('month', NOW()) AS monat,
    
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'solo')                                              AS solo_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'team')                                              AS team_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv')                                                                     AS aktive_kunden_total,
    COUNT(*) FILTER (WHERE abo_status = 'trial')                                                                     AS trial_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'gekuendigt')                                                                AS gechurnde_kunden,
    
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abrechnungs_intervall = 'monatlich')                            AS monatsabo_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abrechnungs_intervall = 'jaehrlich')                            AS jahresabo_kunden,
    
    COALESCE(SUM(
        CASE 
            WHEN abo_status = 'aktiv' AND abo_tier = 'solo' AND abrechnungs_intervall = 'monatlich' THEN 149
            WHEN abo_status = 'aktiv' AND abo_tier = 'solo' AND abrechnungs_intervall = 'jaehrlich' THEN 124.17
            WHEN abo_status = 'aktiv' AND abo_tier = 'team' AND abrechnungs_intervall = 'monatlich' THEN 279
            WHEN abo_status = 'aktiv' AND abo_tier = 'team' AND abrechnungs_intervall = 'jaehrlich' THEN 232.50
            ELSE 0
        END
    ), 0)::NUMERIC(10,2)                                                                                              AS mrr_eur,
    
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
-- ═══════════════════════════════════════════════════════════════════════════

CREATE VIEW public.v_cockpit_master_uebersicht AS
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
    
    mrr_data.aktive_kunden_total                          AS kunden_aktiv,
    mrr_data.trial_kunden                                 AS kunden_trial,
    mrr_data.gechurnde_kunden                             AS kunden_gechurned,
    mrr_data.solo_kunden                                  AS solo_kunden,
    mrr_data.team_kunden                                  AS team_kunden,
    mrr_data.monatsabo_kunden                             AS monatsabo_kunden,
    mrr_data.jahresabo_kunden                             AS jahresabo_kunden,
    
    mrr_data.mrr_eur                                      AS mrr_eur,
    mrr_data.arr_eur                                      AS arr_eur,
    einnahmen_historisch.einnahmen_aktueller_monat::NUMERIC(10,2)        AS einnahmen_aktueller_monat_eur,
    einnahmen_historisch.einnahmen_aktuelles_jahr::NUMERIC(12,2)         AS einnahmen_aktuelles_jahr_eur,
    einnahmen_historisch.einnahmen_lifetime::NUMERIC(12,2)               AS einnahmen_lifetime_eur,
    
    kosten_aktueller_monat.ki_kosten_aktuell_eur          AS ki_kosten_monat_eur,
    kosten_aktueller_monat.ki_calls_aktuell               AS ki_calls_monat,
    
    (mrr_data.mrr_eur - kosten_aktueller_monat.ki_kosten_aktuell_eur)::NUMERIC(10,2)  AS marge_monat_eur,
    CASE WHEN mrr_data.mrr_eur > 0
         THEN ROUND(100 - (kosten_aktueller_monat.ki_kosten_aktuell_eur / mrr_data.mrr_eur * 100), 2)
         ELSE NULL END                                                                 AS marge_pct,
    
    wachstum.neue_signups_monat                           AS neue_signups_monat,
    wachstum.neue_signups_jahr                            AS neue_signups_jahr,
    wachstum.neue_paid_monat                              AS neue_paid_monat,
    wachstum.neue_paid_jahr                               AS neue_paid_jahr,
    wachstum.pending_churn_30d                            AS pending_churn_30d,
    
    CASE WHEN wachstum.neue_signups_jahr > 0
         THEN ROUND((wachstum.neue_paid_jahr::NUMERIC / wachstum.neue_signups_jahr * 100), 2)
         ELSE 0 END                                                                    AS conversion_jahr_pct,
    
    support_aktiv.tickets_offen                           AS support_tickets_offen,
    support_aktiv.tickets_dringend                        AS support_tickets_dringend,
    support_aktiv.tickets_24h                             AS support_tickets_24h
    
FROM mrr_data
CROSS JOIN kosten_aktueller_monat
CROSS JOIN support_aktiv
CROSS JOIN wachstum
CROSS JOIN einnahmen_historisch;


-- ═══════════════════════════════════════════════════════════════════════════
-- §5 v_cockpit_kunden_liste — Tabellarisch
-- ═══════════════════════════════════════════════════════════════════════════

CREATE VIEW public.v_cockpit_kunden_liste AS
SELECT 
    w.id                                                  AS workspace_id,
    w.name                                                AS workspace_name,
    
    (SELECT u.name FROM public.users u 
     JOIN public.workspace_memberships m ON m.user_id = u.id
     WHERE m.workspace_id = w.id AND m.rolle = 'owner' LIMIT 1)                  AS owner_name,
    (SELECT u.email FROM public.users u
     JOIN public.workspace_memberships m ON m.user_id = u.id
     WHERE m.workspace_id = w.id AND m.rolle = 'owner' LIMIT 1)                  AS owner_email,
    
    w.abo_tier,
    w.abo_status,
    w.abrechnungs_intervall,
    
    CASE 
        WHEN w.abo_status != 'aktiv' THEN 0
        WHEN w.mrr_eur_snapshot IS NOT NULL THEN w.mrr_eur_snapshot
        WHEN w.abo_tier = 'solo' AND w.abrechnungs_intervall = 'monatlich' THEN 149
        WHEN w.abo_tier = 'solo' AND w.abrechnungs_intervall = 'jaehrlich' THEN 124.17
        WHEN w.abo_tier = 'team' AND w.abrechnungs_intervall = 'monatlich' THEN 279
        WHEN w.abo_tier = 'team' AND w.abrechnungs_intervall = 'jaehrlich' THEN 232.50
        ELSE 0
    END::NUMERIC(10,2)                                                            AS mrr_eur,
    
    w.created_at::DATE                                    AS angemeldet_am,
    w.abo_trial_endet_am::DATE                            AS trial_endet_am,
    w.abo_aktiv_seit::DATE                                AS bezahlt_seit,
    
    w.naechste_zahlung_am,
    w.letzte_zahlung_am,
    w.letzte_zahlung_betrag_eur,
    w.gesamtzahlungen_lifetime_eur,
    
    w.kuendigung_zum_am,
    w.kuendigung_grund_kategorie,
    
    (SELECT COUNT(*) FROM public.auftraege a 
     WHERE a.workspace_id = w.id 
       AND a.created_at > NOW() - INTERVAL '30 days'
       AND a.deleted_at IS NULL)                                                  AS auftraege_30d,
    
    (SELECT COUNT(*) FROM public.dokumente d 
     WHERE d.workspace_id = w.id 
       AND d.created_at > NOW() - INTERVAL '30 days'
       AND d.deleted_at IS NULL)                                                  AS dokumente_30d,
    
    (SELECT COALESCE(SUM(p.kosten_eur), 0)::NUMERIC(10,2) 
     FROM public.ki_protokoll p 
     WHERE p.workspace_id = w.id 
       AND p.created_at > date_trunc('month', NOW()))                             AS ki_kosten_monat_eur,
    
    (SELECT MAX(u.last_active_at) FROM public.users u
     JOIN public.workspace_memberships m ON m.user_id = u.id
     WHERE m.workspace_id = w.id)                                                 AS letzte_aktivitaet_at,
    
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
    
    w.stripe_customer_id,
    w.stripe_subscription_id,
    
    w.created_at,
    w.updated_at
FROM public.workspaces w
WHERE w.deleted_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- §6 v_cockpit_monats_verlauf
-- ═══════════════════════════════════════════════════════════════════════════

CREATE VIEW public.v_cockpit_monats_verlauf AS
WITH monate AS (
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
    
    COUNT(w.id) FILTER (
        WHERE date_trunc('month', w.created_at) = m.monat_start
    )                                                                                  AS signups,
    
    COUNT(w.id) FILTER (
        WHERE date_trunc('month', w.abo_aktiv_seit) = m.monat_start
    )                                                                                  AS konversionen,
    
    COUNT(w.id) FILTER (
        WHERE w.abo_status = 'gekuendigt' 
          AND date_trunc('month', w.abo_gekuendigt_am) = m.monat_start
    )                                                                                  AS kuendigungen,
    
    COUNT(w.id) FILTER (
        WHERE w.abo_aktiv_seit <= (m.monat_start + INTERVAL '1 month' - INTERVAL '1 day')
          AND (w.abo_gekuendigt_am IS NULL OR w.abo_gekuendigt_am > m.monat_start + INTERVAL '1 month')
          AND w.abo_status != 'trial'
    )                                                                                  AS aktive_kunden_monatsende,
    
    COALESCE(SUM(w.letzte_zahlung_betrag_eur) FILTER (
        WHERE date_trunc('month', w.letzte_zahlung_am) = m.monat_start
    ), 0)::NUMERIC(12,2)                                                              AS einnahmen_eur
FROM monate m
LEFT JOIN public.workspaces w ON w.deleted_at IS NULL
GROUP BY m.monat_start
ORDER BY m.monat_start DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- §7 v_cockpit_jahres_verlauf
-- ═══════════════════════════════════════════════════════════════════════════

CREATE VIEW public.v_cockpit_jahres_verlauf AS
WITH jahre AS (
    SELECT generate_series(
        date_trunc('year', NOW() - INTERVAL '4 years'),
        date_trunc('year', NOW()),
        '1 year'::interval
    )::DATE AS jahr_start
)
SELECT 
    EXTRACT(YEAR FROM j.jahr_start)::INTEGER                                          AS jahr,
    
    COUNT(w.id) FILTER (
        WHERE EXTRACT(YEAR FROM w.created_at) = EXTRACT(YEAR FROM j.jahr_start)
    )                                                                                  AS signups,
    
    COUNT(w.id) FILTER (
        WHERE EXTRACT(YEAR FROM w.abo_aktiv_seit) = EXTRACT(YEAR FROM j.jahr_start)
    )                                                                                  AS konversionen,
    
    COUNT(w.id) FILTER (
        WHERE w.abo_status = 'gekuendigt' 
          AND EXTRACT(YEAR FROM w.abo_gekuendigt_am) = EXTRACT(YEAR FROM j.jahr_start)
    )                                                                                  AS kuendigungen,
    
    COUNT(w.id) FILTER (
        WHERE w.abo_aktiv_seit <= (j.jahr_start + INTERVAL '1 year' - INTERVAL '1 day')
          AND (w.abo_gekuendigt_am IS NULL OR w.abo_gekuendigt_am > j.jahr_start + INTERVAL '1 year')
          AND w.abo_status != 'trial'
    )                                                                                  AS aktive_kunden_jahresende,
    
    COALESCE(SUM(w.letzte_zahlung_betrag_eur) FILTER (
        WHERE EXTRACT(YEAR FROM w.letzte_zahlung_am) = EXTRACT(YEAR FROM j.jahr_start)
    ), 0)::NUMERIC(12,2)                                                              AS einnahmen_eur
FROM jahre j
LEFT JOIN public.workspaces w ON w.deleted_at IS NULL
GROUP BY j.jahr_start
ORDER BY j.jahr_start DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- ENDE PATCH 05 v2
-- 
-- Verifikation:
--   SELECT * FROM public.v_cockpit_master_uebersicht;
--   SELECT * FROM public.v_cockpit_kunden_liste LIMIT 5;
-- ═══════════════════════════════════════════════════════════════════════════
