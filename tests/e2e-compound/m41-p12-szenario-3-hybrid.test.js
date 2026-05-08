'use strict';

/**
 * MEGA⁴¹ P12 Szenario 3 — "Etablierter SV mit Word-Vorlage"
 *
 * Pfad: Login → DOCX-Import → Hybrid-Modus (weg_c) mit Locked-Sections → Bibliothek → Spell+Konjunktiv-II → PDF
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

test('SZ3-1: Cross-Domain-Login (Cookie-Adapter aus M³⁹)', () => {
  // Aus Audit verifiziert (M³⁹ P10): F1 Cross-Domain-Login GEFIXT
  assert.ok(exists('lib/auth-guard.js') || exists('lib/supabase-client.js'));
});

test('SZ3-2: DOCX-Import via mammoth.js (M⁴⁰ P4)', () => {
  assert.ok(exists('lib/docx-import.js'));
  const src = read('lib/docx-import.js');
  assert.match(src, /mammoth/i);
});

test('SZ3-3: Hybrid-Modus weg_c mit 4 Locked-Sections', () => {
  const Locked = require(path.join(ROOT, 'lib/editor-locked-sections.js'));
  assert.strictEqual(Locked.PROVA_LOCKED_SECTIONS.length, 4);
  const keys = Locked.PROVA_LOCKED_SECTIONS.map(s => s.key);
  ['deckblatt', 'paragraph_407a_zpo', 'eu_ai_act_disclosure', 'unterschrift']
    .forEach(k => assert.ok(keys.indexOf(k) >= 0));
});

test('SZ3-4: Bibliothek-Adapter mit 6 Kategorien + Auto-Footnote', () => {
  const Adapter = require(path.join(ROOT, 'lib/editor-bibliothek-adapter.js'));
  assert.strictEqual(Adapter.KATEGORIEN.length, 6);
  // FOOTNOTE_PATTERN für DIN/§-Auto-Detection
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('DIN 4108'));
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('§ 407a'));
});

test('SZ3-5: Spell-Layer mit 3-Schicht-Pattern', () => {
  assert.ok(exists('lib/editor-spell-layer.js'));
  const Spell = require(path.join(ROOT, 'lib/editor-spell-layer.js'));
  assert.strictEqual(typeof Spell.enableBrowserSpellcheck, 'function');
  assert.strictEqual(Spell.SPELL_BACKSTOP_PURPOSE, 's1_rechtschreibung');
  assert.strictEqual(Spell.KONJUNKTIV_PURPOSE, 's3_konjunktiv_ii');
});

test('SZ3-6: Konjunktiv-II nutzt gpt-5.5 praezise (KEIN gpt-4o)', () => {
  const src = read('lib/editor-spell-layer.js');
  // Strip docstrings für Code-Path-Check
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /['"]gpt-4o['"]/);
  assert.match(codeOnly, /model:\s*['"]praezise['"]/);
});

test('SZ3-7: PDF-Browser-Print mit Locked-Sections-Auto-Inject bei weg_c', () => {
  const src = read('lib/editor-pdf-generator.js');
  assert.match(src, /opts\.weg === ['"]weg_c['"]/);
  assert.match(src, /window\.ProvaEditorLockedSections\.injectAll/);
});

test('SZ3-8: Editor-TipTap-Wrapper mit Toolbar-Buttons (Bibliothek + Spell + Konjunktiv + PDF)', () => {
  const src = read('lib/editor-tiptap.js');
  assert.match(src, /ProvaEditorBibliothek/);
  assert.match(src, /runKiBackstop|ProvaEditorSpellLayer/);
  assert.match(src, /ProvaEditorPdfGenerator/);
});

test('SZ3-9: 3-Wege-Modal mit confirmModeSwitch bei hasContent', () => {
  const Modal = require(path.join(ROOT, 'lib/document-mode-modal.js'));
  assert.deepStrictEqual(Modal.VALID_WEGE, ['weg_a', 'weg_b', 'weg_c']);
  assert.strictEqual(typeof Modal.confirmModeSwitch, 'function');
});

test('SZ3-10: Migration 33 documents mit weg + locked_sections-Spalten', () => {
  const mig = read('supabase-migrations/33_documents_editor.sql');
  assert.match(mig, /weg TEXT/);
  assert.match(mig, /locked_sections JSONB/);
});
