-- PROVA Systems · DB Schema-Planung · MEGA¹⁶ W45
-- Mode-C: User-eigene Word-Vorlagen (Mode C Implementation)
--
-- STATUS: PLANNED — Marcel-OK pflicht vor Apply
-- VORGAENGER: 07_user_workflow_settings.sql

CREATE TABLE IF NOT EXISTS user_vorlagen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vorlagen-Metadaten
  name            TEXT NOT NULL,
  source_filename TEXT,
  file_size       INTEGER CHECK (file_size > 0 AND file_size <= 10485760),  -- max 10MB

  -- Konvertierte Inhalte
  parsed_html     TEXT NOT NULL,
  variables       TEXT[],           -- erkannte Platzhalter (z.B. ['$Aktenzeichen', '{{Kunde}}'])
  variable_mapping JSONB,           -- {variable_name: prova_field}

  -- Tracking
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vorlagen_user ON user_vorlagen(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vorlagen_active ON user_vorlagen(user_id) WHERE is_active = TRUE;

-- Trigger fuer updated_at
CREATE OR REPLACE FUNCTION _vorlagen_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_vorlagen_updated_at ON user_vorlagen;
CREATE TRIGGER user_vorlagen_updated_at
  BEFORE UPDATE ON user_vorlagen
  FOR EACH ROW
  EXECUTE FUNCTION _vorlagen_update_updated_at();

-- RLS
ALTER TABLE user_vorlagen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_vorlagen_self ON user_vorlagen;
CREATE POLICY user_vorlagen_self ON user_vorlagen
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ROLLBACK-Plan
-- DROP TRIGGER IF EXISTS user_vorlagen_updated_at ON user_vorlagen;
-- DROP FUNCTION IF EXISTS _vorlagen_update_updated_at();
-- DROP TABLE IF EXISTS user_vorlagen;
