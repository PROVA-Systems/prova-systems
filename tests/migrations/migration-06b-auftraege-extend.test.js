'use strict';

/**
 * MEGA³⁶ W5.1 — Migration 06b auftraege_extend Tests
 *
 * Verifiziert:
 *  - Migration-File-Existenz + Syntax
 *  - Idempotenz (CREATE TYPE in DO-Block, ADD COLUMN IF NOT EXISTS)
 *  - ENUM-Konsistenz zwischen Live-DB (auftraggeber_typ_enum) und SQL-File
 *  - DOKUMENTIERT ENUM-Drift zwischen lib/auftrags-schema.js und DB
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '..', '..', 'supabase-migrations', '06b_auftraege_extend_APPLIED.sql');
const SCHEMA_JS_PATH = path.join(__dirname, '..', '..', 'lib', 'auftrags-schema.js');

const sql = fs.readFileSync(SQL_PATH, 'utf8');
const schemaJs = fs.readFileSync(SCHEMA_JS_PATH, 'utf8');

const DB_ENUM_VALUES = ['privat', 'gewerbe', 'gericht', 'versicherung', 'behoerde', 'andere'];

test('W5.1: Migration-File existiert und ist nicht leer', () => {
  assert.ok(fs.existsSync(SQL_PATH));
  assert.ok(sql.length > 100);
});

test('W5.1: Migration ist idempotent (DO-Block + IF NOT EXISTS)', () => {
  // ENUM via DO-Block mit duplicate_object-Exception
  assert.match(sql, /DO \$\$[\s\S]*?CREATE TYPE auftraggeber_typ_enum AS ENUM[\s\S]*?duplicate_object/);
  // Spalten via ADD COLUMN IF NOT EXISTS
  assert.match(sql, /ADD COLUMN IF NOT EXISTS auftraggeber_typ\s+auftraggeber_typ_enum/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS auftraggeber_kontakt_id\s+UUID/);
  // Indexe via IF NOT EXISTS
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_typ/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_auftraege_auftraggeber_kontakt/);
});

test('W5.1: ENUM-Werte matchen Live-DB-State', () => {
  // Erwartete Werte (aus MCP-Verify gegen Live-DB, 2026-05-07)
  DB_ENUM_VALUES.forEach(v => {
    assert.match(sql, new RegExp("'" + v + "'"), 'ENUM-Wert "' + v + '" fehlt');
  });
});

test('W5.1: FK auftraggeber_kontakt_id zu kontakte mit ON DELETE SET NULL', () => {
  assert.match(sql, /REFERENCES public\.kontakte\(id\) ON DELETE SET NULL/);
});

test('W5.1: Indexe partial — auftraggeber_typ nur deleted_at IS NULL', () => {
  assert.match(sql, /idx_auftraege_auftraggeber_typ[\s\S]*?WHERE deleted_at IS NULL/);
});

test('W5.1: Indexe partial — auftraggeber_kontakt nur NOT NULL', () => {
  assert.match(sql, /idx_auftraege_auftraggeber_kontakt[\s\S]*?WHERE auftraggeber_kontakt_id IS NOT NULL/);
});

test('W5.1: Sanity-Block dokumentiert verifizierbare Live-DB-Bedingungen', () => {
  assert.match(sql, /v_typ_exists/);
  assert.match(sql, /v_col1_exists/);
  assert.match(sql, /v_col2_exists/);
  assert.match(sql, /RAISE NOTICE/);
});

test('W5.1: Hinweis auf PLANNED→APPLIED-Diff dokumentiert', () => {
  assert.match(sql, /HINWEIS PLANNED.*APPLIED-Diff/);
  assert.match(sql, /PLANNED:\s*privatperson/);
  assert.match(sql, /APPLIED:\s*privat,\s*gewerbe/);
});

// ── ENUM-Drift-Doku zwischen Frontend und DB ──────────────
test('W5.1 [Drift]: lib/auftrags-schema.js AUFTRAGGEBER_TYPEN dokumentiert', () => {
  // Frontend hat eigenes Mapping
  assert.match(schemaJs, /AUFTRAGGEBER_TYPEN/);
});

test('W5.1 [Drift]: ENUM-Drift Frontend ↔ DB ist eine bekannte offene TODO', () => {
  // Diese Test verifiziert dass der Drift dokumentiert IST, nicht dass er behoben ist.
  // Frontend nutzt: privatperson, versicherung, anwalt, gericht, behoerde, firma
  // DB nutzt:       privat, gewerbe, gericht, versicherung, behoerde, andere
  // Gemeinsam:      versicherung, gericht, behoerde
  const overlapping = ['versicherung', 'gericht', 'behoerde'];
  overlapping.forEach(v => {
    assert.ok(schemaJs.includes(v), 'Wert "' + v + '" sollte in Frontend-Schema sein (Overlap)');
    assert.ok(sql.includes("'" + v + "'"), 'Wert "' + v + '" sollte in DB-Migration sein');
  });
  // Doc-Hinweis im Migration-File macht den Drift sichtbar
  assert.match(sql, /Frontend-Mapping/);
});
