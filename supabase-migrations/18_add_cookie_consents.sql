-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁴ A1 — cookie_consents Audit-Trail
-- Datum: 2026-05-07
-- Zweck: DSGVO Art. 7 — Beweispflicht der Einwilligung. Audit-Trail
--        für Cookie-Consent-Entscheidungen (anonymous_id + json).
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT,                    -- Browser-side erzeugte UUID (für Re-Audits)
  user_id      UUID,                    -- optional, falls eingeloggt
  consent      JSONB NOT NULL,          -- { necessary, analytics, marketing, ts }
  page         TEXT,                    -- /, /pricing, /datenschutz...
  user_agent   TEXT,
  ip_country   TEXT,                    -- nur Land-Code, kein voller IP-Speicher (DSGVO)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cookie_consents_user_id
  ON public.cookie_consents(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cookie_consents_created
  ON public.cookie_consents(created_at DESC);

COMMENT ON TABLE public.cookie_consents IS
  'MEGA³⁴ A1 — DSGVO Art. 7 Audit-Trail für Cookie-Einwilligungen.';
COMMENT ON COLUMN public.cookie_consents.consent IS
  '{necessary:true, analytics:bool, marketing:bool, ts:ISO}';
