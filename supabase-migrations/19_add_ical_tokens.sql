-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁴ A4 — ical_tokens für Subscribe-URL-Token-Revocation
-- Datum: 2026-05-07
-- Zweck: User kann Calendar-Subscribe-Token erneuern oder revoken.
--        token_hash gespeichert (nicht der Klartext-Token).
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ical_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  token_hash   TEXT NOT NULL,                    -- SHA-256 des Tokens
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ical_tokens_user
  ON public.ical_tokens(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ical_tokens_hash
  ON public.ical_tokens(token_hash) WHERE revoked_at IS NULL;

COMMENT ON TABLE public.ical_tokens IS
  'MEGA³⁴ A4 — Signed-Token-Revocation für iCal-Subscribe-URLs (RFC 5545 + DSGVO).';
