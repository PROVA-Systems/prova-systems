-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁷ C1 — service_endpoints (Make-Webhooks + APIs)
-- Datum: 2026-05-08
-- Status: APPLIED via Supabase MCP (m37_c1_service_endpoints)
-- Idempotent: CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING
--
-- Ersetzt Marcel-Direktive: KEIN MAKE_WEBHOOKS_JSON in Netlify mehr,
-- alle Webhook-URLs in dieser Tabelle. lib/service-endpoints-cache.js
-- (M³⁷ C4) liest aus list-service-endpoints-Lambda.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.service_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT UNIQUE NOT NULL,         -- 'make:l3-lifecycle-trial'
  endpoint_url TEXT NOT NULL,
  service_type TEXT NOT NULL,               -- 'make' | 'webhook' | 'api'
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  workspace_id UUID,                        -- NULL für globale Endpoints
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_endpoints_read_authenticated" ON public.service_endpoints;
DROP POLICY IF EXISTS "service_endpoints_write_service_role"  ON public.service_endpoints;

CREATE POLICY "service_endpoints_read_authenticated"
  ON public.service_endpoints FOR SELECT
  USING (active = TRUE);

CREATE POLICY "service_endpoints_write_service_role"
  ON public.service_endpoints FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS service_endpoints_active_idx
  ON public.service_endpoints(service_type, active) WHERE active = TRUE;

-- SEED mit 10 Make-Webhooks (PLACEHOLDER-URLs, Marcel UPDATE manuell!)
-- active=FALSE damit der Cache kein Fake-Hook anzieht — Marcel SET active=TRUE
-- nach UPDATE der echten URL (siehe MEGA37-MARCEL-VAULT-MIGRATION.md).
INSERT INTO public.service_endpoints (service_key, endpoint_url, service_type, description, active) VALUES
  ('make:g1-gutachten',         'https://hook.eu1.make.com/PLACEHOLDER_G1', 'make', 'G1 Gutachten-Workflow', FALSE),
  ('make:g3-pdf',               'https://hook.eu1.make.com/PLACEHOLDER_G3', 'make', 'G3 PDF-Generation', FALSE),
  ('make:k2-kommunikation',     'https://hook.eu1.make.com/PLACEHOLDER_K2', 'make', 'K2 Kommunikation', FALSE),
  ('make:l3-lifecycle-trial',   'https://hook.eu1.make.com/PLACEHOLDER_L3', 'make', 'L3 Lifecycle Trial-Start', FALSE),
  ('make:l8-lifecycle-renewal', 'https://hook.eu1.make.com/PLACEHOLDER_L8', 'make', 'L8 Lifecycle Renewal', FALSE),
  ('make:l9-lifecycle-cancel',  'https://hook.eu1.make.com/PLACEHOLDER_L9', 'make', 'L9 Lifecycle Cancel', FALSE),
  ('make:l10-lifecycle-final',  'https://hook.eu1.make.com/PLACEHOLDER_L10','make', 'L10 Lifecycle Final', FALSE),
  ('make:a5-admin',             'https://hook.eu1.make.com/PLACEHOLDER_A5', 'make', 'A5 Admin-Notification', FALSE),
  ('make:t3-termine',           'https://hook.eu1.make.com/PLACEHOLDER_T3', 'make', 'T3 Termine', FALSE),
  ('make:f1-finanzen',          'https://hook.eu1.make.com/PLACEHOLDER_F1', 'make', 'F1 Finanzen', FALSE)
ON CONFLICT (service_key) DO NOTHING;

COMMENT ON TABLE public.service_endpoints IS
  'M³⁷ C1 — Workspace-isolierbare Service-Endpoints. active=FALSE bei SEED-Placeholders.';
