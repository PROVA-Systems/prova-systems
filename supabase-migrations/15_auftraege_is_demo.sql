-- ════════════════════════════════════════════════════════════════════════════
-- PROVA — Migration 15: auftraege.is_demo Flag (MEGA²⁸ KORR-2 / D2)
-- 2026-05-10
--
-- Demo-Fall SCH-DEMO-001 wird bei Onboarding angelegt. is_demo=TRUE Flag
-- ermöglicht Filter, Empty-States linken auf Demo, "Demo-Fall entfernen" Button.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.auftraege
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auftraege_is_demo ON public.auftraege(is_demo)
  WHERE is_demo = TRUE;

COMMENT ON COLUMN public.auftraege.is_demo IS
  'TRUE wenn Auto-generierter Demo-Fall (z.B. SCH-DEMO-001 nach Onboarding). Filter via Empty-States + Lösch-Button in Settings.';
