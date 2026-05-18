-- =====================================================================
-- MEGA⁸⁹ Block E — Suspicious-Activity-Detection View
-- File: supabase-migrations/71_mega89_suspicious_activity_view.sql
-- =====================================================================
-- Status: VORBEREITET — Marcel applied via MCP.
--
-- View aggregiert User+Workspace+Login+Auftraege und klassifiziert:
--   - high_suspicion: 3+ Logins + 0 Aufträge + 7+ Tage seit Register
--   - medium_suspicion: 1+ Login + 0 Aufträge + 14+ Tage seit Register
--   - normal: alles andere
--
-- Anwendung: admin-kpis.html Suspicious-Section liest die View und
-- erlaubt 1-Click-Sperren via auth.users.banned_until.
-- =====================================================================

CREATE OR REPLACE VIEW public.suspicious_activity_v1 AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  w.abo_status,
  w.abo_trial_endet_am,
  u.id AS user_id,
  u.email,
  u.created_at AS user_created,
  EXTRACT(DAY FROM NOW() - u.created_at)::int AS days_since_register,
  COALESCE(login_stats.count_30d, 0)::int AS login_count_30d,
  COALESCE(auftraege_stats.count_total, 0)::int AS auftraege_count,
  u.last_login_at,
  u.last_active_at,
  CASE
    WHEN COALESCE(login_stats.count_30d, 0) >= 3
         AND COALESCE(auftraege_stats.count_total, 0) = 0
         AND EXTRACT(DAY FROM NOW() - u.created_at) >= 7
    THEN 'high_suspicion'
    WHEN COALESCE(login_stats.count_30d, 0) >= 1
         AND COALESCE(auftraege_stats.count_total, 0) = 0
         AND EXTRACT(DAY FROM NOW() - u.created_at) >= 14
    THEN 'medium_suspicion'
    ELSE 'normal'
  END AS suspicion_level
FROM public.workspaces w
JOIN public.workspace_memberships wm
  ON wm.workspace_id = w.id AND wm.rolle = 'owner' AND wm.is_active = true
JOIN public.users u ON u.id = wm.user_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count_30d
  FROM public.user_sessions us
  WHERE us.user_id = u.id AND us.started_at > NOW() - INTERVAL '30 days'
) login_stats ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count_total
  FROM public.auftraege a
  WHERE a.workspace_id = w.id AND a.deleted_at IS NULL
) auftraege_stats ON true
WHERE w.deleted_at IS NULL
  AND (
    (COALESCE(login_stats.count_30d, 0) >= 1
     AND COALESCE(auftraege_stats.count_total, 0) = 0
     AND EXTRACT(DAY FROM NOW() - u.created_at) >= 7)
  );

COMMENT ON VIEW public.suspicious_activity_v1 IS
  'MEGA89 Block E: Filtert Workspace-Owner mit verdächtigem Verhalten — '
  || 'mind. 1 Login aber 0 Aufträge UND mind. 7 Tage seit Register. '
  || 'suspicion_level: high (3+ Logins + 7d) | medium (1+ Login + 14d) | normal (gefiltert raus).';

-- View ist SECURITY INVOKER (default) — Marcel als super-admin (via Cockpit-Frontend
-- mit Marcel-Email-Allow-List + admin.* Subdomain-Check) hat SELECT auf alle Quellen.
GRANT SELECT ON public.suspicious_activity_v1 TO authenticated;
