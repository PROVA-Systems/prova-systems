'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const migration = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase', 'migrations', '2026_05_07_mega30_a2_auftraege_auftraggeber.sql'), 'utf8');

test('Migration: ENUM auftraggeber_typ_enum mit 6 Werten', () => {
  assert.match(migration, /CREATE TYPE auftraggeber_typ_enum/);
  ['privat', 'gewerbe', 'gericht', 'versicherung', 'behoerde', 'andere'].forEach(v =>
    assert.match(migration, new RegExp(`'${v}'`), `ENUM-Wert ${v} fehlt`));
});

test('Migration: ALTER TABLE mit IF NOT EXISTS (idempotent)', () => {
  assert.match(migration, /ALTER TABLE public\.auftraege/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS auftraggeber_typ/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS auftraggeber_kontakt_id/);
});

test('Migration: FK auf kontakte mit ON DELETE SET NULL', () => {
  assert.match(migration, /REFERENCES public\.kontakte\(id\) ON DELETE SET NULL/);
});

test('Migration: 2 Indexes für Performance', () => {
  assert.match(migration, /idx_auftraege_auftraggeber_typ/);
  assert.match(migration, /idx_auftraege_auftraggeber_kontakt/);
});

test('Migration: Index auf typ filtert deleted_at IS NULL', () => {
  assert.match(migration, /idx_auftraege_auftraggeber_typ[\s\S]*?WHERE deleted_at IS NULL/);
});

test('Migration: COMMENT ON COLUMN für beide neue Spalten', () => {
  assert.match(migration, /COMMENT ON COLUMN public\.auftraege\.auftraggeber_typ/);
  assert.match(migration, /COMMENT ON COLUMN public\.auftraege\.auftraggeber_kontakt_id/);
});

test('Migration: idempotent via DO $$ EXCEPTION duplicate_object', () => {
  assert.match(migration, /EXCEPTION WHEN duplicate_object THEN NULL/);
});
