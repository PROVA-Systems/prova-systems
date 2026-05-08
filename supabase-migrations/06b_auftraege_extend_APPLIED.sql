-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁶ W5.1 — auftraege Extension (BEREITS APPLIED in Live-DB)
-- Datum:  2026-05-07
-- Status: ⚠️ Bereits in Production-DB live (verifiziert via MCP).
--         Diese Datei dokumentiert den IST-Zustand und ist 100% idempotent —
--         erneutes Ausführen ist safe (keine Operation, alles IF NOT EXISTS).
--
-- Vorgänger: supabase/migrations/PLANNED_06b_auftraege_extend.sql (outdated;
--            hatte andere ENUM-Werte/-Namen — siehe Hinweis am Ende).
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. ENUM auftraggeber_typ_enum (Live-State!)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
    CREATE TYPE auftraggeber_typ_enum AS ENUM (
        'privat',
        'gewerbe',
        'gericht',
        'versicherung',
        'behoerde',
        'andere'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Spalten in auftraege (idempotent)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.auftraege
    ADD COLUMN IF NOT EXISTS auftraggeber_typ        auftraggeber_typ_enum,
    ADD COLUMN IF NOT EXISTS auftraggeber_kontakt_id UUID REFERENCES public.kontakte(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.auftraege.auftraggeber_typ IS
    'M³⁶ W5.1 — Wizard-Conditional-Discriminator (Sprint 06b). Steuert welche Vorgangs-Felder in details JSONB Pflicht sind. ENUM auftraggeber_typ_enum: privat, gewerbe, gericht, versicherung, behoerde, andere.';

COMMENT ON COLUMN public.auftraege.auftraggeber_kontakt_id IS
    'M³⁶ W5.1 — Direct-FK auf kontakte für schnelle Joins. Komplementär zu auftrag_kontakte.rolle="auftraggeber". ON DELETE SET NULL um historische Aufträge nicht zu zerstören.';

-- ────────────────────────────────────────────────────────────
-- 3. Indexe (idempotent)
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_typ
    ON public.auftraege(workspace_id, auftraggeber_typ)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_kontakt
    ON public.auftraege(auftraggeber_kontakt_id)
    WHERE auftraggeber_kontakt_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 4. Sanity-Check (Read-only, sicher bei Live-Run)
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_typ_exists BOOLEAN;
    v_col1_exists BOOLEAN;
    v_col2_exists BOOLEAN;
    v_enum_count INT;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auftraggeber_typ_enum')
        INTO v_typ_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='auftraege' AND column_name='auftraggeber_typ')
        INTO v_col1_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='auftraege' AND column_name='auftraggeber_kontakt_id')
        INTO v_col2_exists;
    SELECT count(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
        WHERE t.typname='auftraggeber_typ_enum'
        INTO v_enum_count;

    RAISE NOTICE 'M³⁶ W5.1 sanity:';
    RAISE NOTICE '  ENUM auftraggeber_typ_enum:        %', v_typ_exists;
    RAISE NOTICE '  Column auftraggeber_typ:           %', v_col1_exists;
    RAISE NOTICE '  Column auftraggeber_kontakt_id:    %', v_col2_exists;
    RAISE NOTICE '  ENUM-Werte (erwartet 6):           %', v_enum_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- HINWEIS PLANNED → APPLIED-Diff:
--
-- Die alte PLANNED-Datei (supabase/migrations/PLANNED_06b_auftraege_extend.sql)
-- hatte andere ENUM-Werte:
--   PLANNED:  privatperson, versicherung, anwalt, gericht, behoerde, firma
--   APPLIED:  privat, gewerbe, gericht, versicherung, behoerde, andere
-- und einen anderen ENUM-Namen:
--   PLANNED:  auftraggeber_typ        (ohne _enum-Suffix)
--   APPLIED:  auftraggeber_typ_enum   (mit _enum-Suffix)
--
-- Diese Datei reflektiert den Live-DB-Zustand (verified via MCP, 2026-05-07).
-- Für Frontend-Mapping siehe lib/auftrags-schema.js — die ENUM-Werte sollten
-- konsistent zwischen DB und Frontend gehalten werden.
-- ═══════════════════════════════════════════════════════════════════
