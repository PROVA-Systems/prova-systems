-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁵ C2 — RLS Aktivierung für 4 MEGA³⁴ Tabellen
-- Datum: 2026-05-07
-- Zweck: cookie_consents/ical_tokens/onboarding_mails_sent/incidents
--        wurden in M³⁴ ohne RLS angelegt → DSGVO/Multi-Tenancy-Risk.
--        Diese Migration aktiviert RLS + setzt Policies.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

-- ─── cookie_consents (DSGVO Art. 7) ───
-- Anonyme: INSERT-only (vor Login, anonymous_id ist Browser-UUID)
-- Eingeloggt: SELECT WHERE user_id = auth.uid()
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cookie_consents_self_select ON public.cookie_consents;
DROP POLICY IF EXISTS cookie_consents_insert ON public.cookie_consents;
DROP POLICY IF EXISTS cookie_consents_service_all ON public.cookie_consents;

CREATE POLICY cookie_consents_self_select ON public.cookie_consents
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY cookie_consents_insert ON public.cookie_consents
  FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

CREATE POLICY cookie_consents_service_all ON public.cookie_consents
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── ical_tokens ───
-- User sieht nur eigene Tokens.
ALTER TABLE public.ical_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ical_tokens_self ON public.ical_tokens;
DROP POLICY IF EXISTS ical_tokens_service_all ON public.ical_tokens;

CREATE POLICY ical_tokens_self ON public.ical_tokens
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ical_tokens_service_all ON public.ical_tokens
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── onboarding_mails_sent ───
-- Service-Role-only (Cron); User sieht eigene Lese-Refs.
ALTER TABLE public.onboarding_mails_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_mails_self_read ON public.onboarding_mails_sent;
DROP POLICY IF EXISTS onboarding_mails_service_all ON public.onboarding_mails_sent;

CREATE POLICY onboarding_mails_self_read ON public.onboarding_mails_sent
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY onboarding_mails_service_all ON public.onboarding_mails_sent
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── incidents (Public-Read für Status-Page) ───
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incidents_public_read ON public.incidents;
DROP POLICY IF EXISTS incidents_service_write ON public.incidents;

CREATE POLICY incidents_public_read ON public.incidents
  FOR SELECT USING (true);

CREATE POLICY incidents_service_write ON public.incidents
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── COMMENTS ───
COMMENT ON POLICY cookie_consents_self_select ON public.cookie_consents IS
  'MEGA³⁵ C2: User sieht nur eigene Einwilligungen';
COMMENT ON POLICY ical_tokens_self ON public.ical_tokens IS
  'MEGA³⁵ C2: User sieht/edit nur eigene iCal-Tokens';
COMMENT ON POLICY incidents_public_read ON public.incidents IS
  'MEGA³⁵ C2: Public-Read für Status-Page (prova-systems.de/status)';
