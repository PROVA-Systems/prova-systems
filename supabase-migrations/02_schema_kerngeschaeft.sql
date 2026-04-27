-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Schema Phase 2: Kerngeschäft
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Inhalt:        Kontakte, Aufträge (universal für 10 Typen), Befunde,
--                Messwerte, Sanierung, Phasen, Ortstermine, AZ-Generator
-- Voraussetzung: Phase 1 muss ausgeführt sein (workspaces, users, audit_trail)
-- 
-- AUSFÜHRUNG:
--   SQL-Editor → New Query → diesen Inhalt einfügen → Run
--   Erfolg: "Success. No rows returned"
-- 
-- DANACH: Phase 3 (Dokumente, Fotos, Audio, Termine, Storage) folgt
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. ENUMS für Kerngeschäft
-- ───────────────────────────────────────────────────────────────────────────

-- 10 Auftragstypen (alle die wir bisher kennen + Erweiterungs-Slots)
CREATE TYPE auftrag_typ AS ENUM (
    'schaden',              -- SCH-YYYY-NNN  Schadensgutachten
    'beweis',               -- BEW-YYYY-NNN  Beweissicherung
    'ergaenzung',           -- ERG-YYYY-NNN  Ergänzungsgutachten
    'gegen',                -- GEG-YYYY-NNN  Gegengutachten / Erwiderung
    'kurzstellungnahme',    -- KSN-YYYY-NNN  Kurzstellungnahme (= F-04)
    'wertgutachten',        -- WG-YYYY-NNN   Verkehrswertermittlung
    'beratung',             -- BER-YYYY-NNN  Beratung (Telefon/Vor-Ort/Kauf/Sanierung)
    'baubegleitung',        -- BB-YYYY-NNN   Baubegleitung mehrphasig
    'schied',               -- SCG-YYYY-NNN  Schiedsgutachten
    'gericht'               -- GG-YYYY-NNN   Gerichtsgutachten nach §403 ZPO
);

CREATE TYPE auftrag_status AS ENUM (
    'entwurf',
    'aktiv',
    'abgeschlossen',
    'archiv',
    'storniert'
);

CREATE TYPE auftrag_zweck AS ENUM (
    'privat',
    'gericht',
    'versicherung',
    'kauf',
    'sanierung',
    'sonstiges'
);

CREATE TYPE kontakt_typ AS ENUM (
    'privat',
    'firma',
    'anwalt',
    'versicherung',
    'gericht',
    'behoerde',
    'sv_kollege',
    'handwerker',
    'sonstiges'
);

CREATE TYPE kontakt_rolle AS ENUM (
    'auftraggeber',
    'geschaedigter',
    'eigentuemer',
    'mieter',
    'verwalter',
    'anwalt_klaeger',
    'anwalt_beklagter',
    'gericht',
    'versicherung_klaeger',
    'versicherung_beklagter',
    'sv_gegner',
    'zeuge',
    'rechnungsempfaenger',
    'sonstiges'
);

CREATE TYPE phase_status AS ENUM (
    'offen',
    'aktiv',
    'abgeschlossen',
    'uebersprungen'
);

CREATE TYPE ursache_prioritaet AS ENUM (
    'primaer',
    'alternativ',
    'ausgeschlossen'
);


