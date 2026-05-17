-- =====================================================================
-- MEGA⁸⁷ Block C — TOTP Recovery-Codes Metadata
-- File: supabase-migrations/61_mega87_totp_recovery_codes_meta.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--         name=mega87_totp_recovery_codes_meta query=<dieser Inhalt>
--
-- public.users.totp_recovery_codes existiert bereits als ARRAY-Column.
-- Migration 61 ergaenzt 2 Metadata-Spalten + 1 Index:
--   - totp_recovery_codes_generated_at: wann wurden die 10 Codes zuletzt generiert
--   - totp_recovery_codes_used_count: wieviele wurden bereits verbraucht
-- Idempotent (IF NOT EXISTS).
-- =====================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_recovery_codes_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS totp_recovery_codes_used_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.totp_recovery_codes_generated_at IS
  'MEGA87: Zeitpunkt der letzten Recovery-Code-Generation (10 Codes auf einmal).';
COMMENT ON COLUMN public.users.totp_recovery_codes_used_count IS
  'MEGA87: Anzahl bereits verbrauchter Recovery-Codes (max 10). Bei =10 muss user neue generieren.';

-- Partial-Index fuer 2FA-aktive User (Performance bei Admin-Listings)
CREATE INDEX IF NOT EXISTS users_totp_enabled_idx
  ON public.users (totp_enabled)
  WHERE totp_enabled = true;
