-- ============================================================
-- PROVA Migration — letterhead_config + Storage Bucket "letterheads"
-- Sprint K-FIX (29.04.2026)
--
-- Zweck: Briefkopf-Konfig pro User (Logo, Stempel, Unterschrift,
--        Bankverbindung, USt-IdNr) + Storage für Bilder.
--        Wird von pdf-generate + brief-generate gelesen für
--        automatische Stempel/Unterschrift-Injektion.
-- ============================================================

-- 1. Spalte letterhead_config (JSONB) in public.users
--    Idempotent — IF NOT EXISTS
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS letterhead_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.letterhead_config IS
    'Briefkopf-Konfig pro User. Erwartete Felder: { logo_url, stempel_url, unterschrift_url, briefkopf_zeile_1-3, bank_iban, bank_bic, bank_name, bank_inhaber, ust_id }. URLs sind Storage-Pfade in letterheads-Bucket — Edge Functions erzeugen Signed URLs via createSignedUrl.';

-- 2. Storage-Bucket "letterheads" anlegen (private)
--    Pattern: {user_id}/{type}.{ext}, type ∈ {logo, stempel, unterschrift}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'letterheads',
    'letterheads',
    false,                                          -- privat, RLS schützt
    204800,                                          -- 200 KB max pro Datei (Marcel-Vorgabe)
    ARRAY['image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. RLS-Policies für letterheads-Bucket
--    Pfad-Pattern: <user_id>/<file>.png — User darf nur eigenen Pfad

-- Read: nur eigene Files
DROP POLICY IF EXISTS "letterheads_select_own" ON storage.objects;
CREATE POLICY "letterheads_select_own" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'letterheads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Insert: nur in eigenen Pfad
DROP POLICY IF EXISTS "letterheads_insert_own" ON storage.objects;
CREATE POLICY "letterheads_insert_own" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'letterheads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Update: nur eigene Files
DROP POLICY IF EXISTS "letterheads_update_own" ON storage.objects;
CREATE POLICY "letterheads_update_own" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'letterheads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Delete: nur eigene Files
DROP POLICY IF EXISTS "letterheads_delete_own" ON storage.objects;
CREATE POLICY "letterheads_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'letterheads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 4. Marcel-User-Row sicherstellen (idempotent — nur wenn vorhanden, nichts überschreiben)
--    Default leer, User füllt via profil-supabase.html
UPDATE public.users
SET letterhead_config = '{}'::jsonb
WHERE id = '68b27e9e-c32c-415d-9775-ce7273881861'
  AND letterhead_config IS NULL;

-- ============================================================
-- Marcel-Workflow nach Migration:
--   1. supabase db push (oder im Dashboard SQL-Editor ausführen)
--   2. profil-supabase.html aufrufen → Briefkopf-Sektion
--   3. Logo / Stempel / Unterschrift hochladen (max 200 KB, PNG/JPEG)
--   4. Bankdaten + USt-IdNr eingeben
--   5. Speichern → letterhead_config wird befüllt
--   6. Nächstes pdf-generate / brief-generate liest config automatisch
-- ============================================================
