-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁷ C2 — Vault-Helper-Functions
-- Datum: 2026-05-08
-- Status: APPLIED via Supabase MCP (m37_c2_vault_helpers)
-- Voraussetzung: vault-Extension installed (verified v0.3.1)
-- ═══════════════════════════════════════════════════════════════════

-- get_vault_secret: Liefert decrypted_secret. NUR service_role!
CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  result TEXT;
BEGIN
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only service_role can read vault secrets';
  END IF;
  SELECT decrypted_secret INTO result
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN result;
END;
$$;

-- has_vault_secret: Existenz-Check (kein Wert!) — authenticated readable
CREATE OR REPLACE FUNCTION public.has_vault_secret(secret_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = secret_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_vault_secret(TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.has_vault_secret(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_vault_secret(TEXT) IS
  'M³⁷ C2 — Liefert ein Vault-Secret als Klartext. NUR service_role!';
COMMENT ON FUNCTION public.has_vault_secret(TEXT) IS
  'M³⁷ C2 — Prüft ob ein Vault-Secret existiert. Authenticated-readable (Existenz, kein Wert).';
