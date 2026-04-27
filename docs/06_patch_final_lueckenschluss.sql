-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Patch 06: Final-Lückenschluss + Forced Re-Consent
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Inhalt:        7 fehlende Tabellen + AVV/AGB-Workflow (DSGVO Art. 7)
-- Voraussetzung: Phase 1+2+3+4 + Patch 05 ausgeführt
-- 
-- AUSFÜHRUNG:    SQL-Editor → New Query → einfügen → Run
--                Erfolg: "Success. No rows returned"
-- 
-- INHALTSVERZEICHNIS:
--   §1  ENUMs für Patch 06
--   §2  stripe_events (Webhook-Idempotenz)
--   §3  email_log (Email-Versand-Tracking)
--   §4  workspace_invitations (Team-Einladungen)
--   §5  onboarding_progress (User-Aktivierung + Einwilligungs-Status)
--   §6  api_keys (Externe Integrationen)
--   §7  tags_global (Zentrale Tag-Bibliothek)
--   §8  bookmarks (Favoriten / Pin-System)
--   §9  Forced-Re-Consent-Workflow (AGB/DSE/AVV)
--   §10 Helper-Functions
--   §11 Row-Level-Security
--   §12 Trigger für Auto-Notification bei neuen Rechtsdokumenten
--   §13 Verifikations-Hinweise
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 ENUMs
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE stripe_event_status AS ENUM (
    'empfangen', 'verarbeitet', 'verarbeitung_fehler', 'ignoriert', 'duplikat'
);

CREATE TYPE email_status AS ENUM (
    'queued', 'gesendet', 'zugestellt', 'gelesen', 'angeklickt',
    'gebounced_hard', 'gebounced_soft', 'spam_complaint', 'fehler'
);

CREATE TYPE invitation_status AS ENUM (
    'offen', 'akzeptiert', 'abgelehnt', 'abgelaufen', 'zurueckgezogen'
);

