-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Schema Phase 3: Artefakte + Storage
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Inhalt:        Dokumente (universal), Fotos, Audio, Anhänge, Termine,
--                Notizen, Storage-Buckets + Policies
-- Voraussetzung: Phase 1 + Phase 2 ausgeführt
-- 
-- AUSFÜHRUNG:
--   SQL-Editor → New Query → diesen Inhalt einfügen → Run
--   Erfolg: "Success. No rows returned"
-- 
-- DANACH: Phase 4 (KI-Protokoll, Imports, Notifications, Cockpit-Views)
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. ENUMS für Artefakte
-- ───────────────────────────────────────────────────────────────────────────

CREATE TYPE dokument_typ AS ENUM (
    -- Gutachten (PDFs erzeugt aus auftraege)
    'gutachten_pdf',                 -- F-08 Schadensgutachten
    'kurzstellungnahme_pdf',         -- F-04 Kurzstellungnahme
    'wertgutachten_pdf',             -- F-19 Wertgutachten
    'beweissicherung_pdf',           -- F-09 / F-10 Beweissicherung
    'gerichtsgutachten_pdf',         -- F-15 Gerichtsgutachten
    'schiedsgutachten_pdf',          -- F-17 Schiedsgutachten
    'beratung_protokoll',
    'baubegleitung_bericht',
    'foto_doku',                     -- FOTODOKU-MASTER
    
    -- Rechnungen
    'rechnung',                      -- F-02 Pauschalrechnung
    'rechnung_jveg',                 -- F-01 JVEG Gerichtsrechnung
    'rechnung_stunden',              -- F-03 Stundenrechnung
    'gutschrift_storno',             -- F-05
    
    -- Mahnungen (mit parent_dokument_id verkettet)
    'mahnung_1',                     -- F-06 1. Mahnung (höflich, blau)
    'mahnung_2',                     -- F-07 2. Mahnung (orange)
    'mahnung_3',                     -- F-08 letzte Mahnung (rot)
    
    -- Korrespondenz
    'brief',                         -- BRIEF Master DIN-5008
    'auftragsbestaetigung',
    'termin_bestaetigung',
    'anschreiben',
    
    -- Bescheinigungen (Top 12)
    'bescheinigung_sv_bestaetigung',
    'bescheinigung_ortsbesichtigung',
    'bescheinigung_auftragsannahme',
    'bescheinigung_termin',
    'bescheinigung_maengelfreiheit',
    'bescheinigung_zustand',
    'bescheinigung_beweissicherung',
    'bescheinigung_schimmelfreiheit',
    'bescheinigung_feuchtigkeit',
    'bescheinigung_standsicherheit',
    'bescheinigung_bedenken_vob',
    'bescheinigung_behinderung_vob',
    
    -- Sonstige
    'sonstiges_pdf'
);

CREATE TYPE dokument_status AS ENUM (
    'entwurf',
    'in_generation',     -- PDFMonkey läuft
    'generiert',         -- PDF fertig, noch nicht versendet
    'versendet',
    'gelesen',           -- bei trackbaren Versand-Kanälen
    'bezahlt',           -- nur Rechnungen
    'ueberfaellig',      -- nur Rechnungen
    'storniert',
    'archiviert'
);

CREATE TYPE versand_kanal AS ENUM (
    'email',
    'bea',               -- besonderes elektronisches Anwaltspostfach
    'egvp',              -- elektronisches Gerichts- und Verwaltungspostfach
    'post',
    'persoenlich',
    'online_portal',
    'fax'
);

CREATE TYPE termin_typ AS ENUM (
    'ortstermin',
    'gerichtstermin',
    'beratung_telefon',
    'beratung_video',
    'beratung_vor_ort',
    'beweisaufnahme',
    'baubegleitung_termin',
    'intern',
    'sonstiges'
);

CREATE TYPE termin_status AS ENUM (
    'geplant',
    'bestaetigt',
    'durchgefuehrt',
    'verschoben',
    'abgesagt',
    'kein_zustandekommen'
);

CREATE TYPE foto_typ AS ENUM (
    'uebersicht',
    'detail',
    'schaden',
    'beweis',
    'vergleich',
    'vorher',
    'nachher',
    'thermografie',
    'messung',
    'sonstiges'
);

CREATE TYPE anhang_typ AS ENUM (
    'klageschrift',
    'klageerwiderung',
    'beweisbeschluss',
    'vertrag',
    'rechnung_extern',
    'korrespondenz_email',
    'korrespondenz_brief',
    'bautagebuch',
    'leistungsverzeichnis',
    'fremd_gutachten',           -- z.B. Privatgutachten der Gegenseite
    'foto_extern',
    'plan',
    'norm_dokument',
    'protokoll',
    'sonstiges'
);

CREATE TYPE anhang_herkunft AS ENUM (
    'manuell_upload',
    'email_eingang',
    'bea_eingang',
    'scan',
    'api',
    'import'
);


