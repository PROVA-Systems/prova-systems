-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Patch 06 v3: Final-Lückenschluss + Forced Re-Consent
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Fix v3:        Cleanup-Section am Anfang entfernt
--                (DROP TRIGGER auf nicht-existenter Tabelle hat gecrasht)
-- 
-- Voraussetzung: Phase 1+2+3+4 + Patch 05 v2 grün
-- 
-- AUSFÜHRUNG:    SQL-Editor → kompletten Inhalt einfügen → Run
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 ENUMs (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE stripe_event_status AS ENUM (
        'empfangen', 'verarbeitet', 'verarbeitung_fehler', 'ignoriert', 'duplikat'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE email_status AS ENUM (
        'queued', 'gesendet', 'zugestellt', 'gelesen', 'angeklickt',
        'gebounced_hard', 'gebounced_soft', 'spam_complaint', 'fehler'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM (
        'offen', 'akzeptiert', 'abgelehnt', 'abgelaufen', 'zurueckgezogen'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE api_key_scope AS ENUM (
        'read_only', 'standard', 'admin', 'webhook_only', 'integration_versicherung'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 STRIPE_EVENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stripe_events (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    stripe_event_id             TEXT NOT NULL UNIQUE,
    event_type                  TEXT NOT NULL,
    livemode                    BOOLEAN NOT NULL DEFAULT FALSE,
    api_version                 TEXT,
    
    stripe_customer_id          TEXT,
    stripe_subscription_id      TEXT,
    stripe_invoice_id           TEXT,
    stripe_payment_intent_id    TEXT,
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    
    raw_payload                 JSONB NOT NULL,
    relevante_daten             JSONB,
    
    status                      stripe_event_status NOT NULL DEFAULT 'empfangen',
    verarbeitet_at              TIMESTAMPTZ,
    verarbeitung_dauer_ms       INTEGER,
    verarbeitung_fehler         TEXT,
    
    auswirkung_beschreibung     TEXT,
    affected_workspace_ids      UUID[],
    
    retry_count                 INTEGER NOT NULL DEFAULT 0,
    naechster_retry_at          TIMESTAMPTZ,
    
    stripe_created_at           TIMESTAMPTZ,
    received_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(event_type, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_customer ON public.stripe_events(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stripe_events_workspace ON public.stripe_events(workspace_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_pending ON public.stripe_events(received_at) WHERE status = 'empfangen';


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 EMAIL_LOG
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_log (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    user_id                     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    empfaenger_email            TEXT NOT NULL,
    empfaenger_name             TEXT,
    
    betreff                     TEXT NOT NULL,
    zweck                       TEXT NOT NULL,
    
    verknuepft_dokument_id      UUID REFERENCES public.dokumente(id) ON DELETE SET NULL,
    verknuepft_ticket_id        UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
    verknuepft_termin_id        UUID REFERENCES public.termine(id) ON DELETE SET NULL,
    
    status                      email_status NOT NULL DEFAULT 'queued',
    
    queued_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at                     TIMESTAMPTZ,
    delivered_at                TIMESTAMPTZ,
    opened_at                   TIMESTAMPTZ,
    clicked_at                  TIMESTAMPTZ,
    bounced_at                  TIMESTAMPTZ,
    complained_at               TIMESTAMPTZ,
    
    provider                    TEXT,
    provider_message_id         TEXT,
    
    bounce_typ                  TEXT,
    bounce_grund                TEXT,
    
    open_count                  INTEGER NOT NULL DEFAULT 0,
    click_count                 INTEGER NOT NULL DEFAULT 0,
    
    inhalt_hash                 TEXT,
    fehler_message              TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user ON public.email_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_workspace ON public.email_log(workspace_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_empfaenger ON public.email_log(empfaenger_email, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON public.email_log(status, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_zweck ON public.email_log(zweck, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_provider_msg ON public.email_log(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_log_bounces ON public.email_log(empfaenger_email, bounced_at DESC) WHERE bounced_at IS NOT NULL;

-- Trigger nur erstellen wenn Tabelle gerade neu erstellt wurde
DO $$ BEGIN
    CREATE TRIGGER trg_email_log_updated_at BEFORE UPDATE ON public.email_log
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §4 WORKSPACE_INVITATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    eingeladen_von_user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    empfaenger_email            TEXT NOT NULL,
    empfaenger_name             TEXT,
    
    vorgeschlagene_rolle        member_rolle NOT NULL DEFAULT 'sv',
    
    token                       TEXT NOT NULL UNIQUE DEFAULT (encode(gen_random_bytes(32), 'hex')),
    
    status                      invitation_status NOT NULL DEFAULT 'offen',
    versendet_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ablauf_at                   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    akzeptiert_at               TIMESTAMPTZ,
    akzeptiert_durch_user_id    UUID REFERENCES public.users(id),
    
    persoenliche_nachricht      TEXT,
    
    email_log_id                UUID REFERENCES public.email_log(id) ON DELETE SET NULL,
    erinnerungen_gesendet_count INTEGER NOT NULL DEFAULT 0,
    letzte_erinnerung_at        TIMESTAMPTZ,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON public.workspace_invitations(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.workspace_invitations(empfaenger_email, status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.workspace_invitations(token) WHERE status = 'offen';
CREATE INDEX IF NOT EXISTS idx_invitations_expiring ON public.workspace_invitations(ablauf_at) WHERE status = 'offen';

DO $$ BEGIN
    CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON public.workspace_invitations
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §5 ONBOARDING_PROGRESS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Einwilligungen
    agb_zugestimmt_at           TIMESTAMPTZ,
    agb_version                 TEXT,
    agb_einwilligung_id         UUID REFERENCES public.einwilligungen(id),
    
    dse_zugestimmt_at           TIMESTAMPTZ,
    dse_version                 TEXT,
    dse_einwilligung_id         UUID REFERENCES public.einwilligungen(id),
    
    avv_zugestimmt_at           TIMESTAMPTZ,
    avv_version                 TEXT,
    avv_einwilligung_id         UUID REFERENCES public.einwilligungen(id),
    
    pflicht_einwilligungen_komplett BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Aktivierungs-Meilensteine
    schritt_1_profil_komplett_at        TIMESTAMPTZ,
    schritt_2_briefkopf_eingerichtet_at TIMESTAMPTZ,
    schritt_3_erster_kontakt_at         TIMESTAMPTZ,
    schritt_4_erster_auftrag_at         TIMESTAMPTZ,
    schritt_5_erstes_diktat_at          TIMESTAMPTZ,
    schritt_6_erstes_pdf_at             TIMESTAMPTZ,
    schritt_7_erste_rechnung_at         TIMESTAMPTZ,
    schritt_8_versendet_an_externe_at   TIMESTAMPTZ,
    
    aktivierungs_score          INTEGER NOT NULL DEFAULT 0 CHECK (aktivierungs_score BETWEEN 0 AND 100),
    aktiviert                   BOOLEAN NOT NULL DEFAULT FALSE,
    aktiviert_at                TIMESTAMPTZ,
    
    welcome_tour_completed      BOOLEAN NOT NULL DEFAULT FALSE,
    welcome_tour_completed_at   TIMESTAMPTZ,
    
    welcome_email_gesendet_at   TIMESTAMPTZ,
    tag_3_email_gesendet_at     TIMESTAMPTZ,
    tag_7_email_gesendet_at     TIMESTAMPTZ,
    trial_endet_warnung_at      TIMESTAMPTZ,
    
    erste_hilfe_anfrage_at      TIMESTAMPTZ,
    
    letzter_aktiver_schritt     INTEGER,
    drop_off_punkt              INTEGER,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onb_workspace ON public.onboarding_progress(workspace_id);
CREATE INDEX IF NOT EXISTS idx_onb_aktiviert ON public.onboarding_progress(aktiviert, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onb_pflicht ON public.onboarding_progress(pflicht_einwilligungen_komplett, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onb_drop_off ON public.onboarding_progress(drop_off_punkt) WHERE drop_off_punkt IS NOT NULL;

DO $$ BEGIN
    CREATE TRIGGER trg_onboarding_updated_at BEFORE UPDATE ON public.onboarding_progress
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §6 API_KEYS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.api_keys (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    erstellt_von_user_id        UUID NOT NULL REFERENCES public.users(id),
    
    name                        TEXT NOT NULL,
    beschreibung                TEXT,
    
    key_hash                    TEXT NOT NULL UNIQUE,
    key_prefix                  TEXT NOT NULL,
    
    scope                       api_key_scope NOT NULL DEFAULT 'read_only',
    erlaubte_endpoints          TEXT[],
    
    rate_limit_pro_minute       INTEGER NOT NULL DEFAULT 60,
    rate_limit_pro_tag          INTEGER NOT NULL DEFAULT 10000,
    
    ip_whitelist                INET[],
    
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    ablauf_at                   TIMESTAMPTZ,
    deaktiviert_at              TIMESTAMPTZ,
    deaktiviert_grund           TEXT,
    
    letzter_call_at             TIMESTAMPTZ,
    calls_total                 INTEGER NOT NULL DEFAULT 0,
    calls_heute                 INTEGER NOT NULL DEFAULT 0,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON public.api_keys(workspace_id, aktiv);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash) WHERE aktiv = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_expiring ON public.api_keys(ablauf_at) WHERE aktiv = TRUE AND ablauf_at IS NOT NULL;

DO $$ BEGIN
    CREATE TRIGGER trg_api_keys_updated_at BEFORE UPDATE ON public.api_keys
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §7 TAGS_GLOBAL (ohne unaccent — IMMUTABLE-Fix)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tags_global (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    name                        TEXT NOT NULL,
    name_normalized             TEXT GENERATED ALWAYS AS (lower(name)) STORED,
    
    farbe_hex                   TEXT DEFAULT '#64748b',
    icon                        TEXT,
    
    kategorie                   TEXT,
    beschreibung                TEXT,
    
    fuer_auftraege              BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_kontakte               BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_dokumente              BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_termine                BOOLEAN NOT NULL DEFAULT TRUE,
    fuer_notizen                BOOLEAN NOT NULL DEFAULT TRUE,
    
    is_global                   BOOLEAN NOT NULL DEFAULT FALSE,
    nutzungen_count             INTEGER NOT NULL DEFAULT 0,
    aktiv                       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (workspace_id, name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_tags_workspace ON public.tags_global(workspace_id, kategorie) WHERE aktiv = TRUE;
CREATE INDEX IF NOT EXISTS idx_tags_global ON public.tags_global(is_global, kategorie) WHERE is_global = TRUE AND aktiv = TRUE;
CREATE INDEX IF NOT EXISTS idx_tags_search ON public.tags_global(name_normalized);

DO $$ BEGIN
    CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON public.tags_global
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §8 BOOKMARKS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    entity_typ                  TEXT NOT NULL,
    entity_id                   UUID NOT NULL,
    
    custom_label                TEXT,
    notiz                       TEXT,
    
    reihenfolge                 INTEGER NOT NULL DEFAULT 0,
    pin_im_cockpit              BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (user_id, entity_typ, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id, entity_typ, reihenfolge);
CREATE INDEX IF NOT EXISTS idx_bookmarks_cockpit ON public.bookmarks(user_id, reihenfolge) WHERE pin_im_cockpit = TRUE;
CREATE INDEX IF NOT EXISTS idx_bookmarks_entity ON public.bookmarks(entity_typ, entity_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- §9 FORCED-RE-CONSENT — View
-- ═══════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.v_user_pending_einwilligungen CASCADE;

CREATE VIEW public.v_user_pending_einwilligungen AS
WITH pflicht_typen AS (
    SELECT unnest(ARRAY['agb', 'datenschutzerklaerung', 'avv_auftragsverarbeitung']::einwilligung_typ[]) AS typ
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
    
    (SELECT MAX(e.erteilt_at) 
     FROM public.einwilligungen e
     WHERE e.user_id = u.id 
       AND e.typ = pt.typ
       AND e.widerrufen_at IS NULL
       AND e.inhalt_hash = ad.inhalt_hash
    ) AS letzte_zustimmung_at,
    
    NOT EXISTS (
        SELECT 1 FROM public.einwilligungen e
        WHERE e.user_id = u.id
          AND e.typ = pt.typ
          AND e.widerrufen_at IS NULL
          AND e.inhalt_hash = ad.inhalt_hash
    ) AS pending
FROM public.users u
CROSS JOIN pflicht_typen pt
LEFT JOIN aktuelle_dokumente ad ON ad.typ::rechtsdoc_typ = (
    CASE pt.typ::text
        WHEN 'agb' THEN 'agb'
        WHEN 'datenschutzerklaerung' THEN 'datenschutzerklaerung'
        WHEN 'avv_auftragsverarbeitung' THEN 'avv'
    END::rechtsdoc_typ
)
WHERE u.deleted_at IS NULL
  AND ad.id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- §10 HELPER-FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- 10.1 get_pending_einwilligungen
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
    
    IF v_user_id IS NULL THEN RETURN; END IF;
    
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


-- 10.2 record_einwilligung
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
    
    SELECT workspace_id INTO v_workspace_id
    FROM public.workspace_memberships
    WHERE user_id = v_user_id AND is_active = TRUE
    LIMIT 1;
    
    INSERT INTO public.einwilligungen (
        workspace_id, user_id, typ, rechtsdokument_id, version, inhalt_hash,
        ip_address, user_agent, session_id, onboarding_schritt, page_url
    ) VALUES (
        v_workspace_id, v_user_id, p_typ, p_rechtsdokument_id, p_version, p_inhalt_hash,
        p_ip_address, p_user_agent, p_session_id, p_onboarding_schritt, p_page_url
    ) RETURNING id INTO v_einwilligung_id;
    
    INSERT INTO public.onboarding_progress (user_id, workspace_id)
    VALUES (v_user_id, v_workspace_id)
    ON CONFLICT (user_id) DO NOTHING;
    
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
    
    INSERT INTO public.audit_trail (
        workspace_id, user_id, action, entity_typ, entity_id, payload
    ) VALUES (
        v_workspace_id, v_user_id, 'create', 'einwilligung', v_einwilligung_id,
        jsonb_build_object('typ', p_typ, 'version', p_version)
    );
    
    RETURN v_einwilligung_id;
END;
$$;


-- 10.3 accept_invitation
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
    
    SELECT * INTO v_invitation
    FROM public.workspace_invitations
    WHERE token = p_token AND status = 'offen';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Einladung nicht gefunden oder bereits verwendet';
    END IF;
    
    IF v_invitation.ablauf_at < NOW() THEN
        UPDATE public.workspace_invitations 
        SET status = 'abgelaufen' 
        WHERE id = v_invitation.id;
        RAISE EXCEPTION 'Einladung abgelaufen';
    END IF;
    
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
    
    UPDATE public.workspace_invitations
    SET status = 'akzeptiert',
        akzeptiert_at = NOW(),
        akzeptiert_durch_user_id = v_user_id
    WHERE id = v_invitation.id;
    
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


-- 10.4 calculate_aktivierungs_score
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
    
    IF v_record.pflicht_einwilligungen_komplett THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_1_profil_komplett_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_2_briefkopf_eingerichtet_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_3_erster_kontakt_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_4_erster_auftrag_at IS NOT NULL THEN v_score := v_score + 15; END IF;
    IF v_record.schritt_5_erstes_diktat_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_6_erstes_pdf_at IS NOT NULL THEN v_score := v_score + 15; END IF;
    IF v_record.schritt_7_erste_rechnung_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_record.schritt_8_versendet_an_externe_at IS NOT NULL THEN v_score := v_score + 10; END IF;
    
    RETURN v_score;
END;
$$;


-- 10.5 update_onboarding_score_trigger
CREATE OR REPLACE FUNCTION public.update_onboarding_score_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.pflicht_einwilligungen_komplett := (
        NEW.agb_zugestimmt_at IS NOT NULL 
        AND NEW.dse_zugestimmt_at IS NOT NULL 
        AND NEW.avv_zugestimmt_at IS NOT NULL
    );
    
    NEW.aktivierungs_score := 0;
    IF NEW.pflicht_einwilligungen_komplett THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 10; END IF;
    IF NEW.schritt_1_profil_komplett_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 10; END IF;
    IF NEW.schritt_2_briefkopf_eingerichtet_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 10; END IF;
    IF NEW.schritt_3_erster_kontakt_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 10; END IF;
    IF NEW.schritt_4_erster_auftrag_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 15; END IF;
    IF NEW.schritt_5_erstes_diktat_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 10; END IF;
    IF NEW.schritt_6_erstes_pdf_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 15; END IF;
    IF NEW.schritt_7_erste_rechnung_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 10; END IF;
    IF NEW.schritt_8_versendet_an_externe_at IS NOT NULL THEN NEW.aktivierungs_score := NEW.aktivierungs_score + 10; END IF;
    
    IF NEW.aktivierungs_score >= 60 AND (OLD IS NULL OR OLD.aktiviert = FALSE) THEN
        NEW.aktiviert := TRUE;
        NEW.aktiviert_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    CREATE TRIGGER trg_onboarding_score 
        BEFORE INSERT OR UPDATE ON public.onboarding_progress
        FOR EACH ROW EXECUTE FUNCTION public.update_onboarding_score_trigger();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §11 ROW-LEVEL-SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- stripe_events
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stripe_events_select ON public.stripe_events;
CREATE POLICY stripe_events_select ON public.stripe_events FOR SELECT 
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

DROP POLICY IF EXISTS stripe_events_modify ON public.stripe_events;
CREATE POLICY stripe_events_modify ON public.stripe_events FOR ALL 
USING (public.is_founder()) WITH CHECK (public.is_founder() OR auth.uid() IS NOT NULL);

-- email_log
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_log_select ON public.email_log;
CREATE POLICY email_log_select ON public.email_log FOR SELECT 
USING (
    user_id = auth.uid() 
    OR workspace_id IN (SELECT public.get_user_workspaces()) 
    OR public.is_founder()
);

DROP POLICY IF EXISTS email_log_insert ON public.email_log;
CREATE POLICY email_log_insert ON public.email_log FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL OR public.is_founder());

-- workspace_invitations
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inv_select ON public.workspace_invitations;
CREATE POLICY inv_select ON public.workspace_invitations FOR SELECT 
USING (
    workspace_id IN (SELECT public.get_user_workspaces())
    OR empfaenger_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR public.is_founder()
);

DROP POLICY IF EXISTS inv_insert ON public.workspace_invitations;
CREATE POLICY inv_insert ON public.workspace_invitations FOR INSERT 
WITH CHECK (public.has_role(workspace_id, 'admin'));

DROP POLICY IF EXISTS inv_update ON public.workspace_invitations;
CREATE POLICY inv_update ON public.workspace_invitations FOR UPDATE 
USING (
    public.has_role(workspace_id, 'admin')
    OR empfaenger_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR public.is_founder()
);

-- onboarding_progress
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS onb_select ON public.onboarding_progress;
CREATE POLICY onb_select ON public.onboarding_progress FOR SELECT 
USING (user_id = auth.uid() OR public.is_founder());

DROP POLICY IF EXISTS onb_modify ON public.onboarding_progress;
CREATE POLICY onb_modify ON public.onboarding_progress FOR ALL 
USING (user_id = auth.uid() OR public.is_founder())
WITH CHECK (user_id = auth.uid() OR public.is_founder());

-- api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS apik_select ON public.api_keys;
CREATE POLICY apik_select ON public.api_keys FOR SELECT 
USING (workspace_id IN (SELECT public.get_user_workspaces()) OR public.is_founder());

DROP POLICY IF EXISTS apik_modify ON public.api_keys;
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
DROP POLICY IF EXISTS tags_select ON public.tags_global;
CREATE POLICY tags_select ON public.tags_global FOR SELECT 
USING (
    is_global = TRUE 
    OR workspace_id IN (SELECT public.get_user_workspaces()) 
    OR public.is_founder()
);

DROP POLICY IF EXISTS tags_modify ON public.tags_global;
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
DROP POLICY IF EXISTS bookmarks_self ON public.bookmarks;
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
    IF NEW.aktuell = TRUE AND (TG_OP = 'INSERT' OR OLD.aktuell != TRUE) THEN
        
        UPDATE public.rechtsdokumente
        SET aktuell = FALSE
        WHERE typ = NEW.typ
          AND id != NEW.id
          AND aktuell = TRUE;
        
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

DO $$ BEGIN
    CREATE TRIGGER trg_neue_rechtsdokument_version
        AFTER INSERT OR UPDATE ON public.rechtsdokumente
        FOR EACH ROW EXECUTE FUNCTION public.on_neue_rechtsdokument_version();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- ANPASSUNG: handle_new_user() um onboarding_progress anzulegen
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
-- ENDE PATCH 06 v3 — sollte jetzt durchlaufen
-- ═══════════════════════════════════════════════════════════════════════════
