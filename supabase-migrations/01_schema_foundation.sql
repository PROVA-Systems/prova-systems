-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA Systems — Schema Phase 1: Foundation
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Inhalt:        Workspaces (Multi-Tenancy), Users, Memberships, Audit-Trail
-- Database:      Supabase PostgreSQL 17 (Frankfurt eu-central-1)
-- DSGVO:         Multi-Tenancy mit RLS, Audit-Trail INSERT-only, EU-Hosting
-- Aufbewahrung:  10+ Jahre garantiert via Supabase Storage + DB-Backup
-- 
-- AUSFÜHRUNG:
--   Supabase Studio → SQL Editor → "New query"
--   Diesen kompletten Inhalt einfügen → "Run" klicken
--   Erfolg: "Success. No rows returned" (oder ähnlich)
--   Bei Fehler: Fehler-Message hier melden
-- 
-- DANACH: Phase 2 (Aufträge) folgt
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ───────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID-Generierung
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Hashing für Audit-Sicherheit
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram für Fuzzy-Suche später
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- Umlaut-tolerante Suche
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- Performance: kombinierte Indices


-- ───────────────────────────────────────────────────────────────────────────
-- 1. ENUMS — wiederverwendbare Typen
-- ───────────────────────────────────────────────────────────────────────────

CREATE TYPE workspace_typ AS ENUM ('solo', 'team');

CREATE TYPE abo_tier AS ENUM ('solo', 'team');

CREATE TYPE abo_status AS ENUM (
    'trial',
    'aktiv',
    'pausiert',
    'ueberfaellig',
    'gekuendigt'
);

CREATE TYPE member_rolle AS ENUM (
    'owner',         -- Account-Eigner, kann alles
    'admin',         -- Team-Admin (Settings, Billing, User-Mgmt)
    'sv',            -- Sachverständiger (Standard-Rolle)
    'assistenz',     -- Limited: schreiben/ändern, kein Delete, keine Settings
    'readonly'       -- Nur Lesen
);

CREATE TYPE ki_provider AS ENUM (
    'openai',        -- aktuell Standard
    'mistral',       -- später EU-Alternative
    'anthropic'      -- optional
);

CREATE TYPE audit_action AS ENUM (
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'login_failed',
    'export', 'import',
    'pdf_generate', 'pdf_view', 'pdf_send',
    'ki_request', 'ki_response',
    'workspace_invite', 'workspace_remove_member',
    'data_export_dsgvo', 'data_delete_dsgvo'
);


-- ───────────────────────────────────────────────────────────────────────────
-- 2. WORKSPACES — Multi-Tenancy Foundation
-- 
-- Ein Workspace = eine "Umgebung". Bei Solo: 1 Workspace pro Person.
-- Bei Team: 1 Workspace, mehrere User. Alle Daten gehören IMMER zu einem
-- Workspace, nie direkt zu einer Person.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    typ                         workspace_typ NOT NULL DEFAULT 'solo',
    name                        TEXT NOT NULL,
    slug                        TEXT UNIQUE,                 -- für URLs später
    
    -- Profil & Briefkopf (geteilt im Team-Workspace)
    briefkopf                   JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Erwartete Felder: { logo_url, kanzlei_name, anschrift, plz, ort,
    --                     telefon, fax, email, website, ust_id, steuernr,
    --                     fusszeile, ihk_kammer, sachgebiet }
    
    -- Abo & Billing
    abo_tier                    abo_tier NOT NULL DEFAULT 'solo',
    abo_status                  abo_status NOT NULL DEFAULT 'trial',
    abo_trial_endet_am          TIMESTAMPTZ,
    abo_aktiv_seit              TIMESTAMPTZ,
    abo_gekuendigt_am           TIMESTAMPTZ,
    
    stripe_customer_id          TEXT UNIQUE,
    stripe_subscription_id      TEXT UNIQUE,
    
    -- DATEV-Settings (Stufe 1: CSV-Export ready)
    datev_settings              JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Erwartet: { berater_nummer, mandant_nummer, standard_konto_soll,
    --             standard_konto_haben, kostenstelle, steuerschluessel }
    
    -- KI-Konfiguration
    preferred_ki_provider       ki_provider NOT NULL DEFAULT 'openai',
    ki_pseudonymisierung_aktiv  BOOLEAN NOT NULL DEFAULT TRUE,   -- DSGVO-Pflicht
    
    -- Tier-Limits (cached, bei Tier-Wechsel updaten)
    max_auftraege_pro_monat     INTEGER NOT NULL DEFAULT 30,
    max_team_members            INTEGER NOT NULL DEFAULT 1,
    storage_quota_mb            INTEGER NOT NULL DEFAULT 5120,    -- 5 GB Default
    
    -- DSGVO
    dsgvo_aufbewahrung_jahre    INTEGER NOT NULL DEFAULT 10,
    dsgvo_loeschen_geplant_am   TIMESTAMPTZ,    -- für DSGVO Art. 17
    
    -- Meta
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ                   -- Soft-Delete
);