-- ───────────────────────────────────────────────────────────────────────────
-- 2. DOKUMENTE — universale Artefakt-Tabelle
-- 
-- Zentrale Wahrheit für ALLE PDFs/Dokumente die das System erstellt oder
-- empfängt. Eine Tabelle für: Gutachten-PDFs, Rechnungen, Briefe,
-- Bescheinigungen, Mahnungen, etc.
-- 
-- 360°-Verknüpfung: Ein Dokument kann zu Auftrag, Kontakt, Termin gleichzeitig
-- gehören. Mahnungs-Kette via parent_dokument_id (Mahnung 1 → 2 → 3).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.dokumente (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    typ                         dokument_typ NOT NULL,
    doc_nummer                  TEXT,                              -- z.B. RE-2026-001, BR-2026-001
    
    -- 360°-Verknüpfungen (mehrere können gesetzt sein)
    auftrag_id                  UUID REFERENCES public.auftraege(id) ON DELETE SET NULL,
    kontakt_id                  UUID REFERENCES public.kontakte(id) ON DELETE SET NULL,    -- Empfänger
    termin_id                   UUID,                              -- FK kommt nach termine-Tabelle
    parent_dokument_id          UUID REFERENCES public.dokumente(id) ON DELETE SET NULL,   -- Mahnung-Kette
    
    -- Inhalt
    betreff                     TEXT,
    inhalt_text                 TEXT,                              -- bei Briefen: Anschreiben-Text
    inhalt_strukturiert         JSONB DEFAULT '{}'::jsonb,
    -- Erwartet typ-spezifisch:
    -- bei 'rechnung': { positionen, summen, faelligkeit, zahlungsbedingungen }
    -- bei 'brief': { anrede, body, gruss, anlagen }
    -- bei 'bescheinigung': { bescheinigungs_text, gueltigkeitsdatum }
    
    -- PDFMonkey-Tracking
    pdfmonkey_template_id       TEXT,                              -- z.B. c4bb257b-2b41-...
    pdfmonkey_document_id       TEXT,                              -- nach Generation gefüllt
    pdf_payload                 JSONB,                             -- was an PDFMonkey ging (für Re-Generation)
    
    -- Storage
    storage_bucket              TEXT NOT NULL DEFAULT 'sv-files',
    storage_path                TEXT,                              -- Pfad in Supabase Storage
    pdf_url                     TEXT,                              -- signierte URL (kurzlebig, regenerierbar)
    pdf_url_expires_at          TIMESTAMPTZ,
    bytes                       INTEGER,
    
    -- Status & Lifecycle
    status                      dokument_status NOT NULL DEFAULT 'entwurf',
    generated_at                TIMESTAMPTZ,
    sent_at                     TIMESTAMPTZ,
    sent_via                    versand_kanal,
    sent_to_email               TEXT,                              -- redundant aber audit-relevant
    gelesen_at                  TIMESTAMPTZ,                       -- bei trackbaren Kanälen
    
    -- Rechnungs-spezifisch (nur bei rechnung*, mahnung*)
    betrag_netto                NUMERIC(12, 2),
    betrag_brutto               NUMERIC(12, 2),
    mwst_satz                   NUMERIC(5, 2),                     -- z.B. 19.00, 7.00, 0.00
    waehrung                    TEXT NOT NULL DEFAULT 'EUR',
    rechnungsdatum              DATE,
    leistungszeitraum_von       DATE,
    leistungszeitraum_bis       DATE,
    faelligkeit                 DATE,
    zahlungsfrist_tage          INTEGER DEFAULT 14,
    bezahlt_at                  TIMESTAMPTZ,
    bezahlt_betrag              NUMERIC(12, 2),
    skonto_satz                 NUMERIC(5, 2),
    skonto_frist_tage           INTEGER,
    
    -- Mahnung-spezifisch
    mahn_stufe                  INTEGER,                           -- 1, 2, 3
    mahn_gebuehr                NUMERIC(8, 2),
    verzug_zinsen               NUMERIC(8, 2),
    
    -- DATEV-Vorbereitung (Stufe 1: CSV-Export)
    datev_konto_soll            TEXT,
    datev_konto_haben           TEXT,
    datev_steuerschluessel      TEXT,
    datev_kostenstelle          TEXT,
    datev_belegfeld_1           TEXT,
    datev_belegfeld_2           TEXT,
    datev_buchungstext          TEXT,
    datev_exported_at           TIMESTAMPTZ,
    datev_export_id             UUID,                              -- Verknüpfung zu späterer datev_exports-Tabelle
    
    -- ZUGFeRD/XRechnung-Vorbereitung
    xrechnung_xml_path          TEXT,                              -- Pfad zur XML-Datei in Storage
    leitweg_id                  TEXT,                              -- für Behörden-Rechnungen
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    
    -- Tags
    tags                        TEXT[] DEFAULT '{}',
    
    -- Meta
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_dokumente_workspace_typ ON public.dokumente(workspace_id, typ) WHERE deleted_at IS NULL;
CREATE INDEX idx_dokumente_workspace_status ON public.dokumente(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dokumente_auftrag ON public.dokumente(auftrag_id) WHERE auftrag_id IS NOT NULL;
CREATE INDEX idx_dokumente_kontakt ON public.dokumente(kontakt_id) WHERE kontakt_id IS NOT NULL;
CREATE INDEX idx_dokumente_parent ON public.dokumente(parent_dokument_id) WHERE parent_dokument_id IS NOT NULL;
CREATE INDEX idx_dokumente_doc_nummer ON public.dokumente(workspace_id, doc_nummer);
CREATE INDEX idx_dokumente_faelligkeit ON public.dokumente(workspace_id, faelligkeit) 
    WHERE typ IN ('rechnung','rechnung_jveg','rechnung_stunden') 
      AND status NOT IN ('bezahlt','storniert')
      AND deleted_at IS NULL;
CREATE INDEX idx_dokumente_search ON public.dokumente USING gin(search_vector);
CREATE INDEX idx_dokumente_tags ON public.dokumente USING gin(tags);

COMMENT ON TABLE public.dokumente IS 'Universale Dokument-Tabelle: Gutachten-PDFs, Rechnungen, Briefe, Mahnungen, Bescheinigungen';
COMMENT ON COLUMN public.dokumente.parent_dokument_id IS 'Mahnung-Kette: Mahnung 1 → 2 → 3 verkettet';
COMMENT ON COLUMN public.dokumente.storage_path IS 'Pfad in Supabase Storage. PDF lebt 10+ Jahre.';


-- Suchindex-Trigger für Dokumente
CREATE OR REPLACE FUNCTION public.update_dokument_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.doc_nummer, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.betreff, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.inhalt_text, '')), 'C');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dokumente_search BEFORE INSERT OR UPDATE ON public.dokumente
    FOR EACH ROW EXECUTE FUNCTION public.update_dokument_search();

