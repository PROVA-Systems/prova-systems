/**
 * PROVA — Migration 10 Tests (users.persona_* + welcome_wizard_completed)
 * MEGA²⁰ W88 (2026-05-08)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '10_users_persona_onboarding.sql'), 'utf8');
const PLANNED = fs.readFileSync(path.join(ROOT, 'db', 'PLANNED-users-persona.sql'), 'utf8');

describe('Migration 10 — versioned vs PLANNED parity', () => {
  test('Beide Files existieren', () => {
    assert.ok(MIG.length > 100);
    assert.ok(PLANNED.length > 100);
  });

  test('ALTER TABLE auf public.users (NICHT user_profile)', () => {
    assert.match(MIG, /ALTER TABLE public\.users/);
    assert.doesNotMatch(MIG, /ALTER TABLE.*user_profile/);
  });

  test('Idempotent: ADD COLUMN IF NOT EXISTS auf alle 4 Spalten', () => {
    ['persona_size', 'persona_types', 'persona_volume', 'welcome_wizard_completed'].forEach(col => {
      assert.match(MIG, new RegExp('ADD COLUMN IF NOT EXISTS ' + col), 'missing IF NOT EXISTS ' + col);
    });
  });
});

describe('Migration 10 — persona_size CHECK constraint', () => {
  test('persona_size erlaubt nur solo/small/large oder NULL', () => {
    assert.match(MIG, /CHECK \(persona_size IS NULL OR persona_size IN \('solo', 'small', 'large'\)\)/);
  });
});

describe('Migration 10 — persona_types JSONB Default []', () => {
  test('JSONB-Type + DEFAULT empty array', () => {
    assert.match(MIG, /persona_types JSONB[\s\S]{0,80}DEFAULT '\[\]'::jsonb/);
  });

  test('NOT NULL constraint', () => {
    assert.match(MIG, /persona_types JSONB[\s\S]{0,40}NOT NULL/);
  });
});

describe('Migration 10 — persona_volume CHECK', () => {
  test('volume range 0-200', () => {
    assert.match(MIG, /persona_volume >= 0 AND persona_volume <= 200/);
  });
});

describe('Migration 10 — welcome_wizard_completed BOOLEAN Default FALSE', () => {
  test('BOOLEAN + NOT NULL + DEFAULT FALSE', () => {
    assert.match(MIG, /welcome_wizard_completed BOOLEAN[\s\S]{0,40}NOT NULL DEFAULT FALSE/);
  });
});

describe('Migration 10 — Partial-Index fuer Wizard-Pending', () => {
  test('Index nur fuer User mit pending wizard + nicht deleted', () => {
    assert.match(MIG, /CREATE INDEX IF NOT EXISTS idx_users_wizard_pending/);
    assert.match(MIG, /WHERE welcome_wizard_completed = FALSE AND deleted_at IS NULL/);
  });
});

describe('Migration 10 — Comments fuer DSGVO + Audit', () => {
  test('COMMENT erklaert Pilot-Phase + Backwards-Compat', () => {
    assert.match(MIG, /Pilot-Phase: alle 3 Werte sind Solo-Tier/);
    assert.match(MIG, /onboarding_completed_at bleibt fuer Backwards-Compat/);
  });
});
