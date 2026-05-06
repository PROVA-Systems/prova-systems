/**
 * PROVA — Migration 11 Beweisbeschluss-PDF Tests (MEGA²¹+²² W111)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '11_auftraege_beweisbeschluss.sql'), 'utf8');
const PLANNED = fs.readFileSync(path.join(ROOT, 'db', 'PLANNED-auftraege-beweisbeschluss.sql'), 'utf8');

describe('Migration 11 — File-Existenz', () => {
  test('Versioniert + PLANNED beide vorhanden', () => {
    assert.ok(MIG.length > 100);
    assert.ok(PLANNED.length > 100);
  });
});

describe('Migration 11 — ALTER TABLE auftraege', () => {
  test('Idempotent: 4x ADD COLUMN IF NOT EXISTS', () => {
    ['beweisbeschluss_pdf_storage_path',
     'beweisbeschluss_pdf_extrakt',
     'beweisbeschluss_pdf_extrakt_version',
     'beweisbeschluss_pdf_uploaded_at'
    ].forEach(col => {
      assert.match(MIG, new RegExp('ADD COLUMN IF NOT EXISTS ' + col), 'missing IF NOT EXISTS ' + col);
    });
  });

  test('storage_path TEXT (Default nullable in PostgreSQL)', () => {
    assert.match(MIG, /beweisbeschluss_pdf_storage_path TEXT/);
    // NOT NULL Pattern: pruefe nur die spezifische TEXT-Zeile
    const lineMatch = MIG.match(/beweisbeschluss_pdf_storage_path TEXT[^,]*,/);
    assert.ok(lineMatch);
    assert.doesNotMatch(lineMatch[0], /NOT NULL/);
  });

  test('extrakt JSONB DEFAULT {}', () => {
    assert.match(MIG, /beweisbeschluss_pdf_extrakt JSONB[\s\S]{0,80}DEFAULT '\{\}'::jsonb/);
  });

  test('extrakt_version CHECK 1-5', () => {
    assert.match(MIG, /beweisbeschluss_pdf_extrakt_version >= 1 AND beweisbeschluss_pdf_extrakt_version <= 5/);
  });

  test('uploaded_at TIMESTAMPTZ', () => {
    assert.match(MIG, /beweisbeschluss_pdf_uploaded_at TIMESTAMPTZ/);
  });
});

describe('Migration 11 — Partial-Index', () => {
  test('Index nur fuer aktive Auftraege mit Beweisbeschluss', () => {
    assert.match(MIG, /CREATE INDEX IF NOT EXISTS idx_auftraege_beweisbeschluss/);
    assert.match(MIG, /WHERE beweisbeschluss_pdf_storage_path IS NOT NULL AND deleted_at IS NULL/);
  });

  test('Index by uploaded_at DESC', () => {
    assert.match(MIG, /idx_auftraege_beweisbeschluss[\s\S]{0,200}beweisbeschluss_pdf_uploaded_at DESC/);
  });
});

describe('Migration 11 — Comments + Marcel-Decisions', () => {
  test('Comment erwaehnt Marcel-J1', () => {
    assert.match(MIG, /Marcel-J1/);
  });

  test('Comment erwaehnt Marcel-C1 Pattern-Matching', () => {
    assert.match(MIG, /Marcel-C1/);
  });

  test('extrakt_version v1=manuell, v2=KI Comment', () => {
    assert.match(MIG, /v1\s*=\s*manuell.*Pattern-Matching/);
    assert.match(MIG, /v2\s*=\s*KI-strukturiert/);
  });
});
