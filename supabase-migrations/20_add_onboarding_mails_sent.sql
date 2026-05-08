-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁴ B2 — onboarding_mails_sent Idempotenz-Log
-- Datum: 2026-05-07
-- Zweck: Onboarding-Cron sendet pro (user_id, template) nur einmal.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.onboarding_mails_sent (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  template      TEXT NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  error_reason  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_mails_unique
  ON public.onboarding_mails_sent(user_id, template);

CREATE INDEX IF NOT EXISTS idx_onboarding_mails_sent_at
  ON public.onboarding_mails_sent(sent_at DESC);

COMMENT ON TABLE public.onboarding_mails_sent IS
  'MEGA³⁴ B2 — Idempotenz-Log für Onboarding-Cron (Day 0/1/3/7/14).';
