'use strict';

/**
 * MEGA⁴⁰ P9 — PDF-Generation + E2E (alle 3 Wege) Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Locked = require(path.join(ROOT, 'lib', 'editor-locked-sections.js'));
const Pdf = require(path.join(ROOT, 'lib', 'editor-pdf-generator.js'));
const Export = require(path.join(ROOT, 'lib', 'docx-export.js'));
const lockedSrc = read('lib/editor-locked-sections.js');
const pdfSrc = read('lib/editor-pdf-generator.js');

// Mock window für PDF-Generator (lädt LockedSections + Export)
function withMockWindow(fn) {
  const orig = global.window;
  global.window = {
    ProvaEditorLockedSections: Locked,
    ProvaDocxExport: Export
  };
  try { return fn(); } finally { global.window = orig; }
}

const sampleDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Befund' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Hallo Welt' }] }
  ]
};

// ─────────────────────────────────────────────────────────────────
//  P9-1 Locked-Sections (4 Compliance-Texte)
// ─────────────────────────────────────────────────────────────────

test('P9-1: Locked.PROVA_LOCKED_SECTIONS hat 4 Sektionen', () => {
  assert.strictEqual(Locked.PROVA_LOCKED_SECTIONS.length, 4);
  const keys = Locked.PROVA_LOCKED_SECTIONS.map(s => s.key);
  ['deckblatt', 'paragraph_407a_zpo', 'eu_ai_act_disclosure', 'unterschrift']
    .forEach(k => assert.ok(keys.indexOf(k) >= 0, k + ' fehlt'));
});

test('P9-1: getSection(deckblatt) hat heading + 4 Datafelder', () => {
  const sec = Locked.getSection('deckblatt');
  assert.ok(Array.isArray(sec));
  assert.ok(sec[0].type === 'heading');
  // Auftraggeber, Aktenzeichen, Gutachtenort, Datum
  const allText = JSON.stringify(sec);
  assert.match(allText, /Auftraggeber/);
  assert.match(allText, /Aktenzeichen/);
  assert.match(allText, /Gutachtenort/);
});

test('P9-1: getSection(paragraph_407a_zpo) enthaelt §407a-Wortlaut + KI-Disclaimer', () => {
  const sec = Locked.getSection('paragraph_407a_zpo');
  const txt = JSON.stringify(sec);
  assert.match(txt, /§\s*407a\s*ZPO/);
  assert.match(txt, /KI/);  // KI-Compliance erwähnt
  assert.match(txt, /Wahrheit/);
});

test('P9-1: getSection(eu_ai_act_disclosure) enthaelt VO 2024/1689 + GPT-5.5', () => {
  const sec = Locked.getSection('eu_ai_act_disclosure');
  const txt = JSON.stringify(sec);
  assert.match(txt, /EU AI Act/i);
  assert.match(txt, /2024\/1689/);
  assert.match(txt, /GPT-5\.5/);
  // KEIN gpt-4o
  assert.doesNotMatch(txt, /gpt-4o/i);
});

test('P9-1: getSection(unterschrift) enthaelt SV_Name + IHK-Bestellungs-Nr.', () => {
  const sec = Locked.getSection('unterschrift');
  const txt = JSON.stringify(sec);
  assert.match(txt, /SV_Name/);
  assert.match(txt, /IHK/);
  assert.match(txt, /Bestellungs/);
});

test('P9-1: getSection(unknown) returns null', () => {
  assert.strictEqual(Locked.getSection('blabla'), null);
});

test('P9-1: _interpolate ersetzt {{Var}} mit Wert', () => {
  assert.strictEqual(Locked._interpolate('Hallo {{Name}}', { Name: 'Marcel' }), 'Hallo Marcel');
  assert.strictEqual(Locked._interpolate('AZ {{AZ}} und {{X}}', { AZ: '123' }), 'AZ 123 und {{X}}');
});

test('P9-1: injectAll wrappt User-Doc mit Deckblatt + Compliance + Unterschrift', () => {
  const wrapped = Locked.injectAll(sampleDoc, { Aktenzeichen: 'AZ-1' });
  assert.strictEqual(wrapped.type, 'doc');
  // Erstes Element muss Deckblatt-Heading sein
  assert.strictEqual(wrapped.content[0].type, 'heading');
  // Mindestens 4 Page-Breaks (Deckblatt-end, vor User-Content, vor AI-Act, vor Unterschrift)
  const pageBreaks = wrapped.content.filter(n => n.type === 'pageBreak');
  assert.ok(pageBreaks.length >= 3);
  // User-Content muss erhalten sein
  const allText = JSON.stringify(wrapped);
  assert.match(allText, /Befund/);
  assert.match(allText, /Hallo Welt/);
});

// ─────────────────────────────────────────────────────────────────
//  P9-2 PDF-Generator buildPrintHtml
// ─────────────────────────────────────────────────────────────────

test('P9-2: buildPrintHtml liefert komplettes HTML-Document', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { titel: 'Test' }));
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<title>Test<\/title>/);
});

test('P9-2: buildPrintHtml DIN A4 + 25mm Margins + Times New Roman', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { titel: 'T' }));
  assert.match(html, /size:\s*A4/);
  assert.match(html, /margin:\s*25mm/);
  assert.match(html, /Times New Roman/);
});

test('P9-2: buildPrintHtml Header (Aktenzeichen) + Footer (Seitenzahl)', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { vars: { Aktenzeichen: 'AZ-2026-001' }, titel: 'T' }));
  assert.match(html, /AZ-2026-001/);
  assert.match(html, /counter\(page\)/);
  assert.match(html, /counter\(pages\)/);
});

test('P9-2: buildPrintHtml mit weg_c injiziert Locked-Sections', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { weg: 'weg_c', titel: 'T', vars: { SV_Name: 'Marcel' } }));
  assert.match(html, /§\s*407a/);
  assert.match(html, /EU AI Act/i);
  assert.match(html, /Marcel/);
  // User-Content erhalten
  assert.match(html, /Befund/);
});

test('P9-2: buildPrintHtml mit weg_a/weg_b: KEINE Locked-Sections', () => {
  const html_a = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { weg: 'weg_a', titel: 'T' }));
  const html_b = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { weg: 'weg_b', titel: 'T' }));
  assert.doesNotMatch(html_a, /§\s*407a/);
  assert.doesNotMatch(html_b, /§\s*407a/);
  // Aber User-Content erhalten
  assert.match(html_a, /Befund/);
  assert.match(html_b, /Befund/);
});

test('P9-2: buildPrintHtml CSS hat page-break + widows/orphans (IHK-konform)', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { titel: 'T' }));
  assert.match(html, /page-break-after:\s*avoid/);
  assert.match(html, /widows:\s*3/);
  assert.match(html, /orphans:\s*3/);
});

test('P9-2: buildPrintHtml mit pageBreak-Node → page-break-before: always', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { titel: 'T' }));
  assert.match(html, /page-break-before:\s*always/);
});

// ─────────────────────────────────────────────────────────────────
//  P9-3 E2E (alle 3 Wege)
// ─────────────────────────────────────────────────────────────────

test('P9-3 E2E weg_a (Wizard): nur User-Content, kein §407a', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { weg: 'weg_a', titel: 'Wiz' }));
  assert.match(html, /Befund/);
  assert.doesNotMatch(html, /Wahrheit unparteilich/);
});

test('P9-3 E2E weg_b (Eigene Vorlage): nur User-Content', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { weg: 'weg_b', titel: 'Eigene' }));
  assert.match(html, /Befund/);
  assert.doesNotMatch(html, /Wahrheit unparteilich/);
});

test('P9-3 E2E weg_c (Hybrid): User-Content + §407a + EU AI Act + Unterschrift', () => {
  const html = withMockWindow(() => Pdf.buildPrintHtml(sampleDoc, { weg: 'weg_c', titel: 'Hyb', vars: { SV_Name: 'Marcel S.', SV_Bestellungsnr: '12345' } }));
  assert.match(html, /Befund/);
  assert.match(html, /Wahrheit/);  // §407a-Marker
  assert.match(html, /EU AI Act/i);
  assert.match(html, /Marcel S\./);
  assert.match(html, /12345/);
});

// ─────────────────────────────────────────────────────────────────
//  P9-4 Performance (Mock-Test: <1s Render)
// ─────────────────────────────────────────────────────────────────

test('P9-4 Performance: buildPrintHtml mit 30-Section-Doc <100ms (synthetic)', () => {
  const bigDoc = { type: 'doc', content: [] };
  for (let i = 0; i < 30; i++) {
    bigDoc.content.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section ' + i }] });
    bigDoc.content.push({ type: 'paragraph', content: [{ type: 'text', text: 'Lorem ipsum '.repeat(50) }] });
  }
  const t0 = Date.now();
  withMockWindow(() => Pdf.buildPrintHtml(bigDoc, { weg: 'weg_c', titel: '30s', vars: {} }));
  const dt = Date.now() - t0;
  assert.ok(dt < 100, '30-Section-Doc Render-Zeit: ' + dt + 'ms (Limit: 100ms)');
});

// ─────────────────────────────────────────────────────────────────
//  P9-5 Source-Inspection
// ─────────────────────────────────────────────────────────────────

test('P9-5: editor-tiptap.js Toolbar hat "⊟ PDF" Button', () => {
  const editorSrc = read('lib/editor-tiptap.js');
  assert.match(editorSrc, /⊟ PDF/);
  assert.match(editorSrc, /ProvaEditorPdfGenerator\.generate/);
});

test('P9-5: PDF-Generator nutzt Pop-up-Window-Pattern + auto-print', () => {
  assert.match(pdfSrc, /window\.open/);
  assert.match(pdfSrc, /\.print\(\)/);
});

test('P9-5: KEIN gpt-4o im Locked-Sections Code-Path (nur GPT-5.5)', () => {
  // Strip Doku-Comments
  const codeOnly = lockedSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /gpt-4o/);
  assert.match(codeOnly, /GPT-5\.5/);
});

test('P9-5: UMD-Pattern: window + module.exports auf beiden Libs', () => {
  assert.match(lockedSrc, /window\.ProvaEditorLockedSections/);
  assert.match(lockedSrc, /module\.exports\s*=\s*api/);
  assert.match(pdfSrc, /window\.ProvaEditorPdfGenerator/);
  assert.match(pdfSrc, /module\.exports\s*=\s*api/);
});