-- ───────────────────────────────────────────────────────────────────────────
-- 2. KONTAKTE — Auftraggeber, Geschädigte, Anwälte, Versicherungen etc.
-- 
-- Universale Kontakt-Tabelle. Eine Person/Firma kann via kontakt_rollen
-- mehrere Rollen haben (z.B. Auftraggeber + Geschädigter + Eigentümer).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.kontakte (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    typ                         kontakt_typ NOT NULL DEFAULT 'privat',
    
    -- Person
    anrede                      TEXT,                          -- "Herr" / "Frau" / "Dr." / "Prof."
    titel                       TEXT,                          -- "Dipl.-Ing." / "RA"
    vorname                     TEXT,
    nachname                    TEXT,
    
    -- Firma (für firma/anwalt/versicherung/gericht/behoerde)
    firma                       TEXT,
    abteilung                   TEXT,
    
    -- Computed Display Name (via Trigger gepflegt)
    name                        TEXT NOT NULL,
    
    -- Adresse
    adresse_strasse             TEXT,
    adresse_nr                  TEXT,
    adresse_zusatz              TEXT,                          -- z.B. "2. OG"
    plz                         TEXT,
    ort                         TEXT,
    land                        TEXT NOT NULL DEFAULT 'DE',
    
    -- Kommunikation
    email                       TEXT,
    email_2                     TEXT,
    telefon                     TEXT,
    mobil                       TEXT,
    fax                         TEXT,
    website                     TEXT,
    
    -- Geschäftsdaten (für Rechnungen)
    ust_id                      TEXT,
    steuernummer                TEXT,
    iban                        TEXT,
    bic                         TEXT,
    
    -- Justiz/Behörden-spezifisch
    behoerden_az                TEXT,                          -- bei Gerichten/Behörden
    
    -- Anwalt-spezifisch
    kanzlei                     TEXT,                          -- "Müller & Partner Rechtsanwälte"
    
    -- Versicherung-spezifisch
    versicherungs_nr            TEXT,
    schaden_nr                  TEXT,
    
    -- Notizen + Tags
    notizen                     TEXT,
    tags                        TEXT[] DEFAULT '{}',           -- z.B. ["Stammkunde", "VIP"]
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    
    -- Meta
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_kontakte_workspace ON public.kontakte(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kontakte_name ON public.kontakte(workspace_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_kontakte_email ON public.kontakte(workspace_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_kontakte_search ON public.kontakte USING gin(search_vector);
CREATE INDEX idx_kontakte_tags ON public.kontakte USING gin(tags);

COMMENT ON TABLE public.kontakte IS 'Universale Kontakt-Tabelle — Personen + Firmen';
COMMENT ON COLUMN public.kontakte.name IS 'Computed via Trigger: bei Person = Anrede+Titel+Vorname+Nachname, bei Firma = Firma';


-- ───────────────────────────────────────────────────────────────────────────
-- 3. KONTAKT-NAME-COMPUTE-TRIGGER
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_kontakt_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.typ IN ('firma','anwalt','versicherung','gericht','behoerde','sv_kollege','handwerker') 
       AND NEW.firma IS NOT NULL 
    THEN
        NEW.name := NEW.firma;
    ELSE
        NEW.name := TRIM(BOTH ' ' FROM 
            COALESCE(NEW.anrede || ' ', '') ||
            COALESCE(NEW.titel || ' ', '') ||
            COALESCE(NEW.vorname || ' ', '') ||
            COALESCE(NEW.nachname, '')
        );
        IF NEW.name = '' THEN
            NEW.name := COALESCE(NEW.firma, '(unbenannt)');
        END IF;
    END IF;
    
    -- Volltext-Vektor pflegen (Deutsch + Umlaut-tolerant)
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.firma, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.email, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.ort, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(NEW.notizen, '')), 'D');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kontakte_compute_name 
    BEFORE INSERT OR UPDATE ON public.kontakte
    FOR EACH ROW EXECUTE FUNCTION public.compute_kontakt_name();

CREATE TRIGGER trg_kontakte_updated_at BEFORE UPDATE ON public.kontakte
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 4. AZ-SEQUENCES — Aktenzeichen-Counter pro Workspace + Typ + Jahr
-- 
-- Eigene Tabelle damit der Counter race-condition-safe ist.
-- generate_az() macht UPSERT mit Row-Lock.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.az_sequences (
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    typ                         auftrag_typ NOT NULL,
    jahr                        INTEGER NOT NULL,
    counter                     INTEGER NOT NULL DEFAULT 0,
    
    PRIMARY KEY (workspace_id, typ, jahr)
);


-- ───────────────────────────────────────────────────────────────────────────
-- 5. AZ-GENERATOR FUNCTION
-- 
-- Aufruf: SELECT generate_az('<workspace_id>', 'kurzstellungnahme'::auftrag_typ);
-- Liefert z.B.: 'KSN-2026-007'
-- 
-- Race-condition-safe via UPSERT mit Row-Lock.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_az(
    p_workspace_id UUID,
    p_typ auftrag_typ,
    p_jahr INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_counter   INTEGER;
    v_prefix    TEXT;
BEGIN
    -- Prefix-Mapping
    v_prefix := CASE p_typ
        WHEN 'schaden'           THEN 'SCH'
        WHEN 'beweis'            THEN 'BEW'
        WHEN 'ergaenzung'        THEN 'ERG'
        WHEN 'gegen'             THEN 'GEG'
        WHEN 'kurzstellungnahme' THEN 'KSN'
        WHEN 'wertgutachten'     THEN 'WG'
        WHEN 'beratung'          THEN 'BER'
        WHEN 'baubegleitung'     THEN 'BB'
        WHEN 'schied'            THEN 'SCG'
        WHEN 'gericht'           THEN 'GG'
    END;
    
    -- UPSERT mit Increment, Row-Lock garantiert Atomarität
    INSERT INTO public.az_sequences (workspace_id, typ, jahr, counter)
    VALUES (p_workspace_id, p_typ, p_jahr, 1)
    ON CONFLICT (workspace_id, typ, jahr) DO UPDATE
        SET counter = az_sequences.counter + 1
    RETURNING counter INTO v_counter;
    
    -- Format: PREFIX-YYYY-NNN
    RETURN v_prefix || '-' || p_jahr::TEXT || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_az IS 'Race-condition-safe AZ-Generator. Liefert z.B. KSN-2026-007.';


-- ───────────────────────────────────────────────────────────────────────────
-- 6. AUFTRAEGE — DIE zentrale Tabelle (universal für alle Typen)
-- 
-- Strategie: Gemeinsame Felder als Spalten, typ-spezifische Felder in JSONB.
-- Volltext-Suche über alles via TSVECTOR-Index.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.auftraege (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Kern-Identifikation
    typ                         auftrag_typ NOT NULL,
    az                          TEXT NOT NULL,                 -- generiert via generate_az()
    
    status                      auftrag_status NOT NULL DEFAULT 'entwurf',
    zweck                       auftrag_zweck DEFAULT 'privat',
    
    -- Phasen-Tracking
    phase_aktuell               INTEGER NOT NULL DEFAULT 1,
    phase_max                   INTEGER NOT NULL DEFAULT 3,    -- 9 für Schaden, 3 für Beratung etc.
    
    -- Titel & Fragestellung
    titel                       TEXT,                          -- Kurzbezeichnung für Listen
    schadensart_label           TEXT,                          -- z.B. "Parkettfehler nach Neuverlegung"
    schadensart_kategorie       TEXT,                          -- z.B. "feuchte" / "rissbildung"
    
    fragestellung               TEXT,                          -- Zentrale Frage (Phase 1)
    
    -- Termine
    schadensstichtag            DATE,
    auftragsdatum               DATE,
    gutachtendatum              DATE,
    abgeschlossen_am            TIMESTAMPTZ,
    
    -- Objekt (JSONB strukturiert)
    objekt                      JSONB DEFAULT '{}'::jsonb,
    -- { adresse, plz, ort, land,
    --   objektart, objektart_label,
    --   baujahr, wohnflaeche, grundstuecksflaeche,
    --   bauweise, schadensort,
    --   beschreibung,
    --   geo_lat, geo_lng }
    
    -- Typ-spezifische Details (JSONB flexibel)
    details                     JSONB DEFAULT '{}'::jsonb,
    -- Bei Schaden:    { schadensbild, schadensumfang, vorgeschichte, ... }
    -- Bei Wertgut.:   { verfahren, bewertungsstichtag, sachwert, vergleichswert, ertragswert, verkehrswert }
    -- Bei Beratung:   { beratungstyp, dauer_minuten, abrechnungsmodell }
    -- Bei Baubegl.:   { bauphasen, gewerkliste, terminzyklus }
    -- Bei Gericht:    { gericht_name, gericht_az, beweisbeschluss_datum, beweisbeschluss_text }
    
    -- IHK-SVO Teil 4: SV-Eigenleistung & KI-Compliance
    fachurteil_text             TEXT,                          -- KI-FREI! SV schreibt selbst
    fachurteil_eigenleistung_chars  INTEGER,                   -- für Compliance (min 500)
    
    kurzbeantwortung            TEXT,                          -- Teil 4.1
    grenzen_sachkunde           TEXT,                          -- Teil 4.1 Hinweis
    
    -- Kosten-Schätzung
    kosten_geschaetzt_netto     NUMERIC(12,2),
    kosten_geschaetzt_brutto    NUMERIC(12,2),
    kosten_summe_card_label     TEXT,                          -- z.B. "Geschätzter Sanierungsaufwand"
    
    -- KI-Anzeige (§ 407a Abs. 3 ZPO, EU AI Act Art. 50)
    ki_anzeige_datum            DATE,
    ki_anzeige_empfaenger       TEXT,
    ki_tasks                    JSONB DEFAULT '{}'::jsonb,     -- { gpt: [...], whisper: [...] }
    hilfskraefte                JSONB DEFAULT '[]'::jsonb,
    
    -- Verkettung (für Ergänzungs-/Gegengutachten)
    parent_auftrag_id           UUID REFERENCES public.auftraege(id),
    
    -- Umfang-Stats (für Deckblatt)
    umfang_seiten               INTEGER,
    umfang_anlagen              INTEGER DEFAULT 0,
    umfang_fotos                INTEGER DEFAULT 0,
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    
    -- Tags/Flags
    tags                        TEXT[] DEFAULT '{}',
    is_template                 BOOLEAN NOT NULL DEFAULT FALSE,    -- Vorlagen-Flag
    
    -- Zuständigkeit
    created_by_user_id          UUID REFERENCES public.users(id),
    assigned_to_user_id         UUID REFERENCES public.users(id),
    
    -- Meta
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archiviert_am               TIMESTAMPTZ,
    deleted_at                  TIMESTAMPTZ,
    
    UNIQUE (workspace_id, az)
);

-- Performance-Indices
CREATE INDEX idx_auftraege_workspace_status ON public.auftraege(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_auftraege_workspace_typ ON public.auftraege(workspace_id, typ) WHERE deleted_at IS NULL;
CREATE INDEX idx_auftraege_az ON public.auftraege(workspace_id, az);
CREATE INDEX idx_auftraege_assigned ON public.auftraege(assigned_to_user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_auftraege_phase_aktiv ON public.auftraege(workspace_id, phase_aktuell, status) 
    WHERE status = 'aktiv' AND deleted_at IS NULL;
CREATE INDEX idx_auftraege_search ON public.auftraege USING gin(search_vector);
CREATE INDEX idx_auftraege_tags ON public.auftraege USING gin(tags);
CREATE INDEX idx_auftraege_objekt ON public.auftraege USING gin(objekt);
CREATE INDEX idx_auftraege_parent ON public.auftraege(parent_auftrag_id) WHERE parent_auftrag_id IS NOT NULL;

COMMENT ON TABLE public.auftraege IS 'Universale Auftrag-Tabelle — alle 10 Typen mit JSONB für typ-spezifische Felder';
COMMENT ON COLUMN public.auftraege.fachurteil_text IS 'KI-FREI! SV schreibt persönlich. Compliance via fachurteil_eigenleistung_chars (min 500)';


-- ───────────────────────────────────────────────────────────────────────────
-- 7. AUFTRAG-SEARCH-VECTOR-TRIGGER
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_auftrag_search()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.az, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.titel, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.fragestellung, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.schadensart_label, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(NEW.kurzbeantwortung, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(NEW.objekt->>'adresse', '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(NEW.objekt->>'beschreibung', '')), 'D');
    
    -- Eigenleistung automatisch tracken
    IF NEW.fachurteil_text IS NOT NULL THEN
        NEW.fachurteil_eigenleistung_chars := length(NEW.fachurteil_text);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auftraege_search 
    BEFORE INSERT OR UPDATE ON public.auftraege
    FOR EACH ROW EXECUTE FUNCTION public.update_auftrag_search();

CREATE TRIGGER trg_auftraege_updated_at BEFORE UPDATE ON public.auftraege
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 8. AUFTRAG-KONTAKTE — M:N mit Rollen
-- 
-- Ein Auftrag kann mehrere Kontakte mit verschiedenen Rollen haben.
-- Beispiel: Schadensauftrag mit Auftraggeber, Geschädigter, Anwalt-Kläger,
--           Versicherung-Beklagter, SV-Gegner.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.auftrag_kontakte (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    kontakt_id                  UUID NOT NULL REFERENCES public.kontakte(id) ON DELETE CASCADE,
    
    rolle                       kontakt_rolle NOT NULL,
    ist_primaer                 BOOLEAN NOT NULL DEFAULT FALSE,    -- z.B. Haupt-Auftraggeber bei mehreren
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    notiz                       TEXT,                              -- z.B. "Vertretungsbevollmächtigt"
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (auftrag_id, kontakt_id, rolle)
);

CREATE INDEX idx_auftrag_kontakte_auftrag ON public.auftrag_kontakte(auftrag_id, rolle);
CREATE INDEX idx_auftrag_kontakte_kontakt ON public.auftrag_kontakte(kontakt_id);

COMMENT ON TABLE public.auftrag_kontakte IS 'M:N — ein Auftrag kann mehrere Kontakte mit verschiedenen Rollen haben';


-- ───────────────────────────────────────────────────────────────────────────
-- 9. AUFTRAG-PHASEN — Phase-Tracking pro Auftrag
-- 
-- Bei Schaden 9 Phasen, bei Beratung 3, bei Bauerl. 3+. Skip-Logik möglich.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.auftrag_phasen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    phase_nr                    INTEGER NOT NULL,
    phase_label                 TEXT,                              -- z.B. "Stammdaten" / "Diktat" / "Fachurteil"
    
    status                      phase_status NOT NULL DEFAULT 'offen',
    
    started_at                  TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    skip_reason                 TEXT,                              -- bei status='uebersprungen'
    
    -- Phase-spezifischer State (z.B. Auto-Save-Daten)
    state                       JSONB DEFAULT '{}'::jsonb,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (auftrag_id, phase_nr)
);

CREATE INDEX idx_auftrag_phasen_auftrag ON public.auftrag_phasen(auftrag_id, phase_nr);
CREATE INDEX idx_auftrag_phasen_status ON public.auftrag_phasen(status, auftrag_id);

CREATE TRIGGER trg_auftrag_phasen_updated_at BEFORE UPDATE ON public.auftrag_phasen
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 10. ORTSTERMINE — strukturierte Ortstermin-Dokumentation
-- 
-- Ein Auftrag kann mehrere Ortstermine haben (z.B. Baubegleitung).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.ortstermine (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    nr                          INTEGER NOT NULL DEFAULT 1,        -- 1, 2, 3 bei mehreren Terminen
    
    datum                       DATE NOT NULL,
    uhrzeit                     TIME,
    dauer_minuten               INTEGER,
    ort                         TEXT,                              -- konkrete Adresse falls abweichend
    
    -- Anwesende als strukturierte Liste
    anwesende                   JSONB DEFAULT '[]'::jsonb,
    -- [{ name: "Frau Müller", rolle: "Eigentümerin" }, ...]
    
    -- Wetter/Klima (für Bau-Kontext relevant)
    wetter                      TEXT,
    temperatur_aussen           TEXT,                              -- TEXT damit "18 °C" möglich ist
    temperatur_innen            TEXT,
    luftfeuchte                 TEXT,
    
    -- Ablauf
    ablauf                      TEXT,
    notizen                     TEXT,
    
    -- Meta
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ortstermine_auftrag ON public.ortstermine(auftrag_id, nr);
CREATE INDEX idx_ortstermine_workspace_datum ON public.ortstermine(workspace_id, datum DESC);

CREATE TRIGGER trg_ortstermine_updated_at BEFORE UPDATE ON public.ortstermine
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 11. ANKNUEPFUNGSTATSACHEN — Quellen-Liste pro Auftrag
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.anknuepfungstatsachen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    nr                          INTEGER NOT NULL DEFAULT 0,
    quelle                      TEXT NOT NULL,                     -- "Klageschrift RA Holmann"
    inhalt                      TEXT,                              -- Was steht drin
    datum                       TEXT,                              -- TEXT für Flexibilität "03.06.–01.09.2024"
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anknuepfungstatsachen_auftrag ON public.anknuepfungstatsachen(auftrag_id, nr);


-- ───────────────────────────────────────────────────────────────────────────
-- 12. BEFUNDE — strukturierte Befund-Liste mit Norm-Bezug
-- 
-- Phase 3.1 in IHK-SVO: jeder Befund ist eine Karte mit Titel, Text, Norm.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.befunde (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    nr                          INTEGER NOT NULL,
    titel                       TEXT NOT NULL,
    text                        TEXT,
    norm_ref                    TEXT,                              -- "DIN 55699; Herstellerrichtlinie X-Bau"
    
    beweisfrage_ref             TEXT,                              -- bei Gerichtsgutachten: "Beweisfrage 2"
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_befunde_auftrag ON public.befunde(auftrag_id, reihenfolge);

CREATE TRIGGER trg_befunde_updated_at BEFORE UPDATE ON public.befunde
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 13. MESSWERTE — strukturierte Messwerte mit Norm-Vergleich
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.messwerte (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    nr                          INTEGER NOT NULL DEFAULT 0,
    
    ort                         TEXT NOT NULL,                     -- Messstelle
    parameter                   TEXT,                              -- Was gemessen
    wert                        TEXT,                              -- TEXT damit "132 mm (Soll: 140 mm)" möglich
    norm                        TEXT,                              -- Grenzwert/Vergleich
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messwerte_auftrag ON public.messwerte(auftrag_id, reihenfolge);


-- ───────────────────────────────────────────────────────────────────────────
-- 14. MESSGERAETE — verwendete Messgeräte mit Kalibrierung
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.messgeraete (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    geraet                      TEXT NOT NULL,                     -- "Testo 876 Wärmebildkamera"
    kalibrierung                TEXT,                              -- "Werkskalibrierung 02/2026"
    genauigkeit                 TEXT,
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messgeraete_auftrag ON public.messgeraete(auftrag_id, reihenfolge);


-- ───────────────────────────────────────────────────────────────────────────
-- 15. URSACHEN-HYPOTHESEN — Konjunktiv-II-Pflicht (Halluzinationsverbot)
-- 
-- Phase 3.2 IHK-SVO. ALLE Hypothesen MÜSSEN in Konjunktiv II geschrieben sein.
-- Wird via Compliance-Check beim Speichern geprüft (im Frontend/Edge Function).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.ursachen_hypothesen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    nr                          INTEGER NOT NULL DEFAULT 0,
    prioritaet                  ursache_prioritaet NOT NULL DEFAULT 'alternativ',
    
    titel                       TEXT NOT NULL,
    wahrscheinlichkeit_label    TEXT,                              -- "Hoch" / "Gering" / "Ausgeschlossen"
    text                        TEXT NOT NULL,                     -- IM KONJUNKTIV II!
    
    -- Compliance-Marker
    konjunktiv_check_passed     BOOLEAN,                           -- via Compliance-Check gesetzt
    konjunktiv_check_at         TIMESTAMPTZ,
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ursachen_auftrag ON public.ursachen_hypothesen(auftrag_id, prioritaet, reihenfolge);

CREATE TRIGGER trg_ursachen_updated_at BEFORE UPDATE ON public.ursachen_hypothesen
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 16. SANIERUNGSPOSITIONEN — Kostenrahmen mit Pos-Nr + EP + Summe
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.sanierungspositionen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    pos_nr                      INTEGER NOT NULL,
    bezeichnung                 TEXT NOT NULL,
    
    menge                       NUMERIC(12,2),
    einheit                     TEXT,                              -- "lfm" / "m²" / "Stück" / "psch"
    
    ep_netto                    NUMERIC(12,2),
    summe_netto                 NUMERIC(12,2),                     -- = menge * ep_netto (computed in Frontend)
    
    -- DATEV-Vorbereitung (Stufe 1)
    datev_konto                 TEXT,
    datev_kostenstelle          TEXT,
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sanierung_auftrag ON public.sanierungspositionen(auftrag_id, pos_nr);

CREATE TRIGGER trg_sanierung_updated_at BEFORE UPDATE ON public.sanierungspositionen
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 17. NORMEN — verwendete Normen pro Auftrag (Teil 5 IHK-SVO)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.auftrag_normen (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    
    nr                          TEXT NOT NULL,                     -- "DIN 55699 (2018-04)" / "§ 407a Abs. 2 ZPO"
    titel                       TEXT,
    gw                          TEXT,                              -- Grenzwerte/Beschreibung
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_normen_auftrag ON public.auftrag_normen(auftrag_id, reihenfolge);


-- ───────────────────────────────────────────────────────────────────────────
-- 18. EINTRAEGE — Diktat-Sammlungen (besonders Baubegleitung)
-- 
-- Bei Baubegleitung: pro Vor-Ort-Termin ein Eintrag mit Diktat + Foto.
-- Bei Schaden: ein Eintrag pro Diktat-Session.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TYPE eintrag_typ AS ENUM ('diktat', 'text', 'foto', 'mix');

CREATE TABLE public.eintraege (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    auftrag_id                  UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
    ortstermin_id               UUID REFERENCES public.ortstermine(id) ON DELETE SET NULL,
    
    typ                         eintrag_typ NOT NULL DEFAULT 'text',
    nr                          INTEGER NOT NULL DEFAULT 0,
    
    datum                       DATE NOT NULL DEFAULT CURRENT_DATE,
    titel                       TEXT,
    
    content                     TEXT,                              -- Volltext
    
    -- Audio-Diktat-Verknüpfung (Phase 3 wird audio_dateien-Tabelle anlegen)
    audio_dateien_ids           UUID[] DEFAULT '{}',
    
    -- Foto-Verknüpfung (Phase 3 wird fotos-Tabelle anlegen)
    foto_ids                    UUID[] DEFAULT '{}',
    
    -- DSGVO + Halluzinations-Check
    pseudonymisiert             BOOLEAN NOT NULL DEFAULT FALSE,
    konjunktiv_check_passed     BOOLEAN,
    
    -- Volltext-Suche
    search_vector               TSVECTOR,
    
    -- Meta
    created_by_user_id          UUID REFERENCES public.users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eintraege_auftrag ON public.eintraege(auftrag_id, datum DESC);
CREATE INDEX idx_eintraege_search ON public.eintraege USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.update_eintrag_search()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.titel, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_eintraege_search BEFORE INSERT OR UPDATE ON public.eintraege
    FOR EACH ROW EXECUTE FUNCTION public.update_eintrag_search();

CREATE TRIGGER trg_eintraege_updated_at BEFORE UPDATE ON public.eintraege
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) für alle Phase-2-Tabellen
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Pattern: workspace_id IN (SELECT public.get_user_workspaces())
-- Plus Founder-Bypass für Cockpit
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── KONTAKTE ──────────────────────────────────────────────────────────────
ALTER TABLE public.kontakte ENABLE ROW LEVEL SECURITY;

CREATE POLICY kontakte_select ON public.kontakte FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

CREATE POLICY kontakte_insert ON public.kontakte FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

CREATE POLICY kontakte_update ON public.kontakte FOR UPDATE
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

CREATE POLICY kontakte_delete ON public.kontakte FOR DELETE
USING (workspace_id IN (SELECT public.get_user_workspaces()) AND 
       public.has_role(workspace_id, 'admin'));


-- ─── AZ_SEQUENCES ──────────────────────────────────────────────────────────
ALTER TABLE public.az_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY az_sequences_select ON public.az_sequences FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

-- INSERT/UPDATE läuft via SECURITY DEFINER Function generate_az() — kein Direct-Access nötig


-- ─── AUFTRAEGE ─────────────────────────────────────────────────────────────
ALTER TABLE public.auftraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY auftraege_select ON public.auftraege FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

CREATE POLICY auftraege_insert ON public.auftraege FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

CREATE POLICY auftraege_update ON public.auftraege FOR UPDATE
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));

CREATE POLICY auftraege_delete ON public.auftraege FOR DELETE
USING (workspace_id IN (SELECT public.get_user_workspaces()) AND 
       public.has_role(workspace_id, 'admin'));


-- ─── AUFTRAG_KONTAKTE ──────────────────────────────────────────────────────
ALTER TABLE public.auftrag_kontakte ENABLE ROW LEVEL SECURITY;

CREATE POLICY ak_select ON public.auftrag_kontakte FOR SELECT
USING (auftrag_id IN (
    SELECT id FROM public.auftraege 
    WHERE workspace_id IN (SELECT public.get_user_workspaces())
) OR public.is_founder());

CREATE POLICY ak_insert ON public.auftrag_kontakte FOR INSERT
WITH CHECK (auftrag_id IN (
    SELECT id FROM public.auftraege 
    WHERE workspace_id IN (SELECT public.get_user_workspaces())
));

CREATE POLICY ak_update ON public.auftrag_kontakte FOR UPDATE
USING (auftrag_id IN (
    SELECT id FROM public.auftraege 
    WHERE workspace_id IN (SELECT public.get_user_workspaces())
));

CREATE POLICY ak_delete ON public.auftrag_kontakte FOR DELETE
USING (auftrag_id IN (
    SELECT id FROM public.auftraege 
    WHERE workspace_id IN (SELECT public.get_user_workspaces())
));


-- ─── AUFTRAG_PHASEN ────────────────────────────────────────────────────────
ALTER TABLE public.auftrag_phasen ENABLE ROW LEVEL SECURITY;

CREATE POLICY phasen_select ON public.auftrag_phasen FOR SELECT
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())) OR public.is_founder());

CREATE POLICY phasen_modify ON public.auftrag_phasen FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));


-- ─── ORTSTERMINE ───────────────────────────────────────────────────────────
ALTER TABLE public.ortstermine ENABLE ROW LEVEL SECURITY;

CREATE POLICY ortstermine_select ON public.ortstermine FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

CREATE POLICY ortstermine_modify ON public.ortstermine FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()))
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));


