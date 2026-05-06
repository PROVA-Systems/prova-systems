-- ════════════════════════════════════════════════════════════════════════
-- MEGA²⁹ W9-I1 — AUTH-PERFEKT 2.0 Foundation: TOTP-2FA
-- Datum: 2026-05-10
-- Marcel-Direktive: AUTH-PERFEKT-Foundation in W9, Vollausbau in Welle 11
-- ════════════════════════════════════════════════════════════════════════

-- 2FA-Felder in users-Table (defensive: existiert evtl. schon)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT NULL,                 -- AES-256-GCM verschlüsselt
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS totp_recovery_codes TEXT[] NULL,       -- 10 Codes, AES-256-GCM verschlüsselt
  ADD COLUMN IF NOT EXISTS totp_last_used_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS totp_setup_started_at TIMESTAMPTZ NULL;

-- Index für totp_enabled = TRUE (Performance bei Login-Check)
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled
  ON public.users (totp_enabled) WHERE totp_enabled = TRUE;

-- Audit-Trail für 2FA-Events (in audit_trail-Tabelle, falls existiert)
-- Pattern: function_name = 'auth-2fa-setup'/'auth-2fa-verify'/'auth-2fa-disable'
-- Payload: { user_id, action: 'setup_started|verified|recovery_used|disabled', ts }

-- Comment für Marcel
COMMENT ON COLUMN public.users.totp_secret IS
  'TOTP-Secret AES-256-GCM verschlüsselt mit PROVA_TOTP_ENCRYPTION_KEY. NULL = 2FA noch nicht konfiguriert.';

COMMENT ON COLUMN public.users.totp_enabled IS
  'TRUE wenn 2FA aktiv. Nach Setup erst auf TRUE wenn auth-2fa-verify erfolgreich.';

COMMENT ON COLUMN public.users.totp_recovery_codes IS
  'Array von 10 Recovery-Codes (8-stellig, formatiert XXXX-XXXX), encrypted. Bei Verwendung wird Code aus Array entfernt.';

COMMENT ON COLUMN public.users.totp_last_used_at IS
  'Timestamp letzter erfolgreicher TOTP-Verifikation (für Replay-Protection: Code darf nicht 2× hintereinander genutzt werden).';

-- Anti-Replay-Check via Index (totp_last_used_at + Time-Slot)
CREATE INDEX IF NOT EXISTS idx_users_totp_last_used
  ON public.users (totp_last_used_at) WHERE totp_enabled = TRUE;
