-- ============================================================
-- PROVA Migration 40 — M⁴² P8: RLS-Security-Fix
-- Date: 2026-05-08
-- ============================================================
-- Phase 0 Live-State-Audit identifizierte 2 Tabellen ohne RLS:
--   - public.system_health_history (M⁴¹ P3 Migration 38)
--   - public.push_alert_log         (M⁴¹ P3 Migration 38)
-- Beide enthalten Service-Health-Daten (sensitiv) und Alert-Logs.
-- Ohne RLS kann jeder Anon-Caller alle Rows lesen/schreiben.
--
-- Fix: RLS aktivieren + Service-Role-only Policies.
-- (Frontend/User braucht keinen Direct-Access — nur via Lambdas.)
-- ============================================================

-- 1. system_health_history
ALTER TABLE public.system_health_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS health_history_admin_select ON public.system_health_history;
DROP POLICY IF EXISTS health_history_service_insert ON public.system_health_history;

-- Nur Service-Role (Lambdas) darf SELECT
CREATE POLICY health_history_admin_select
  ON public.system_health_history
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Nur Service-Role darf INSERT (health-check-cron)
CREATE POLICY health_history_service_insert
  ON public.system_health_history
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 2. push_alert_log
ALTER TABLE public.push_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_alert_admin_select ON public.push_alert_log;
DROP POLICY IF EXISTS push_alert_service_insert ON public.push_alert_log;

CREATE POLICY push_alert_admin_select
  ON public.push_alert_log
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY push_alert_service_insert
  ON public.push_alert_log
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- Verifikation (nach Apply ausführen):
--   SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname='public'
--      AND tablename IN ('system_health_history','push_alert_log');
-- Erwartung: rowsecurity=true für beide.
--
--   SELECT * FROM pg_policies
--    WHERE tablename IN ('system_health_history','push_alert_log');
-- Erwartung: 4 Policies (2 pro Tabelle).
-- ============================================================
