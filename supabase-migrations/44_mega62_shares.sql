-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶² Phase 0 Item 0.5 — shares (Versand-Stufe 2 Platform-Link)
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega62_shares
-- ═══════════════════════════════════════════════════════════════════
-- Vorbereitung Q2/Q3 2026: Token + Passwort-geschuetzte Dokument-Links
-- mit Auto-Expire + max_zugriffe-Limit + Revoke. Schema jetzt damit
-- spaeter kein Migration-Hassle.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dokument_id UUID NOT NULL REFERENCES public.dokumente(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  token TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  empfaenger_email TEXT NOT NULL,
  empfaenger_name TEXT,
  valid_until TIMESTAMPTZ NOT NULL,
  max_zugriffe INTEGER NOT NULL DEFAULT 10 CHECK (max_zugriffe > 0),
  zugriffe_count INTEGER NOT NULL DEFAULT 0 CHECK (zugriffe_count >= 0),
  erstellt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  erstellt_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  letzter_zugriff_at TIMESTAMPTZ,
  letzter_zugriff_ip INET,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.shares IS
  'Versand-Stufe-2 (Platform-Link mit Passwort + Ablauf). MEGA62 Schema vorbereitet, Aktivierung Q2/Q3 2026. Pattern: Token + bcrypt password_hash, max_zugriffe-Limit, Auto-Expire via valid_until, revoke moeglich.';

COMMENT ON COLUMN public.shares.token IS 'Random 32-Char Token in URL — UNIQUE Constraint.';
COMMENT ON COLUMN public.shares.password_hash IS 'bcrypt-Hash des Empfaenger-Passworts (clear-text wird per separatem Channel uebermittelt).';
COMMENT ON COLUMN public.shares.zugriffe_count IS 'Wird bei jedem erfolgreichen Zugriff inkrementiert; Lock bei >= max_zugriffe.';

CREATE INDEX IF NOT EXISTS idx_shares_token
  ON public.shares(token) WHERE revoked_at IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shares_dokument
  ON public.shares(dokument_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shares_workspace
  ON public.shares(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shares_valid_until
  ON public.shares(valid_until)
  WHERE revoked_at IS NULL AND deleted_at IS NULL;

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shares_select ON public.shares;
CREATE POLICY shares_select ON public.shares
  FOR SELECT
  USING ((workspace_id IN (SELECT get_user_workspaces())) OR is_founder());

DROP POLICY IF EXISTS shares_modify ON public.shares;
CREATE POLICY shares_modify ON public.shares
  FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces()))
  WITH CHECK (workspace_id IN (SELECT get_user_workspaces()));
