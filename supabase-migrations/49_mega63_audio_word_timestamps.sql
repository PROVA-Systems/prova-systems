-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶³ Item 1.1 — audio_dateien.word_timestamps JSONB
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega63_audio_word_timestamps
-- ═══════════════════════════════════════════════════════════════════
-- Marcel-OK: Schema-Erweiterung + Re-Transkription bei Bedarf.
-- audio_dateien hat 0 Rows aktuell -> kein Backfill noetig.
--
-- Format (Whisper verbose_json):
--   {
--     "words": [
--       { "word": "Der", "start": 0.0, "end": 0.18 },
--       { "word": "Schaden", "start": 0.18, "end": 0.62 },
--       ...
--     ],
--     "segments": [
--       { "id": 0, "start": 0.0, "end": 4.5, "text": "Der Schaden..." },
--       ...
--     ]
--   }
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.audio_dateien
  ADD COLUMN IF NOT EXISTS word_timestamps JSONB;

COMMENT ON COLUMN public.audio_dateien.word_timestamps IS
  'Whisper verbose_json Output: { words: [{word,start,end}], segments: [{id,start,end,text}] }. Wird beim Whisper-Call mit response_format=verbose_json persistiert. Pflicht fuer Fragment-Pipeline (quelle_startzeit_ms-Mapping).';

CREATE INDEX IF NOT EXISTS idx_audio_dateien_has_word_timestamps
  ON public.audio_dateien((word_timestamps IS NOT NULL))
  WHERE deleted_at IS NULL;
