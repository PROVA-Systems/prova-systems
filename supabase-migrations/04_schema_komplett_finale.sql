-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Schema Phase 4: KOMPLETT-FINALE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Inhalt:        Wissens-Bibliotheken, KI-Infrastruktur, Migration,
--                System-Health, Admin-Cockpit + Support, Compliance, 
--                Geschäft, 8 Functions, 8 Cockpit-Views, pgvector
-- 
-- Voraussetzung: Phase 1 + Phase 2 + Phase 3 ausgeführt
-- 
-- AUSFÜHRUNG:
--   SQL-Editor → New Query → diesen Inhalt einfügen → Run
--   Erwartete Dauer: ~5-10 Sekunden
--   Erfolg: "Success. No rows returned"
-- 
-- DANACH: Schema 100% komplett. Sprint K-1 für Claude Code starten.
-- 
-- INHALTSVERZEICHNIS:
--   §1  Extensions (pgvector!)
--   §2  ENUMs für Phase 4
--   §3  Wissens-Bibliotheken (5 Tabellen)
--   §4  KI-Infrastruktur (3 Tabellen)
--   §5  Migration (2 Tabellen)
--   §6  System & Health (4 Tabellen)
--   §7  Admin-Cockpit + Support (6 Tabellen)
--   §8  Compliance & Recht (2 Tabellen)
--   §9  Geschäft & Marketing (4 Tabellen)
--   §10 Helper-Functions (8)
--   §11 Row-Level-Security (alle Phase-4-Tabellen)
--   §12 Cockpit-Views (8 für Marcel-Founder-Dashboard)
--   §13 Verifikations-Hinweise
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- pgvector ermöglicht Vektor-Suche für KI-RAG (Retrieval-Augmented Generation).
-- Wir brauchen es für wissen_diagnostik (KI versteht Bedeutung, nicht nur Wörter).

CREATE EXTENSION IF NOT EXISTS "vector";


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 ENUMs für Phase 4
-- ═══════════════════════════════════════════════════════════════════════════

-- Wissens-Bibliotheken
CREATE TYPE norm_bereich AS ENUM (
    'bauwerksabdichtung', 'feuchteschutz', 'waermeschutz', 'schallschutz',
    'brandschutz', 'standsicherheit', 'estriche', 'putze', 'beton',
    'mauerwerk', 'holzbau', 'metallbau', 'fenster_tueren', 'daecher',
    'fassaden', 'innenausbau', 'tga_haustechnik', 'sanitaer', 'heizung',
    'elektro', 'aussenanlagen', 'jveg', 'zpo_bgb', 'sonstiges'
);

CREATE TYPE textbaustein_kategorie AS ENUM (
    'einleitung', 'sachverhalt', 'befund', 'bewertung', 'fachurteil',
    'norm_zitat', 'pflichthinweis', 'gruss', 'mahnung', 'anschreiben',
    'bescheinigung', 'rechnung', 'fragestellung', 'sonstiges'
);

CREATE TYPE prompt_purpose AS ENUM (
    'diktat_strukturierung',
    'plausibilitaets_check',
    'norm_vorschlag',
    'konjunktiv_korrektur',
    'befund_generierung',
    'ursachen_hypothesen',
    'kurzbeantwortung',
    'kurzstellungnahme',
    'sanierungsvorschlag',
    'foto_beschreibung',
    'pseudonymisierung',
    'sonstiges'
);

-- KI-Tracking
CREATE TYPE ki_modell_typ AS ENUM (
    'gpt_4o', 'gpt_4o_mini', 'gpt_4_turbo',
    'whisper_1',
    'claude_4_opus', 'claude_sonnet',
    'mistral_large', 'mistral_medium',
    'embedding_3_small', 'embedding_3_large',
    'sonstiges'
);

CREATE TYPE ki_call_status AS ENUM (
    'erfolg', 'fehler', 'timeout', 'rate_limit', 'inhaltspolicy_blockiert'
);

CREATE TYPE ki_feedback_bewertung AS ENUM (
    'sehr_gut', 'gut', 'mittel', 'schlecht', 'unbrauchbar'
);

-- Migration
CREATE TYPE import_quelle AS ENUM (
    'airtable', 'csv', 'excel', 'word_dokument', 
    'annotext', 'heimsoeth', 'thurau', 'antaris',
    'datev_csv', 'vcf_kontakte', 'manueller_input', 'api', 'sonstiges'
);

CREATE TYPE import_job_status AS ENUM (
    'geplant', 'laeuft', 'abgeschlossen', 'mit_fehlern_abgeschlossen', 'abgebrochen', 'fehlgeschlagen'
);

CREATE TYPE import_record_status AS ENUM (
    'erfolg', 'fehler', 'duplikat', 'uebersprungen', 'manuell_zu_pruefen'
);

-- Support
CREATE TYPE ticket_typ AS ENUM (
    'bug', 'frage', 'feature_request', 'beschwerde', 'compliance', 'abrechnung', 'sonstiges'
);

CREATE TYPE ticket_prioritaet AS ENUM (
    'niedrig', 'normal', 'hoch', 'kritisch'
);

CREATE TYPE ticket_status AS ENUM (
    'neu', 'in_bearbeitung', 'wartet_auf_user', 'wartet_auf_dritte', 'geloest', 'closed', 'duplikat'
);

-- Feature-Tracking
CREATE TYPE feature_event_typ AS ENUM (
    'page_view', 'click', 'form_submit', 'feature_used',
    'document_generated', 'pdf_downloaded', 'email_sent',
    'audio_recorded', 'photo_uploaded', 'search_query',
    'ki_request', 'export_data', 'login', 'logout', 'sonstiges'
);

-- Compliance
CREATE TYPE einwilligung_typ AS ENUM (
    'agb',
    'datenschutzerklaerung',
    'avv_auftragsverarbeitung',
    'newsletter',
    'cookies_marketing',
    'cookies_analytics',
    'ki_einsatz',
    '407a_zpo_anzeige',
    'widerruf_sofortbeginn',
    'sonstiges'
);

CREATE TYPE rechtsdoc_typ AS ENUM (
    'agb', 'datenschutzerklaerung', 'avv', 'impressum',
    'widerrufsbelehrung', 'nutzungsbedingungen', 'cookie_policy',
    'sla', 'lizenzbedingungen', 'sonstiges'
);

-- Geschäft
CREATE TYPE referral_status AS ENUM (
    'eingereicht', 'qualifiziert', 'konvertiert', 'auszahlung_geplant', 'ausgezahlt', 'abgelehnt'
);

CREATE TYPE lead_stufe AS ENUM (
    'kalt', 'erstkontakt', 'qualifiziert', 'demo_geplant', 'demo_durchgefuehrt',
    'verhandlung', 'gewonnen', 'verloren', 'auf_eis'
);

CREATE TYPE health_check_kategorie AS ENUM (
    'database', 'storage', 'edge_function', 'pdfmonkey', 'openai',
    'stripe', 'make', 'email_smtp', 'frontend', 'sonstiges'
);


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 WISSENS-BIBLIOTHEKEN (5 Tabellen)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 3.1 NORMEN_BIBLIOTHEK — hybrid (global + workspace)
-- 
-- workspace_id IS NULL  →  globale Master-Norm (von Marcel kuratiert)
-- workspace_id != NULL  →  SV-spezifische Ergänzung
-- is_master = TRUE      →  nicht editierbar von SVs (für globale)
-- 
-- Migration aus Airtable NORMEN: 1:1 mit Erweiterungen.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.normen_bibliothek (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    norm_nr                     TEXT NOT NULL,                     -- "DIN 18195" / "VOB/B § 4" / "§ 407a ZPO"
    titel                       TEXT NOT NULL,                     -- "Bauwerksabdichtung"
    untertitel                  TEXT,                              -- "Anforderungen, Planung, Ausführung"
    bereich                     norm_bereich NOT NULL DEFAULT 'sonstiges',
    
    -- Inhaltliche Felder (aus Airtable übernommen)
    schadensarten               TEXT[] DEFAULT '{}',               -- ["Feuchte","Schimmel","Risse"]
    anwendung                   TEXT,                              -- Wann anwendbar
    grenzwerte                  TEXT,                              -- z.B. "Feuchte < 80% rH"
    grenzwerte_strukturiert     JSONB DEFAULT '{}'::jsonb,         -- für maschinelle Auswertung
    -- Format: { "feuchte_max_prozent": 80, "temperatur_min_grad": 5, ... }
    
    messtechnik                 TEXT,                              -- "CM-Methode, Darr-Probe"
    gutachter_hinweis           TEXT,                              -- Praxis-Tipp
    
    -- Versionierung & Status
    version_jahr                INTEGER,                           -- Erscheinungsjahr (2018 etc.)
    ersatz_fuer_norm_id         UUID REFERENCES public.normen_bibliothek(id),  -- Vorgänger-Norm
    aktuell_gueltig             BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Hybrid-Flags
    is_master                   BOOLEAN NOT NULL DEFAULT FALSE,    -- TRUE = globale Master-Norm
    is_global                   BOOLEAN NOT NULL DEFAULT FALSE,    -- TRUE = workspace_id IS NULL implies
    
    -- Häufigkeit (wie oft Marcel diese Norm einsetzt)
    haeufigkeit                 TEXT,                              -- "Sehr häufig" / "Häufig" / "Selten"
    nutzungs_count              INTEGER NOT NULL DEFAULT 0,        -- automatisch hochgezählt
    
    -- Audit
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    letzte_pruefung             DATE,
    pruefung_durch_user_id      UUID REFERENCES public.users(id),
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    
    -- Vector-Embedding für RAG (1536 dim = OpenAI text-embedding-3-small)
    embedding                   vector(1536),
    embedding_modell            TEXT,
    embedding_generated_at      TIMESTAMPTZ,
    
    -- Tags
    tags                        TEXT[] DEFAULT '{}',
    
    -- Meta
    quelle                      TEXT,                              -- "DIN-Verlag", "VOB 2019" etc.
    quellen_url                 TEXT,
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,                              -- für Migration-Tracking
    
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ,
    
    -- Hybrid-Constraint: entweder global ODER workspace-spezifisch
    CONSTRAINT normen_hybrid_check CHECK (
        (is_master = TRUE AND workspace_id IS NULL) OR
        (is_master = FALSE)
    )
);

