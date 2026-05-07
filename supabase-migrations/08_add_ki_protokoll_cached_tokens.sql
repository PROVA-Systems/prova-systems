-- ═══════════════════════════════════════════════════════════════════
-- MEGA³³ B2 — ki_protokoll Prompt-Caching Tracking
-- Datum: 2026-05-07
-- Zweck: OpenAI Prompt-Caching für stabile System-Prompts.
--        Cached Input-Tokens kosten nur 10% des Standard-Preises.
--        Bei stabilen System-Prompts > 1024 Tokens (z.B. ki-proxy
--        SV-Persona + IHK-SVO-Kontext) erwartet ~40% Cost-Reduktion.
-- Idempotent: re-runfähig
-- ═══════════════════════════════════════════════════════════════════

-- 1. cached_token_input (INT, default 0)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ki_protokoll' AND column_name = 'cached_token_input'
  ) THEN
    ALTER TABLE public.ki_protokoll
      ADD COLUMN cached_token_input INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. cached_token_output (INT, default 0) — derzeit nur GPT-5.5+ supports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ki_protokoll' AND column_name = 'cached_token_output'
  ) THEN
    ALTER TABLE public.ki_protokoll
      ADD COLUMN cached_token_output INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3. Index für Aggregation Cache-Hit-Rate
CREATE INDEX IF NOT EXISTS idx_ki_protokoll_cached
  ON public.ki_protokoll(workspace_id, created_at)
  WHERE cached_token_input > 0;

-- 4. Comments für Self-Documentation
COMMENT ON COLUMN public.ki_protokoll.cached_token_input IS
  'MEGA³³ B2 — Anzahl Input-Tokens, die aus dem OpenAI Prompt-Cache kamen (-90% Kosten).';
COMMENT ON COLUMN public.ki_protokoll.cached_token_output IS
  'MEGA³³ B2 — Anzahl Output-Tokens, die aus dem Cache kamen (sehr selten, primär für Prefix-Cache).';