CREATE TRIGGER trg_dokumente_updated_at BEFORE UPDATE ON public.dokumente
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 3. DOKUMENT-NUMMER-GENERATOR (analog zu generate_az)
-- 
-- Format: PRÄFIX-YYYY-NNN
-- Präfixe: RE (Rechnung), MA (Mahnung), BR (Brief), BES (Bescheinigung), AB (Auftragsbestätigung)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.dok_sequences (
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    praefix                     TEXT NOT NULL,                     -- RE, MA, BR, BES, ...
    jahr                        INTEGER NOT NULL,
    counter                     INTEGER NOT NULL DEFAULT 0,
    
    PRIMARY KEY (workspace_id, praefix, jahr)
);

CREATE OR REPLACE FUNCTION public.generate_doc_nummer(
    p_workspace_id UUID,
    p_typ dokument_typ,
    p_jahr INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_counter   INTEGER;
    v_praefix   TEXT;
BEGIN
    -- Präfix-Mapping nach Dokumenttyp
    v_praefix := CASE
        WHEN p_typ IN ('rechnung','rechnung_jveg','rechnung_stunden') THEN 'RE'
        WHEN p_typ = 'gutschrift_storno' THEN 'GS'
        WHEN p_typ IN ('mahnung_1','mahnung_2','mahnung_3') THEN 'MA'
        WHEN p_typ IN ('brief','anschreiben','auftragsbestaetigung','termin_bestaetigung') THEN 'BR'
        WHEN p_typ::text LIKE 'bescheinigung_%' THEN 'BES'
        ELSE 'DOK'
    END;
    
    INSERT INTO public.dok_sequences (workspace_id, praefix, jahr, counter)
    VALUES (p_workspace_id, v_praefix, p_jahr, 1)
    ON CONFLICT (workspace_id, praefix, jahr) DO UPDATE
        SET counter = dok_sequences.counter + 1
    RETURNING counter INTO v_counter;
    
    RETURN v_praefix || '-' || p_jahr::TEXT || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 4. DOKUMENT-POSITIONEN — Rechnungs-/Mahnungs-Positionen
-- 
-- Strukturierte Positions-Liste pro Rechnung/Mahnung. Bei Briefen leer.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.dokument_positionen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dokument_id                 UUID NOT NULL REFERENCES public.dokumente(id) ON DELETE CASCADE,
    
    pos_nr                      INTEGER NOT NULL,
    bezeichnung                 TEXT NOT NULL,
    beschreibung                TEXT,
    
    menge                       NUMERIC(12, 2),
    einheit                     TEXT,                              -- "Std", "Stk", "psch", "km"
    
    ep_netto                    NUMERIC(12, 2),
    summe_netto                 NUMERIC(12, 2),
    
    mwst_satz                   NUMERIC(5, 2) DEFAULT 19.00,
    summe_brutto                NUMERIC(12, 2),
    
    -- JVEG-spezifisch
    jveg_paragraph              TEXT,                              -- z.B. "§ 9 JVEG"
    jveg_kategorie              TEXT,
    
    -- Leistungszeitraum (pro Position)
    leistung_von                DATE,
    leistung_bis                DATE,
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dok_positionen_dokument ON public.dokument_positionen(dokument_id, pos_nr);

CREATE TRIGGER trg_dok_positionen_updated_at BEFORE UPDATE ON public.dokument_positionen
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 5. FOTOS — kritisch! 10+ Jahre Aufbewahrung, EU Storage
-- 
-- Jedes Foto bekommt einen Postgres-Record + ein File in Supabase Storage.
-- Verknüpfungen flexibel: Auftrag, Ortstermin, Kontakt, Eintrag, Dokument
-- (für Foto-Doku-PDFs).
-- 
-- DSGVO: EXIF wird VOR Upload gestrippt (in Edge Function). Marker hier
-- zur Compliance-Verifikation.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.fotos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- 360°-Verknüpfungen (mehrere möglich)
    auftrag_id                  UUID REFERENCES public.auftraege(id) ON DELETE SET NULL,
    ortstermin_id               UUID REFERENCES public.ortstermine(id) ON DELETE SET NULL,
    kontakt_id                  UUID REFERENCES public.kontakte(id) ON DELETE SET NULL,
    eintrag_id                  UUID REFERENCES public.eintraege(id) ON DELETE SET NULL,
    dokument_id                 UUID REFERENCES public.dokumente(id) ON DELETE SET NULL,
    
    typ                         foto_typ NOT NULL DEFAULT 'detail',
    
    -- Storage
    storage_bucket              TEXT NOT NULL DEFAULT 'sv-files',
    storage_path                TEXT NOT NULL,                     -- z.B. sv-{ws}/auftrag-{id}/fotos/{uuid}.jpg
    thumbnail_path              TEXT,                              -- automatisch generiert
    original_filename           TEXT,
    
    -- Bild-Metadaten
    mime_type                   TEXT NOT NULL DEFAULT 'image/jpeg',
    bytes                       INTEGER,
    width                       INTEGER,
    height                      INTEGER,
    
    -- DSGVO-Compliance (EXIF-Strip)
    exif_stripped               BOOLEAN NOT NULL DEFAULT FALSE,
    exif_stripped_at            TIMESTAMPTZ,
    exif_stripped_by            TEXT,                              -- 'edge_function' / 'client'
    
    -- Original-Aufnahmezeitpunkt (aus EXIF, vor Strip)
    captured_at                 TIMESTAMPTZ,
    
    -- Beschreibung & Kontext
    beschreibung                TEXT,
    beweisfrage_ref             TEXT,                              -- bei Gerichtsgutachten
    
    -- Tags & Sortierung
    tags                        TEXT[] DEFAULT '{}',
    position_in_dokument        INTEGER,                           -- bei Foto-Doku-PDF: Reihenfolge
    
    -- Volltext-Suche (über Beschreibung + Tags)
    search_vector               TSVECTOR,
    
    -- Meta
    uploaded_by_user_id         UUID REFERENCES public.users(id),
    uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_fotos_workspace ON public.fotos(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fotos_auftrag ON public.fotos(auftrag_id, position_in_dokument) WHERE auftrag_id IS NOT NULL;
CREATE INDEX idx_fotos_ortstermin ON public.fotos(ortstermin_id) WHERE ortstermin_id IS NOT NULL;
CREATE INDEX idx_fotos_dokument ON public.fotos(dokument_id, position_in_dokument) WHERE dokument_id IS NOT NULL;
CREATE INDEX idx_fotos_eintrag ON public.fotos(eintrag_id) WHERE eintrag_id IS NOT NULL;
CREATE INDEX idx_fotos_search ON public.fotos USING gin(search_vector);
CREATE INDEX idx_fotos_tags ON public.fotos USING gin(tags);
CREATE INDEX idx_fotos_exif_pending ON public.fotos(uploaded_at) WHERE exif_stripped = FALSE AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_foto_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.beschreibung, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fotos_search BEFORE INSERT OR UPDATE ON public.fotos
    FOR EACH ROW EXECUTE FUNCTION public.update_foto_search();

COMMENT ON TABLE public.fotos IS 'Foto-Records. EXIF-Strip Pflicht (DSGVO). 10+ Jahre Aufbewahrung in EU Storage.';
COMMENT ON COLUMN public.fotos.exif_stripped IS 'DSGVO: muss TRUE sein bevor Foto produktiv genutzt wird';


-- ───────────────────────────────────────────────────────────────────────────
-- 6. AUDIO-DATEIEN — Diktate für Whisper-Transkription
-- 
-- Format: bevorzugt Opus 16kbps (effizient für Sprache).
-- Transkription via OpenAI Whisper, läuft als Edge Function.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.audio_dateien (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Verknüpfungen
    auftrag_id                  UUID REFERENCES public.auftraege(id) ON DELETE SET NULL,
    ortstermin_id               UUID REFERENCES public.ortstermine(id) ON DELETE SET NULL,
    eintrag_id                  UUID REFERENCES public.eintraege(id) ON DELETE SET NULL,
    
    -- Storage
    storage_bucket              TEXT NOT NULL DEFAULT 'sv-files',
    storage_path                TEXT NOT NULL,
    original_filename           TEXT,
    mime_type                   TEXT NOT NULL DEFAULT 'audio/opus',
    codec                       TEXT,                              -- 'opus', 'aac', 'wav'
    bitrate_kbps                INTEGER,
    
    duration_seconds            INTEGER,
    bytes                       INTEGER,
    
    -- Transkription
    transkript_text             TEXT,                              -- finaler Text (re-identifiziert)
    transkript_pseudonym        TEXT,                              -- was an Whisper ging
    transkribiert_am            TIMESTAMPTZ,
    transkriptions_modell       TEXT,                              -- z.B. 'whisper-1'
    transkriptions_dauer_ms     INTEGER,
    transkriptions_kosten_eur   NUMERIC(8, 4),
    
    -- DSGVO
    pseudonymisiert             BOOLEAN NOT NULL DEFAULT FALSE,
    pseudonymisiert_am          TIMESTAMPTZ,
    
    -- Halluzinations-Check (Diktat vs. KI-Output Konsistenz)
    halluzination_check_passed  BOOLEAN,
    halluzination_check_at      TIMESTAMPTZ,
    
    -- Volltext-Suche über Transkript
    search_vector               TSVECTOR,
    
    -- Meta
    recorded_by_user_id         UUID REFERENCES public.users(id),
    recorded_at                 TIMESTAMPTZ,
    uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_audio_workspace ON public.audio_dateien(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audio_auftrag ON public.audio_dateien(auftrag_id) WHERE auftrag_id IS NOT NULL;
CREATE INDEX idx_audio_eintrag ON public.audio_dateien(eintrag_id) WHERE eintrag_id IS NOT NULL;
CREATE INDEX idx_audio_search ON public.audio_dateien USING gin(search_vector);
CREATE INDEX idx_audio_pending_transkription ON public.audio_dateien(uploaded_at) 
    WHERE transkript_text IS NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_audio_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := to_tsvector('german', COALESCE(NEW.transkript_text, ''));
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audio_search BEFORE INSERT OR UPDATE ON public.audio_dateien
    FOR EACH ROW EXECUTE FUNCTION public.update_audio_search();

COMMENT ON TABLE public.audio_dateien IS 'Diktat-Audios. Whisper-Transkription, Pseudonymisierung Pflicht.';


-- ───────────────────────────────────────────────────────────────────────────
-- 7. ANHAENGE — hochgeladene Dokumente von außen
-- 
-- Klageschriften, Werkverträge, Bautagebücher, Privatgutachten der Gegenseite.
-- Vorbereitung für Volltext-OCR (Stufe 2) + Smart-Extract (Stufe 3).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.anhaenge (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- 360°-Verknüpfungen
    auftrag_id                  UUID REFERENCES public.auftraege(id) ON DELETE SET NULL,
    kontakt_id                  UUID REFERENCES public.kontakte(id) ON DELETE SET NULL,
    termin_id                   UUID,                              -- FK kommt nach termine-Tabelle
    eintrag_id                  UUID REFERENCES public.eintraege(id) ON DELETE SET NULL,
    
    typ                         anhang_typ NOT NULL DEFAULT 'sonstiges',
    herkunft                    anhang_herkunft NOT NULL DEFAULT 'manuell_upload',
    
    -- Storage
    storage_bucket              TEXT NOT NULL DEFAULT 'sv-files',
    storage_path                TEXT NOT NULL,
    original_filename           TEXT NOT NULL,
    mime_type                   TEXT,
    bytes                       INTEGER,
    
    -- Sicherheits-Marker
    vertraulich                 BOOLEAN NOT NULL DEFAULT TRUE,
    virus_scan_status           TEXT,                              -- 'clean', 'pending', 'infected'
    virus_scan_at               TIMESTAMPTZ,
    
    -- OCR (Stufe 2 — wird via Edge Function gefüllt)
    ocr_text                    TEXT,
    ocr_completed_at            TIMESTAMPTZ,
    ocr_confidence              NUMERIC(5, 2),                     -- 0-100
    
    -- Smart-Extract (Stufe 3 — KI-strukturierte Extraktion)
    extracted_data              JSONB,
    -- Bei Klageschrift: { aktenzeichen, klaeger, beklagter, streitwert, datum, antraege }
    -- Bei Vertrag: { vertragsparteien, vertragsdatum, leistungen, konditionen }
    extraction_at               TIMESTAMPTZ,
    extraction_modell           TEXT,                              -- z.B. 'gpt-4o' / 'mistral-doc-ai'
    
    -- Beschreibung
    beschreibung                TEXT,
    tags                        TEXT[] DEFAULT '{}',
    
    -- Volltext-Suche (kombiniert Original-Filename + OCR-Text + Beschreibung)
    search_vector               TSVECTOR,
    
    -- Meta
    uploaded_by_user_id         UUID REFERENCES public.users(id),
    uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_anhaenge_workspace ON public.anhaenge(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_anhaenge_auftrag ON public.anhaenge(auftrag_id) WHERE auftrag_id IS NOT NULL;
CREATE INDEX idx_anhaenge_kontakt ON public.anhaenge(kontakt_id) WHERE kontakt_id IS NOT NULL;
CREATE INDEX idx_anhaenge_search ON public.anhaenge USING gin(search_vector);
CREATE INDEX idx_anhaenge_tags ON public.anhaenge USING gin(tags);
CREATE INDEX idx_anhaenge_pending_ocr ON public.anhaenge(uploaded_at) 
    WHERE ocr_text IS NULL AND mime_type LIKE 'application/pdf%' AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_anhang_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.original_filename, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.beschreibung, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.ocr_text, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_anhaenge_search BEFORE INSERT OR UPDATE ON public.anhaenge
    FOR EACH ROW EXECUTE FUNCTION public.update_anhang_search();

COMMENT ON TABLE public.anhaenge IS 'Hochgeladene Dokumente von außen — Klageschriften, Verträge, Privatgutachten. Mit OCR-Pipeline (Stufe 2) + Smart-Extract (Stufe 3).';


-- ───────────────────────────────────────────────────────────────────────────
-- 8. TERMINE — Cross-Auftrag-Termine mit iCal-Support
-- 
-- Universale Termin-Tabelle. Kann zu Auftrag/Kontakt gehören oder frei sein.
-- iCal-UID für Outlook/Google-Kalender-Subscription (Sprint 05 P6 + iCal).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.termine (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Verknüpfungen
    auftrag_id                  UUID REFERENCES public.auftraege(id) ON DELETE SET NULL,
    kontakt_id                  UUID REFERENCES public.kontakte(id) ON DELETE SET NULL,
    
    typ                         termin_typ NOT NULL DEFAULT 'ortstermin',
    status                      termin_status NOT NULL DEFAULT 'geplant',
    
    -- Inhalt
    titel                       TEXT NOT NULL,
    beschreibung                TEXT,
    
    -- Zeit
    datum                       DATE NOT NULL,
    uhrzeit_von                 TIME,
    uhrzeit_bis                 TIME,
    ganztaegig                  BOOLEAN NOT NULL DEFAULT FALSE,
    dauer_minuten               INTEGER,
    timezone                    TEXT NOT NULL DEFAULT 'Europe/Berlin',
    
    -- Ort
    ort_name                    TEXT,                              -- "Landgericht Köln" / "Baustelle Mustermann"
    ort_adresse                 TEXT,
    ort_plz                     TEXT,
    ort_ort                     TEXT,
    ort_geo_lat                 NUMERIC(9, 6),
    ort_geo_lng                 NUMERIC(9, 6),
    
    -- Teilnehmer (strukturierte Liste)
    teilnehmer                  JSONB DEFAULT '[]'::jsonb,
    -- [{ name, rolle, email, kontakt_id }]
    
    -- iCal-Support
    ical_uid                    TEXT NOT NULL UNIQUE DEFAULT (uuid_generate_v4() || '@prova-systems.de'),
    ical_sequence               INTEGER NOT NULL DEFAULT 0,        -- für Updates erhöhen
    
    -- Erinnerungen
    erinnerung_minuten          INTEGER,                           -- NULL = keine
    erinnerung_gesendet_at      TIMESTAMPTZ,
    
    -- Auswertung nach Termin
    notizen_nach_termin         TEXT,
    durchgefuehrt_am            TIMESTAMPTZ,
    
    -- Meta
    assigned_to_user_id         UUID REFERENCES public.users(id),
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_termine_workspace_datum ON public.termine(workspace_id, datum DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_termine_assigned ON public.termine(assigned_to_user_id, datum) WHERE deleted_at IS NULL;
CREATE INDEX idx_termine_auftrag ON public.termine(auftrag_id) WHERE auftrag_id IS NOT NULL;
CREATE INDEX idx_termine_kontakt ON public.termine(kontakt_id) WHERE kontakt_id IS NOT NULL;
CREATE INDEX idx_termine_status ON public.termine(workspace_id, status, datum) WHERE deleted_at IS NULL;
CREATE INDEX idx_termine_ical ON public.termine(ical_uid);
CREATE INDEX idx_termine_erinnerung_pending ON public.termine(datum, uhrzeit_von) 
    WHERE status IN ('geplant','bestaetigt') 
      AND erinnerung_minuten IS NOT NULL 
      AND erinnerung_gesendet_at IS NULL
      AND deleted_at IS NULL;

CREATE TRIGGER trg_termine_updated_at BEFORE UPDATE ON public.termine
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Jetzt FK-Constraints für termin_id in dokumente/anhaenge nachreichen
ALTER TABLE public.dokumente 
    ADD CONSTRAINT fk_dokumente_termin 
    FOREIGN KEY (termin_id) REFERENCES public.termine(id) ON DELETE SET NULL;

ALTER TABLE public.anhaenge 
    ADD CONSTRAINT fk_anhaenge_termin 
    FOREIGN KEY (termin_id) REFERENCES public.termine(id) ON DELETE SET NULL;

COMMENT ON TABLE public.termine IS 'Universale Termin-Tabelle mit iCal-Support für Outlook/Google-Subscription';


-- ───────────────────────────────────────────────────────────────────────────
-- 9. NOTIZEN — Free-Form Notizen, an alles dranhängbar
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.notizen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- 360°-Verknüpfungen
    auftrag_id                  UUID REFERENCES public.auftraege(id) ON DELETE CASCADE,
    kontakt_id                  UUID REFERENCES public.kontakte(id) ON DELETE CASCADE,
    termin_id                   UUID REFERENCES public.termine(id) ON DELETE CASCADE,
    dokument_id                 UUID REFERENCES public.dokumente(id) ON DELETE CASCADE,
    
    -- Inhalt
    titel                       TEXT,
    content                     TEXT NOT NULL,
    
    -- Flags
    important                   BOOLEAN NOT NULL DEFAULT FALSE,
    pinned                      BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Tags
    tags                        TEXT[] DEFAULT '{}',
    
    -- Volltext
    search_vector               TSVECTOR,
    
    -- Meta
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_notizen_workspace ON public.notizen(workspace_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notizen_auftrag ON public.notizen(auftrag_id, created_at DESC) WHERE auftrag_id IS NOT NULL;
CREATE INDEX idx_notizen_kontakt ON public.notizen(kontakt_id, created_at DESC) WHERE kontakt_id IS NOT NULL;
CREATE INDEX idx_notizen_pinned ON public.notizen(workspace_id, pinned, created_at DESC) WHERE pinned = TRUE;
CREATE INDEX idx_notizen_search ON public.notizen USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.update_notiz_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.titel, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notizen_search BEFORE INSERT OR UPDATE ON public.notizen
    FOR EACH ROW EXECUTE FUNCTION public.update_notiz_search();

CREATE TRIGGER trg_notizen_updated_at BEFORE UPDATE ON public.notizen
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE-BUCKETS-SETUP
-- 
-- Supabase Storage = S3-kompatibler Object-Store, EU-Region.
-- 3 Buckets:
--   sv-files    — alle privaten Files (PDFs, Fotos, Audio, Anhänge) — RLS scharf
--   sv-public   — öffentliche Files (heute leer, Vorbereitung für ggf. Public-Foto-Galerie)
--   sv-system   — System-Backups, Marcel-only
-- ═══════════════════════════════════════════════════════════════════════════

-- sv-files: privater Hauptbucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'sv-files', 
    'sv-files', 
    FALSE,                                     -- private
    52428800,                                  -- 50 MB max pro Datei
    NULL                                       -- alle MIME-Types erlaubt
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

-- sv-public: heute leer, später für Marketing-Assets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sv-public', 'sv-public', TRUE, 10485760)
ON CONFLICT (id) DO NOTHING;

-- sv-system: Marcel-only, für System-Files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sv-system', 'sv-system', FALSE, 524288000)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE-RLS-POLICIES
-- 
-- Storage-Pfad-Konvention:
--   sv-files/sv-{workspace_id}/...   ← Workspace-isoliert
--   sv-files/sv-{workspace_id}/auftraege/{auftrag_id}/...
--   sv-files/sv-{workspace_id}/kontakte/{kontakt_id}/...
-- 
-- RLS extrahiert die workspace_id aus dem Pfad und prüft Membership.
-- ═══════════════════════════════════════════════════════════════════════════

-- Hilfs-Function: extrahiert workspace_id aus Storage-Pfad
CREATE OR REPLACE FUNCTION public.storage_path_to_workspace_id(p_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_first_part TEXT;
BEGIN
    v_first_part := split_part(p_path, '/', 1);
    
    -- Format: sv-{uuid}
    IF v_first_part LIKE 'sv-%' THEN
        BEGIN
            RETURN substring(v_first_part FROM 4)::UUID;
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
    END IF;
    
    RETURN NULL;
END;
$$;


-- Storage-RLS für sv-files

-- SELECT: User kann Files seiner Workspaces lesen
CREATE POLICY storage_sv_files_select ON storage.objects FOR SELECT
USING (
    bucket_id = 'sv-files' 
    AND (
        public.storage_path_to_workspace_id(name) IN (SELECT public.get_user_workspaces())
        OR public.is_founder()
    )
);

-- INSERT: User kann nur in eigene Workspaces uploaden
CREATE POLICY storage_sv_files_insert ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'sv-files'
    AND public.storage_path_to_workspace_id(name) IN (SELECT public.get_user_workspaces())
);

-- UPDATE: nur in eigenen Workspaces (z.B. Metadata ändern)
CREATE POLICY storage_sv_files_update ON storage.objects FOR UPDATE
USING (
    bucket_id = 'sv-files'
    AND public.storage_path_to_workspace_id(name) IN (SELECT public.get_user_workspaces())
);

-- DELETE: nur Owner/Admin der Workspace
CREATE POLICY storage_sv_files_delete ON storage.objects FOR DELETE
USING (
    bucket_id = 'sv-files'
    AND public.storage_path_to_workspace_id(name) IN (SELECT public.get_user_workspaces())
    AND public.has_role(public.storage_path_to_workspace_id(name), 'admin')
);


-- Storage-RLS für sv-public (lesen alle, schreiben nur Founder)
CREATE POLICY storage_sv_public_select ON storage.objects FOR SELECT
USING (bucket_id = 'sv-public');

CREATE POLICY storage_sv_public_insert ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sv-public' AND public.is_founder());

CREATE POLICY storage_sv_public_modify ON storage.objects FOR UPDATE
USING (bucket_id = 'sv-public' AND public.is_founder());

CREATE POLICY storage_sv_public_delete ON storage.objects FOR DELETE
USING (bucket_id = 'sv-public' AND public.is_founder());


-- Storage-RLS für sv-system (Marcel-only)
CREATE POLICY storage_sv_system_all ON storage.objects FOR ALL
USING (bucket_id = 'sv-system' AND public.is_founder())
WITH CHECK (bucket_id = 'sv-system' AND public.is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY für alle Phase-3-Tabellen
-- ═══════════════════════════════════════════════════════════════════════════

-- DOKUMENTE
ALTER TABLE public.dokumente ENABLE ROW LEVEL SECURITY;
CREATE POLICY dokumente_select ON public.dokumente FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY dokumente_modify ON public.dokumente FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

-- DOK_SEQUENCES
ALTER TABLE public.dok_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY dok_sequences_select ON public.dok_sequences FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

-- DOKUMENT_POSITIONEN
ALTER TABLE public.dokument_positionen ENABLE ROW LEVEL SECURITY;
CREATE POLICY dok_pos_all ON public.dokument_positionen FOR ALL
USING (dokument_id IN (SELECT id FROM public.dokumente WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (dokument_id IN (SELECT id FROM public.dokumente WHERE workspace_id IN (SELECT public.get_user_workspaces())));

-- FOTOS
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fotos_select ON public.fotos FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY fotos_modify ON public.fotos FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

-- AUDIO_DATEIEN
ALTER TABLE public.audio_dateien ENABLE ROW LEVEL SECURITY;
CREATE POLICY audio_select ON public.audio_dateien FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY audio_modify ON public.audio_dateien FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

-- ANHAENGE
ALTER TABLE public.anhaenge ENABLE ROW LEVEL SECURITY;
CREATE POLICY anhaenge_select ON public.anhaenge FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY anhaenge_modify ON public.anhaenge FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

-- TERMINE
ALTER TABLE public.termine ENABLE ROW LEVEL SECURITY;
CREATE POLICY termine_select ON public.termine FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY termine_modify ON public.termine FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

-- NOTIZEN
ALTER TABLE public.notizen ENABLE ROW LEVEL SECURITY;
CREATE POLICY notizen_select ON public.notizen FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY notizen_modify ON public.notizen FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));


-- ═══════════════════════════════════════════════════════════════════════════
-- 360°-VIEWS — die Magie, die Sprint 04e Verknüpfungen MEGA trivial macht
-- ═══════════════════════════════════════════════════════════════════════════

-- Ersetze v_kontakte_overview aus Phase 2 durch erweiterte Version
DROP VIEW IF EXISTS public.v_kontakte_overview CASCADE;

CREATE OR REPLACE VIEW public.v_kontakte_overview AS
SELECT 
    k.id,
    k.workspace_id,
    k.typ,
    k.name,
    k.firma,
    k.email,
    k.telefon,
    k.ort,
    k.tags,
    
    -- Auftrags-Counts pro Rolle
    (SELECT COUNT(*) FROM public.auftrag_kontakte WHERE kontakt_id = k.id AND rolle = 'auftraggeber')           AS als_auftraggeber_count,
    (SELECT COUNT(*) FROM public.auftrag_kontakte WHERE kontakt_id = k.id AND rolle = 'geschaedigter')          AS als_geschaedigter_count,
    (SELECT COUNT(*) FROM public.auftrag_kontakte WHERE kontakt_id = k.id)                                      AS auftraege_total,
    
    -- Dokument-Counts
    (SELECT COUNT(*) FROM public.dokumente WHERE kontakt_id = k.id 
        AND typ IN ('rechnung','rechnung_jveg','rechnung_stunden') 
        AND deleted_at IS NULL)                                                                                  AS rechnungen_count,
    (SELECT COUNT(*) FROM public.dokumente WHERE kontakt_id = k.id 
        AND typ IN ('rechnung','rechnung_jveg','rechnung_stunden') 
        AND status NOT IN ('bezahlt','storniert')
        AND deleted_at IS NULL)                                                                                  AS rechnungen_offen_count,
    (SELECT COUNT(*) FROM public.dokumente WHERE kontakt_id = k.id 
        AND typ IN ('mahnung_1','mahnung_2','mahnung_3') 
        AND deleted_at IS NULL)                                                                                  AS mahnungen_count,
    (SELECT COUNT(*) FROM public.dokumente WHERE kontakt_id = k.id 
        AND typ = 'brief' AND deleted_at IS NULL)                                                                AS briefe_count,
    
    -- Termine
    (SELECT COUNT(*) FROM public.termine WHERE kontakt_id = k.id 
        AND status IN ('geplant','bestaetigt') AND deleted_at IS NULL)                                           AS termine_kommend_count,
    
    -- Letzte Aktivität
    (SELECT MAX(a.created_at) 
     FROM public.auftrag_kontakte ak
     JOIN public.auftraege a ON ak.auftrag_id = a.id
     WHERE ak.kontakt_id = k.id)                                                                                  AS letzter_auftrag_am,
    
    -- Offene Rechnungssumme
    (SELECT COALESCE(SUM(betrag_brutto), 0) 
     FROM public.dokumente 
     WHERE kontakt_id = k.id 
       AND typ IN ('rechnung','rechnung_jveg','rechnung_stunden')
       AND status NOT IN ('bezahlt','storniert')
       AND deleted_at IS NULL)                                                                                    AS offene_rechnungssumme_eur,
    
    k.created_at,
    k.updated_at
FROM public.kontakte k
WHERE k.deleted_at IS NULL;


-- Auftrag-360-View — alles was zu einem Auftrag gehört
CREATE OR REPLACE VIEW public.v_auftrag_360 AS
SELECT 
    a.id,
    a.workspace_id,
    a.az,
    a.typ,
    a.status,
    a.titel,
    a.phase_aktuell,
    a.phase_max,
    a.objekt,
    a.created_at,
    a.updated_at,
    
    -- Counts aller verknüpften Entitäten (für 360°-Tabs in der UI)
    (SELECT COUNT(*) FROM public.auftrag_kontakte WHERE auftrag_id = a.id)                  AS kontakte_count,
    (SELECT COUNT(*) FROM public.befunde WHERE auftrag_id = a.id)                            AS befunde_count,
    (SELECT COUNT(*) FROM public.messwerte WHERE auftrag_id = a.id)                          AS messwerte_count,
    (SELECT COUNT(*) FROM public.ortstermine WHERE auftrag_id = a.id)                        AS ortstermine_count,
    (SELECT COUNT(*) FROM public.eintraege WHERE auftrag_id = a.id)                          AS eintraege_count,
    (SELECT COUNT(*) FROM public.fotos WHERE auftrag_id = a.id AND deleted_at IS NULL)       AS fotos_count,
    (SELECT COUNT(*) FROM public.audio_dateien WHERE auftrag_id = a.id AND deleted_at IS NULL) AS audio_count,
    (SELECT COUNT(*) FROM public.anhaenge WHERE auftrag_id = a.id AND deleted_at IS NULL)    AS anhaenge_count,
    (SELECT COUNT(*) FROM public.dokumente WHERE auftrag_id = a.id AND deleted_at IS NULL)   AS dokumente_count,
    (SELECT COUNT(*) FROM public.termine WHERE auftrag_id = a.id AND deleted_at IS NULL)     AS termine_count,
    (SELECT COUNT(*) FROM public.notizen WHERE auftrag_id = a.id AND deleted_at IS NULL)     AS notizen_count,
    (SELECT COUNT(*) FROM public.sanierungspositionen WHERE auftrag_id = a.id)               AS sanierung_count,
    
    -- Auftraggeber + Geschädigter direkt
    (SELECT k.name FROM public.auftrag_kontakte ak JOIN public.kontakte k ON ak.kontakt_id = k.id 
     WHERE ak.auftrag_id = a.id AND ak.rolle = 'auftraggeber' ORDER BY ak.ist_primaer DESC LIMIT 1) AS auftraggeber_name,
    (SELECT k.name FROM public.auftrag_kontakte ak JOIN public.kontakte k ON ak.kontakt_id = k.id 
     WHERE ak.auftrag_id = a.id AND ak.rolle = 'geschaedigter' ORDER BY ak.ist_primaer DESC LIMIT 1) AS geschaedigter_name
FROM public.auftraege a
WHERE a.deleted_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATIONS-QUERIES
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Phase-3 Tabellen-Check (insgesamt jetzt 30 Tabellen):
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 
-- Storage-Buckets:
--   SELECT id, name, public, file_size_limit FROM storage.buckets;
--   Erwartet: sv-files (private, 50MB), sv-public (public, 10MB), sv-system (private, 500MB)
-- 
-- 360°-Views:
--   SELECT * FROM public.v_kontakte_overview LIMIT 1;
--   SELECT * FROM public.v_auftrag_360 LIMIT 1;
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- ENDE PHASE 3
-- 
-- Nächster Schritt: Phase 4 (KI-Protokoll, Pseudonymisierung-Functions, 
-- Imports, Push-Subscriptions, Workflow-Errors, Cockpit-Aggregations)
-- ═══════════════════════════════════════════════════════════════════════════