CREATE TYPE api_key_scope AS ENUM (
    'read_only',           -- nur GET
    'standard',            -- CRUD auf eigene Daten
    'admin',               -- inkl. Settings
    'webhook_only',        -- nur Webhook-Endpoint
    'integration_versicherung'  -- Versicherungs-API-Use-Case
);


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 STRIPE_EVENTS — Webhook-Idempotenz + Audit
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Bei JEDEM Stripe-Webhook landet hier ein Eintrag.
-- UNIQUE(stripe_event_id) verhindert Doppelt-Verarbeitung.
-- Bei Bug: Event kann manuell neu verarbeitet werden.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.stripe_events (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Eindeutige Stripe-Event-ID (Stripe sendet ggf. mehrfach!)
    stripe_event_id             TEXT NOT NULL UNIQUE,
    event_type                  TEXT NOT NULL,                     -- "invoice.payment_succeeded"
    livemode                    BOOLEAN NOT NULL DEFAULT FALSE,
    api_version                 TEXT,
    
    -- Verknüpfung
    stripe_customer_id          TEXT,
    stripe_subscription_id      TEXT,
    stripe_invoice_id           TEXT,
    stripe_payment_intent_id    TEXT,
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    
    -- Daten
    raw_payload                 JSONB NOT NULL,                    -- komplettes Stripe-Payload
    relevante_daten             JSONB,                             -- extrahierte Felder
    
    -- Verarbeitung
    status                      stripe_event_status NOT NULL DEFAULT 'empfangen',
    verarbeitet_at              TIMESTAMPTZ,
    verarbeitung_dauer_ms       INTEGER,
    verarbeitung_fehler         TEXT,
    
    -- Auswirkung
    auswirkung_beschreibung     TEXT,                              -- "abo_status auf aktiv gesetzt"
    affected_workspace_ids      UUID[],
    
    -- Retry
    retry_count                 INTEGER NOT NULL DEFAULT 0,
    naechster_retry_at          TIMESTAMPTZ,
    
    -- Stripe-Timestamps
    stripe_created_at           TIMESTAMPTZ,
    received_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_type ON public.stripe_events(event_type, received_at DESC);
CREATE INDEX idx_stripe_events_customer ON public.stripe_events(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_stripe_events_workspace ON public.stripe_events(workspace_id, received_at DESC);
CREATE INDEX idx_stripe_events_pending ON public.stripe_events(received_at) WHERE status = 'empfangen';
CREATE INDEX idx_stripe_events_errors ON public.stripe_events(received_at DESC) WHERE status = 'verarbeitung_fehler';

COMMENT ON TABLE public.stripe_events IS 'Stripe-Webhook-Empfang. UNIQUE(stripe_event_id) verhindert Duplikate.';


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 EMAIL_LOG — Zentrales Email-Tracking
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.email_log (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    user_id                     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Empfänger
    empfaenger_email            TEXT NOT NULL,
    empfaenger_name             TEXT,
    
    -- Inhalt
    betreff                     TEXT NOT NULL,
    zweck                       TEXT NOT NULL,
    -- "transactional" / "rechnung" / "mahnung_1" / "newsletter" / "system_alert"
    -- "support_reply" / "termin_erinnerung" / "agb_aenderung" / etc.
    
    -- Verknüpfung zu Quelle
    verknuepft_dokument_id      UUID REFERENCES public.dokumente(id) ON DELETE SET NULL,
    verknuepft_ticket_id        UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
    verknuepft_termin_id        UUID REFERENCES public.termine(id) ON DELETE SET NULL,
    
    -- Status-Lifecycle
    status                      email_status NOT NULL DEFAULT 'queued',
    
    queued_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at                     TIMESTAMPTZ,
    delivered_at                TIMESTAMPTZ,
    opened_at                   TIMESTAMPTZ,
    clicked_at                  TIMESTAMPTZ,
    bounced_at                  TIMESTAMPTZ,
    complained_at               TIMESTAMPTZ,
    
    -- Provider-Info
    provider                    TEXT,                              -- "resend" / "ses" / "ionos_smtp"
    provider_message_id         TEXT,                              -- für Provider-API-Lookups
    
    -- Bounce/Complaint-Details
    bounce_typ                  TEXT,                              -- "hard" / "soft" / "permanent"
    bounce_grund                TEXT,
    
    -- Open-Tracking
    open_count                  INTEGER NOT NULL DEFAULT 0,
    click_count                 INTEGER NOT NULL DEFAULT 0,
    
    -- Inhalt-Hash (für DSGVO-Audit)
    inhalt_hash                 TEXT,
    
    fehler_message              TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_user ON public.email_log(user_id, sent_at DESC);
CREATE INDEX idx_email_log_workspace ON public.email_log(workspace_id, sent_at DESC);
CREATE INDEX idx_email_log_empfaenger ON public.email_log(empfaenger_email, sent_at DESC);
CREATE INDEX idx_email_log_status ON public.email_log(status, queued_at DESC);
CREATE INDEX idx_email_log_zweck ON public.email_log(zweck, sent_at DESC);
CREATE INDEX idx_email_log_provider_msg ON public.email_log(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_email_log_bounces ON public.email_log(empfaenger_email, bounced_at DESC) WHERE bounced_at IS NOT NULL;

CREATE TRIGGER trg_email_log_updated_at BEFORE UPDATE ON public.email_log
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.email_log IS 'Zentrales Email-Versand-Tracking: Bounces, Complaints, Open-Rates, SLA-Audit';


-- ═══════════════════════════════════════════════════════════════════════════
-- §4 WORKSPACE_INVITATIONS — Team-Einladungen
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.workspace_invitations (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    eingeladen_von_user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Empfänger
    empfaenger_email            TEXT NOT NULL,
    empfaenger_name             TEXT,
    
    -- Vorgeschlagene Rolle
    vorgeschlagene_rolle        member_rolle NOT NULL DEFAULT 'sv',
    
    -- Sicherheits-Token
    token                       TEXT NOT NULL UNIQUE DEFAULT (encode(gen_random_bytes(32), 'hex')),
    
    -- Lifecycle
    status                      invitation_status NOT NULL DEFAULT 'offen',
    versendet_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ablauf_at                   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    akzeptiert_at               TIMESTAMPTZ,
    akzeptiert_durch_user_id    UUID REFERENCES public.users(id),
    
    -- Persönliche Nachricht
    persoenliche_nachricht      TEXT,
    
    -- Tracking
    email_log_id                UUID REFERENCES public.email_log(id) ON DELETE SET NULL,
    erinnerungen_gesendet_count INTEGER NOT NULL DEFAULT 0,
    letzte_erinnerung_at        TIMESTAMPTZ,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_workspace ON public.workspace_invitations(workspace_id, status);
CREATE INDEX idx_invitations_email ON public.workspace_invitations(empfaenger_email, status);
CREATE INDEX idx_invitations_token ON public.workspace_invitations(token) WHERE status = 'offen';
CREATE INDEX idx_invitations_expiring ON public.workspace_invitations(ablauf_at) WHERE status = 'offen';

CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON public.workspace_invitations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.workspace_invitations IS 'Team-Einladungen mit Email-Token-Pattern. Token = sicheres 64-Zeichen-Hex.';


-- ═══════════════════════════════════════════════════════════════════════════
-- §5 ONBOARDING_PROGRESS — User-Aktivierung + Einwilligungs-Tracking
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Tracking welche Onboarding-Schritte ein User durchlaufen hat.
-- Inklusive Pflicht-Einwilligungen (AGB / DSE / AVV) — Marcel-Wunsch.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.onboarding_progress (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- ═══ EINWILLIGUNGEN (Pflicht für Aktivierung) ═══
    agb_zugestimmt_at           TIMESTAMPTZ,
    agb_version                 TEXT,
    agb_einwilligung_id         UUID REFERENCES public.einwilligungen(id),
    
    dse_zugestimmt_at           TIMESTAMPTZ,
    dse_version                 TEXT,
    dse_einwilligung_id         UUID REFERENCES public.einwilligungen(id),
    
    avv_zugestimmt_at           TIMESTAMPTZ,
    avv_version                 TEXT,
    avv_einwilligung_id         UUID REFERENCES public.einwilligungen(id),
    
    -- Computed: alle Pflicht-Einwilligungen abgegeben
    pflicht_einwilligungen_komplett BOOLEAN GENERATED ALWAYS AS (
        agb_zugestimmt_at IS NOT NULL 
        AND dse_zugestimmt_at IS NOT NULL 
        AND avv_zugestimmt_at IS NOT NULL
    ) STORED,
    
    -- ═══ AKTIVIERUNGS-MEILENSTEINE ═══
    schritt_1_profil_komplett_at        TIMESTAMPTZ,
    schritt_2_briefkopf_eingerichtet_at TIMESTAMPTZ,
    schritt_3_erster_kontakt_at         TIMESTAMPTZ,
    schritt_4_erster_auftrag_at         TIMESTAMPTZ,
    schritt_5_erstes_diktat_at          TIMESTAMPTZ,
    schritt_6_erstes_pdf_at             TIMESTAMPTZ,
    schritt_7_erste_rechnung_at         TIMESTAMPTZ,
    schritt_8_versendet_an_externe_at   TIMESTAMPTZ,
    
    -- Aktivierungs-Score (0-100)
    aktivierungs_score          INTEGER NOT NULL DEFAULT 0 CHECK (aktivierungs_score BETWEEN 0 AND 100),
    aktiviert                   BOOLEAN NOT NULL DEFAULT FALSE,
    aktiviert_at                TIMESTAMPTZ,
    
    -- Tour-Status
    welcome_tour_completed      BOOLEAN NOT NULL DEFAULT FALSE,
    welcome_tour_completed_at   TIMESTAMPTZ,
    
    -- Onboarding-Email-Sequenz
    welcome_email_gesendet_at   TIMESTAMPTZ,
    tag_3_email_gesendet_at     TIMESTAMPTZ,
    tag_7_email_gesendet_at     TIMESTAMPTZ,
    trial_endet_warnung_at      TIMESTAMPTZ,
    
    -- Hilfe-Anfragen
    erste_hilfe_anfrage_at      TIMESTAMPTZ,
    
    -- Drop-off-Tracking
    letzter_aktiver_schritt     INTEGER,                           -- 1-8
    drop_off_punkt              INTEGER,                           -- wo hat User aufgehört?
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onb_workspace ON public.onboarding_progress(workspace_id);
CREATE INDEX idx_onb_aktiviert ON public.onboarding_progress(aktiviert, created_at DESC);
CREATE INDEX idx_onb_pflicht ON public.onboarding_progress(pflicht_einwilligungen_komplett, created_at DESC);
CREATE INDEX idx_onb_drop_off ON public.onboarding_progress(drop_off_punkt) WHERE drop_off_punkt IS NOT NULL;

CREATE TRIGGER trg_onboarding_updated_at BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.onboarding_progress IS 'User-Aktivierung + Pflicht-Einwilligungen (AGB/DSE/AVV) tracking';


-- ═══════════════════════════════════════════════════════════════════════════
-- §6 API_KEYS — Externe Integrationen
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.api_keys (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    erstellt_von_user_id        UUID NOT NULL REFERENCES public.users(id),
    
    -- Key-Daten
    name                        TEXT NOT NULL,                     -- "Versicherungs-API VKB"
    beschreibung                TEXT,
    
    -- HASH des Keys (NIE Klartext speichern!)
    key_hash                    TEXT NOT NULL UNIQUE,
    key_prefix                  TEXT NOT NULL,                     -- erste 8 Zeichen für Anzeige
    
    -- Berechtigung
    scope                       api_key_scope NOT NULL DEFAULT 'read_only',
    erlaubte_endpoints          TEXT[],                            -- NULL = alle erlaubten
    
    -- Rate-Limiting
    rate_limit_pro_minute       INTEGER NOT NULL DEFAULT 60,
    rate_limit_pro_tag          INTEGER NOT NULL DEFAULT 10000,
    
    -- IP-Whitelist (optional)
    ip_whitelist                INET[],
    
    -- Lifecycle
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    ablauf_at                   TIMESTAMPTZ,                       -- NULL = nie
    deaktiviert_at              TIMESTAMPTZ,
    deaktiviert_grund           TEXT,
    
    -- Nutzung
    letzter_call_at             TIMESTAMPTZ,
    calls_total                 INTEGER NOT NULL DEFAULT 0,
    calls_heute                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_workspace ON public.api_keys(workspace_id, aktiv);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE aktiv = TRUE;
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX idx_api_keys_expiring ON public.api_keys(ablauf_at) WHERE aktiv = TRUE AND ablauf_at IS NOT NULL;

CREATE TRIGGER trg_api_keys_updated_at BEFORE UPDATE ON public.api_keys
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.api_keys IS 'API-Keys fuer externe Integrationen. NIE Klartext speichern, nur Hash.';


-- ═══════════════════════════════════════════════════════════════════════════
-- §7 TAGS_GLOBAL — Zentrale Tag-Bibliothek mit Farben
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.tags_global (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- NULL workspace_id = globaler Tag (System)
    
    name                        TEXT NOT NULL,
    name_normalized             TEXT GENERATED ALWAYS AS (lower(unaccent(name))) STORED,
    
    -- Visual
    farbe_hex                   TEXT DEFAULT '#64748b',            -- Default: muted gray
    icon                        TEXT,                              -- z.B. "alert-triangle"
    
    -- Kategorie (für Filter)
    kategorie                   TEXT,                              -- "prioritaet" / "status" / "art" / "kunde"
    
    -- Beschreibung
    beschreibung                TEXT,
    
    -- Wofür nutzbar?
    fuer_auftraege              BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_kontakte               BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_dokumente              BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_termine                BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_notizen                BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- System-Flag (von Marcel kuratiert, von SVs nicht löschbar)
    is_global                   BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Nutzung
    nutzungen_count             INTEGER NOT NULL DEFAULT 0,
    
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (workspace_id, name_normalized)
);

CREATE INDEX idx_tags_workspace ON public.tags_global(workspace_id, kategorie) WHERE aktiv = TRUE;
CREATE INDEX idx_tags_global ON public.tags_global(is_global, kategorie) WHERE is_global = TRUE AND aktiv = TRUE;
CREATE INDEX idx_tags_search ON public.tags_global(name_normalized);

CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON public.tags_global
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.tags_global IS 'Zentrale Tag-Bibliothek mit Farben und Auto-Complete';


-- ═══════════════════════════════════════════════════════════════════════════
-- §8 BOOKMARKS — Favoriten / Pin-System
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.bookmarks (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Was wird gepinnt?
    entity_typ                  TEXT NOT NULL,                     -- "auftrag" / "kontakt" / "dokument" / "norm" / "termin"
    entity_id                   UUID NOT NULL,
    
    -- Custom-Label (optional)
    custom_label                TEXT,
    notiz                       TEXT,
    
    -- Sortierung
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    
    -- Cockpit-Pin (im Dashboard sichtbar)
    pin_im_cockpit              BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (user_id, entity_typ, entity_id)
);

CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id, entity_typ, reihenfolge);
CREATE INDEX idx_bookmarks_cockpit ON public.bookmarks(user_id, reihenfolge) WHERE pin_im_cockpit = TRUE;
CREATE INDEX idx_bookmarks_entity ON public.bookmarks(entity_typ, entity_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- §9 FORCED-RE-CONSENT-WORKFLOW — Marcel-Wunsch
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Wenn neue Version eines Rechtsdokuments aktuell wird:
--   → Beim nächsten Login zeigt Frontend Popup
--   → User MUSS zustimmen bevor weiter
--   → Audit-Eintrag wird gespeichert
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 9.1 View: pending_einwilligungen pro User
-- 
-- Liefert für jeden User: welche aktuellen Pflicht-Dokumente
-- hat er noch nicht (oder mit veralteter Version) zugestimmt?
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_user_pending_einwilligungen AS
WITH pflicht_typen AS (
    SELECT unnest(ARRAY['agb', 'datenschutzerklaerung', 'avv']::rechtsdoc_typ[]) AS typ
),
aktuelle_dokumente AS (
    SELECT DISTINCT ON (typ)
        id, typ, version, inhalt_hash, gueltig_ab
    FROM public.rechtsdokumente
    WHERE aktuell = TRUE
      AND gueltig_ab <= NOW()
      AND (gueltig_bis IS NULL OR gueltig_bis > NOW())
    ORDER BY typ, gueltig_ab DESC
)
SELECT 
    u.id AS user_id,
    u.email,
    pt.typ AS pflicht_typ,
    ad.id AS aktuelle_rechtsdokument_id,
    ad.version AS aktuelle_version,
    ad.inhalt_hash AS aktueller_hash,
    
    -- Wann hat User zuletzt diesem Typ zugestimmt?
    (SELECT MAX(e.erteilt_at) 
     FROM public.einwilligungen e
     WHERE e.user_id = u.id 
       AND e.typ::text = pt.typ::text
       AND e.widerrufen_at IS NULL
       AND e.inhalt_hash = ad.inhalt_hash
    ) AS letzte_zustimmung_at,
    
    -- Pending = User hat aktuelle Version nicht zugestimmt
    NOT EXISTS (
        SELECT 1 FROM public.einwilligungen e
        WHERE e.user_id = u.id
          AND e.typ::text = pt.typ::text
          AND e.widerrufen_at IS NULL
          AND e.inhalt_hash = ad.inhalt_hash
    ) AS pending
FROM public.users u
CROSS JOIN pflicht_typen pt
LEFT JOIN aktuelle_dokumente ad ON ad.typ::text = pt.typ::text
WHERE u.deleted_at IS NULL
  AND ad.id IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 9.2 Function: get_pending_einwilligungen() für Frontend
-- 
-- Frontend ruft diese auf nach Login:
--   SELECT * FROM get_pending_einwilligungen(auth.uid());
-- 
-- Wenn Result nicht leer → Popup zeigen, Weiterleitung blockieren.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_pending_einwilligungen(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    pflicht_typ TEXT,
    rechtsdokument_id UUID,
    version TEXT,
    titel TEXT,
    inhalt_text TEXT,
    inhalt_html TEXT,
    inhalt_hash TEXT,
    aenderungs_hinweis TEXT,
    storage_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RETURN;  -- nicht eingeloggt
    END IF;
    
    -- Berechtigung: nur eigene Daten oder Founder
    IF v_user_id != auth.uid() AND NOT public.is_founder() THEN
        RAISE EXCEPTION 'Keine Berechtigung';
    END IF;
    
    RETURN QUERY
    SELECT 
        pe.pflicht_typ::text,
        rd.id,
        rd.version,
        rd.name,
        rd.inhalt_text,
        rd.inhalt_html,
        rd.inhalt_hash,
        rd.aenderungs_hinweis,
        rd.storage_path
    FROM public.v_user_pending_einwilligungen pe
    JOIN public.rechtsdokumente rd ON rd.id = pe.aktuelle_rechtsdokument_id
    WHERE pe.user_id = v_user_id
      AND pe.pending = TRUE;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 9.3 Function: record_einwilligung() — Komfort fuer Frontend
-- 
-- Frontend ruft auf wenn User klickt "Ich stimme zu":
--   SELECT public.record_einwilligung(
--       'agb'::einwilligung_typ,
--       '<rechtsdok_uuid>',
--       'v2.0',
--       'sha256-hash-here'
--   );
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_einwilligung(
    p_typ einwilligung_typ,
    p_rechtsdokument_id UUID,
    p_version TEXT,
    p_inhalt_hash TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_onboarding_schritt TEXT DEFAULT NULL,
    p_page_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_einwilligung_id UUID;
    v_workspace_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nicht eingeloggt';
    END IF;
    
    -- Workspace ermitteln (erstes aktives)
    SELECT workspace_id INTO v_workspace_id
    FROM public.workspace_memberships
    WHERE user_id = v_user_id AND is_active = TRUE
    LIMIT 1;
    
    -- Einwilligung speichern
    INSERT INTO public.einwilligungen (
        workspace_id, user_id, typ, rechtsdokument_id, version, inhalt_hash,
        ip_address, user_agent, session_id, onboarding_schritt, page_url
    ) VALUES (
        v_workspace_id, v_user_id, p_typ, p_rechtsdokument_id, p_version, p_inhalt_hash,
        p_ip_address, p_user_agent, p_session_id, p_onboarding_schritt, p_page_url
    ) RETURNING id INTO v_einwilligung_id;
    
    -- onboarding_progress aktualisieren
    UPDATE public.onboarding_progress
    SET 
        agb_zugestimmt_at = CASE WHEN p_typ = 'agb' THEN NOW() ELSE agb_zugestimmt_at END,
        agb_version = CASE WHEN p_typ = 'agb' THEN p_version ELSE agb_version END,
        agb_einwilligung_id = CASE WHEN p_typ = 'agb' THEN v_einwilligung_id ELSE agb_einwilligung_id END,
        
        dse_zugestimmt_at = CASE WHEN p_typ = 'datenschutzerklaerung' THEN NOW() ELSE dse_zugestimmt_at END,
        dse_version = CASE WHEN p_typ = 'datenschutzerklaerung' THEN p_version ELSE dse_version END,
        dse_einwilligung_id = CASE WHEN p_typ = 'datenschutzerklaerung' THEN v_einwilligung_id ELSE dse_einwilligung_id END,
        
        avv_zugestimmt_at = CASE WHEN p_typ = 'avv_auftragsverarbeitung' THEN NOW() ELSE avv_zugestimmt_at END,
        avv_version = CASE WHEN p_typ = 'avv_auftragsverarbeitung' THEN p_version ELSE avv_version END,
        avv_einwilligung_id = CASE WHEN p_typ = 'avv_auftragsverarbeitung' THEN v_einwilligung_id ELSE avv_einwilligung_id END
    WHERE user_id = v_user_id;
    
    -- Falls onboarding_progress noch nicht existiert: anlegen
    INSERT INTO public.onboarding_progress (user_id, workspace_id)
    VALUES (v_user_id, v_workspace_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Audit
    INSERT INTO public.audit_trail (
        workspace_id, user_id, action, entity_typ, entity_id, payload
    ) VALUES (
        v_workspace_id, v_user_id, 'create', 'einwilligung', v_einwilligung_id,
        jsonb_build_object('typ', p_typ, 'version', p_version)
    );
    
    RETURN v_einwilligung_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §10 HELPER-FUNCTIONS für die neuen Tabellen
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 10.1 accept_invitation() — Team-Einladung annehmen
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nicht eingeloggt';
    END IF;
    
    -- Einladung finden
    SELECT * INTO v_invitation
    FROM public.workspace_invitations
    WHERE token = p_token AND status = 'offen';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Einladung nicht gefunden oder bereits verwendet';
    END IF;
    
    -- Abgelaufen?
    IF v_invitation.ablauf_at < NOW() THEN
        UPDATE public.workspace_invitations 
        SET status = 'abgelaufen' 
        WHERE id = v_invitation.id;
        RAISE EXCEPTION 'Einladung abgelaufen';
    END IF;
    
    -- Membership anlegen
    INSERT INTO public.workspace_memberships (
        workspace_id, user_id, rolle,
        invited_by_user_id, invited_at, accepted_at
    ) VALUES (
        v_invitation.workspace_id, v_user_id, v_invitation.vorgeschlagene_rolle,
        v_invitation.eingeladen_von_user_id, v_invitation.versendet_at, NOW()
    )
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET
        is_active = TRUE,
        accepted_at = NOW();
    
    -- Einladung als akzeptiert markieren
    UPDATE public.workspace_invitations
    SET status = 'akzeptiert',
        akzeptiert_at = NOW(),
        akzeptiert_durch_user_id = v_user_id
    WHERE id = v_invitation.id;
    
    -- Audit
    INSERT INTO public.audit_trail (
        workspace_id, user_id, action, entity_typ, entity_id
    ) VALUES (
        v_invitation.workspace_id, v_user_id, 'workspace_invite', 'invitation', v_invitation.id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'workspace_id', v_invitation.workspace_id,
        'rolle', v_invitation.vorgeschlagene_rolle
    );
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.2 calculate_aktivierungs_score() — Score-Berechnung
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_aktivierungs_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score INTEGER := 0;
    v_record RECORD;
BEGIN
    SELECT * INTO v_record 
    FROM public.onboarding_progress 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN RETURN 0; END IF;
    
    -- 8 Schritte, jeder zählt unterschiedlich
    IF v_record.pflicht_einwilligungen_komplett THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_1_profil_komplett_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_2_briefkopf_eingerichtet_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_3_erster_kontakt_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_4_erster_auftrag_at IS NOT NULL THEN v_score := v_score + 15; END IF;  -- wichtig
    IF v_record.schritt_5_erstes_diktat_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_6_erstes_pdf_at IS NOT NULL THEN v_score := v_score + 15; END IF;     -- wichtig
    IF v_record.schritt_7_erste_rechnung_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_8_versendet_an_externe_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    
    RETURN v_score;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 10.3 update_onboarding_score_trigger() — automatisch Score updaten
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_onboarding_score_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.aktivierungs_score := public.calculate_aktivierungs_score(NEW.user_id);
    
    -- Aktiviert ab Score >= 60
    IF NEW.aktivierungs_score >= 60 AND NEW.aktiviert = FALSE THEN
        NEW.aktiviert := TRUE;
        NEW.aktiviert_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_onboarding_score 
    BEFORE INSERT OR UPDATE ON public.onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_onboarding_score_trigger();


-- ═══════════════════════════════════════════════════════════════════════════
-- §11 ROW-LEVEL-SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- stripe_events
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY stripe_events_select ON public.stripe_events FOR SELECT 
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY stripe_events_modify ON public.stripe_events FOR ALL 
USING (public.is_founder()) WITH CHECK (public.is_founder() OR auth.uid() IS NOT NULL);

-- email_log
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_log_select ON public.email_log FOR SELECT 
USING (
    user_id = auth.uid() 
    OR workspace_id IN (SELECT public.get_user_workspaces()) 
    OR public.is_founder()
);
CREATE POLICY email_log_insert ON public.email_log FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL OR public.is_founder());

-- workspace_invitations
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_select ON public.workspace_invitations FOR SELECT 
USING (
    workspace_id IN (SELECT public.get_user_workspaces())
    OR empfaenger_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR public.is_founder()
);
CREATE POLICY inv_insert ON public.workspace_invitations FOR INSERT 
WITH CHECK (public.has_role(workspace_id, 'admin'));
CREATE POLICY inv_update ON public.workspace_invitations FOR UPDATE 
USING (
    public.has_role(workspace_id, 'admin')
    OR empfaenger_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR public.is_founder()
);

-- onboarding_progress
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY onb_select ON public.onboarding_progress FOR SELECT 
USING (user_id = auth.uid() OR public.is_founder());
CREATE POLICY onb_modify ON public.onboarding_progress FOR ALL 
USING (user_id = auth.uid() OR public.is_founder())
WITH CHECK (user_id = auth.uid() OR public.is_founder());

-- api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY apik_select ON public.api_keys FOR SELECT 
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());
CREATE POLICY apik_modify ON public.api_keys FOR ALL 
USING (
    workspace_id IN (SELECT public.get_user_workspaces()) 
    AND public.has_role(workspace_id, 'admin')
)
WITH CHECK (
    workspace_id IN (SELECT public.get_user_workspaces()) 
    AND public.has_role(workspace_id, 'admin')
);

-- tags_global
ALTER TABLE public.tags_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_select ON public.tags_global FOR SELECT 
USING (
    is_global = TRUE 
    OR workspace_id IN (SELECT public.get_user_workspaces()) 
    OR public.is_founder()
);
CREATE POLICY tags_modify ON public.tags_global FOR ALL 
USING (
    (is_global = TRUE AND public.is_founder())
    OR workspace_id IN (SELECT public.get_user_workspaces())
)
WITH CHECK (
    (is_global = TRUE AND public.is_founder())
    OR workspace_id IN (SELECT public.get_user_workspaces())
);

-- bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookmarks_self ON public.bookmarks FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- §12 TRIGGER für Auto-Notification bei neuem Rechtsdokument
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.on_neue_rechtsdokument_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Nur wenn neue Version aktuell wird (INSERT mit aktuell=TRUE oder UPDATE auf aktuell=TRUE)
    IF NEW.aktuell = TRUE AND (TG_OP = 'INSERT' OR OLD.aktuell != TRUE) THEN
        
        -- Alte Version als nicht-aktuell markieren
        UPDATE public.rechtsdokumente
        SET aktuell = FALSE
        WHERE typ = NEW.typ
          AND id != NEW.id
          AND aktuell = TRUE;
        
        -- Notification für alle aktiven User
        FOR v_user IN 
            SELECT DISTINCT u.id, u.email, m.workspace_id
            FROM public.users u
            JOIN public.workspace_memberships m ON m.user_id = u.id
            WHERE u.deleted_at IS NULL AND m.is_active = TRUE
        LOOP
            INSERT INTO public.notifications (
                user_id, workspace_id, kategorie, titel, body,
                link_typ, link_id, link_url
            ) VALUES (
                v_user.id, v_user.workspace_id, 'system',
                'Neue Version: ' || NEW.name,
                'Bitte stimme der neuen Version zu (' || NEW.version || '). ' ||
                COALESCE(NEW.aenderungs_hinweis, 'Aktualisierung erforderlich.'),
                'rechtsdokument', NEW.id,
                '/einstellungen/rechtsdokumente?id=' || NEW.id::text
            );
        END LOOP;
        
        -- Audit
        INSERT INTO public.audit_trail (
            user_id, action, entity_typ, entity_id, payload
        ) VALUES (
            COALESCE(NEW.approved_by_user_id, NEW.erstellt_von_user_id),
            'create', 'rechtsdokument', NEW.id,
            jsonb_build_object(
                'typ', NEW.typ, 
                'version', NEW.version,
                'force_re_consent', true
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_neue_rechtsdokument_version
    AFTER INSERT OR UPDATE ON public.rechtsdokumente
    FOR EACH ROW EXECUTE FUNCTION public.on_neue_rechtsdokument_version();


-- ═══════════════════════════════════════════════════════════════════════════
-- ANPASSUNG: handle_new_user() um onboarding_progress zu erstellen
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
    v_user_name    TEXT;
BEGIN
    v_user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    INSERT INTO public.users (id, email, email_verified, name, created_at, updated_at)
    VALUES (
        NEW.id, NEW.email, NEW.email_confirmed_at IS NOT NULL,
        v_user_name, NOW(), NOW()
    );
    
    INSERT INTO public.workspaces (
        typ, name, abo_tier, abo_status, abo_trial_endet_am
    )
    VALUES (
        'solo', v_user_name || ' — Solo-Workspace', 'solo', 'trial',
        NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_workspace_id;
    
    INSERT INTO public.workspace_memberships (
        workspace_id, user_id, rolle,
        can_invite_members, can_manage_billing, can_export_data, can_delete_records,
        accepted_at
    )
    VALUES (
        v_workspace_id, NEW.id, 'owner',
        TRUE, TRUE, TRUE, TRUE, NOW()
    );
    
    -- NEU: onboarding_progress anlegen
    INSERT INTO public.onboarding_progress (user_id, workspace_id)
    VALUES (NEW.id, v_workspace_id);
    
    INSERT INTO public.audit_trail (
        workspace_id, user_id, action, entity_typ, entity_id, payload
    )
    VALUES (
        v_workspace_id, NEW.id, 'create', 'workspace', v_workspace_id,
        jsonb_build_object('typ', 'solo', 'auto_created', true)
    );
    
    RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §13 VERIFIKATIONS-HINWEISE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- A) 7 neue Tabellen da:
--    SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
--      AND tablename IN ('stripe_events', 'email_log', 'workspace_invitations', 
--                        'onboarding_progress', 'api_keys', 'tags_global', 'bookmarks')
--      ORDER BY tablename;
--    Erwartet: 7 Zeilen
-- 
-- B) Forced-Re-Consent-Workflow:
--    SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
--      AND proname IN ('get_pending_einwilligungen', 'record_einwilligung', 
--                      'accept_invitation', 'calculate_aktivierungs_score',
--                      'on_neue_rechtsdokument_version');
--    Erwartet: 5 Zeilen
-- 
-- C) View v_user_pending_einwilligungen:
--    SELECT * FROM public.v_user_pending_einwilligungen LIMIT 1;
--    Erwartet: leer (noch keine User registriert)
-- 
-- D) Tabellen-Anzahl jetzt total:
--    SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
--    Erwartet: 61 (54 + 7 neue)
-- 
-- ═══════════════════════════════════════════════════════════════════════════
-- ENDE PATCH 06
-- 
-- Schema 100% komplett mit Forced-Re-Consent-Workflow.
-- Naechster Schritt: Sprint K-1 fuer Claude Code.
-- ═══════════════════════════════════════════════════════════════════════════
