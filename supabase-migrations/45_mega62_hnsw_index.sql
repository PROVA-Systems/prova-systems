-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶² Phase 0 Item 0.6 — HNSW-Index fuer befund_fragmente.embedding
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega62_hnsw_index
-- ═══════════════════════════════════════════════════════════════════
-- pgvector v0.8.0 unterstuetzt HNSW + IVFFlat. HNSW (m=16, ef=64) ist
-- 2-3x schneller als IVFFlat bei Similarity-Search auf 100k+ Rows und
-- braucht kein periodisches Re-Indexing bei Insert-Heavy-Workloads
-- (Asset-Upload -> Fragment-Extraktion -> INSERT in real-time).
-- Prognose: 100 SVs * 5 Auftraege/Monat * 50-300 Fragmente
--          = 100k+ Rows/Monat, 1,2+ Mio Rows nach 12 Monaten.
--
-- Legacy-IVFFlat-Tabellen bleiben unangetastet (Marcel-Direktive
-- "DU FRAGST bevor existing changes"):
--   - wissen_diagnostik (MEGA39 P3, lists=100)
--   - ki_lernpool       (Legacy, lists=100)
--   - normen_bibliothek (Legacy, lists=100)
-- Migration -> HNSW geplant fuer MEGA75 (Q3 2026) wenn pro Tabelle
-- Row-Count > 50k oder Slow-Query-Log Hits zeigt.
--
-- Detail-Strategie: docs/sprint-status/MEGA62-PHASE-0-FUNDAMENT.md
-- Section "Vector-Index-Strategie nach MEGA62".
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_befund_fragmente_embedding_hnsw
  ON public.befund_fragmente
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