-- ─── REST DER PHASE-2-TABELLEN (Pattern: über auftrag_id) ─────────────────

ALTER TABLE public.anknuepfungstatsachen ENABLE ROW LEVEL SECURITY;
CREATE POLICY at_all ON public.anknuepfungstatsachen FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));

ALTER TABLE public.befunde ENABLE ROW LEVEL SECURITY;
CREATE POLICY befunde_all ON public.befunde FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));

ALTER TABLE public.messwerte ENABLE ROW LEVEL SECURITY;
CREATE POLICY messwerte_all ON public.messwerte FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));

ALTER TABLE public.messgeraete ENABLE ROW LEVEL SECURITY;
CREATE POLICY messgeraete_all ON public.messgeraete FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));

ALTER TABLE public.ursachen_hypothesen ENABLE ROW LEVEL SECURITY;
CREATE POLICY ursachen_all ON public.ursachen_hypothesen FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));

ALTER TABLE public.sanierungspositionen ENABLE ROW LEVEL SECURITY;
CREATE POLICY sanierung_all ON public.sanierungspositionen FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));

ALTER TABLE public.auftrag_normen ENABLE ROW LEVEL SECURITY;
CREATE POLICY normen_all ON public.auftrag_normen FOR ALL
USING (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())))
WITH CHECK (auftrag_id IN (SELECT id FROM public.auftraege WHERE workspace_id IN (SELECT public.get_user_workspaces())));

