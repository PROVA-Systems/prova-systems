-- ════════════════════════════════════════════════════════════════════════
-- MEGA³⁰ A2 — auftraege.auftraggeber_typ + auftraggeber_kontakt_id
-- Datum: 2026-05-07
-- Apply'd via Supabase-MCP. Marcel-Decision-Default: 1:1 FK + ENUM.
-- Audit-Beleg: docs/audit/AUDIT-2026-05-07-VISION-STATUS.md (Bereich 7)
-- ════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE auftraggeber_typ_enum AS ENUM (
    'privat', 'gewerbe', 'gericht', 'versicherung', 'behoerde', 'andere'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.auftraege
  ADD COLUMN IF NOT EXISTS auftraggeber_typ auftraggeber_typ_enum NULL,
  ADD COLUMN IF NOT EXISTS auftraggeber_kontakt_id UUID NULL REFERENCES public.kontakte(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_typ
  ON public.auftraege(auftraggeber_typ)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_kontakt
  ON public.auftraege(auftraggeber_kontakt_id)
  WHERE auftraggeber_kontakt_id IS NOT NULL;

COMMENT ON COLUMN public.auftraege.auftraggeber_typ IS
  'MEGA30-A2: Auftraggeber-Typ (privat/gewerbe/gericht/versicherung/behoerde/andere). Wizard-Conditional-Discriminator.';
COMMENT ON COLUMN public.auftraege.auftraggeber_kontakt_id IS
  'MEGA30-A2: Direct-FK auf kontakte fuer schnelle Joins. Backwards-Compat zu auftrag_kontakte M:N (kontakt_rolle=auftraggeber).';

-- Backwards-Compat: alte Migration 2026_05_10_w9_06b_auftraege_extend.sql
-- bleibt als PLANNED (gleiche Spalten-Namen, kompatibel falls zusätzlich apply'd).
