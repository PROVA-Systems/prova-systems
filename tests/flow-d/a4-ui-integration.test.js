'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'baubegleitung.html'), 'utf8');
const polishSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'baubegleitung-polish.js'), 'utf8');
const sqlSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase-migrations', '07_add_eintraege_bauphase.sql'), 'utf8');
const tplExists = fs.existsSync(path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '05-beratung', 'B-03-SCHLUSSBERICHT-BAUBEGLEITUNG.liquid.template.html'));

test('A4: bau-phase|timeline-step Selector >= 4 Treffer in HTML', () => {
  const total = (html.match(/bau-phase|timeline-step/g) || []).length;
  assert.ok(total >= 4, 'Erwarte >=4 Refs, gefunden: ' + total);
});

test('A4: 5 data-bau-phase-Werte (erdarbeiten/rohbau/ausbau/abnahme/sonstige)', () => {
  ['erdarbeiten', 'rohbau', 'ausbau', 'abnahme', 'sonstige'].forEach(p => {
    assert.match(html, new RegExp(`data-bau-phase="${p}"`));
  });
});

test('A4: data-timeline-step 1-4 Phase-Marker', () => {
  for (let i = 1; i <= 4; i++) {
    assert.match(html, new RegExp(`data-timeline-step="${i}"`));
  }
});

test('A4: Schema-Migration 07_add_eintraege_bauphase.sql existiert', () => {
  assert.match(sqlSrc, /eintraege.*bauphase/i);
  assert.match(sqlSrc, /ADD COLUMN bauphase TEXT/);
});

test('A4: SQL CHECK-Constraint mit 5 erlaubten Werten', () => {
  ['erdarbeiten', 'rohbau', 'ausbau', 'abnahme', 'sonstige'].forEach(p => {
    assert.match(sqlSrc, new RegExp(`'${p}'`));
  });
  assert.match(sqlSrc, /eintraege_bauphase_check/);
});

test('A4: SQL Idempotent (DO $$ BEGIN + DROP CONSTRAINT IF EXISTS)', () => {
  assert.match(sqlSrc, /DO \$\$/);
  assert.match(sqlSrc, /DROP CONSTRAINT IF EXISTS/);
  assert.match(sqlSrc, /IF NOT EXISTS/);
});

test('A4: SQL Index für Performance (auftrag_id + bauphase)', () => {
  assert.match(sqlSrc, /CREATE INDEX IF NOT EXISTS idx_eintraege_bauphase/);
  assert.match(sqlSrc, /\(auftrag_id, bauphase\)/);
});

test('A4: Schluss-Bericht-Button in baubegleitung-polish.js', () => {
  assert.match(polishSrc, /data-bb-schluss/);
  assert.match(polishSrc, /Schluss-Bericht.*B-03/);
});

test('A4: B-03-SCHLUSSBERICHT-BAUBEGLEITUNG Template-Reference', () => {
  assert.match(polishSrc, /B-03-SCHLUSSBERICHT-BAUBEGLEITUNG/);
  assert.match(polishSrc, /bescheinigung-generate/);
  assert.match(polishSrc, /maengel_chronologie/);
});

test('A4: Template-File existiert (docs/templates-goldstandard)', () => {
  assert.ok(tplExists, 'B-03-SCHLUSSBERICHT-BAUBEGLEITUNG.liquid.template.html sollte existieren');
});
