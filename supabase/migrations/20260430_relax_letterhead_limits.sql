-- ============================================================
-- PROVA Migration — letterheads Storage-Bucket: relax limits
-- Sprint K-UI Hotfix X1 (29.04.2026)
--
-- Zweck: Server-side Bucket-Limits an neues Frontend-Limit anpassen
--        - file_size_limit: 200 KB -> 5 MB
--        - allowed_mime_types: + image/svg+xml
--
-- Frontend-Aenderung in profil-supabase-logic.js:
--   MAX_BYTES = 5 * 1024 * 1024
--   ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml']
--
-- Ohne diese Migration: Frontend laesst 5 MB durch, Bucket lehnt
-- mit "Payload too large" 413 ab + SVG-Uploads fail mit 415.
--
-- Idempotent — UPDATE auf existing bucket. RLS-Policies bleiben
-- unveraendert (siehe 20260429_add_letterhead_config.sql).
-- ============================================================

UPDATE storage.buckets
SET
    file_size_limit    = 5 * 1024 * 1024,                    -- 5 MB
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml']::text[]
WHERE id = 'letterheads';

-- Sanity-Check: zeigt aktuelle Werte
DO $$
DECLARE
    v_limit BIGINT;
    v_mimes TEXT[];
BEGIN
    SELECT file_size_limit, allowed_mime_types
      INTO v_limit, v_mimes
      FROM storage.buckets
      WHERE id = 'letterheads';

    IF v_limit IS NULL THEN
        RAISE EXCEPTION 'letterheads-Bucket nicht gefunden — erst 20260429_add_letterhead_config.sql laufen lassen';
    END IF;

    RAISE NOTICE 'letterheads-Bucket: file_size_limit=% Bytes (% MB), mime_types=%',
        v_limit, ROUND(v_limit::numeric / 1024 / 1024, 2), v_mimes;
END $$;

-- ============================================================
-- Marcel-Workflow:
--   1. Im Supabase-Dashboard SQL-Editor diese Migration ausfuehren
--      (oder lokal: supabase db push)
--   2. Sanity-Output pruefen: "file_size_limit=5242880 Bytes (5.00 MB)"
--   3. profil-supabase.html testen: 5 MB Datei + SVG hochladen
-- ============================================================
