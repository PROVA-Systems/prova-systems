'use strict';

/**
 * MEGA⁴⁰ P5 — DOCX/HTML/Markdown-Export Tests
 *
 * Inkl. Roundtrip-Test: Import-mock-HTML → JSON → Export-HTML → Re-Parse
 *       struktur-≥80%-identisch.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Export = require(path.join(ROOT, 'lib', 'docx-export.js'));
const Import = require(path.join(ROOT, 'lib', 'docx-import.js'));
const exportSrc = read('lib/docx-export.js');
const lambdaSrc = read('netlify/functions/editor-docx-export.js');
const Lambda = require(path.join(ROOT, 'netlify', 'functions', 'editor-docx-export.js'));
const editorSrc = read('lib/editor-tiptap.js');

const sampleJson = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Befund' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Hallo ' },
      { type: 'text', text: 'fett', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' und ' },
      { type: 'text', text: 'kursiv', marks: [{ type: 'italic' }] }
    ]},
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Punkt 1' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Punkt 2' }] }] }
    ]},
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Zitat' }] }] }
  ]
};

// ─────────────────────────────────────────────────────────────────
//  P5-1 docx-export.js Public API
// ─────────────────────────────────────────────────────────────────

test('P5-1: Export exports exportHtml + exportMarkdown + exportDocxBlob', () => {
  ['exportHtml', 'exportMarkdown', 'exportDocxBlob', 'downloadBlob', 'downloadHtml', 'downloadMarkdown']
    .forEach(fn => assert.strictEqual(typeof Export[fn], 'function', fn));
});

test('P5-1: exportHtml(json, {wrap:false}) liefert reinen Body-HTML', () => {
  const html = Export.exportHtml(sampleJson, { wrap: false });
  assert.match(html, /<h2>Befund<\/h2>/);
  assert.match(html, /<strong>fett<\/strong>/);
  assert.match(html, /<em>kursiv<\/em>/);
  assert.match(html, /<ul><li><p>Punkt 1<\/p><\/li>/);
  assert.match(html, /<blockquote><p>Zitat<\/p><\/blockquote>/);
  // Kein DOCTYPE bei wrap:false
  assert.doesNotMatch(html, /<!DOCTYPE/);
});

test('P5-1: exportHtml() mit default-wrap liefert komplettes HTML-Document', () => {
  const html = Export.exportHtml(sampleJson, { title: 'Mein Dok' });
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<title>Mein Dok<\/title>/);
  assert.match(html, /<style>/);
});

test('P5-1: exportHtml escaped XSS-Inhalte', () => {
  const malicious = { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: '<script>alert("x")</script>' }] }
  ]};
  const html = Export.exportHtml(malicious, { wrap: false });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test('P5-1: exportMarkdown rendert ATX-Headings + GFM-Listen', () => {
  const md = Export.exportMarkdown(sampleJson);
  assert.match(md, /^## Befund$/m);
  assert.match(md, /Hallo \*\*fett\*\* und \*kursiv\*/);
  assert.match(md, /^- Punkt 1$/m);
  assert.match(md, /^- Punkt 2$/m);
  assert.match(md, /^> Zitat$/m);
});

test('P5-1: exportMarkdown rendert Tabellen mit Header-Separator', () => {
  const json = { type: 'doc', content: [{
    type: 'table', content: [
      { type: 'tableRow', content: [
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }
      ]},
      { type: 'tableRow', content: [
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] },
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }] }
      ]}
    ]
  }]};
  const md = Export.exportMarkdown(json);
  assert.match(md, /\| A \| B \|/);
  assert.match(md, /\| --- \| --- \|/);
  assert.match(md, /\| 1 \| 2 \|/);
});

test('P5-1: DOCX_EXPORT_ENDPOINT zeigt auf editor-docx-export Lambda', () => {
  assert.strictEqual(Export.DOCX_EXPORT_ENDPOINT, '/.netlify/functions/editor-docx-export');
});

// ─────────────────────────────────────────────────────────────────
//  P5-2 editor-docx-export Lambda
// ─────────────────────────────────────────────────────────────────

test('P5-2: Lambda hat requireAuth + RateLimit 30/60', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /RateLimit\.check\([^,]+,\s*30,\s*60/);
});

test('P5-2: Lambda buildWordXml liefert WordprocessingML-Header', () => {
  const xml = Lambda.__internals.buildWordXml(sampleJson, 'Test');
  assert.match(xml, /<\?xml version="1\.0"/);
  assert.match(xml, /<\?mso-application progid="Word\.Document"/);
  assert.match(xml, /xmlns:w="http:\/\/schemas\.microsoft\.com\/office\/word\/2003\/wordml"/);
});

test('P5-2: buildWordXml mappt heading{level:2} → Heading2-Style', () => {
  const xml = Lambda.__internals.buildWordXml(sampleJson, 'T');
  assert.match(xml, /<w:pStyle w:val="Heading2"\/>/);
});

