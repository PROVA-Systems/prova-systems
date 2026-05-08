'use strict';

/**
 * MEGA⁴¹ P12 Szenario 1 — "Neuer SV migriert von Gutachten Manager"
 *
 * Pfad: Account → CSV-Import → Editor mit 3-Wegen → Aggregation → PDF + Audit-Trail
 *
 * Source-Verifikation: Alle benötigten Files + Lambdas + Routes existieren UND sind verlinkt.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

// ─────────────────────────────────────────────────────────────────
//  Szenario 1: SV Gutachten-Manager-Migration
// ─────────────────────────────────────────────────────────────────

test('SZ1-1: DSGVO-Consent verfügbar (datenschutz.html)', () => {
  assert.ok(exists('datenschutz.html'));
});

test('SZ1-2: Account-Erstellung via app-register oder onboarding', () => {
  assert.ok(exists('app-register.html') || exists('onboarding.html'));
});

test('SZ1-3: Import-Flow vollständig (UI + 3 Lambdas + Format-Detector)', () => {
  // UI
  assert.ok(exists('import-assistent.html'));
  // Backend
  assert.ok(exists('netlify/functions/import-validate.js'));
  assert.ok(exists('netlify/functions/import-execute.js'));
  assert.ok(exists('netlify/functions/import-rollback.js'));
  // Format-Detector
  assert.ok(exists('lib/import-format-detector.js'));
  assert.ok(exists('lib/aktenzeichen-normalizer.js'));
  // Bridge
  assert.ok(exists('lib/import-assistent-supabase.js'));
});

test('SZ1-4: Format gutachten_manager im Detector definiert', () => {
  const Detector = require(path.join(ROOT, 'lib/import-format-detector.js'));
  assert.ok(Detector.FORMAT_SIGNATURES.gutachten_manager);
  assert.ok(Detector.FIELD_MAPPINGS.gutachten_manager);
});

test('SZ1-5: Editor + 3-Wege-Modal (Wizard/Eigene/Hybrid)', () => {
  assert.ok(exists('editor-demo.html'));
  assert.ok(exists('dokument-neu.html'));
  assert.ok(exists('lib/document-mode-modal.js'));
  assert.ok(exists('lib/editor-tiptap.js'));
});

test('SZ1-6: Aggregations-Lambda für Eintraege → PDF-Vorbereitung', () => {
  assert.ok(exists('netlify/functions/eintraege-pdf-aggregator.js'));
});

test('SZ1-7: PDF-Generation mit §407a + EU AI Act Footer', () => {
  assert.ok(exists('lib/editor-pdf-generator.js'));
  assert.ok(exists('lib/editor-locked-sections.js'));
  const locked = read('lib/editor-locked-sections.js');
  assert.match(locked, /§\s*407a|paragraph_407a_zpo/i);
  assert.match(locked, /eu_ai_act_disclosure/);
});

test('SZ1-8: Audit-Trail-Viewer für post-Migration-Check', () => {
  assert.ok(exists('audit-trail.html'));
  assert.ok(exists('netlify/functions/admin-audit-trail.js'));
});

test('SZ1-9: import-assistent.html bindet Supabase-Bridge ein', () => {
  const html = read('import-assistent.html');
  assert.match(html, /\/lib\/import-assistent-supabase\.js/);
  assert.match(html, /\/lib\/import-format-detector\.js/);
});

test('SZ1-10: Migration 36 import_logs für Rollback', () => {
  const mig = read('supabase-migrations/36_import_logs.sql');
  assert.match(mig, /rollback_token TEXT/);
  assert.match(mig, /rollback_expires_at/);
});