CREATE INDEX idx_normen_workspace ON public.normen_bibliothek(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_normen_master ON public.normen_bibliothek(is_master, aktuell_gueltig) WHERE is_master = TRUE;
CREATE INDEX idx_normen_bereich ON public.normen_bibliothek(bereich, aktuell_gueltig) WHERE deleted_at IS NULL;
CREATE INDEX idx_normen_nr ON public.normen_bibliothek(norm_nr) WHERE deleted_at IS NULL;
CREATE INDEX idx_normen_search ON public.normen_bibliothek USING gin(search_vector);
CREATE INDEX idx_normen_tags ON public.normen_bibliothek USING gin(tags);
CREATE INDEX idx_normen_schadensarten ON public.normen_bibliothek USING gin(schadensarten);
CREATE INDEX idx_normen_embedding ON public.normen_bibliothek USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.update_norm_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.norm_nr, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.titel, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.untertitel, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.anwendung, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(NEW.gutachter_hinweis, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.schadensarten, ' '), '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normen_search BEFORE INSERT OR UPDATE ON public.normen_bibliothek
    FOR EACH ROW EXECUTE FUNCTION public.update_norm_search();

CREATE TRIGGER trg_normen_updated_at BEFORE UPDATE ON public.normen_bibliothek
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.normen_bibliothek IS 'Normen-Bibliothek hybrid: globale Master-Normen (Marcel-pflegt) + Workspace-spezifische Ergaenzungen';


-- ───────────────────────────────────────────────────────────────────────────
-- 3.2 TEXTBAUSTEINE — zusammengefuehrt mit is_global-Flag
-- 
-- Migration aus Airtable: TEXTBAUSTEINE (global) + TEXTBAUSTEINE_CUSTOM (sv)
-- werden zusammengefuehrt. is_global=TRUE bedeutet sichtbar fuer alle SVs.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.textbausteine (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    titel                       TEXT NOT NULL,
    text                        TEXT NOT NULL,
    text_kurz                   TEXT,                              -- 1-Satz-Zusammenfassung
    
    kategorie                   textbaustein_kategorie NOT NULL DEFAULT 'sonstiges',
    schadenart                  TEXT,                              -- frei (Feuchte, Risse, ...)
    notiz                       TEXT,
    
    -- Hybrid-Flag
    is_global                   BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Variablen-Pattern (z.B. {auftraggeber_name}, {datum}, {az})
    enthaelt_variablen          BOOLEAN NOT NULL DEFAULT FALSE,
    erkannte_variablen          TEXT[] DEFAULT '{}',
    
    -- Nutzungs-Statistik
    nutzungen                   INTEGER NOT NULL DEFAULT 0,
    letzte_nutzung_at           TIMESTAMPTZ,
    
    -- Tags
    tags                        TEXT[] DEFAULT '{}',
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    
    -- Migration-Tracking
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    airtable_quelle             TEXT,                              -- "TEXTBAUSTEINE" / "TEXTBAUSTEINE_CUSTOM"
    
    -- Meta
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ,
    
    -- Constraint: globale Bausteine haben kein workspace_id
    CONSTRAINT textbausteine_global_check CHECK (
        (is_global = TRUE AND workspace_id IS NULL) OR
        (is_global = FALSE AND workspace_id IS NOT NULL)
    )
);

CREATE INDEX idx_textb_workspace ON public.textbausteine(workspace_id, kategorie) WHERE deleted_at IS NULL;
CREATE INDEX idx_textb_global ON public.textbausteine(is_global, kategorie) WHERE is_global = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_textb_kategorie ON public.textbausteine(kategorie, schadenart);
CREATE INDEX idx_textb_search ON public.textbausteine USING gin(search_vector);
CREATE INDEX idx_textb_tags ON public.textbausteine USING gin(tags);

CREATE OR REPLACE FUNCTION public.update_textbaustein_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.titel, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.text, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.schadenart, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    
    -- Variablen-Erkennung: {variable_name}
    NEW.erkannte_variablen := ARRAY(
        SELECT DISTINCT m[1] 
        FROM regexp_matches(COALESCE(NEW.text, ''), '\{([a-z_]+)\}', 'g') AS m
    );
    NEW.enthaelt_variablen := array_length(NEW.erkannte_variablen, 1) > 0;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_textbausteine_search BEFORE INSERT OR UPDATE ON public.textbausteine
    FOR EACH ROW EXECUTE FUNCTION public.update_textbaustein_search();

CREATE TRIGGER trg_textbausteine_updated_at BEFORE UPDATE ON public.textbausteine
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.textbausteine IS 'Textbausteine zusammengefuehrt: globale (is_global=TRUE) + workspace-spezifische';


-- ───────────────────────────────────────────────────────────────────────────
-- 3.3 KI_PROMPT_TEMPLATES — Founder-only editierbar
-- 
-- Zentrale Prompt-Bibliothek. Versioniert. A/B-testbar. Erfolgsquoten-Tracking.
-- Migration aus KI_PROMPT_LIBERY.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.ki_prompt_templates (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name                        TEXT NOT NULL UNIQUE,
    purpose                     prompt_purpose NOT NULL,
    
    version                     TEXT NOT NULL DEFAULT '1.0',
    parent_template_id          UUID REFERENCES public.ki_prompt_templates(id),  -- bei Forking
    
    -- Prompt-Inhalt
    system_prompt               TEXT NOT NULL,
    user_prompt_template        TEXT NOT NULL,                     -- mit {variablen}
    erkannte_variablen          TEXT[] DEFAULT '{}',
    
    -- KI-Konfiguration
    bevorzugtes_modell          ki_modell_typ NOT NULL DEFAULT 'gpt_4o',
    fallback_modell             ki_modell_typ,
    temperatur                  NUMERIC(3,2) NOT NULL DEFAULT 0.30 CHECK (temperatur >= 0 AND temperatur <= 2),
    max_tokens                  INTEGER NOT NULL DEFAULT 2000,
    output_format               TEXT,                              -- "json" / "markdown" / "text"
    
    -- Schadensart-Filter (welche Aufträge nutzen das?)
    schadensart_filter          TEXT[],                            -- NULL = alle, sonst spezifisch
    
    -- Status & A/B-Tests
    aktiv                       BOOLEAN NOT NULL DEFAULT FALSE,
    getestet                    BOOLEAN NOT NULL DEFAULT FALSE,
    ist_default                 BOOLEAN NOT NULL DEFAULT FALSE,    -- Default für purpose
    ab_test_anteil_prozent      INTEGER,                           -- für gradual rollout
    
    -- Performance-Tracking (gepflegt durch ki_protokoll)
    nutzungen_count             INTEGER NOT NULL DEFAULT 0,
    erfolgsquote_pct            NUMERIC(5,2),
    avg_dauer_ms                INTEGER,
    avg_kosten_eur              NUMERIC(8,4),
    avg_token_input             INTEGER,
    avg_token_output            INTEGER,
    feedback_score              NUMERIC(3,2),                      -- 1.0-5.0 aus ki_feedback
    
    -- Compliance-Marker
    enthaelt_konjunktiv_anweisung BOOLEAN NOT NULL DEFAULT FALSE,
    enthaelt_pseudonymisierung_check BOOLEAN NOT NULL DEFAULT TRUE,
    enthaelt_halluzinations_schutz BOOLEAN NOT NULL DEFAULT TRUE,
    
    notizen                     TEXT,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archiviert_at               TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_ki_prompts_default_per_purpose ON public.ki_prompt_templates(purpose) 
    WHERE ist_default = TRUE AND archiviert_at IS NULL;
CREATE INDEX idx_ki_prompts_purpose_aktiv ON public.ki_prompt_templates(purpose, aktiv) WHERE archiviert_at IS NULL;
CREATE INDEX idx_ki_prompts_modell ON public.ki_prompt_templates(bevorzugtes_modell);

CREATE TRIGGER trg_ki_prompts_updated_at BEFORE UPDATE ON public.ki_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.ki_prompt_templates IS 'KI-Prompt-Bibliothek. Nur Founder editierbar. Versioniert. A/B-testbar.';


-- ───────────────────────────────────────────────────────────────────────────
-- 3.4 POSITIONEN_BIBLIOTHEK — Sanierungs-Marktdaten
-- 
-- Migration aus POSITIONEN_DATENBANK. Mit DATEV-Vorbereitung.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.positionen_bibliothek (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    bezeichnung                 TEXT NOT NULL,
    kategorie                   TEXT,                              -- "Estricharbeiten", "Trocknung", etc.
    schadensart                 TEXT,
    
    einheit                     TEXT,                              -- "m²", "lfm", "Std", "psch"
    
    -- Marktpreise (Mid-2026 Stand, regelmäßig zu pflegen)
    ep_min_eur                  NUMERIC(12,2),
    ep_median_eur               NUMERIC(12,2),
    ep_max_eur                  NUMERIC(12,2),
    
    -- Norm-Bezug
    vob_abschnitt               TEXT,                              -- z.B. "ATV DIN 18353"
    
    beschreibung                TEXT,
    quelle                      TEXT,                              -- "Sirados 2024", "BKI", eigene Erfahrung
    quelle_datum                DATE,
    
    -- DATEV-Vorbereitung
    datev_konto                 TEXT,
    datev_kostenstelle          TEXT,
    datev_steuerschluessel      TEXT,
    
    is_global                   BOOLEAN NOT NULL DEFAULT FALSE,
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    
    nutzungen_count             INTEGER NOT NULL DEFAULT 0,
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_positionen_workspace ON public.positionen_bibliothek(workspace_id, kategorie) WHERE deleted_at IS NULL;
CREATE INDEX idx_positionen_global ON public.positionen_bibliothek(is_global, kategorie) WHERE is_global = TRUE;
CREATE INDEX idx_positionen_search ON public.positionen_bibliothek USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.update_position_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.bezeichnung, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.beschreibung, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.kategorie, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.schadensart, '')), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_positionen_search BEFORE INSERT OR UPDATE ON public.positionen_bibliothek
    FOR EACH ROW EXECUTE FUNCTION public.update_position_search();

CREATE TRIGGER trg_positionen_updated_at BEFORE UPDATE ON public.positionen_bibliothek
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 3.5 WISSEN_DIAGNOSTIK — Marcel-Fachwissen + RAG-Foundation
-- 
-- "Wenn ich X sehe → prüfe Y, Z" Regeln strukturiert.
-- Mit pgvector für KI-RAG (KI versteht Bedeutung).
-- Initial leer, gemeinsam später befüllen.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.wissen_diagnostik (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Inhalt
    titel                       TEXT NOT NULL,                     -- "Salzausblühungen an Sockelmauerwerk"
    befund_pattern              TEXT,                              -- Was beobachtet
    typische_ursachen           JSONB DEFAULT '[]'::jsonb,
    -- [{ titel, prioritaet (primaer/alternativ), wahrscheinlichkeit, hinweis }]
    
    pruef_schritte              JSONB DEFAULT '[]'::jsonb,
    -- [{ titel, methode, erwartetes_ergebnis }]
    
    relevante_normen            TEXT[],
    relevante_messwerte         JSONB DEFAULT '[]'::jsonb,
    
    -- Quelle des Wissens
    quelle_typ                  TEXT,                              -- "marcel_erfahrung" / "norm" / "literatur"
    quelle_referenz             TEXT,
    
    -- Vector-Embedding für RAG
    embedding                   vector(1536),
    embedding_modell            TEXT,
    embedding_generated_at      TIMESTAMPTZ,
    
    -- Volltext + Tags
    search_vector               TSVECTOR,
    tags                        TEXT[] DEFAULT '{}',
    schadensarten               TEXT[] DEFAULT '{}',
    
    -- Hybrid-Flag
    is_global                   BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Nutzung
    nutzungen_count             INTEGER NOT NULL DEFAULT 0,
    last_used_at                TIMESTAMPTZ,
    
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_wissen_workspace ON public.wissen_diagnostik(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wissen_global ON public.wissen_diagnostik(is_global) WHERE is_global = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_wissen_search ON public.wissen_diagnostik USING gin(search_vector);
CREATE INDEX idx_wissen_tags ON public.wissen_diagnostik USING gin(tags);
CREATE INDEX idx_wissen_schadensarten ON public.wissen_diagnostik USING gin(schadensarten);
CREATE INDEX idx_wissen_embedding ON public.wissen_diagnostik USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.update_wissen_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.titel, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.befund_pattern, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.schadensarten, ' '), '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wissen_search BEFORE INSERT OR UPDATE ON public.wissen_diagnostik
    FOR EACH ROW EXECUTE FUNCTION public.update_wissen_search();

CREATE TRIGGER trg_wissen_updated_at BEFORE UPDATE ON public.wissen_diagnostik
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.wissen_diagnostik IS 'Marcel-Fachwissen strukturiert. Mit pgvector fuer KI-RAG.';


-- ═══════════════════════════════════════════════════════════════════════════
-- §4 KI-INFRASTRUKTUR (3 Tabellen)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 4.1 KI_PROTOKOLL — jeder OpenAI/Whisper/Claude-Call
-- 
-- DSGVO Art. 30 Pflicht. EU AI Act Pflicht. Kosten-Tracking.
-- Im Cockpit: live-Stream + Aggregations-Views.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.ki_protokoll (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id                     UUID REFERENCES public.users(id),
    
    -- Verknüpfungen
    auftrag_id                  UUID REFERENCES public.auftraege(id) ON DELETE SET NULL,
    eintrag_id                  UUID REFERENCES public.eintraege(id) ON DELETE SET NULL,
    audio_id                    UUID REFERENCES public.audio_dateien(id) ON DELETE SET NULL,
    prompt_template_id          UUID REFERENCES public.ki_prompt_templates(id),
    
    -- Was wurde gemacht?
    purpose                     prompt_purpose NOT NULL,
    feature_kontext             TEXT,                              -- "kurzstellungnahme/phase3/diktat-strukturierung"
    page_url                    TEXT,                              -- wo war der User?
    
    -- KI-Modell
    modell                      ki_modell_typ NOT NULL,
    modell_version              TEXT,
    provider                    ki_provider NOT NULL DEFAULT 'openai',
    
    -- Tokens & Kosten
    token_input                 INTEGER,
    token_output                INTEGER,
    token_total                 INTEGER GENERATED ALWAYS AS (COALESCE(token_input,0) + COALESCE(token_output,0)) STORED,
    kosten_eur                  NUMERIC(10,6),                     -- 6 Nachkommastellen für Mikro-Kosten
    
    -- Performance
    dauer_ms                    INTEGER,
    status                      ki_call_status NOT NULL DEFAULT 'erfolg',
    fehler_message              TEXT,
    
    -- Pseudonymisierung
    input_pseudonymisiert       BOOLEAN NOT NULL DEFAULT FALSE,
    pseudonymisierung_token_count INTEGER,                         -- Anzahl ersetzte Tokens
    output_repseudonymisiert    BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Compliance-Checks
    konjunktiv_check_passed     BOOLEAN,                           -- bei relevanten purpose
    halluzinations_check_passed BOOLEAN,
    
    -- Hashes (kein Klartext!)
    input_hash                  TEXT,                              -- SHA256 des pseudonymisierten Inputs
    output_hash                 TEXT,
    output_laenge_chars         INTEGER,
    
    -- Optional: gekürzte Vorschau (max 200 Zeichen) für Audit-Anzeige
    output_preview              TEXT,
    
    -- Timestamps
    started_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ki_prot_workspace_time ON public.ki_protokoll(workspace_id, created_at DESC);
CREATE INDEX idx_ki_prot_user_time ON public.ki_protokoll(user_id, created_at DESC);
CREATE INDEX idx_ki_prot_auftrag ON public.ki_protokoll(auftrag_id) WHERE auftrag_id IS NOT NULL;
CREATE INDEX idx_ki_prot_purpose_modell ON public.ki_protokoll(purpose, modell, created_at DESC);
CREATE INDEX idx_ki_prot_template ON public.ki_protokoll(prompt_template_id) WHERE prompt_template_id IS NOT NULL;
CREATE INDEX idx_ki_prot_status ON public.ki_protokoll(status, created_at DESC) WHERE status != 'erfolg';

COMMENT ON TABLE public.ki_protokoll IS 'Jeder KI-Call dokumentiert. DSGVO Art. 30 + EU AI Act + Kosten-Tracking.';


-- ───────────────────────────────────────────────────────────────────────────
-- 4.2 KI_LERNPOOL — anonymisierte "Andere Ursache"-Eintraege
-- 
-- Migration aus KI_LERNPOOL (Airtable). DSGVO-Pseudonymisiert.
-- Marketing: "Datenbank waechst" - NIE "KI lernt"!
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.ki_lernpool (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Anonymisierter Inhalt (NIE Klartext-Personendaten!)
    schadenart                  TEXT NOT NULL,
    sv_ursache_pseudonym        TEXT NOT NULL,                     -- pseudonymisierter Text
    foto_beschreibung_pseudonym TEXT,
    foto_tags                   TEXT[],
    
    -- Strukturierte Felder
    objektart                   TEXT,
    bauteil                     TEXT,
    typische_messwerte          JSONB,
    
    -- Quell-Workspace (für ggf. Rückverfolgung bei DSGVO-Löschung)
    quell_workspace_id          UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    
    -- RAG-Vektor
    embedding                   vector(1536),
    embedding_modell            TEXT,
    
    -- Volltext
    search_vector               TSVECTOR,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    datum                       DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lernpool_schadenart ON public.ki_lernpool(schadenart);
CREATE INDEX idx_lernpool_search ON public.ki_lernpool USING gin(search_vector);
CREATE INDEX idx_lernpool_embedding ON public.ki_lernpool USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_lernpool_quell ON public.ki_lernpool(quell_workspace_id) WHERE quell_workspace_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_lernpool_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.schadenart, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.sv_ursache_pseudonym, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.foto_tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lernpool_search BEFORE INSERT OR UPDATE ON public.ki_lernpool
    FOR EACH ROW EXECUTE FUNCTION public.update_lernpool_search();

COMMENT ON TABLE public.ki_lernpool IS 'Anonymisierte SV-Ursachen. Datenbank waechst, NICHT "KI lernt".';


-- ───────────────────────────────────────────────────────────────────────────
-- 4.3 KI_FEEDBACK — SV-Bewertung nach KI-Antwort
-- 
-- SV gibt Daumen hoch/runter. Pflegt erfolgsquote_pct in ki_prompt_templates.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.ki_feedback (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    ki_protokoll_id             UUID NOT NULL REFERENCES public.ki_protokoll(id) ON DELETE CASCADE,
    prompt_template_id          UUID REFERENCES public.ki_prompt_templates(id),
    
    bewertung                   ki_feedback_bewertung NOT NULL,
    bewertung_score             INTEGER GENERATED ALWAYS AS (
        CASE bewertung
            WHEN 'sehr_gut' THEN 5
            WHEN 'gut' THEN 4
            WHEN 'mittel' THEN 3
            WHEN 'schlecht' THEN 2
            WHEN 'unbrauchbar' THEN 1
        END
    ) STORED,
    
    -- Strukturierte Probleme (Multiple-Choice)
    probleme                    TEXT[],                            -- ["halluziniert", "indikativ statt konjunktiv", "zu generisch"]
    
    kommentar                   TEXT,
    sv_korrektur                TEXT,                              -- was SV stattdessen geschrieben hat
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ki_feedback_template ON public.ki_feedback(prompt_template_id, bewertung);
CREATE INDEX idx_ki_feedback_user ON public.ki_feedback(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_ki_feedback_unique ON public.ki_feedback(ki_protokoll_id);

COMMENT ON TABLE public.ki_feedback IS 'SV-Bewertung nach KI-Antwort. Pflegt erfolgsquote in prompt_templates.';


-- ═══════════════════════════════════════════════════════════════════════════
-- §5 MIGRATION (2 Tabellen)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.import_jobs (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    quelle                      import_quelle NOT NULL,
    quelle_beschreibung         TEXT,                              -- "Airtable Base appJ7bL... Tabelle KONTAKTE"
    ziel_tabelle                TEXT NOT NULL,                     -- "kontakte" / "auftraege" / "normen_bibliothek"
    
    status                      import_job_status NOT NULL DEFAULT 'geplant',
    
    -- Fortschritt
    records_total               INTEGER,
    records_verarbeitet         INTEGER NOT NULL DEFAULT 0,
    records_erfolg              INTEGER NOT NULL DEFAULT 0,
    records_fehler              INTEGER NOT NULL DEFAULT 0,
    records_uebersprungen       INTEGER NOT NULL DEFAULT 0,
    
    -- Konfiguration
    field_mapping               JSONB,                             -- { airtable_field_id: supabase_column }
    transform_rules             JSONB,                             -- { remove_exif: true, ... }
    dry_run                     BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Logging
    log_summary                 TEXT,
    error_summary               TEXT,
    
    -- Timestamps
    started_at                  TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    
    started_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_workspace ON public.import_jobs(workspace_id, started_at DESC);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status, started_at DESC);

CREATE TRIGGER trg_import_jobs_updated_at BEFORE UPDATE ON public.import_jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.import_records (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id                      UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
    
    -- Quelle
    source_record_id            TEXT,                              -- Airtable rec-ID, CSV-Zeilennr etc.
    source_data                 JSONB,                             -- Originaldaten zum Debug
    
    -- Ziel
    target_table                TEXT NOT NULL,
    target_record_id            UUID,                              -- nach Insert in Supabase
    
    status                      import_record_status NOT NULL,
    error_message               TEXT,
    error_details               JSONB,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_records_job ON public.import_records(job_id, status);
CREATE INDEX idx_import_records_target ON public.import_records(target_table, target_record_id);
CREATE INDEX idx_import_records_errors ON public.import_records(job_id, status) WHERE status = 'fehler';


-- ═══════════════════════════════════════════════════════════════════════════
-- §6 SYSTEM & HEALTH (4 Tabellen)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 6.1 WORKFLOW_ERRORS — System-Fehler-Tracking
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.workflow_errors (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id                     UUID REFERENCES public.users(id),
    
    workflow                    TEXT NOT NULL,                     -- "G-DOC", "M-MAIL", "stripe_webhook", "pdf_generation"
    step                        TEXT,                              -- z.B. "PDFMonkey API call"
    
    -- Verknüpfung zu betroffener Entität
    entity_typ                  TEXT,
    entity_id                   UUID,
    
    -- Error-Details
    error_code                  TEXT,
    error_message               TEXT NOT NULL,
    error_stack                 TEXT,
    error_details               JSONB,
    
    request_payload             JSONB,                             -- was gesendet wurde
    response_payload            JSONB,                             -- was empfangen wurde
    
    -- Resolution
    retry_count                 INTEGER NOT NULL DEFAULT 0,
    resolved                    BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at                 TIMESTAMPTZ,
    resolved_by_user_id         UUID REFERENCES public.users(id),
    resolution_notes            TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_errors_unresolved ON public.workflow_errors(created_at DESC) WHERE resolved = FALSE;
CREATE INDEX idx_workflow_errors_workspace ON public.workflow_errors(workspace_id, created_at DESC);
CREATE INDEX idx_workflow_errors_workflow ON public.workflow_errors(workflow, created_at DESC);


-- ───────────────────────────────────────────────────────────────────────────
-- 6.2 PUSH_SUBSCRIPTIONS — Web-Push-Tokens
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.push_subscriptions (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    endpoint                    TEXT NOT NULL UNIQUE,
    keys_p256dh                 TEXT NOT NULL,
    keys_auth                   TEXT NOT NULL,
    
    user_agent                  TEXT,
    geraet_typ                  TEXT,                              -- "desktop" / "mobile" / "tablet"
    
    -- Preferences pro Subscription
    prefs                       JSONB DEFAULT '{
        "termin_erinnerungen": true,
        "neue_auftraege": true,
        "rechnung_bezahlt": true,
        "support_replies": true,
        "system_alerts": false
    }'::jsonb,
    
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at                TIMESTAMPTZ DEFAULT NOW(),
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id) WHERE aktiv = TRUE;
CREATE INDEX idx_push_subs_workspace ON public.push_subscriptions(workspace_id) WHERE aktiv = TRUE;

CREATE TRIGGER trg_push_subs_updated_at BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 6.3 FEATURE_FLAGS — Features pro Workspace ein/aus ohne Code-Deploy
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.feature_flags (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    flag_key                    TEXT NOT NULL,                     -- "kurzstellungnahme_v2", "datev_export_beta"
    flag_value                  BOOLEAN NOT NULL DEFAULT FALSE,
    flag_value_json             JSONB,                             -- für komplexere Configs
    
    -- Global flag oder pro Workspace
    is_global                   BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Beta-Tester / Rollout
    rollout_prozent             INTEGER CHECK (rollout_prozent >= 0 AND rollout_prozent <= 100),
    nur_fuer_testpiloten        BOOLEAN NOT NULL DEFAULT FALSE,
    
    beschreibung                TEXT,
    
    aktiviert_at                TIMESTAMPTZ,
    deaktiviert_at              TIMESTAMPTZ,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (workspace_id, flag_key)
);

CREATE INDEX idx_feature_flags_workspace ON public.feature_flags(workspace_id, flag_key);
CREATE INDEX idx_feature_flags_global ON public.feature_flags(flag_key) WHERE is_global = TRUE;

CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 6.4 SYSTEM_HEALTH — Monitoring von Endpoint-Latencies, Error-Rates
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.system_health (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    kategorie                   health_check_kategorie NOT NULL,
    component                   TEXT NOT NULL,                     -- "stripe-webhook", "openai-chat", "pdfmonkey-create"
    
    -- Health-Check-Ergebnis
    status                      TEXT NOT NULL,                     -- "ok" / "degraded" / "down"
    response_time_ms            INTEGER,
    error_rate_pct              NUMERIC(5,2),
    
    -- Details
    details                     JSONB,
    error_message               TEXT,
    
    -- Aggregations-Window
    sampled_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_minutes              INTEGER NOT NULL DEFAULT 5,        -- Aggregations-Fenster
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_kategorie_time ON public.system_health(kategorie, sampled_at DESC);
CREATE INDEX idx_health_component ON public.system_health(component, sampled_at DESC);
CREATE INDEX idx_health_problems ON public.system_health(sampled_at DESC) WHERE status != 'ok';


-- ═══════════════════════════════════════════════════════════════════════════
-- §7 ADMIN-COCKPIT + SUPPORT (6 Tabellen)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 7.1 SUPPORT_TICKETS — mit Browser/Network/Action-Kontext
-- 
-- Marcel-Wunsch: SV meldet Bug, Du siehst SOFORT wo das Problem auftrat.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.support_tickets (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 3-fach Verknüpfung
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    user_id                     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email                  TEXT NOT NULL,                     -- redundant aber audit
    
    -- Ticket-Daten
    typ                         ticket_typ NOT NULL DEFAULT 'frage',
    prioritaet                  ticket_prioritaet NOT NULL DEFAULT 'normal',
    status                      ticket_status NOT NULL DEFAULT 'neu',
    
    titel                       TEXT NOT NULL,
    beschreibung                TEXT NOT NULL,
    
    -- 🔥 KONTEXT: wo war der User?
    page_url                    TEXT,                              -- "https://prova-systems.de/kurzstellungnahme.html"
    page_titel                  TEXT,                              -- z.B. "Kurzstellungnahme — Phase 3"
    referrer_url                TEXT,                              -- vorherige Page
    
    -- 🔥 BROWSER-INFO
    browser_name                TEXT,                              -- "Chrome 126"
    browser_version             TEXT,
    os_name                     TEXT,                              -- "macOS 14.5"
    geraet_typ                  TEXT,                              -- "desktop" / "mobile"
    viewport_breite             INTEGER,
    viewport_hoehe              INTEGER,
    user_agent                  TEXT,
    sprach_einstellung          TEXT,                              -- "de-DE"
    
    -- 🔥 CONSOLE-ERRORS (letzten 10 vor Bug-Report)
    console_errors              JSONB DEFAULT '[]'::jsonb,
    -- [{ timestamp, level, message, source, stack }]
    
    -- 🔥 NETWORK-ERRORS (failed API-Calls)
    network_errors              JSONB DEFAULT '[]'::jsonb,
    -- [{ timestamp, url, method, status, response_excerpt }]
    
    -- 🔥 USER-ACTIONS (letzte 20 Klicks vor Bug — wie Tatort-Protokoll!)
    user_actions                JSONB DEFAULT '[]'::jsonb,
    -- [{ timestamp, action: "click", element: "button#save", value }]
    
    -- Workspace-Kontext (Snapshot zur Diagnose)
    workspace_snapshot          JSONB,
    -- { abo_tier, abo_status, anzahl_auftraege, plan_features, ... }
    
    -- Bearbeitung
    assigned_to_user_id         UUID REFERENCES public.users(id),
    
    -- Resolution
    resolution_text             TEXT,
    resolved_at                 TIMESTAMPTZ,
    resolved_by_user_id         UUID REFERENCES public.users(id),
    
    -- Internal
    internal_notes              TEXT,                              -- nur Founder-Team sichtbar
    duplikat_von_id             UUID REFERENCES public.support_tickets(id),
    related_workflow_error_id   UUID REFERENCES public.workflow_errors(id),
    
    -- SLA-Tracking
    sla_first_response_at       TIMESTAMPTZ,
    sla_resolution_at           TIMESTAMPTZ,
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    tags                        TEXT[] DEFAULT '{}',
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_status_prio ON public.support_tickets(status, prioritaet, created_at DESC);
CREATE INDEX idx_tickets_workspace ON public.support_tickets(workspace_id, created_at DESC);
CREATE INDEX idx_tickets_assigned ON public.support_tickets(assigned_to_user_id, status) WHERE status NOT IN ('geloest', 'closed');
CREATE INDEX idx_tickets_typ ON public.support_tickets(typ, status);
CREATE INDEX idx_tickets_search ON public.support_tickets USING gin(search_vector);
CREATE INDEX idx_tickets_unresolved ON public.support_tickets(prioritaet, created_at DESC) 
    WHERE status NOT IN ('geloest', 'closed');

CREATE OR REPLACE FUNCTION public.update_ticket_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.titel, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.beschreibung, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.page_url, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tickets_search BEFORE INSERT OR UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_ticket_search();

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 7.2 SUPPORT_REPLIES — Threading
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.support_replies (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id                   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    
    user_id                     UUID REFERENCES public.users(id),
    user_name                   TEXT NOT NULL,                     -- redundant für Anzeige
    
    content                     TEXT NOT NULL,
    
    -- Sichtbarkeit
    ist_intern                  BOOLEAN NOT NULL DEFAULT FALSE,    -- TRUE = nur Founder-Team
    
    -- Versand-Tracking
    via_email_versendet         BOOLEAN NOT NULL DEFAULT FALSE,
    email_versendet_at          TIMESTAMPTZ,
    via_push_versendet          BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_replies_ticket ON public.support_replies(ticket_id, created_at);
CREATE INDEX idx_replies_user ON public.support_replies(user_id, created_at DESC);


-- ───────────────────────────────────────────────────────────────────────────
-- 7.3 SUPPORT_ATTACHMENTS — Screenshots, Logs
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.support_attachments (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id                   UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    reply_id                    UUID REFERENCES public.support_replies(id) ON DELETE CASCADE,
    
    storage_bucket              TEXT NOT NULL DEFAULT 'sv-files',
    storage_path                TEXT NOT NULL,
    filename                    TEXT NOT NULL,
    mime_type                   TEXT,
    bytes                       INTEGER,
    
    typ                         TEXT,                              -- "screenshot" / "log" / "console_dump"
    
    uploaded_by_user_id         UUID REFERENCES public.users(id),
    uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT support_attachment_target_check CHECK (
        (ticket_id IS NOT NULL AND reply_id IS NULL) OR
        (ticket_id IS NULL AND reply_id IS NOT NULL) OR
        (ticket_id IS NOT NULL AND reply_id IS NOT NULL)
    )
);

CREATE INDEX idx_support_attach_ticket ON public.support_attachments(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_support_attach_reply ON public.support_attachments(reply_id) WHERE reply_id IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 7.4 IMPERSONATION_LOG — DSGVO-Pflicht: Login-as-User Audit
-- 
-- Wenn Marcel sich als User einloggt, wird das hier dokumentiert.
-- Beweis-Pflicht fuer DSGVO-Compliance.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.impersonation_log (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Wer war wer?
    founder_user_id             UUID NOT NULL REFERENCES public.users(id),
    target_user_id              UUID NOT NULL REFERENCES public.users(id),
    target_workspace_id         UUID NOT NULL REFERENCES public.workspaces(id),
    
    -- Begründung (Pflicht für DSGVO-Audit)
    grund                       TEXT NOT NULL,                     -- "Bug-Reproduktion Ticket #123"
    related_ticket_id           UUID REFERENCES public.support_tickets(id),
    
    -- Session
    session_id                  UUID,
    started_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at                    TIMESTAMPTZ,
    dauer_sekunden              INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
    ) STORED,
    
    -- Was wurde gemacht?
    actions_log                 JSONB DEFAULT '[]'::jsonb,
    -- [{ timestamp, action, entity_typ, entity_id }]
    
    -- IP & Metadata
    ip_address                  INET,
    user_agent                  TEXT,
    
    notes                       TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impersonation_target ON public.impersonation_log(target_user_id, started_at DESC);
CREATE INDEX idx_impersonation_founder ON public.impersonation_log(founder_user_id, started_at DESC);
CREATE INDEX idx_impersonation_active ON public.impersonation_log(started_at DESC) WHERE ended_at IS NULL;

COMMENT ON TABLE public.impersonation_log IS 'DSGVO-Pflicht: jedes Login-as-User dokumentiert';


-- ───────────────────────────────────────────────────────────────────────────
-- 7.5 FEATURE_EVENTS — Granulares Click-Tracking fuer Heatmap + Funnel
-- 
-- Marcel-Wunsch: "was wie oft genutzt wird"
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.feature_events (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id                     UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    typ                         feature_event_typ NOT NULL,
    feature_key                 TEXT NOT NULL,                     -- "kurzstellungnahme.phase3.diktat_button"
    page_url                    TEXT,
    
    -- Verknüpfung zu Entitäten (falls relevant)
    entity_typ                  TEXT,
    entity_id                   UUID,
    
    -- Wert / Resultat
    value                       JSONB,
    -- { duration_ms, success: true, details: {...} }
    
    -- Session
    session_id                  UUID,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_time ON public.feature_events(user_id, created_at DESC);
CREATE INDEX idx_events_workspace_time ON public.feature_events(workspace_id, created_at DESC);
CREATE INDEX idx_events_feature ON public.feature_events(feature_key, created_at DESC);
CREATE INDEX idx_events_typ ON public.feature_events(typ, created_at DESC);

COMMENT ON TABLE public.feature_events IS 'Granulares Click-Tracking fuer Cockpit-Heatmap + Drop-off-Funnel';


-- ───────────────────────────────────────────────────────────────────────────
-- 7.6 CHURN_REASONS — Warum gekuendigt?
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.churn_reasons (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id                     UUID REFERENCES public.users(id),
    
    -- Strukturierter Grund
    grund_kategorie             TEXT NOT NULL,
    -- "preis", "fehlende_features", "bugs", "schlechte_ux", "alternative_gefunden",
    -- "geschaeftsaufgabe", "wechsel_zu_konkurrenz", "kein_grund_angegeben", "sonstiges"
    
    -- Freitext-Details
    details                     TEXT,
    konkurrenz_genannt          TEXT,
    
    -- War-Loyalty?
    abonniert_seit_tagen        INTEGER,
    monatliche_aktivitaet_score NUMERIC(3,2),                      -- 0-1
    
    -- Win-back-Versuch
    win_back_versucht           BOOLEAN NOT NULL DEFAULT FALSE,
    win_back_ergebnis           TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_churn_workspace ON public.churn_reasons(workspace_id);
CREATE INDEX idx_churn_kategorie ON public.churn_reasons(grund_kategorie, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- §8 COMPLIANCE & RECHT (2 Tabellen)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 8.1 EINWILLIGUNGEN — DSGVO-pflichtige Einwilligungs-Dokumentation
-- 
-- Migration aus Airtable EINWILLIGUNGEN.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.einwilligungen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    typ                         einwilligung_typ NOT NULL,
    rechtsdokument_id           UUID,                              -- FK kommt nach rechtsdokumente
    version                     TEXT NOT NULL,
    
    -- Inhalts-Hash für Beweis (welcher Text wurde unterschrieben?)
    inhalt_hash                 TEXT NOT NULL,
    
    -- Signing-Details
    erteilt_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address                  INET,
    user_agent                  TEXT,
    session_id                  UUID,
    
    -- Onboarding-Kontext
    onboarding_schritt          TEXT,
    page_url                    TEXT,
    
    -- Widerruf
    widerrufen_at               TIMESTAMPTZ,
    widerruf_grund              TEXT,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_einw_user ON public.einwilligungen(user_id, typ, erteilt_at DESC);
CREATE INDEX idx_einw_workspace ON public.einwilligungen(workspace_id, typ, erteilt_at DESC);
CREATE INDEX idx_einw_widerrufen ON public.einwilligungen(workspace_id) WHERE widerrufen_at IS NOT NULL;

COMMENT ON TABLE public.einwilligungen IS 'DSGVO Art. 7 Pflicht: Einwilligungs-Dokumentation mit Inhalts-Hash';


-- ───────────────────────────────────────────────────────────────────────────
-- 8.2 RECHTSDOKUMENTE — AGB / DSE / AVV mit Versionierung
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.rechtsdokumente (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    typ                         rechtsdoc_typ NOT NULL,
    name                        TEXT NOT NULL,
    version                     TEXT NOT NULL,
    
    inhalt_text                 TEXT NOT NULL,
    inhalt_html                 TEXT,                              -- gerenderte Version für Anzeige
    inhalt_hash                 TEXT NOT NULL UNIQUE,              -- für Einwilligungs-Beweis
    
    -- Speicher für PDF-Version
    storage_path                TEXT,
    
    -- Versionierung
    parent_doc_id               UUID REFERENCES public.rechtsdokumente(id),  -- Vorgänger
    aenderungs_hinweis          TEXT,                              -- Was hat sich geändert
    
    -- Geltungsbereich
    gueltig_ab                  TIMESTAMPTZ NOT NULL,
    gueltig_bis                 TIMESTAMPTZ,                       -- NULL = unbestimmt
    aktuell                     BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Anwendbarkeit
    fuer_tier                   abo_tier[],                        -- NULL = alle
    fuer_sprache                TEXT NOT NULL DEFAULT 'de-DE',
    
    -- Approval
    erstellt_von_user_id        UUID REFERENCES public.users(id),
    approved_by_user_id         UUID REFERENCES public.users(id),
    approved_at                 TIMESTAMPTZ,
    
    notizen                     TEXT,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rechtsdoc_aktuell_typ ON public.rechtsdokumente(typ) WHERE aktuell = TRUE;
CREATE INDEX idx_rechtsdoc_typ_version ON public.rechtsdokumente(typ, version);
CREATE INDEX idx_rechtsdoc_gueltig ON public.rechtsdokumente(gueltig_ab, gueltig_bis);

CREATE TRIGGER trg_rechtsdoc_updated_at BEFORE UPDATE ON public.rechtsdokumente
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Jetzt FK in einwilligungen nachreichen
ALTER TABLE public.einwilligungen 
    ADD CONSTRAINT fk_einw_rechtsdoc 
    FOREIGN KEY (rechtsdokument_id) REFERENCES public.rechtsdokumente(id) ON DELETE SET NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- §9 GESCHÄFT & MARKETING (4 Tabellen)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 9.1 VERSICHERUNGS_PARTNER — fuer Versicherungs-API-Integration
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.versicherungs_partner (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    versicherungsname           TEXT NOT NULL,
    kurzname                    TEXT,
    logo_url                    TEXT,
    website                     TEXT,
    
    -- API-Integration
    api_endpoint                TEXT,
    api_version                 TEXT,
    api_key_env_var             TEXT,                              -- z.B. "VKB_API_KEY"
    authentifizierung           TEXT,                              -- "Bearer", "Basic", "OAuth2"
    fnol_format                 TEXT,                              -- "JSON", "XML", "BiPRO"
    pdf_upload_moeglich         BOOLEAN NOT NULL DEFAULT FALSE,
    status_callback_url         TEXT,
    
    -- Kontaktperson
    kontakt_name                TEXT,
    kontakt_email               TEXT,
    kontakt_telefon             TEXT,
    
    schadenarten_abgedeckt      TEXT[] DEFAULT '{}',
    durchschn_regulierung_tage  INTEGER,
    
    partnerschaft_status        TEXT,                              -- "aktiv", "pausiert", "in_verhandlung"
    vertrag_seit                DATE,
    umsatz_anteil_pct           NUMERIC(5,2),
    
    notizen                     TEXT,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_versicherer_aktiv ON public.versicherungs_partner(aktiv, partnerschaft_status);
CREATE INDEX idx_versicherer_schadenarten ON public.versicherungs_partner USING gin(schadenarten_abgedeckt);

CREATE TRIGGER trg_versicherer_updated_at BEFORE UPDATE ON public.versicherungs_partner
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 9.2 DOKUMENT_TEMPLATES — Master-Schema fuer PDFMonkey-Templates
-- 
-- Migration aus GUTACHTEN_TEMPLATES. Mit DIN/VOB-Refs, rechtlichen Hinweisen.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.dokument_templates (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name                        TEXT NOT NULL UNIQUE,
    typ                         dokument_typ NOT NULL,
    schadensart                 TEXT,
    sprache                     TEXT NOT NULL DEFAULT 'de-DE',
    version                     TEXT NOT NULL DEFAULT '1.0',
    
    -- Schema/Struktur
    abschnitte_schema           JSONB DEFAULT '[]'::jsonb,         -- Was muss alles drin sein
    
    -- Header/Footer
    header_text                 TEXT,
    footer_text                 TEXT,
    
    -- Branding
    logo_pflicht                BOOLEAN NOT NULL DEFAULT TRUE,
    unterschrift_pflicht        BOOLEAN NOT NULL DEFAULT TRUE,
    anti_austausch_header       BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Rechtliche Refs
    din_referenzen              TEXT[],
    vob_referenzen              TEXT[],
    rechtlicher_hinweis         TEXT,
    
    -- PDFMonkey-Verknüpfung
    pdfmonkey_template_id       TEXT NOT NULL,                     -- F-04, F-15, etc.
    pdfmonkey_template_name     TEXT,
    
    -- Variablen-Schema
    benoetigte_variablen        JSONB DEFAULT '[]'::jsonb,
    optionale_variablen         JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default_for_typ          BOOLEAN NOT NULL DEFAULT FALSE,
    
    nutzungen_count             INTEGER NOT NULL DEFAULT 0,
    letzte_nutzung_at           TIMESTAMPTZ,
    
    notizen                     TEXT,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dok_templ_default_per_typ ON public.dokument_templates(typ) 
    WHERE is_default_for_typ = TRUE AND aktiv = TRUE;
CREATE INDEX idx_dok_templ_typ_aktiv ON public.dokument_templates(typ, aktiv);
CREATE INDEX idx_dok_templ_pdfmonkey ON public.dokument_templates(pdfmonkey_template_id);

CREATE TRIGGER trg_dok_templ_updated_at BEFORE UPDATE ON public.dokument_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 9.3 EMPFEHLUNGEN — Referral-Programm
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.empfehlungen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Empfehler (bestehender User)
    empfehler_user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    empfehler_workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ref_code                    TEXT NOT NULL UNIQUE,
    
    -- Neuer SV (Empfohlener)
    neuer_user_id               UUID REFERENCES public.users(id),
    neuer_workspace_id          UUID REFERENCES public.workspaces(id),
    neuer_email                 TEXT,                              -- vor Anmeldung
    
    -- Wert
    paket                       abo_tier,
    bonus_betrag_eur            NUMERIC(8,2),
    
    -- Status-Lifecycle
    status                      referral_status NOT NULL DEFAULT 'eingereicht',
    qualifiziert_at             TIMESTAMPTZ,                       -- nach Demo
    konvertiert_at              TIMESTAMPTZ,                       -- nach erstem Bezahlmonat
    abschluss_at                TIMESTAMPTZ,
    auszahlung_at               TIMESTAMPTZ,
    
    notizen                     TEXT,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_empfehlungen_empfehler ON public.empfehlungen(empfehler_user_id, status);
CREATE INDEX idx_empfehlungen_status ON public.empfehlungen(status, created_at DESC);
CREATE INDEX idx_empfehlungen_ref_code ON public.empfehlungen(ref_code);

CREATE TRIGGER trg_empfehlungen_updated_at BEFORE UPDATE ON public.empfehlungen
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 9.4 LEADS_PIPELINE — Akquise-CRM fuer Marcel persoenlich
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.leads_pipeline (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Person
    vorname                     TEXT,
    nachname                    TEXT,
    firma                       TEXT,
    email                       TEXT,
    telefon                     TEXT,
    plz                         TEXT,
    ort                         TEXT,
    
    -- Profil
    spezialisierung             TEXT,
    quelle                      TEXT,                              -- "Empfehlung", "Verband", "Linkedin", "Google Ads"
    verbands_mitglied           BOOLEAN,
    
    -- Pipeline
    stufe                       lead_stufe NOT NULL DEFAULT 'kalt',
    abschluss_wahrscheinlichkeit_pct INTEGER CHECK (abschluss_wahrscheinlichkeit_pct >= 0 AND abschluss_wahrscheinlichkeit_pct <= 100),
    erwarteter_mrr_eur          NUMERIC(8,2),
    
    -- Aktivitäten
    erstkontakt_datum           DATE,
    demo_geplant_am             TIMESTAMPTZ,
    demo_durchgefuehrt_am       DATE,
    naechster_schritt           TEXT,
    
    -- Conversion
    konvertiert_zu_user_id      UUID REFERENCES public.users(id),
    konvertiert_at              TIMESTAMPTZ,
    
    -- Owner (in der Regel Marcel)
    assigned_to_user_id         UUID REFERENCES public.users(id),
    
    notizen                     TEXT,
    tags                        TEXT[] DEFAULT '{}',
    
    -- Volltext
    search_vector               TSVECTOR,
    
    -- Migration
    importiert_aus_airtable     BOOLEAN NOT NULL DEFAULT FALSE,
    airtable_record_id          TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_stufe ON public.leads_pipeline(stufe, created_at DESC);
CREATE INDEX idx_leads_assigned ON public.leads_pipeline(assigned_to_user_id, stufe);
CREATE INDEX idx_leads_search ON public.leads_pipeline USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.update_lead_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.vorname, '') || ' ' || COALESCE(NEW.nachname, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.firma, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.email, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.spezialisierung, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(NEW.notizen, '')), 'D');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_search BEFORE INSERT OR UPDATE ON public.leads_pipeline
    FOR EACH ROW EXECUTE FUNCTION public.update_lead_search();

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads_pipeline
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- §10 HELPER-FUNCTIONS (8)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 10.1 record_ki_call() — Komfort-Function fuer KI-Logging
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_ki_call(
    p_workspace_id UUID,
    p_purpose prompt_purpose,
    p_modell ki_modell_typ,
    p_token_input INTEGER,
    p_token_output INTEGER,
    p_kosten_eur NUMERIC,
    p_dauer_ms INTEGER,
    p_status ki_call_status DEFAULT 'erfolg',
    p_auftrag_id UUID DEFAULT NULL,
    p_template_id UUID DEFAULT NULL,
    p_feature_kontext TEXT DEFAULT NULL,
    p_input_pseudonymisiert BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.ki_protokoll (
        workspace_id, user_id, purpose, modell,
        token_input, token_output, kosten_eur, dauer_ms,
        status, auftrag_id, prompt_template_id,
        feature_kontext, input_pseudonymisiert,
        completed_at
    ) VALUES (
        p_workspace_id, auth.uid(), p_purpose, p_modell,
        p_token_input, p_token_output, p_kosten_eur, p_dauer_ms,
        p_status, p_auftrag_id, p_template_id,
        p_feature_kontext, p_input_pseudonymisiert,
        NOW()
    ) RETURNING id INTO v_id;
    
    -- Template-Stats updaten
    IF p_template_id IS NOT NULL AND p_status = 'erfolg' THEN
        UPDATE public.ki_prompt_templates
        SET nutzungen_count = nutzungen_count + 1
        WHERE id = p_template_id;
    END IF;
    
    RETURN v_id;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.2 log_feature_event() — Komfort fuer Click-Tracking
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_feature_event(
    p_workspace_id UUID,
    p_typ feature_event_typ,
    p_feature_key TEXT,
    p_page_url TEXT DEFAULT NULL,
    p_value JSONB DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.feature_events (
        workspace_id, user_id, typ, feature_key, page_url, value, session_id
    ) VALUES (
        p_workspace_id, auth.uid(), p_typ, p_feature_key, p_page_url, p_value, p_session_id
    ) RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.3 start_impersonation() — Audit-pflichtige Login-as-User
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_impersonation(
    p_target_user_id UUID,
    p_grund TEXT,
    p_ticket_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_target_workspace UUID;
    v_is_founder BOOLEAN;
BEGIN
    -- Nur Founder darf das
    SELECT public.is_founder() INTO v_is_founder;
    IF NOT v_is_founder THEN
        RAISE EXCEPTION 'Nur Founder kann Impersonation starten';
    END IF;
    
    -- Grund ist Pflicht (DSGVO)
    IF p_grund IS NULL OR length(trim(p_grund)) < 10 THEN
        RAISE EXCEPTION 'Grund mit min. 10 Zeichen ist Pflicht';
    END IF;
    
    -- Target-Workspace finden
    SELECT workspace_id INTO v_target_workspace
    FROM public.workspace_memberships
    WHERE user_id = p_target_user_id AND is_active = TRUE
    LIMIT 1;
    
    IF v_target_workspace IS NULL THEN
        RAISE EXCEPTION 'Target-User hat keinen aktiven Workspace';
    END IF;
    
    -- Log-Eintrag
    INSERT INTO public.impersonation_log (
        founder_user_id, target_user_id, target_workspace_id,
        grund, related_ticket_id
    ) VALUES (
        auth.uid(), p_target_user_id, v_target_workspace,
        p_grund, p_ticket_id
    ) RETURNING id INTO v_log_id;
    
    -- Audit-Trail
    INSERT INTO public.audit_trail (
        workspace_id, user_id, action, entity_typ, entity_id, payload
    ) VALUES (
        v_target_workspace, auth.uid(), 'login', 'impersonation', v_log_id,
        jsonb_build_object('target_user_id', p_target_user_id, 'grund', p_grund)
    );
    
    RETURN v_log_id;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.4 pseudonymize_text() — DSGVO Layer 2 (DB-Pseudonymisierung)
-- 
-- Einfache Pattern-basierte Pseudonymisierung als Backup zum Frontend.
-- Volle Pipeline läuft im Frontend (prova-pseudo.js + Edge Function).
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.pseudonymize_text(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_result TEXT := p_text;
BEGIN
    IF v_result IS NULL THEN RETURN NULL; END IF;
    
    -- Email-Adressen
    v_result := regexp_replace(v_result, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[EMAIL]', 'g');
    
    -- Telefonnummern (deutsch)
    v_result := regexp_replace(v_result, '(\+49|0)[\s\-]?[0-9\s\-/()]{6,20}', '[TELEFON]', 'g');
    
    -- IBAN
    v_result := regexp_replace(v_result, 'DE[0-9]{2}\s?([0-9]{4}\s?){4,5}[0-9]{1,2}', '[IBAN]', 'g');
    
    -- PLZ + Ort (vereinfacht: 5-stellige PLZ + folgendes Wort)
    v_result := regexp_replace(v_result, '\m[0-9]{5}\s+[A-ZÄÖÜ][a-zäöüß]+', '[PLZ_ORT]', 'g');
    
    RETURN v_result;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.5 unpseudonymize_text() — Re-Identifikation mit Mapping
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unpseudonymize_text(p_text TEXT, p_mapping JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_result TEXT := p_text;
    v_key TEXT;
    v_value TEXT;
BEGIN
    IF v_result IS NULL OR p_mapping IS NULL THEN RETURN v_result; END IF;
    
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_mapping)
    LOOP
        v_result := replace(v_result, v_key, v_value);
    END LOOP;
    
    RETURN v_result;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.6 dsgvo_user_loeschen() — Art. 17 DSGVO
-- 
-- Setzt deleted_at auf alles, anonymisiert was nicht löschbar (Audit-Trail).
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.dsgvo_user_loeschen(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB := '{}'::jsonb;
    v_count INTEGER;
    v_workspace_id UUID;
BEGIN
    -- Nur Founder oder User selbst
    IF NOT (public.is_founder() OR auth.uid() = p_user_id) THEN
        RAISE EXCEPTION 'Keine Berechtigung';
    END IF;
    
    -- Workspace-IDs sammeln (Solo-Workspaces auch löschen)
    FOR v_workspace_id IN 
        SELECT w.id FROM public.workspaces w
        WHERE w.typ = 'solo' AND EXISTS (
            SELECT 1 FROM public.workspace_memberships m
            WHERE m.workspace_id = w.id AND m.user_id = p_user_id AND m.rolle = 'owner'
        )
    LOOP
        UPDATE public.workspaces SET deleted_at = NOW() WHERE id = v_workspace_id;
    END LOOP;
    
    -- User soft-deleten
    UPDATE public.users 
    SET deleted_at = NOW(), 
        email = 'geloescht-' || id::text || '@anonym.invalid',
        name = '(geloescht)',
        anschrift = NULL, plz = NULL, ort = NULL,
        telefon = NULL, mobil = NULL, fax = NULL,
        signatur_storage_path = NULL, stempel_storage_path = NULL
    WHERE id = p_user_id;
    
    -- Audit-Trail anonymisieren (kann nicht gelöscht werden)
    UPDATE public.audit_trail 
    SET payload = jsonb_build_object('anonymized', true)
    WHERE user_id = p_user_id;
    
    -- Push-Subscriptions hart löschen
    DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('push_subscriptions_deleted', v_count);
    
    -- Audit-Eintrag schreiben
    INSERT INTO public.audit_trail (
        user_id, action, entity_typ, entity_id, payload
    ) VALUES (
        auth.uid(), 'data_delete_dsgvo', 'user', p_user_id,
        jsonb_build_object('reason', 'DSGVO Art. 17', 'result', v_result)
    );
    
    v_result := v_result || jsonb_build_object('user_deleted', true, 'completed_at', NOW());
    RETURN v_result;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.7 dsgvo_user_export() — Art. 20 DSGVO
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.dsgvo_user_export(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_workspaces JSONB;
    v_auftraege JSONB;
    v_kontakte JSONB;
    v_dokumente JSONB;
BEGIN
    IF NOT (public.is_founder() OR auth.uid() = p_user_id) THEN
        RAISE EXCEPTION 'Keine Berechtigung';
    END IF;
    
    SELECT jsonb_agg(to_jsonb(w)) INTO v_workspaces
    FROM public.workspaces w
    JOIN public.workspace_memberships m ON m.workspace_id = w.id
    WHERE m.user_id = p_user_id;
    
    SELECT jsonb_agg(to_jsonb(a)) INTO v_auftraege
    FROM public.auftraege a
    WHERE a.created_by_user_id = p_user_id OR a.assigned_to_user_id = p_user_id;
    
    SELECT jsonb_agg(to_jsonb(k)) INTO v_kontakte
    FROM public.kontakte k
    WHERE k.created_by_user_id = p_user_id;
    
    SELECT jsonb_agg(to_jsonb(d)) INTO v_dokumente
    FROM public.dokumente d
    WHERE d.created_by_user_id = p_user_id;
    
    v_result := jsonb_build_object(
        'export_date', NOW(),
        'user_id', p_user_id,
        'user', (SELECT to_jsonb(u) FROM public.users u WHERE u.id = p_user_id),
        'workspaces', COALESCE(v_workspaces, '[]'::jsonb),
        'auftraege', COALESCE(v_auftraege, '[]'::jsonb),
        'kontakte', COALESCE(v_kontakte, '[]'::jsonb),
        'dokumente', COALESCE(v_dokumente, '[]'::jsonb)
    );
    
    INSERT INTO public.audit_trail (
        user_id, action, entity_typ, entity_id, payload
    ) VALUES (
        auth.uid(), 'data_export_dsgvo', 'user', p_user_id,
        jsonb_build_object('reason', 'DSGVO Art. 20')
    );
    
    RETURN v_result;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.8 match_normen_vector() — Vector-Suche fuer KI-RAG
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_normen_vector(
    p_query_embedding vector(1536),
    p_workspace_id UUID,
    p_match_count INTEGER DEFAULT 5,
    p_similarity_threshold NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    norm_nr TEXT,
    titel TEXT,
    bereich norm_bereich,
    anwendung TEXT,
    similarity NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        n.id, n.norm_nr, n.titel, n.bereich, n.anwendung,
        (1 - (n.embedding <=> p_query_embedding))::NUMERIC AS similarity
    FROM public.normen_bibliothek n
    WHERE n.embedding IS NOT NULL
      AND n.aktiv = TRUE
      AND n.deleted_at IS NULL
      AND (n.is_master = TRUE OR n.workspace_id = p_workspace_id)
      AND (1 - (n.embedding <=> p_query_embedding))::NUMERIC > p_similarity_threshold
    ORDER BY n.embedding <=> p_query_embedding
    LIMIT p_match_count;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §11 ROW-LEVEL-SECURITY für alle Phase-4-Tabellen
-- ═══════════════════════════════════════════════════════════════════════════

-- WISSENS-BIBLIOTHEKEN
ALTER TABLE public.normen_bibliothek ENABLE ROW LEVEL SECURITY;
CREATE POLICY normen_select ON public.normen_bibliothek FOR SELECT
USING (
    is_master = TRUE 
    OR workspace_id IN (SELECT public.get_user_workspaces())
    OR public.is_founder()
);
CREATE POLICY normen_insert ON public.normen_bibliothek FOR INSERT
WITH CHECK (
    (is_master = TRUE AND public.is_founder())
    OR workspace_id IN (SELECT public.get_user_workspaces())
);
CREATE POLICY normen_update ON public.normen_bibliothek FOR UPDATE
USING (
    (is_master = TRUE AND public.is_founder())
    OR (is_master = FALSE AND workspace_id IN (SELECT public.get_user_workspaces()))
);
CREATE POLICY normen_delete ON public.normen_bibliothek FOR DELETE
USING (
    (is_master = TRUE AND public.is_founder())
    OR (is_master = FALSE AND workspace_id IN (SELECT public.get_user_workspaces()) AND public.has_role(workspace_id, 'admin'))
);

ALTER TABLE public.textbausteine ENABLE ROW LEVEL SECURITY;
CREATE POLICY textb_select ON public.textbausteine FOR SELECT
USING (is_global = TRUE OR workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY textb_insert ON public.textbausteine FOR INSERT
WITH CHECK ((is_global = TRUE AND public.is_founder()) OR workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY textb_modify ON public.textbausteine FOR UPDATE
USING ((is_global = TRUE AND public.is_founder()) OR workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY textb_delete ON public.textbausteine FOR DELETE
USING ((is_global = TRUE AND public.is_founder()) OR workspace_id IN (SELECT public.get_user_workspaces()));

ALTER TABLE public.ki_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY ki_prompts_select ON public.ki_prompt_templates FOR SELECT
USING (TRUE);  -- alle dürfen lesen
CREATE POLICY ki_prompts_modify ON public.ki_prompt_templates FOR ALL
USING (public.is_founder())
WITH CHECK (public.is_founder());

ALTER TABLE public.positionen_bibliothek ENABLE ROW LEVEL SECURITY;
CREATE POLICY pos_select ON public.positionen_bibliothek FOR SELECT
USING (is_global = TRUE OR workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY pos_modify ON public.positionen_bibliothek FOR ALL
USING ((is_global = TRUE AND public.is_founder()) OR workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK ((is_global = TRUE AND public.is_founder()) OR workspace_id IN (SELECT public.get_user_workspaces()));

ALTER TABLE public.wissen_diagnostik ENABLE ROW LEVEL SECURITY;
CREATE POLICY wissen_select ON public.wissen_diagnostik FOR SELECT
USING (is_global = TRUE OR workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY wissen_modify ON public.wissen_diagnostik FOR ALL
USING ((is_global = TRUE AND public.is_founder()) OR workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK ((is_global = TRUE AND public.is_founder()) OR workspace_id IN (SELECT public.get_user_workspaces()));

-- KI-INFRASTRUKTUR
ALTER TABLE public.ki_protokoll ENABLE ROW LEVEL SECURITY;
CREATE POLICY ki_prot_select ON public.ki_protokoll FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY ki_prot_insert ON public.ki_protokoll FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));
-- KEIN UPDATE/DELETE — Protokoll ist immutable (außer Founder)
CREATE POLICY ki_prot_founder_modify ON public.ki_protokoll FOR ALL
USING (public.is_founder())
WITH CHECK (public.is_founder());

ALTER TABLE public.ki_lernpool ENABLE ROW LEVEL SECURITY;
CREATE POLICY lernpool_select ON public.ki_lernpool FOR SELECT USING (TRUE);  -- anonymisiert, alle lesen
CREATE POLICY lernpool_insert ON public.ki_lernpool FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY lernpool_founder_modify ON public.ki_lernpool FOR ALL USING (public.is_founder()) WITH CHECK (public.is_founder());

ALTER TABLE public.ki_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY ki_feedback_select ON public.ki_feedback FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY ki_feedback_insert ON public.ki_feedback FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()) AND user_id = auth.uid());

-- MIGRATION
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY import_jobs_all ON public.import_jobs FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder())
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

ALTER TABLE public.import_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY import_records_all ON public.import_records FOR ALL
USING (job_id IN (SELECT id FROM public.import_jobs WHERE workspace_id IN (SELECT public.get_user_workspaces())) OR public.is_founder())
WITH CHECK (job_id IN (SELECT id FROM public.import_jobs WHERE workspace_id IN (SELECT public.get_user_workspaces())) OR public.is_founder());

-- SYSTEM
ALTER TABLE public.workflow_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY wf_errors_select ON public.workflow_errors FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY wf_errors_modify ON public.workflow_errors FOR ALL
USING (public.is_founder()) WITH CHECK (public.is_founder() OR auth.uid() IS NOT NULL);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_subs_self ON public.push_subscriptions FOR ALL
USING (user_id = auth.uid() OR public.is_founder())
WITH CHECK (user_id = auth.uid() OR public.is_founder());

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY ff_select ON public.feature_flags FOR SELECT
USING (is_global = TRUE OR workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY ff_modify ON public.feature_flags FOR ALL
USING (public.is_founder()) WITH CHECK (public.is_founder());

ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_select ON public.system_health FOR SELECT USING (public.is_founder());
CREATE POLICY health_insert ON public.system_health FOR INSERT WITH CHECK (TRUE);  -- System-Inserts

-- ADMIN-COCKPIT + SUPPORT
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_select ON public.support_tickets FOR SELECT
USING (
    user_id = auth.uid() 
    OR workspace_id IN (SELECT public.get_user_workspaces())
    OR public.is_founder()
);
CREATE POLICY tickets_insert ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tickets_update ON public.support_tickets FOR UPDATE
USING (
    user_id = auth.uid()  -- eigene Tickets editieren
    OR public.is_founder()
);

ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY replies_select ON public.support_replies FOR SELECT
USING (
    ticket_id IN (
        SELECT id FROM public.support_tickets 
        WHERE user_id = auth.uid() OR workspace_id IN (SELECT public.get_user_workspaces())
    )
    OR public.is_founder()
);
CREATE POLICY replies_insert ON public.support_replies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY attach_all ON public.support_attachments FOR ALL
USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid() OR workspace_id IN (SELECT public.get_user_workspaces()))
    OR public.is_founder()
);

ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY imperson_select ON public.impersonation_log FOR SELECT
USING (target_user_id = auth.uid() OR founder_user_id = auth.uid() OR public.is_founder());
CREATE POLICY imperson_insert ON public.impersonation_log FOR INSERT
WITH CHECK (public.is_founder() AND founder_user_id = auth.uid());

ALTER TABLE public.feature_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_select ON public.feature_events FOR SELECT
USING (user_id = auth.uid() OR workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY events_insert ON public.feature_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.churn_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY churn_select ON public.churn_reasons FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY churn_insert ON public.churn_reasons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- COMPLIANCE
ALTER TABLE public.einwilligungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY einw_select ON public.einwilligungen FOR SELECT
USING (user_id = auth.uid() OR public.is_founder());
CREATE POLICY einw_insert ON public.einwilligungen FOR INSERT
WITH CHECK (user_id = auth.uid());

ALTER TABLE public.rechtsdokumente ENABLE ROW LEVEL SECURITY;
CREATE POLICY rd_select ON public.rechtsdokumente FOR SELECT USING (TRUE);  -- alle lesen
CREATE POLICY rd_modify ON public.rechtsdokumente FOR ALL
USING (public.is_founder()) WITH CHECK (public.is_founder());

-- GESCHÄFT
ALTER TABLE public.versicherungs_partner ENABLE ROW LEVEL SECURITY;
CREATE POLICY vp_select ON public.versicherungs_partner FOR SELECT USING (TRUE);
CREATE POLICY vp_modify ON public.versicherungs_partner FOR ALL
USING (public.is_founder()) WITH CHECK (public.is_founder());

ALTER TABLE public.dokument_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY dt_select ON public.dokument_templates FOR SELECT USING (TRUE);
CREATE POLICY dt_modify ON public.dokument_templates FOR ALL
USING (public.is_founder()) WITH CHECK (public.is_founder());

ALTER TABLE public.empfehlungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY empf_select ON public.empfehlungen FOR SELECT
USING (
    empfehler_user_id = auth.uid() 
    OR neuer_user_id = auth.uid() 
    OR public.is_founder()
);
CREATE POLICY empf_insert ON public.empfehlungen FOR INSERT
WITH CHECK (empfehler_user_id = auth.uid() OR public.is_founder());
CREATE POLICY empf_modify ON public.empfehlungen FOR UPDATE
USING (public.is_founder());

ALTER TABLE public.leads_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_all ON public.leads_pipeline FOR ALL
USING (public.is_founder()) WITH CHECK (public.is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- §12 COCKPIT-VIEWS (8 für Marcel-Founder-Dashboard)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 12.1 v_cockpit_mrr — MRR live pro Monat
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_mrr AS
SELECT 
    date_trunc('month', NOW()) AS monat,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'solo') AS solo_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'team') AS team_kunden,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv') AS aktive_kunden_total,
    COUNT(*) FILTER (WHERE abo_status = 'trial') AS trial_kunden,
    
    (COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'solo') * 149)::NUMERIC AS mrr_solo_eur,
    (COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'team') * 279)::NUMERIC AS mrr_team_eur,
    
    (
      COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'solo') * 149 +
      COUNT(*) FILTER (WHERE abo_status = 'aktiv' AND abo_tier = 'team') * 279
    )::NUMERIC AS mrr_total_eur
FROM public.workspaces
WHERE deleted_at IS NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 12.2 v_cockpit_user_aktivitaet — Aktivitaets-Score
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_user_aktivitaet AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    u.last_login_at,
    u.last_active_at,
    
    (SELECT COUNT(*) FROM public.auftraege a 
     JOIN public.workspace_memberships m ON m.workspace_id = a.workspace_id
     WHERE m.user_id = u.id AND a.created_at > NOW() - INTERVAL '30 days')                 AS auftraege_30_tage,
    
    (SELECT COUNT(*) FROM public.dokumente d 
     JOIN public.workspace_memberships m ON m.workspace_id = d.workspace_id
     WHERE m.user_id = u.id AND d.created_at > NOW() - INTERVAL '30 days')                 AS dokumente_30_tage,
    
    (SELECT COUNT(*) FROM public.feature_events 
     WHERE user_id = u.id AND created_at > NOW() - INTERVAL '7 days')                       AS events_7_tage,
    
    -- Aktivitäts-Score 0-100
    LEAST(100, GREATEST(0, 
        COALESCE(
            CASE 
                WHEN u.last_active_at > NOW() - INTERVAL '1 day' THEN 100
                WHEN u.last_active_at > NOW() - INTERVAL '7 days' THEN 80
                WHEN u.last_active_at > NOW() - INTERVAL '30 days' THEN 50
                WHEN u.last_active_at > NOW() - INTERVAL '90 days' THEN 20
                ELSE 0
            END, 0
        )
    ))::INTEGER AS aktivitaets_score
FROM public.users u
WHERE u.deleted_at IS NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 12.3 v_cockpit_ki_kosten_pro_user — Marcel-Wunsch: Kosten je User
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_ki_kosten_pro_user AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    w.id AS workspace_id,
    w.abo_tier,
    
    -- Aktueller Monat
    COALESCE(SUM(p.kosten_eur) FILTER (WHERE p.created_at > date_trunc('month', NOW())), 0)::NUMERIC(10,4)    AS kosten_aktueller_monat_eur,
    COUNT(p.id) FILTER (WHERE p.created_at > date_trunc('month', NOW()))                                       AS calls_aktueller_monat,
    COALESCE(SUM(p.token_total) FILTER (WHERE p.created_at > date_trunc('month', NOW())), 0)::INTEGER         AS tokens_aktueller_monat,
    
    -- Letzten 30 Tage
    COALESCE(SUM(p.kosten_eur) FILTER (WHERE p.created_at > NOW() - INTERVAL '30 days'), 0)::NUMERIC(10,4)    AS kosten_30_tage_eur,
    
    -- Pro Modell
    COUNT(p.id) FILTER (WHERE p.modell IN ('gpt_4o', 'gpt_4_turbo'))                                          AS calls_premium,
    COUNT(p.id) FILTER (WHERE p.modell = 'gpt_4o_mini')                                                       AS calls_mini,
    COUNT(p.id) FILTER (WHERE p.modell = 'whisper_1')                                                         AS calls_whisper,
    
    -- Margin (Annahme: 149€ Solo / 279€ Team Tier)
    CASE w.abo_tier
        WHEN 'solo' THEN 149 - COALESCE(SUM(p.kosten_eur) FILTER (WHERE p.created_at > date_trunc('month', NOW())), 0)
        WHEN 'team' THEN 279 - COALESCE(SUM(p.kosten_eur) FILTER (WHERE p.created_at > date_trunc('month', NOW())), 0)
    END::NUMERIC(10,4)                                                                                         AS aktueller_marge_eur
FROM public.users u
JOIN public.workspace_memberships m ON m.user_id = u.id
JOIN public.workspaces w ON w.id = m.workspace_id
LEFT JOIN public.ki_protokoll p ON p.user_id = u.id
WHERE u.deleted_at IS NULL AND w.deleted_at IS NULL
GROUP BY u.id, u.name, u.email, w.id, w.abo_tier;


-- ───────────────────────────────────────────────────────────────────────────
-- 12.4 v_cockpit_ki_performance — Modell+Prompt-Erfolgsquoten
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_ki_performance AS
SELECT 
    p.modell,
    p.purpose,
    pt.name AS template_name,
    pt.id AS template_id,
    
    COUNT(p.id) AS total_calls,
    COUNT(p.id) FILTER (WHERE p.status = 'erfolg')                       AS erfolgreiche_calls,
    ROUND(100.0 * COUNT(p.id) FILTER (WHERE p.status = 'erfolg') / NULLIF(COUNT(p.id), 0), 2) AS erfolgsquote_pct,
    
    AVG(p.dauer_ms)::INTEGER                                              AS avg_dauer_ms,
    AVG(p.kosten_eur)::NUMERIC(10,4)                                      AS avg_kosten_eur,
    AVG(p.token_input)::INTEGER                                           AS avg_tokens_input,
    AVG(p.token_output)::INTEGER                                          AS avg_tokens_output,
    
    -- SV-Feedback (aus ki_feedback)
    AVG(f.bewertung_score)::NUMERIC(3,2)                                  AS avg_user_score,
    COUNT(f.id)                                                            AS feedback_count,
    
    SUM(p.kosten_eur)::NUMERIC(10,4)                                      AS gesamt_kosten_eur
FROM public.ki_protokoll p
LEFT JOIN public.ki_prompt_templates pt ON pt.id = p.prompt_template_id
LEFT JOIN public.ki_feedback f ON f.ki_protokoll_id = p.id
WHERE p.created_at > NOW() - INTERVAL '90 days'
GROUP BY p.modell, p.purpose, pt.name, pt.id;


-- ───────────────────────────────────────────────────────────────────────────
-- 12.5 v_cockpit_funnel — Trial→Paid Conversion
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_funnel AS
WITH cohorts AS (
    SELECT 
        date_trunc('month', created_at) AS cohort_monat,
        id AS workspace_id,
        abo_status,
        abo_tier,
        abo_aktiv_seit,
        created_at
    FROM public.workspaces
    WHERE deleted_at IS NULL
)
SELECT 
    cohort_monat,
    COUNT(*) AS signups,
    COUNT(*) FILTER (WHERE abo_status = 'aktiv') AS konvertiert,
    COUNT(*) FILTER (WHERE abo_status = 'gekuendigt') AS gechurned,
    COUNT(*) FILTER (WHERE abo_status = 'trial') AS noch_trial,
    
    ROUND(100.0 * COUNT(*) FILTER (WHERE abo_status = 'aktiv') / NULLIF(COUNT(*), 0), 2) AS conversion_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE abo_status = 'gekuendigt') / NULLIF(COUNT(*), 0), 2) AS churn_pct,
    
    AVG(EXTRACT(DAY FROM abo_aktiv_seit - created_at)) FILTER (WHERE abo_aktiv_seit IS NOT NULL)::INTEGER AS avg_days_to_paid
FROM cohorts
GROUP BY cohort_monat
ORDER BY cohort_monat DESC;


-- ───────────────────────────────────────────────────────────────────────────
-- 12.6 v_cockpit_auftrag_durchlaufzeiten — Marcel-Wunsch: Erstellungsdauer
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_auftrag_durchlaufzeiten AS
WITH durchlaufzeiten AS (
    SELECT 
        a.typ,
        EXTRACT(EPOCH FROM (a.abgeschlossen_am - a.created_at)) / 3600 AS stunden_gesamt
    FROM public.auftraege a
    WHERE a.abgeschlossen_am IS NOT NULL
      AND a.deleted_at IS NULL
      AND a.created_at > NOW() - INTERVAL '180 days'
)
SELECT 
    typ,
    COUNT(*) AS anzahl_abgeschlossen,
    ROUND(AVG(stunden_gesamt)::NUMERIC, 2) AS avg_stunden,
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY stunden_gesamt))::NUMERIC, 2) AS median_stunden,
    ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY stunden_gesamt))::NUMERIC, 2) AS p90_stunden,
    ROUND(MIN(stunden_gesamt)::NUMERIC, 2) AS min_stunden,
    ROUND(MAX(stunden_gesamt)::NUMERIC, 2) AS max_stunden
FROM durchlaufzeiten
GROUP BY typ
ORDER BY typ;


-- ───────────────────────────────────────────────────────────────────────────
-- 12.7 v_cockpit_feature_usage — Marcel-Wunsch: was wie oft genutzt
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_feature_usage AS
SELECT 
    feature_key,
    typ,
    COUNT(*) AS total_events,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT workspace_id) AS unique_workspaces,
    
    -- Zeitliche Verteilung
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS events_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS events_7d,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS events_30d,
    
    MAX(created_at) AS last_used_at,
    MIN(created_at) AS first_used_at
FROM public.feature_events
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY feature_key, typ
ORDER BY total_events DESC;


-- ───────────────────────────────────────────────────────────────────────────
-- 12.8 v_cockpit_support_overview — Marcel-Wunsch: Support live
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_cockpit_support_overview AS
SELECT 
    -- Aktuelle Last
    COUNT(*) FILTER (WHERE status = 'neu')                                              AS tickets_neu,
    COUNT(*) FILTER (WHERE status = 'in_bearbeitung')                                   AS tickets_in_bearbeitung,
    COUNT(*) FILTER (WHERE status = 'wartet_auf_user')                                  AS tickets_wartet_user,
    COUNT(*) FILTER (WHERE status NOT IN ('geloest', 'closed'))                         AS tickets_offen_total,
    
    -- Prioritäten
    COUNT(*) FILTER (WHERE prioritaet = 'kritisch' AND status NOT IN ('geloest', 'closed'))     AS kritisch_offen,
    COUNT(*) FILTER (WHERE prioritaet = 'hoch' AND status NOT IN ('geloest', 'closed'))         AS hoch_offen,
    
    -- Typ-Verteilung
    COUNT(*) FILTER (WHERE typ = 'bug' AND status NOT IN ('geloest', 'closed'))                 AS bugs_offen,
    COUNT(*) FILTER (WHERE typ = 'frage' AND status NOT IN ('geloest', 'closed'))               AS fragen_offen,
    COUNT(*) FILTER (WHERE typ = 'feature_request')                                              AS feature_requests_total,
    
    -- Resolutions-Performance
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL AND created_at > NOW() - INTERVAL '30 days')::INTEGER AS avg_resolution_hours_30d,
    
    -- Heute
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')                    AS neue_tickets_24h,
    COUNT(*) FILTER (WHERE resolved_at > NOW() - INTERVAL '24 hours')                   AS geloeste_tickets_24h
FROM public.support_tickets;


-- ═══════════════════════════════════════════════════════════════════════════
-- §13 VERIFIKATIONS-HINWEISE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Nach erfolgreichem Run, diese Queries ausführen zur Verifikation:
-- 
-- A) Tabellen-Anzahl (sollte ~52 sein nach allen 4 Phasen):
--    SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- 
-- B) Cockpit-Views da:
--    SELECT viewname FROM pg_views WHERE schemaname = 'public' 
--      AND viewname LIKE 'v_cockpit_%' ORDER BY viewname;
--    Erwartet: 8 Zeilen
-- 
-- C) pgvector aktiv:
--    SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- 
-- D) Helper-Functions:
--    SELECT proname FROM pg_proc 
--      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
--      AND proname IN ('record_ki_call', 'log_feature_event', 'start_impersonation', 
--                      'pseudonymize_text', 'unpseudonymize_text', 
--                      'dsgvo_user_loeschen', 'dsgvo_user_export', 'match_normen_vector');
--    Erwartet: 8 Zeilen
-- 
-- ═══════════════════════════════════════════════════════════════════════════
-- ENDE PHASE 4 — Schema 100% komplett
-- 
-- Naechster Schritt: Sprint K-1 Prompt fuer Claude Code
--   - Airtable-Daten migrieren
--   - Frontend-Libs bauen
--   - Backend-Refactor
--   - Pages umstellen
-- ═══════════════════════════════════════════════════════════════════════════