CREATE INDEX idx_workspaces_typ ON public.workspaces(typ) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_abo_status ON public.workspaces(abo_status);
CREATE INDEX idx_workspaces_stripe ON public.workspaces(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON TABLE public.workspaces IS 'Multi-Tenancy Foundation. Solo=1 User, Team=mehrere User pro Workspace.';
COMMENT ON COLUMN public.workspaces.briefkopf IS 'JSONB mit allen Briefkopf-Daten — geteilt im Team-Workspace, individuell bei Solo';


-- ───────────────────────────────────────────────────────────────────────────
-- 3. USERS — 1:1 Mapping zu auth.users
-- 
-- Supabase Auth verwaltet auth.users (Login, Passwörter, JWT).
-- public.users speichert SV-Profil + Verbindung zu Workspaces.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
    id                          UUID PRIMARY KEY,             -- = auth.users.id
    
    email                       TEXT NOT NULL UNIQUE,         -- Synchronisiert mit auth
    email_verified              BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Persönliche Daten
    name                        TEXT,                          -- "Marcel Mustermann"
    titel                       TEXT,                          -- "Dipl.-Ing." / "Dr."
    qualifikation               TEXT,                          -- "ö.b.u.v. Sachverständiger"
    sachgebiet                  TEXT,                          -- "Schäden an Gebäuden"
    bestellungsstelle           TEXT,                          -- "IHK Köln"
    
    -- Kontakt
    anschrift                   TEXT,
    plz                         TEXT,
    ort                         TEXT,
    telefon                     TEXT,
    mobil                       TEXT,
    fax                         TEXT,
    
    -- Signatur
    signatur_storage_path       TEXT,                          -- Supabase Storage
    stempel_storage_path        TEXT,
    
    -- Settings
    locale                      TEXT NOT NULL DEFAULT 'de-DE',
    timezone                    TEXT NOT NULL DEFAULT 'Europe/Berlin',
    notification_settings       JSONB NOT NULL DEFAULT '{
        "email_neuer_auftrag": true,
        "email_termin_erinnerung": true,
        "email_rechnung_bezahlt": true,
        "push_aktiv": true
    }'::jsonb,
    
    -- Onboarding & Status
    onboarding_completed_at     TIMESTAMPTZ,
    last_login_at               TIMESTAMPTZ,
    last_active_at              TIMESTAMPTZ,
    
    -- 2FA (für Sprint 18 / heute already prepared)
    totp_secret                 TEXT,                          -- verschlüsselt
    totp_enabled                BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Founder-Flag (Du = Super-Admin im Cockpit)
    is_founder                  BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Meta
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ,
    
    CONSTRAINT users_id_fk FOREIGN KEY (id)
        REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON public.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_founder ON public.users(is_founder) WHERE is_founder = TRUE;
