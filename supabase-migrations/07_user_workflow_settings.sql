-- PROVA Systems · Migration 07 · MEGA¹⁵ W31
-- Triple-Mode-Workflow-System (Mode A/B/C)
--
-- STATUS: VERSIONIERT (kopiert aus db/PLANNED-user_workflow_settings.sql)
-- DATUM: 2026-05-06/07
-- VORGAENGER: 06_v3_patch_final_lueckenschluss.sql
--
-- ANWENDUNG (Marcel-Pflicht — CLAUDE.md Regel 5+35):
--   1. Marcel reviewed dieses File
--   2. Marcel approved
--   3. Apply via Supabase-CLI ODER SQL Editor (Staging-Test pflicht!)
--   4. Smoke-Test: SELECT * FROM v_user_workflow_resolved LIMIT 1;
--
-- VERIFICATION nach Apply:
--   SELECT table_name FROM information_schema.tables
--     WHERE table_name = 'user_workflow_settings';
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'auftraege' AND column_name = 'workflow_mode_override';
--
-- ROLLBACK-Plan: am Ende des Files

-- ════════════════════════════════════════════════════════════════
-- TABELLE: user_workflow_settings
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_workflow_settings (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Default-Mode: was passiert wenn User eine neue Akte anlegt
  -- 'A' = PROVA-Standard (Templates) — existing
  -- 'B' = PROVA+Editor (TipTap) — MEGA¹⁵
  -- 'C' = Eigene Vorlagen (Word-Upload) — MEGA¹⁶
  default_mode         VARCHAR(8) NOT NULL DEFAULT 'A'
                       CHECK (default_mode IN ('A','B','C')),

  -- Tracking-Felder
  default_mode_set_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Mode-spezifische Preferences (alle nullable — werden bei Bedarf gesetzt)
  mode_a_template_pref TEXT,           -- z.B. 'F-09-KURZGUTACHTEN' als Standard
  mode_b_editor_config JSONB,          -- TipTap-Toolbar-Settings, Inline-Pruefung
  mode_c_vorlagen_ids  UUID[],         -- Refs auf eigene Vorlagen

  -- Audit-Felder
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uws_user ON user_workflow_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_uws_default_mode ON user_workflow_settings(default_mode);

-- Trigger fuer updated_at
CREATE OR REPLACE FUNCTION _uws_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS uws_updated_at ON user_workflow_settings;
CREATE TRIGGER uws_updated_at
  BEFORE UPDATE ON user_workflow_settings
  FOR EACH ROW
  EXECUTE FUNCTION _uws_update_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS-Policies
-- ════════════════════════════════════════════════════════════════

ALTER TABLE user_workflow_settings ENABLE ROW LEVEL SECURITY;

-- User darf NUR eigene Settings sehen/aendern
DROP POLICY IF EXISTS uws_self_select ON user_workflow_settings;
CREATE POLICY uws_self_select ON user_workflow_settings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS uws_self_insert ON user_workflow_settings;
CREATE POLICY uws_self_insert ON user_workflow_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS uws_self_update ON user_workflow_settings;
CREATE POLICY uws_self_update ON user_workflow_settings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Service-Role-Bypass NICHT noetig (User-eigene Daten)

-- ════════════════════════════════════════════════════════════════
-- ALTER auftraege: workflow_mode_override Spalte
-- ════════════════════════════════════════════════════════════════

ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS workflow_mode_override VARCHAR(8)
  CHECK (workflow_mode_override IN ('A','B','C') OR workflow_mode_override IS NULL);

CREATE INDEX IF NOT EXISTS idx_auftraege_workflow_mode
  ON auftraege(workflow_mode_override)
  WHERE workflow_mode_override IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- VIEW: v_user_workflow_resolved
-- Resolves: override → default → 'A' (Fallback)
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_user_workflow_resolved AS
SELECT
  a.id           AS auftrag_id,
  a.user_id      AS user_id,
  COALESCE(
    a.workflow_mode_override,
    uws.default_mode,
    'A'
  )              AS resolved_mode,
  CASE
    WHEN a.workflow_mode_override IS NOT NULL THEN 'override'
    WHEN uws.default_mode IS NOT NULL          THEN 'default'
    ELSE 'fallback'
  END            AS resolved_source
FROM auftraege a
LEFT JOIN user_workflow_settings uws ON uws.user_id = a.user_id;

-- ════════════════════════════════════════════════════════════════
-- ROLLBACK-Plan
-- ════════════════════════════════════════════════════════════════
--
-- Falls Probleme:
--
-- DROP VIEW IF EXISTS v_user_workflow_resolved;
-- ALTER TABLE auftraege DROP COLUMN IF EXISTS workflow_mode_override;
-- DROP TRIGGER IF EXISTS uws_updated_at ON user_workflow_settings;
-- DROP FUNCTION IF EXISTS _uws_update_updated_at();
-- DROP TABLE IF EXISTS user_workflow_settings;
--
-- Datenbank-Status nach Rollback: identisch zu pre-MEGA¹⁵.
-- Keine Daten-Verluste fuer User-Akten (nur neue Tabelle + neue Spalte).

-- ════════════════════════════════════════════════════════════════
-- TEST-QUERIES (manueller Test in Supabase-Studio)
-- ════════════════════════════════════════════════════════════════

-- Test 1: Insert + Update
-- INSERT INTO user_workflow_settings (user_id, default_mode)
-- VALUES (auth.uid(), 'A');
-- UPDATE user_workflow_settings SET default_mode = 'B' WHERE user_id = auth.uid();

-- Test 2: View-Resolution
-- SELECT * FROM v_user_workflow_resolved WHERE auftrag_id = '<some-uuid>';

-- Test 3: RLS-Verifikation
-- (Anderer User darf eigene Settings NICHT sehen)
