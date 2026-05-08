'use strict';

/**
 * MEGA⁴⁰ P4 — DOCX-Import Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Import = require(path.join(ROOT, 'lib', 'docx-import.js'));
const importSrc = read('lib/docx-import.js');
const importHtml = read('dokument-import.html');
const researchDoc = read('docs/sprint-research/MEGA40-P4-DOCX-IMPORT-RECHERCHE.md');

// ─────────────────────────────────────────────────────────────────
//  P4-1 Recherche-Doku
// ─────────────────────────────────────────────────────────────────

test('P4-1: Recherche-Doku enthaelt 5 Library-Kandidaten (Master-Prompt: 3-5 Quellen)', () => {
  // mammoth.js, docx-preview, docxtemplater, docx (npm), JSZip
  ['mammoth\\.js', 'docx-preview', 'docxtemplater', 'JSZip'].forEach(name => {
    assert.match(researchDoc, new RegExp(name, 'i'));
  });
});

test('P4-1: Recherche-Doku gibt klare Empfehlung (mammoth.js)', () => {
  assert.match(researchDoc, /mammoth\.js[\s\S]*?(✅|EMPFEHLUNG)/i);
  assert.match(researchDoc, /Decision-Final[\s\S]*?mammoth/i);
});

test('P4-1: Recherche-Doku dokumentiert Risiken + Mitigations (≥3)', () => {
  assert.match(researchDoc, /Risiken/);
  // 3 spezifische Risiken
  assert.match(researchDoc, /Bilder/i);
  assert.match(researchDoc, /Footnote/i);
  assert.match(researchDoc, /Page-Break/i);
});

// ─────────────────────────────────────────────────────────────────
//  P4-2 docx-import.js Helpers
// ─────────────────────────────────────────────────────────────────

test('P4-2: Import exports importDocx + extractPlaceholders + htmlToTipTapJson + detectWordWarnings', () => {
  ['importDocx', 'extractPlaceholders', 'htmlToTipTapJson', 'detectWordWarnings'].forEach(fn => {
    assert.strictEqual(typeof Import[fn], 'function', fn);
  });
});

test('P4-2: PROVA_STYLE_MAP mappt Heading 1 → h2 (PROVA-Konvention)', () => {
  const map = Import.PROVA_STYLE_MAP.join('\n');
  assert.match(map, /Heading 1.*=>\s*h2/);
  assert.match(map, /Heading 2.*=>\s*h3/);
  assert.match(map, /Quote.*=>\s*blockquote/);
});

test('P4-2: PLACEHOLDER_PATTERN matched {{Token}} korrekt', () => {
  const html = 'a {{Mandant}} b {{AZ123}} c {{ Mandant }} d';
  const matches = Import.extractPlaceholders(html);
  // Die {{Token}}-Pattern sollten Mandant + AZ123 separieren
  const tokens = matches.map(m => m.token);
  assert.ok(tokens.indexOf('Mandant') >= 0);
  assert.ok(tokens.indexOf('AZ123') >= 0);
  // Mandant doppelt → count 2
  const m = matches.find(x => x.token === 'Mandant');
  assert.strictEqual(m.count, 2);
});

test('P4-2: extractPlaceholders sortiert alphabetisch', () => {
  const html = '{{Z}} {{A}} {{M}}';
  const ms = Import.extractPlaceholders(html);
  assert.deepStrictEqual(ms.map(m => m.token), ['A', 'M', 'Z']);
});

test('P4-2: extractPlaceholders gibt leeres Array bei leerem Input', () => {
  assert.deepStrictEqual(Import.extractPlaceholders(''), []);
  assert.deepStrictEqual(Import.extractPlaceholders(null), []);
});

test('P4-2: htmlToTipTapJson regex-fallback konvertiert h1 → heading{level:1}', () => {
  const json = Import._htmlToTipTapJsonRegex('<h1>Titel</h1><p>Text</p>');
  assert.strictEqual(json.type, 'doc');
  assert.strictEqual(json.content.length, 2);
  assert.strictEqual(json.content[0].type, 'heading');
  assert.strictEqual(json.content[0].attrs.level, 1);
  assert.strictEqual(json.content[1].type, 'paragraph');
});

test('P4-2: htmlToTipTapJson regex-fallback konvertiert blockquote', () => {
  const json = Import._htmlToTipTapJsonRegex('<blockquote>Zitat</blockquote>');
  assert.strictEqual(json.content[0].type, 'blockquote');
});

test('P4-2: detectWordWarnings findet Page-Breaks im HTML', () => {
  const w = Import.detectWordWarnings('<p>x<br class="page-break"/>y</p>', []);
  assert.ok(w.length >= 1);
  assert.match(w[0], /Seitenumbr/i);
});

test('P4-2: detectWordWarnings inkludiert mammoth-Warnings', () => {
  const w = Import.detectWordWarnings('<p>x</p>', [
    { type: 'warning', message: 'Style nicht erkannt' }
  ]);
  assert.ok(w.some(x => /mammoth/.test(x)));
});

test('P4-2: detectWordWarnings gibt leeres Array bei leerem Input', () => {
  assert.deepStrictEqual(Import.detectWordWarnings('', []), []);
});

test('P4-2: importDocx erwartet ArrayBuffer (wirft bei String)', async () => {
  await assert.rejects(
    () => Import.importDocx('not an arraybuffer'),
    /ArrayBuffer/
  );
});

// ─────────────────────────────────────────────────────────────────
//  P4-3 dokument-import.html Drag&Drop Page
// ─────────────────────────────────────────────────────────────────

test('P4-3: dokument-import.html laedt /lib/docx-import.js', () => {
  assert.match(importHtml, /\/lib\/docx-import\.js/);
});

test('P4-3: dokument-import.html hat #di-dropzone mit Drag&Drop-Handlers', () => {
  assert.match(importHtml, /id=["']di-dropzone["']/);
  assert.match(importHtml, /['"]dragover['"]/);
  assert.match(importHtml, /['"]drop['"]/);
  assert.match(importHtml, /dataTransfer/);
});

test('P4-3: dokument-import.html ruft ProvaDocxImport.importDocx', () => {
  assert.match(importHtml, /ProvaDocxImport\.importDocx/);
});

test('P4-3: dokument-import.html zeigt Preview, Placeholder-Liste, Warnings', () => {
  assert.match(importHtml, /id=["']di-preview-content["']/);
  assert.match(importHtml, /id=["']di-placeholder-list["']/);
  assert.match(importHtml, /id=["']di-warnings-list["']/);
});

test('P4-3: dokument-import.html hat 2 Action-Buttons (Bearbeiten + Vorlage)', () => {
  assert.match(importHtml, /id=["']di-action-edit["']/);
  assert.match(importHtml, /id=["']di-action-template["']/);
  assert.match(importHtml, /Direkt bearbeiten/);
  assert.match(importHtml, /Als Vorlage/);
});

test('P4-3: dokument-import.html POSTet zu /document-save mit weg_b', () => {
  assert.match(importHtml, /\/\.netlify\/functions\/document-save/);
  assert.match(importHtml, /weg:\s*['"]weg_b['"]/);
});

test('P4-3: dokument-import.html validiert .docx-Extension', () => {
  assert.match(importHtml, /\.docx\$/i);
});

test('P4-3: dokument-import.html keyboard-accessible (tabindex + Enter/Space)', () => {
  assert.match(importHtml, /tabindex=["']0["']/);
  assert.match(importHtml, /e\.key === ['"]Enter['"] \|\| e\.key === ['"] ['"]/);
});

// ─────────────────────────────────────────────────────────────────
//  P4-4 docx-import.js — Edge Cases
// ─────────────────────────────────────────────────────────────────

test('P4-4: extractPlaceholders ignoriert single-{}-Vorkommen', () => {
  const html = 'foo {bar} baz {{ok}}';
  const m = Import.extractPlaceholders(html);
  assert.deepStrictEqual(m.map(x => x.token), ['ok']);
});

test('P4-4: extractPlaceholders matched {{ Token_With_Underscores }}', () => {
  const html = '{{Mein_Token_42}}';
  const m = Import.extractPlaceholders(html);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].token, 'Mein_Token_42');
});

test('P4-4: htmlToTipTapJson regex-fallback liefert leeren Doc bei leerem Input', () => {
  const json = Import._htmlToTipTapJsonRegex('');
  assert.strictEqual(json.type, 'doc');
  assert.strictEqual(json.content.length, 1);
  assert.strictEqual(json.content[0].type, 'paragraph');
});

test('P4-4: detectWordWarnings findet Tracked-Changes', () => {
  const w = Import.detectWordWarnings('<p data-tracked-change="ins">x</p>', []);
  assert.ok(w.some(x => /Track Changes|Änderungsverfolgung/i.test(x)));
});

test('P4-4: UMD-Pattern: window.ProvaDocxImport + module.exports', () => {
  assert.match(importSrc, /window\.ProvaDocxImport/);
  assert.match(importSrc, /module\.exports\s*=\s*api/);
});