ALTER TABLE public.eintraege ENABLE ROW LEVEL SECURITY;
CREATE POLICY eintraege_all ON public.eintraege FOR ALL
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder())
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));


-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS für 360°-Sichten (Cockpit, Kontakt-Detail-Page)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 360°-View: Auftrag mit allen Detail-Counts ────────────────────────────
CREATE OR REPLACE VIEW public.v_auftraege_overview AS
SELECT 
    a.id,
    a.workspace_id,
    a.az,
    a.typ,
    a.status,
    a.titel,
    a.schadensart_label,
    a.phase_aktuell,
    a.phase_max,
    a.created_at,
    a.updated_at,
    
    -- Beziehungs-Counts
    (SELECT COUNT(*) FROM public.befunde WHERE auftrag_id = a.id)               AS befunde_count,
    (SELECT COUNT(*) FROM public.messwerte WHERE auftrag_id = a.id)             AS messwerte_count,
    (SELECT COUNT(*) FROM public.ortstermine WHERE auftrag_id = a.id)           AS ortstermine_count,
    (SELECT COUNT(*) FROM public.eintraege WHERE auftrag_id = a.id)             AS eintraege_count,
    (SELECT COUNT(*) FROM public.sanierungspositionen WHERE auftrag_id = a.id)  AS sanierung_count,
    
    -- Auftraggeber (primärer)
    (SELECT k.name 
     FROM public.auftrag_kontakte ak
     JOIN public.kontakte k ON ak.kontakt_id = k.id
     WHERE ak.auftrag_id = a.id 
       AND ak.rolle = 'auftraggeber'
     ORDER BY ak.ist_primaer DESC, ak.reihenfolge
     LIMIT 1)                                                                    AS auftraggeber_name,
    
    -- Objekt-Anschrift
    a.objekt->>'adresse'                                                         AS objekt_adresse
