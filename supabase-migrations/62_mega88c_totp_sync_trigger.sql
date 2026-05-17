-- =====================================================================
-- MEGA⁸⁸-C Block A — TOTP-Sync-Trigger auth.mfa_factors → users.totp_enabled
-- File: supabase-migrations/62_mega88c_totp_sync_trigger.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--         name=mega88c_totp_sync_trigger query=<dieser Inhalt>
--
-- Bug: public.users.totp_enabled drifted away von auth.mfa_factors-Wahrheit.
-- Supabase MFA-API arbeitet ausschliesslich auf auth.mfa_factors. Unsere
-- App-Logic (generate-mfa-recovery-codes, verify-mfa-recovery-code, account-
-- 2fa-status.html) liest aber users.totp_enabled — Konsistenz nicht garantiert.
--
-- Fix: AFTER-Trigger auf auth.mfa_factors syncronisiert users.totp_enabled
-- + users.totp_last_used_at automatisch bei jedem INSERT/UPDATE/DELETE.
--
-- Idempotent: DROP TRIGGER IF EXISTS + CREATE OR REPLACE FUNCTION.
-- =====================================================================

-- Sync-Function
CREATE OR REPLACE FUNCTION public.sync_users_totp_from_factors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Wenn factor verified wird/ist → totp_enabled=true setzen
  IF TG_OP <> 'DELETE' AND NEW.status = 'verified' THEN
    UPDATE public.users
      SET totp_enabled = true,
          totp_last_used_at = NOW()
    WHERE id = NEW.user_id;
  -- Wenn factor unverified/geloescht UND kein anderer verified-Factor existiert → totp_enabled=false
  ELSIF (TG_OP = 'DELETE' OR NEW.status = 'unverified')
       AND NOT EXISTS (
         SELECT 1 FROM auth.mfa_factors
         WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
           AND status = 'verified'
       ) THEN
    UPDATE public.users
      SET totp_enabled = false
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

COMMENT ON FUNCTION public.sync_users_totp_from_factors() IS
  'MEGA88-C: Syncronisiert users.totp_enabled aus auth.mfa_factors-Status. '
  || 'verified → totp_enabled=true + totp_last_used_at=NOW. '
  || 'unverified/delete OHNE anderen verified-Factor → totp_enabled=false.';

-- Trigger neu anlegen (idempotent)
DROP TRIGGER IF EXISTS sync_totp_enabled_on_factor_change ON auth.mfa_factors;
CREATE TRIGGER sync_totp_enabled_on_factor_change
AFTER INSERT OR UPDATE OR DELETE ON auth.mfa_factors
FOR EACH ROW
EXECUTE FUNCTION public.sync_users_totp_from_factors();

-- Backfill: existing users mit verified-Factors syncen
UPDATE public.users u
  SET totp_enabled = true
WHERE EXISTS (
  SELECT 1 FROM auth.mfa_factors f
  WHERE f.user_id = u.id AND f.status = 'verified'
) AND COALESCE(u.totp_enabled, false) = false;

-- Backfill: users ohne verified-Factor sollen totp_enabled=false haben
UPDATE public.users u
  SET totp_enabled = false
WHERE COALESCE(u.totp_enabled, false) = true
  AND NOT EXISTS (
    SELECT 1 FROM auth.mfa_factors f
    WHERE f.user_id = u.id AND f.status = 'verified'
  );
