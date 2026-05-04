-- PROVA Systems · Migration 09 (PLANNED) · MEGA¹⁷ W49
-- Mode-C: Vorlage-Reference auf auftraege (Akten-Integration)
--
-- ZWECK:
--   Mode C: User waehlt eine eigene Word-Vorlage fuer einen Auftrag.
--   Beim PDF-Generieren wird die Vorlage statt PROVA-Standard genutzt.
--   variable_values speichert die konkreten Werte fuer die Mapping-Variablen
--   (Cache-Layer — schnellere PDF-Gen ohne Re-Lookup).
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS
-- ON DELETE: SET NULL (wenn User Vorlage loescht, Auftrag bleibt — ohne Vorlage)

ALTER TABLE public.auftraege
  ADD COLUMN IF NOT EXISTS vorlage_id UUID
    REFERENCES public.user_vorlagen(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vorlage_variable_values JSONB
    NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.auftraege.vorlage_id IS
  'Mode C: Referenz auf user_vorlagen. NULL = Mode A oder Mode B (kein User-Template).';

COMMENT ON COLUMN public.auftraege.vorlage_variable_values IS
  'Mode C: Cache fuer aufgeloeste Mapping-Werte. Format: { "$Aktenzeichen": "SCH-2026-001", ... }';

CREATE INDEX IF NOT EXISTS idx_auftraege_vorlage
  ON public.auftraege(vorlage_id)
  WHERE vorlage_id IS NOT NULL AND deleted_at IS NULL;
