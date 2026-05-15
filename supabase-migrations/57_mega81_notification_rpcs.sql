-- =====================================================================
-- MEGA⁸¹ Phase B.1+B.2 — Notification-RPC-Helpers + Index
-- File: supabase-migrations/57_mega81_notification_rpcs.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply-Path: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--             name=mega81_notification_rpcs query=<dieser Inhalt>
--
-- 4 RPC-Functions für Notifications-Bell + Inbox-Widget:
--   notifications_unread_count()           — int
--   notifications_list(limit, kat, unread) — rows
--   notifications_mark_read(id)            — boolean (true wenn gefunden+geupdatet)
--   notifications_mark_all_read()          — int (Anzahl gemarkter)
--
-- Alle 4 nutzen auth.uid() statt p_user_id — RLS-konform, kein Spoofing möglich.
-- SECURITY INVOKER (Default) — RLS-Policies auf notifications-Tabelle greifen.
--
-- Schema-Wahrheit (per MCP 2026-05-15 verifiziert):
--   notifications: id, user_id, workspace_id, kategorie notification_kategorie,
--                  titel, body, link_typ, link_id, link_url, read_at, dismissed_at,
--                  pushed_at, expires_at, created_at
--   Bestehende Indexes:
--     idx_notifications_user_unread     (user_id, created_at DESC) WHERE read_at IS NULL
--     idx_notifications_user_kategorie  (user_id, kategorie, created_at DESC)
--     idx_notifications_expires         (expires_at)
--   NEU in dieser Migration:
--     idx_notifications_user_active     (user_id, created_at DESC) WHERE dismissed_at IS NULL
-- =====================================================================

-- ── 1. notifications_unread_count ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notifications_unread_count()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::int
  FROM public.notifications n
  WHERE n.user_id = auth.uid()
    AND n.read_at IS NULL
    AND n.dismissed_at IS NULL
    AND (n.expires_at IS NULL OR n.expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.notifications_unread_count() FROM public;
GRANT EXECUTE ON FUNCTION public.notifications_unread_count() TO authenticated;

COMMENT ON FUNCTION public.notifications_unread_count() IS
  'MEGA81 — Bell-Badge: Anzahl ungelesener+nicht-dismissed+nicht-expired Notifications für auth.uid().';

-- ── 2. notifications_list ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notifications_list(
  p_limit      integer DEFAULT 30,
  p_kategorie  text    DEFAULT NULL,
  p_only_unread boolean DEFAULT false
)
RETURNS TABLE (
  id          uuid,
  workspace_id uuid,
  kategorie   text,
  titel       text,
  body        text,
  link_typ    text,
  link_id     uuid,
  link_url    text,
  read_at     timestamptz,
  created_at  timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT n.id, n.workspace_id, n.kategorie::text, n.titel, n.body,
         n.link_typ, n.link_id, n.link_url, n.read_at, n.created_at
  FROM public.notifications n
  WHERE n.user_id = auth.uid()
    AND n.dismissed_at IS NULL
    AND (n.expires_at IS NULL OR n.expires_at > now())
    AND (p_kategorie IS NULL OR n.kategorie::text = p_kategorie)
    AND (NOT p_only_unread OR n.read_at IS NULL)
  ORDER BY (n.read_at IS NULL) DESC, n.created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;

REVOKE ALL ON FUNCTION public.notifications_list(integer, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.notifications_list(integer, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.notifications_list(integer, text, boolean) IS
  'MEGA81 — Bell-Inbox-List. Ungelesene zuerst, dann nach created_at DESC. Filter: kategorie + only_unread. Max 100.';

-- ── 3. notifications_mark_read ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notifications_mark_read(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_id AND user_id = auth.uid();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_mark_read(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.notifications_mark_read(uuid) TO authenticated;

COMMENT ON FUNCTION public.notifications_mark_read(uuid) IS
  'MEGA81 — Eine Notification als gelesen markieren. Liefert true wenn gefunden+geupdatet.';

-- ── 4. notifications_mark_all_read ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notifications_mark_all_read()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND dismissed_at IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.notifications_mark_all_read() FROM public;
GRANT EXECUTE ON FUNCTION public.notifications_mark_all_read() TO authenticated;

COMMENT ON FUNCTION public.notifications_mark_all_read() IS
  'MEGA81 — Alle ungelesenen+aktiven Notifications des Users als gelesen markieren. Liefert Anzahl.';

-- ── Index ─────────────────────────────────────────────────────────────
-- Für `notifications_list` ohne kategorie-Filter — bestehende Indexes
-- decken nur (user_id WHERE read_at IS NULL) und (user_id, kategorie) ab.
CREATE INDEX IF NOT EXISTS idx_notifications_user_active
  ON public.notifications (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;
