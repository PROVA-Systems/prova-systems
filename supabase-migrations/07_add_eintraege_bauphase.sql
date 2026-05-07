-- ═══════════════════════════════════════════════════════════════════
-- MEGA³³ A4 — eintraege.bauphase Phase-Tagging
-- Datum: 2026-05-07
-- Zweck: Multi-Termin Begehungs-Einträge nach Bauphase taggen
--        (für B-03-SCHLUSSBERICHT-Aggregation)
-- Erlaubte Werte: erdarbeiten, rohbau, ausbau, abnahme, sonstige
-- Idempotent: re-runfähig
-- ═══════════════════════════════════════════════════════════════════

-- 1. Spalte hinzufügen (falls noch nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eintraege' AND column_name = 'bauphase'
  ) THEN
    ALTER TABLE public.eintraege
      ADD COLUMN bauphase TEXT;
  END IF;
END $$;

-- 2. CHECK-Constraint für gültige Werte (idempotent: zuerst droppen)
ALTER TABLE public.eintraege
  DROP CONSTRAINT IF EXISTS eintraege_bauphase_check;

ALTER TABLE public.eintraege
  ADD CONSTRAINT eintraege_bauphase_check
  CHECK (
    bauphase IS NULL
    OR bauphase IN ('erdarbeiten', 'rohbau', 'ausbau', 'abnahme', 'sonstige')
  );

-- 3. Index für Query-Performance (B-03-Aggregation)
CREATE INDEX IF NOT EXISTS idx_eintraege_bauphase
  ON public.eintraege(auftrag_id, bauphase)
  WHERE bauphase IS NOT NULL;

-- 4. Comment für Self-Documentation
COMMENT ON COLUMN public.eintraege.bauphase IS
  'MEGA³³ A4 — Bauphase-Tag für Multi-Termin-Aggregation in B-03-SCHLUSSBERICHT (VOB/B § 12 + DIN 18205). Erlaubt: erdarbeiten/rohbau/ausbau/abnahme/sonstige.';