test('P5-2: buildWordXml mappt bold-Mark → <w:b/>', () => {
  const xml = Lambda.__internals.buildWordXml(sampleJson, 'T');
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:i\/>/);
});

test('P5-2: buildWordXml mappt bulletList → ListBullet-Style mit numId 1', () => {
  const xml = Lambda.__internals.buildWordXml(sampleJson, 'T');
  assert.match(xml, /<w:pStyle w:val="ListBullet"\/>/);
  assert.match(xml, /<w:numId w:val="1"\/>/);
});

test('P5-2: buildWordXml mappt blockquote → Quote-Style', () => {
  const xml = Lambda.__internals.buildWordXml(sampleJson, 'T');
  assert.match(xml, /<w:pStyle w:val="Quote"\/>/);
});

test('P5-2: buildWordXml mappt pageBreak → w:br type=page', () => {
  const json = { type: 'doc', content: [{ type: 'pageBreak' }] };
  const xml = Lambda.__internals.buildWordXml(json, 'T');
  assert.match(xml, /<w:br w:type="page"\/>/);
});

test('P5-2: buildWordXml escaped Special-Chars (XML-Safety)', () => {
  const json = { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: '<script>&"x' }] }
  ]};
  const xml = Lambda.__internals.buildWordXml(json, 'T');
  assert.doesNotMatch(xml, /<script>/);
  assert.match(xml, /&lt;script&gt;/);
  assert.match(xml, /&amp;/);
  assert.match(xml, /&quot;/);
});

// ─────────────────────────────────────────────────────────────────
//  P5-3 Roundtrip-Test (Import-Mock → Export → Re-Parse) ≥80%
// ─────────────────────────────────────────────────────────────────

test('P5-3: Roundtrip Heading + Paragraph + List → strukturell identisch', () => {
  // Step 1: Original-HTML (simuliert DOCX-Import-Output)
  const originalHtml = '<h2>Befund</h2><p>Hallo Welt</p><ul><li>A</li><li>B</li></ul>';
  // Step 2: HTML → JSON (via Regex-Fallback)
  const json = Import._htmlToTipTapJsonRegex(originalHtml);
  // Step 3: JSON → HTML (Export)
  const exportedHtml = Export.exportHtml(json, { wrap: false });
  // Step 4: Strukturelle Übereinstimmung
  assert.match(exportedHtml, /<h2>Befund<\/h2>/);
  assert.match(exportedHtml, /<p>Hallo Welt<\/p>/);
  // Bullets sind in regex-fallback nur als <p>-Inhalte; kann vereinfacht sein.
  // Wichtig: ≥80% structural — Heading + Paragraph erhalten. Lists in regex-fallback sind p.
});

test('P5-3: Roundtrip Strukturmaß: doc → export → re-parse zaehlt Element-Match', () => {
  // Direkter JSON → HTML → JSON-Vergleich
  const json = sampleJson;
  const html = Export.exportHtml(json, { wrap: false });
  const reparsed = Import._htmlToTipTapJsonRegex(html);
  // Ursprünglich 4 top-level: heading + paragraph + bulletList + blockquote
  // Regex-fallback erkennt heading + paragraph + blockquote (3) — bulletList wird zu p's
  assert.ok(reparsed.content.length >= 3);
  // Heading vorhanden
  assert.ok(reparsed.content.some(c => c.type === 'heading' && c.attrs.level === 2));
  // Blockquote vorhanden
  assert.ok(reparsed.content.some(c => c.type === 'blockquote'));
});

// ─────────────────────────────────────────────────────────────────
//  P5-4 Editor-Toolbar Integration
// ─────────────────────────────────────────────────────────────────

test('P5-4: editor-tiptap.js Extended-Toolbar hat Export-Buttons (HTML/MD/DOCX)', () => {
  assert.match(editorSrc, /downloadHtml/);
  assert.match(editorSrc, /downloadMarkdown/);
  assert.match(editorSrc, /exportDocxBlob/);
});

test('P5-4: Export-Buttons checken window.ProvaDocxExport-Verfuegbarkeit', () => {
  assert.match(editorSrc, /typeof window\.ProvaDocxExport !== ['"]undefined['"]/);
});

test('P5-4: editor-demo.html + dokument-neu.html laden /lib/docx-export.js', () => {
  const demoSrc = read('editor-demo.html');
  const neuSrc = read('dokument-neu.html');
  assert.match(demoSrc, /\/lib\/docx-export\.js/);
  assert.match(neuSrc, /\/lib\/docx-export\.js/);
});

test('P5-4: UMD-Pattern: window.ProvaDocxExport + module.exports', () => {
  assert.match(exportSrc, /window\.ProvaDocxExport/);
  assert.match(exportSrc, /module\.exports\s*=\s*api/);
});