CREATE INDEX idx_users_last_active ON public.users(last_active_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.users IS 'SV-Profile, 1:1 mit auth.users. Persönliche Daten + Settings.';
COMMENT ON COLUMN public.users.is_founder IS 'Marcel-Flag für Super-Admin-Zugang im AUTH-COCKPIT';


-- ───────────────────────────────────────────────────────────────────────────
-- 4. WORKSPACE_MEMBERSHIPS — User-zu-Workspace-Beziehung mit Rollen
-- 
-- M:N zwischen users und workspaces. Bei Solo: 1 Eintrag pro User
-- (User ist Owner seines eigenen Solo-Workspaces). Bei Team: mehrere User
-- mit unterschiedlichen Rollen.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.workspace_memberships (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    workspace_id                UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    rolle                       member_rolle NOT NULL DEFAULT 'sv',
    
    -- Permissions (granular, override default by rolle)
    can_invite_members          BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_billing          BOOLEAN NOT NULL DEFAULT FALSE,
    can_export_data             BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_records          BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Einladung
    invited_by_user_id          UUID REFERENCES public.users(id),
    invited_at                  TIMESTAMPTZ,
    accepted_at                 TIMESTAMPTZ,
    
    -- Status
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Meta
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_memberships_user ON public.workspace_memberships(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_memberships_workspace ON public.workspace_memberships(workspace_id) WHERE is_active = TRUE;
CREATE INDEX idx_memberships_rolle ON public.workspace_memberships(rolle, workspace_id);

COMMENT ON TABLE public.workspace_memberships IS 'M:N zwischen User und Workspace mit Rollen-System';


-- ───────────────────────────────────────────────────────────────────────────
-- 5. USER_SESSIONS — aktive Sessions für AUTH-COCKPIT
-- 
-- Tracking aller aktiven Logins. Foundation für AUTH-COCKPIT Live-Sessions
-- und Multi-Device-Sicherheit (Session-Liste, Remote-Logout).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.user_sessions (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Device-Info (anonymisiert)
    device_typ                  TEXT,                          -- "desktop" / "mobile" / "tablet"
    device_name                 TEXT,                          -- "Chrome on macOS"
    user_agent                  TEXT,
    
    ip_address                  INET,                          -- für Sicherheits-Audit
    ip_country                  TEXT,                          -- via Geo-IP
    ip_city                     TEXT,
    
    -- JWT-Tracking (Hash, nie der Token selbst!)
    jwt_hash                    TEXT,                          -- SHA256 des JWT
    refresh_token_hash          TEXT,
    
    -- Status
    started_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at                  TIMESTAMPTZ NOT NULL,
    revoked_at                  TIMESTAMPTZ,
    revoke_reason               TEXT
);

CREATE INDEX idx_sessions_user_active ON public.user_sessions(user_id, last_activity_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires ON public.user_sessions(expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE public.user_sessions IS 'Session-Tracking für Multi-Device + AUTH-COCKPIT';


-- ───────────────────────────────────────────────────────────────────────────
-- 6. AUDIT_TRAIL — INSERT-only Forensik-Log
-- 
-- Jede sicherheitsrelevante Aktion wird hier eingetragen.
-- DSGVO Art. 30 Pflicht (Verzeichnis von Verarbeitungstätigkeiten).
-- IHK-SVO Nachweispflicht. Manipulationssicher: KEIN UPDATE/DELETE erlaubt.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.audit_trail (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Wer
    workspace_id                UUID REFERENCES public.workspaces(id),
    user_id                     UUID REFERENCES public.users(id),
    
    -- Was
    action                      audit_action NOT NULL,
    entity_typ                  TEXT,                          -- "auftrag" / "rechnung" / "kontakt" / ...
    entity_id                   UUID,
    
    -- Details
    payload                     JSONB,                         -- Vorher/Nachher bei Update
    
    -- Wo
    ip_address                  INET,
    user_agent                  TEXT,
    request_id                  TEXT,                          -- Trace-ID für Debugging
    
    -- Sicherheits-Hash (Tamper-Detection)
    -- Hash wird über (action || entity_id || payload || created_at) gebildet
    integrity_hash              TEXT,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance-Indices für Cockpit-Queries
CREATE INDEX idx_audit_workspace_time ON public.audit_trail(workspace_id, created_at DESC);
CREATE INDEX idx_audit_user_time ON public.audit_trail(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_trail(entity_typ, entity_id, created_at DESC);
CREATE INDEX idx_audit_action_time ON public.audit_trail(action, created_at DESC);

COMMENT ON TABLE public.audit_trail IS 'INSERT-only Audit-Log. UPDATE/DELETE durch RLS verboten. DSGVO Art. 30 + IHK-SVO Nachweis.';


-- ───────────────────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS — In-App-Benachrichtigungen (System-weit)
-- 
-- 4 Kategorien: aufgaben / termine / achtung / system
-- Werden im Frontend von prova-notifications.js angezeigt.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TYPE notification_kategorie AS ENUM (
    'aufgaben',     -- z.B. "Phase 4 Fachurteil offen"
    'termine',      -- z.B. "Termin morgen 9:00"
    'achtung',      -- z.B. "Rechnung überfällig"
    'system'        -- z.B. "Wartungsfenster heute Nacht"
);

CREATE TABLE public.notifications (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id                UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    kategorie                   notification_kategorie NOT NULL,
    titel                       TEXT NOT NULL,
    body                        TEXT,
    
    -- Verlinkung
    link_typ                    TEXT,                          -- "auftrag" / "rechnung" / "termin"
    link_id                     UUID,
    link_url                    TEXT,                          -- Frontend-Pfad
    
    -- Status
    read_at                     TIMESTAMPTZ,
    dismissed_at                TIMESTAMPTZ,
    
    -- Push (optional Echo via Web-Push)
    pushed_at                   TIMESTAMPTZ,
    
    -- Auto-Cleanup (alte Notifs löschen)
    expires_at                  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_kategorie ON public.notifications(user_id, kategorie, created_at DESC);
CREATE INDEX idx_notifications_expires ON public.notifications(expires_at);

COMMENT ON TABLE public.notifications IS 'In-App-Benachrichtigungen, 4 Kategorien (aufgaben/termine/achtung/system)';


-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- updated_at automatisch setzen — universal trigger
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_memberships_updated_at BEFORE UPDATE ON public.workspace_memberships
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- handle_new_user() — Auto-Setup nach Signup
-- 
-- Wenn ein User sich neu registriert (auth.users INSERT), passiert:
--   1. public.users-Eintrag erstellen
--   2. Solo-Workspace anlegen
--   3. Membership als "owner" eintragen
--   4. Trial-Periode setzen (14 Tage)
-- 
-- Bei späteren Team-Einladungen wird das anders gehandhabt
-- (separater Code-Pfad, kein Auto-Workspace).
-- ───────────────────────────────────────────────────────────────────────────

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
    -- Name aus Metadata oder Email-Prefix ableiten
    v_user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    -- 1. public.users anlegen
    INSERT INTO public.users (id, email, email_verified, name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email_confirmed_at IS NOT NULL,
        v_user_name,
        NOW(),
        NOW()
    );
    
    -- 2. Solo-Workspace anlegen (Default Trial 14 Tage)
    INSERT INTO public.workspaces (
        typ, name, abo_tier, abo_status, abo_trial_endet_am
    )
    VALUES (
        'solo',
        v_user_name || ' — Solo-Workspace',
        'solo',
        'trial',
        NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_workspace_id;
    
    -- 3. User als Owner des eigenen Workspaces eintragen
    INSERT INTO public.workspace_memberships (
        workspace_id, user_id, rolle,
        can_invite_members, can_manage_billing, can_export_data, can_delete_records,
        accepted_at
    )
    VALUES (
        v_workspace_id, NEW.id, 'owner',
        TRUE, TRUE, TRUE, TRUE,
        NOW()
    );
    
    -- 4. Audit-Eintrag
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

-- Trigger an auth.users hängen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ───────────────────────────────────────────────────────────────────────────
-- get_user_workspaces() — Helper für RLS
-- Liefert alle Workspace-IDs in denen der eingeloggte User aktiv ist
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT workspace_id
    FROM public.workspace_memberships
    WHERE user_id = auth.uid()
      AND is_active = TRUE
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- has_role() — Helper für RLS
-- Prüft ob User in Workspace eine bestimmte Rolle hat (oder höher)
-- Hierarchie: owner > admin > sv > assistenz > readonly
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_role(p_workspace_id UUID, p_min_rolle member_rolle)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_memberships m
        WHERE m.workspace_id = p_workspace_id
          AND m.user_id = auth.uid()
          AND m.is_active = TRUE
          AND CASE m.rolle
                WHEN 'owner' THEN 5
                WHEN 'admin' THEN 4
                WHEN 'sv' THEN 3
                WHEN 'assistenz' THEN 2
                WHEN 'readonly' THEN 1
              END >= CASE p_min_rolle
                WHEN 'owner' THEN 5
                WHEN 'admin' THEN 4
                WHEN 'sv' THEN 3
                WHEN 'assistenz' THEN 2
                WHEN 'readonly' THEN 1
              END
    )
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- is_founder() — Marcel-Super-Admin-Check
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_founder FROM public.users WHERE id = auth.uid()),
        FALSE
    )
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Hier passiert die Sicherheit auf DB-Ebene:
-- - SVs sehen NUR Daten ihrer Workspaces
-- - Founder (Marcel) sieht alles im Cockpit
-- - Audit-Trail: INSERT erlaubt, UPDATE/DELETE NIE
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── WORKSPACES ────────────────────────────────────────────────────────────

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Lesen: User sieht Workspaces in denen er Mitglied ist + Founder sieht alle
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT
USING (
    id IN (SELECT public.get_user_workspaces())
    OR public.is_founder()
);

-- Update: nur Owner/Admin
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE
USING (public.has_role(id, 'admin') OR public.is_founder())
WITH CHECK (public.has_role(id, 'admin') OR public.is_founder());

-- Insert: über Trigger automatisch (handle_new_user) — sonst nur Founder
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT
WITH CHECK (public.is_founder());

-- Delete: nur Founder (Soft-Delete via deleted_at empfohlen statt echtem Delete)
CREATE POLICY workspaces_delete ON public.workspaces FOR DELETE
USING (public.is_founder());


-- ─── USERS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Lesen: User sieht eigenes Profil + Profile von Team-Mitgliedern
CREATE POLICY users_select ON public.users FOR SELECT
USING (
    id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.workspace_memberships m1
        JOIN public.workspace_memberships m2 ON m1.workspace_id = m2.workspace_id
        WHERE m1.user_id = auth.uid()
          AND m2.user_id = users.id
          AND m1.is_active = TRUE
          AND m2.is_active = TRUE
    )
    OR public.is_founder()
);

-- Update: nur eigenes Profil (außer Founder)
CREATE POLICY users_update ON public.users FOR UPDATE
USING (id = auth.uid() OR public.is_founder())
WITH CHECK (id = auth.uid() OR public.is_founder());


-- ─── WORKSPACE_MEMBERSHIPS ─────────────────────────────────────────────────

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;

-- Lesen: User sieht eigene Memberships + Memberships seiner Workspaces (für Team-View)
CREATE POLICY memberships_select ON public.workspace_memberships FOR SELECT
USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspaces())
    OR public.is_founder()
);

-- Insert: nur Workspace-Owner/Admin (kann einladen)
CREATE POLICY memberships_insert ON public.workspace_memberships FOR INSERT
WITH CHECK (
    public.has_role(workspace_id, 'admin')
    OR public.is_founder()
);

-- Update: nur Owner/Admin oder eigene Membership (z.B. Einladung annehmen)
CREATE POLICY memberships_update ON public.workspace_memberships FOR UPDATE
USING (
    user_id = auth.uid()
    OR public.has_role(workspace_id, 'admin')
    OR public.is_founder()
);

-- Delete: nur Owner oder Founder
CREATE POLICY memberships_delete ON public.workspace_memberships FOR DELETE
USING (public.has_role(workspace_id, 'owner') OR public.is_founder());


-- ─── USER_SESSIONS ─────────────────────────────────────────────────────────

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- User sieht eigene Sessions + Founder sieht alle (Cockpit)
CREATE POLICY sessions_select ON public.user_sessions FOR SELECT
USING (user_id = auth.uid() OR public.is_founder());

-- User kann eigene Sessions revoken
CREATE POLICY sessions_update ON public.user_sessions FOR UPDATE
USING (user_id = auth.uid() OR public.is_founder());


-- ─── AUDIT_TRAIL ───────────────────────────────────────────────────────────
-- 
-- KRITISCH: INSERT-only! KEIN UPDATE, KEIN DELETE.
-- Auch nicht für Founder. Forensische Integrität.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Lesen: User sieht eigene Audits + Founder sieht alle
CREATE POLICY audit_select ON public.audit_trail FOR SELECT
USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspaces())
    OR public.is_founder()
);

-- Insert: alle authentifizierten User können Audits schreiben (für eigene Aktionen)
CREATE POLICY audit_insert ON public.audit_trail FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- KEIN UPDATE-Policy → standardmäßig blockiert
-- KEIN DELETE-Policy → standardmäßig blockiert
-- Das ist absichtlich so. Audit-Trail ist immutable.


-- ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON public.notifications FOR SELECT
USING (user_id = auth.uid() OR public.is_founder());

CREATE POLICY notifications_update ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Insert: System-Functions (über Service-Role-Key) — kein User-Insert direkt
CREATE POLICY notifications_insert ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR public.is_founder());


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (zum Testen nach Run)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Nach erfolgreichem Run kannst Du diese Queries ausführen um zu prüfen
-- dass alles steht:
-- 
--   SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
--   -- Erwartet: workspace_typ, abo_tier, abo_status, member_rolle, ki_provider, audit_action, notification_kategorie
-- 
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--   -- Erwartet: audit_trail, notifications, user_sessions, users, workspace_memberships, workspaces
-- 
--   SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
--   -- Erwartet: get_user_workspaces, handle_new_user, has_role, is_founder, set_updated_at
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- ENDE PHASE 1
-- 
-- Nächster Schritt: Phase 2 (Kontakte, Aufträge, Befunde, Messwerte)
-- ═══════════════════════════════════════════════════════════════════════════
