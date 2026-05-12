-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶² Fix — search_path-Pin fuer update_ki_wirkung_timestamp
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega62_fix_wirkung_search_path
-- ═══════════════════════════════════════════════════════════════════
-- Supabase Security-Advisor: function_search_path_mutable (WARN)
-- Lint-Rule: 0011_function_search_path_mutable
-- Fix: SET search_path = public, pg_temp pinnen.
-- find_similar_fragments hatte den Pin bereits (SET search_path = public).
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_ki_wirkung_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.wirkung IS DISTINCT FROM OLD.wirkung AND NEW.wirkung <> 'vorschlag' THEN
    NEW.wirkung_set_at := NOW();
    BEGIN
      NEW.wirkung_set_by := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      NEW.wirkung_set_by := NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;
