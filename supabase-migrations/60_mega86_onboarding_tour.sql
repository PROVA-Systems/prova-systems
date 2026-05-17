-- =====================================================================
-- MEGA⁸⁶ Block D — Onboarding-Tour persistence
-- File: supabase-migrations/60_mega86_onboarding_tour.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--         name=mega86_onboarding_tour query=<dieser Inhalt>
--
-- Ergänzt user_workflow_settings um 2 Spalten für Trial-Onboarding-Tour.
-- Idempotent (IF NOT EXISTS).
-- =====================================================================

ALTER TABLE public.user_workflow_settings
  ADD COLUMN IF NOT EXISTS onboarding_tour_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_tour_completed_at timestamptz;

COMMENT ON COLUMN public.user_workflow_settings.onboarding_tour_completed IS
  'MEGA86 D: User hat 5-Step Onboarding-Tour durchklickt oder geskippt.';
COMMENT ON COLUMN public.user_workflow_settings.onboarding_tour_completed_at IS
  'MEGA86 D: Zeitpunkt des Tour-Completion (NULL = nie gesehen).';