FROM public.auftraege a
WHERE a.deleted_at IS NULL;


-- ─── 360°-View: Kontakt mit allen Verknüpfungen ────────────────────────────
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
    
    -- Auftrags-Counts pro Rolle
    (SELECT COUNT(*) FROM public.auftrag_kontakte WHERE kontakt_id = k.id AND rolle = 'auftraggeber')        AS als_auftraggeber_count,
    (SELECT COUNT(*) FROM public.auftrag_kontakte WHERE kontakt_id = k.id AND rolle = 'geschaedigter')       AS als_geschaedigter_count,
    (SELECT COUNT(*) FROM public.auftrag_kontakte WHERE kontakt_id = k.id)                                   AS auftraege_total,
    
    -- Letzter Auftrag
    (SELECT MAX(a.created_at) 
     FROM public.auftrag_kontakte ak
     JOIN public.auftraege a ON ak.auftrag_id = a.id
     WHERE ak.kontakt_id = k.id)                                                                              AS letzter_auftrag_am,
    
    k.created_at,
    k.updated_at
FROM public.kontakte k
WHERE k.deleted_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFIKATIONS-QUERIES (zum Testen nach Run)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Phase-2-Tabellen (15 neue):
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--   Erwartet (insgesamt 21 Tabellen):
--     audit_trail, anknuepfungstatsachen, auftraege, auftrag_kontakte,
--     auftrag_normen, auftrag_phasen, az_sequences, befunde, eintraege,
--     kontakte, messgeraete, messwerte, notifications, ortstermine,
--     sanierungspositionen, ursachen_hypothesen, user_sessions, users,
--     workspace_memberships, workspaces
-- 
-- Test des AZ-Generators:
--   SELECT public.generate_az(
--     (SELECT id FROM public.workspaces LIMIT 1),
--     'kurzstellungnahme'::auftrag_typ
--   );
--   Erwartet: 'KSN-2026-001' (oder höher)
-- 
-- Views funktionieren:
--   SELECT * FROM public.v_auftraege_overview LIMIT 1;
--   SELECT * FROM public.v_kontakte_overview LIMIT 1;
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- ENDE PHASE 2
-- 
-- Nächster Schritt: Phase 3 (Dokumente, Fotos, Audio, Anhänge, Termine, 
-- Notizen, Storage-Buckets-Setup)
-- ═══════════════════════════════════════════════════════════════════════════
