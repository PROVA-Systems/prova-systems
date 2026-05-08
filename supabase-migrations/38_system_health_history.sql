-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁴¹ P3 — system_health_history (Push-Alerts + Uptime)
-- Datum: 2026-05-08
-- Status: PLANNED — Marcel apply via Supabase MCP
-- ═══════════════════════════════════════════════════════════════════
--
-- Speichert Health-Check-Ergebnisse pro Service über Zeit für:
--   - Uptime-Berechnung (24h/7d/30d)
--   - Push-Notification-Trigger (Service down >1 Min → Push)
--   - Throttling-State (max 1 Push/Service/h)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.system_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,                       -- 'stripe' | 'supabase' | 'openai' | 'sentry' | 'pdfmonkey' | 'make_com' | 'netlify' | 'ssl_cert'
  status TEXT NOT NULL,                        -- 'up' | 'degraded' | 'down'
  response_ms INTEGER,
  http_status INTEGER,
  error_msg TEXT,
  metadata JSONB,                              -- z.B. SSL-cert-expires-at, scenario_id für Make.com
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_service_time
  ON public.system_health_history(service, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_status_time
  ON public.system_health_history(status, checked_at DESC) WHERE status != 'up';
CREATE INDEX IF NOT EXISTS idx_health_recent
  ON public.system_health_history(checked_at DESC);

-- Push-Notification-Throttling: pro Service max 1 Push/Stunde
CREATE TABLE IF NOT EXISTS public.push_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  alert_type TEXT NOT NULL,                    -- 'down' | 'recovery' | 'latency' | 'ssl_warning'
  message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status TEXT,                        -- 'sent' | 'failed' | 'throttled'
  vapid_response JSONB
);

CREATE INDEX IF NOT EXISTS idx_push_alert_service_time
  ON public.push_alert_log(service, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_alert_recent
  ON public.push_alert_log(sent_at DESC);

-- Uptime-View: % up pro Service in den letzten 24h/7d/30d
CREATE OR REPLACE VIEW public.v_service_uptime AS
WITH ranges AS (
  SELECT '24h'::TEXT AS range_label, NOW() - INTERVAL '24 hours' AS since
  UNION ALL SELECT '7d', NOW() - INTERVAL '7 days'
  UNION ALL SELECT '30d', NOW() - INTERVAL '30 days'
)
SELECT
  h.service,
  r.range_label,
  COUNT(*) AS check_count,
  COUNT(*) FILTER (WHERE h.status = 'up') AS up_count,
  COUNT(*) FILTER (WHERE h.status = 'degraded') AS degraded_count,
  COUNT(*) FILTER (WHERE h.status = 'down') AS down_count,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE h.status = 'up')::numeric / COUNT(*)::numeric) * 100, 2)
  END AS uptime_prozent,
  ROUND(AVG(h.response_ms))::INTEGER AS avg_response_ms
FROM public.system_health_history h
CROSS JOIN ranges r
WHERE h.checked_at >= r.since
GROUP BY h.service, r.range_label, r.since
ORDER BY h.service, r.range_label;

COMMENT ON VIEW public.v_service_uptime IS
  'MEGA⁴¹ P3: Uptime-Prozente pro Service in 24h/7d/30d-Fenstern.';

-- Latest-Status-View: aktueller Status jedes Services
CREATE OR REPLACE VIEW public.v_service_status_latest AS
SELECT DISTINCT ON (service)
  service,
  status,
  response_ms,
  http_status,
  error_msg,
  metadata,
  checked_at
FROM public.system_health_history
ORDER BY service, checked_at DESC;

COMMENT ON VIEW public.v_service_status_latest IS
  'MEGA⁴¹ P3: Aktueller Status jedes Services (letzter Check pro Service).';

COMMENT ON TABLE public.system_health_history IS 'MEGA⁴¹ P3: Health-Check-History fuer Uptime-Berechnung + Down-Detection.';
COMMENT ON TABLE public.push_alert_log IS 'MEGA⁴¹ P3: Push-Alert-Log fuer Throttling (max 1/Service/h).';
