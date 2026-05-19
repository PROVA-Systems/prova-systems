-- =====================================================================
-- MEGA⁸⁸-D Block B — Founding-Status + Stripe-Coupon-Assignment
-- File: supabase-migrations/63_mega88d_founding_status.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP.
-- Apply: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--         name=mega88d_founding_status query=<dieser Inhalt>
--
-- Trennt Standard-Trial (14d) von Founding/Pilot-Trial (90d) auf Workspace-Ebene.
-- Plus User-spezifischer Coupon-Slot (statt hartcoded FOUNDING-99).
-- Idempotent.
-- =====================================================================

-- Drei-stufige Klassifizierung
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS founding_status text
    CHECK (founding_status IN ('standard', 'founding_member', 'pilot_tester'))
    DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS founding_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_coupon_assigned text;

COMMENT ON COLUMN public.workspaces.founding_status IS
  'MEGA88-D: Onboarding-Sondergruppen. standard=14d Trial (Default); founding_member/pilot_tester=90d Trial + persönlicher Stripe-Coupon. Frontend zeigt FOUNDING-99 NICHT mehr global an — Coupon wird beim Checkout per workspaces.stripe_coupon_assigned automatisch angewendet.';
COMMENT ON COLUMN public.workspaces.founding_assigned_at IS
  'MEGA88-D: Zeitpunkt der Founding-Zuweisung (NULL für Standard-User).';
COMMENT ON COLUMN public.workspaces.stripe_coupon_assigned IS
  'MEGA88-D: User-spezifischer Stripe-Coupon-Code (z.B. FOUNDING-99-MARCEL01). NUR in DB sichtbar, NICHT im Frontend hardcoded. Wird via Stripe Checkout-Session pre-applied.';

-- Backfill: existing workspaces sind standard (DEFAULT greift fuer alte Rows mit NULL)
UPDATE public.workspaces SET founding_status = 'standard' WHERE founding_status IS NULL;

-- Index für Admin-Queries (Founding-Cohort-Listings im admin-kpis Cockpit)
CREATE INDEX IF NOT EXISTS workspaces_founding_status_idx
  ON public.workspaces (founding_status)
  WHERE founding_status <> 'standard';
