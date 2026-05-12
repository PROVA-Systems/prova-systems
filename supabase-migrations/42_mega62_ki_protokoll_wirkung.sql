-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶² Phase 0 Item 0.3 — ki_protokoll.wirkung (§407a-Beweis)
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega62_ki_protokoll_wirkung
-- ═══════════════════════════════════════════════════════════════════
-- LG Darmstadt 10.11.2025 Az. 19 O 527/16: Honorar auf 0€ wegen
-- verschleierter KI-Nutzung. Woertlich: "Pauschale Mitteilung 'mit
-- Hilfe einer KI erstellt' genuegt nicht."
-- wirkung-Spalte = exakter Schutz: pro KI-Call dokumentiert ob SV
-- den Vorschlag uebernommen, verworfen oder bearbeitet hat.
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE ki_wirkung AS ENUM (
    'vorschlag',
    'uebernommen',
    'verworfen',
    'bearbeitet'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.ki_protokoll
  ADD COLUMN IF NOT EXISTS wirkung ki_wirkung NOT NULL DEFAULT 'vorschlag';

ALTER TABLE public.ki_protokoll
  ADD COLUMN IF NOT EXISTS wirkung_set_at TIMESTAMPTZ;

ALTER TABLE public.ki_protokoll
  ADD COLUMN IF NOT EXISTS wirkung_set_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.ki_protokoll.wirkung IS '§407a-Beweis: dokumentiert SV-Entscheidung pro KI-Call (vorschlag=initial, uebernommen/verworfen/bearbeitet=nach SV-Pruefung). LG Darmstadt 10.11.2025: verschleierte KI-Nutzung = Honorar 0€.';
COMMENT ON COLUMN public.ki_protokoll.wirkung_set_at IS 'Zeitstempel wann SV die wirkung gesetzt hat (NULL solange wirkung=vorschlag).';
COMMENT ON COLUMN public.ki_protokoll.wirkung_set_by IS 'User der die wirkung gesetzt hat. NULL bei Service-Role-Calls.';

CREATE OR REPLACE FUNCTION public.update_ki_wirkung_timestamp()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ki_protokoll_wirkung ON public.ki_protokoll;
CREATE TRIGGER trg_ki_protokoll_wirkung
  BEFORE UPDATE ON public.ki_protokoll
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ki_wirkung_timestamp();

CREATE INDEX IF NOT EXISTS idx_ki_protokoll_wirkung
  ON public.ki_protokoll(wirkung, created_at DESC)
  WHERE wirkung <> 'vorschlag';

CREATE INDEX IF NOT EXISTS idx_ki_protokoll_wirkung_workspace
  ON public.ki_protokoll(workspace_id, wirkung, created_at DESC);
