-- ════════════════════════════════════════════════════════════════════════
-- MEGA³² W12b-I4 — 2FA Foundation Complete (Schema-Reconciled)
-- Datum: 2026-05-11
-- Quelle: docs/master/PROVA-SUPABASE-SCHEMA-REFERENCE.md (W12-I0 Audit)
--
-- Schema-Status nach W12-I0:
--   ✅ users.totp_secret existiert bereits
--   ✅ users.totp_enabled existiert bereits
--   ❌ users.totp_recovery_codes fehlt
--   ❌ users.totp_last_used_at fehlt
--   ❌ users.totp_setup_started_at fehlt
--
-- Diese Migration ergänzt nur die 3 fehlenden Spalten (NICHT alle 5 wie alte W9-Migration).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_recovery_codes TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS totp_last_used_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS totp_setup_started_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.users.totp_recovery_codes IS
  '10 Backup-Codes XXXX-XXXX-Format (verschlüsselt mit AES-256-GCM via TWO_FACTOR_ENCRYPTION_KEY).';
COMMENT ON COLUMN public.users.totp_last_used_at IS
  'Letzter erfolgreicher TOTP-Verify (Replay-Window-Check).';
COMMENT ON COLUMN public.users.totp_setup_started_at IS
  'Setup-Initiated-Timestamp — falls verify nicht binnen 24h: Cleanup-Job löscht totp_secret.';
