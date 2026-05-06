'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const listSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'skizzen-list.js'), 'utf8');
const saveSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'skizzen-save.js'), 'utf8');
const deleteSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'skizzen-delete.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'skizzen.html'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase', 'migrations', '2026_05_11_w12_skizzen_system.sql'), 'utf8');

test('Migration: FK auf auftraege (NICHT schadensfaelle)', () => {
  assert.match(migration, /REFERENCES public\.auftraege/);
  assert.ok(!/REFERENCES.*schadensfaelle/.test(migration));
});

test('Migration: RLS auf workspace_memberships (NICHT workspace_members)', () => {
  // Kommentare entfernen für strict body check
  const codeOnly = migration.replace(/--.*$/gm, '');
  assert.match(codeOnly, /workspace_memberships/);
  // workspace_members als isoliertes Wort darf nicht im Code-Body stehen
  assert.ok(!/\bworkspace_members\b(?!hip)/.test(codeOnly), 'workspace_members ohne -ships-Suffix verboten');
});

test('Migration: created_by_user_id (NICHT erstellt_von)', () => {
  const codeOnly = migration.replace(/--.*$/gm, '');
  assert.match(codeOnly, /created_by_user_id/);
  assert.ok(!/erstellt_von/.test(codeOnly));
});

test('Migration: is_active (NICHT aktiv)', () => {
  assert.match(migration, /is_active/);
});

test('Migration: svg_content (NICHT svg_data)', () => {
  assert.match(migration, /svg_content TEXT/);
  assert.ok(!/svg_data\s+TEXT/.test(migration));
});

test('Migration: 200KB CHECK-Constraint', () => {
  assert.match(migration, /length\(svg_content\)\s*<=\s*200000/);
});

test('Migration: foto_referenz_id FK auf fotos', () => {
  assert.match(migration, /foto_referenz_id UUID NULL REFERENCES public\.fotos/);
});

test('Migration: pseudonymisiert BOOLEAN', () => {
  assert.match(migration, /pseudonymisiert BOOLEAN NOT NULL DEFAULT FALSE/);
});

test('Migration: deleted_at Soft-Delete', () => {
  assert.match(migration, /deleted_at TIMESTAMPTZ NULL/);
});

test('skizzen-list: SELECT auftrag_id (NICHT schadensfall_id)', () => {
  assert.match(listSrc, /eq\(['"]auftrag_id['"]/);
  // Backwards-Compat erlaubt schadensfall_id-Lookup, aber nicht im Body
  const codeOnly = listSrc.replace(/Backwards-Compat[\s\S]*?schadensfall_id/, 'OK');
  assert.ok(!/eq\(['"]schadensfall_id['"]/.test(codeOnly));
});

test('skizzen-list: svg_content (NICHT svg_data)', () => {
  assert.match(listSrc, /svg_content/);
  assert.ok(!/svg_data/.test(listSrc));
});

test('skizzen-save: SVG-Validation 200KB + XSS', () => {
  const { __validateSvg } = require('../../netlify/functions/skizzen-save');
  assert.strictEqual(__validateSvg(''), 'svg_content leer');
  assert.match(__validateSvg('<svg' + 'x'.repeat(210 * 1024) + '</svg>'), /200KB/);
  assert.match(__validateSvg('<div>x</div>'), /<svg>-Tag/);
  assert.match(__validateSvg('<svg><script>x</script></svg>'), /<script>/);
  assert.match(__validateSvg('<svg onload="x">y</svg>'), /on\*-Handler/);
  assert.strictEqual(__validateSvg('<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>'), null);
});

test('skizzen-save: created_by_user_id (NICHT erstellt_von)', () => {
  assert.match(saveSrc, /created_by_user_id:/);
  assert.ok(!/erstellt_von:/.test(saveSrc));
});

test('skizzen-save: foto_referenz_id (NICHT foto_ref)', () => {
  assert.match(saveSrc, /foto_referenz_id/);
  // foto_ref existiert nur im W10b — sollte raus
  const newCode = saveSrc.replace(/foto_referenz_id/g, 'OK');
  assert.ok(!/\bfoto_ref\b/.test(newCode));
});

test('skizzen-save: Backwards-Compat svg_data → svg_content', () => {
  assert.match(saveSrc, /body\.svg_content \|\| body\.svg_data/);
});

test('skizzen-save: Backwards-Compat schadensfall_id → auftrag_id', () => {
  assert.match(saveSrc, /body\.auftrag_id \|\| body\.schadensfall_id/);
});

test('skizzen-delete: Soft-Delete via deleted_at', () => {
  assert.match(deleteSrc, /deleted_at:/);
});

test('Frontend: sk-auftrag_id (NICHT sk-schadensfall_id)', () => {
  assert.match(html, /id="sk-auftrag_id"/);
  assert.ok(!/id="sk-schadensfall_id"/.test(html));
});

test('Frontend: svg_content im Body (NICHT svg_data)', () => {
  assert.match(html, /svg_content: svg/);
  assert.match(html, /s\.svg_content/);
});

test('Frontend: auftrag_id Body-Field', () => {
  assert.match(html, /\{ auftrag_id, titel/);
});
