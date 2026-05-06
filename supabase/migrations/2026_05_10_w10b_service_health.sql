-- ════════════════════════════════════════════════════════════════════════
-- MEGA³⁰ W10b-I7 — Service-Health Foundation
-- Datum: 2026-05-10
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.service_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,                  -- 'supabase' | 'stripe' | 'resend' | 'openai' | 'pdfmonkey' | 'frontend'
  status TEXT NOT NULL,                   -- 'up' | 'degraded' | 'down'
  latency_ms INTEGER NULL,
  detail TEXT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_health_service_time ON public.service_health(service, checked_at DESC);

-- RLS: Public-Read (für status.html-Page ohne Login)
ALTER TABLE public.service_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_health_public_read" ON public.service_health;
CREATE POLICY "service_health_public_read" ON public.service_health
  FOR SELECT USING (true);

COMMENT ON TABLE public.service_health IS
  'Status-Page: 6 Services × Periodic Checks. MEGA³⁰ W10b-I7. Public-Readable für Trust-Signal.';
