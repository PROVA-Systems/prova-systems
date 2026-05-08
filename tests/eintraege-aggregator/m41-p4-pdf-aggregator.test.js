'use strict';

/**
 * MEGA⁴¹ P4 — eintraege-pdf-aggregator Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Aggregator = require(path.join(ROOT, 'netlify', 'functions', 'eintraege-pdf-aggregator.js'));
const aggSrc = read('netlify/functions/eintraege-pdf-aggregator.js');
const editorSrc = read('lib/editor-tiptap.js');

const baseAuftrag = { id: 'a1', aktenzeichen: 'AZ-2026-001', titel: 'Test-Schaden' };

test('P4-1: VALID_FORMATS = [tiptap_json, html]', () => {
  assert.deepStrictEqual(Aggregator.__internals.VALID_FORMATS, ['tiptap_json', 'html']);
});

test('P4-1: _heading produces TipTap heading node', () => {
  const h = Aggregator.__internals._heading(2, 'Befund');
  assert.strictEqual(h.type, 'heading');
  assert.strictEqual(h.attrs.level, 2);
  assert.strictEqual(h.content[0].text, 'Befund');
});

test('P4-1: _para produces paragraph node mit optional marks', () => {
  const p1 = Aggregator.__internals._para('Hallo');
  assert.strictEqual(p1.type, 'paragraph');
  assert.strictEqual(p1.content[0].text, 'Hallo');

  const p2 = Aggregator.__internals._para('Italic', [{ type: 'italic' }]);
  assert.strictEqual(p2.content[0].marks[0].type, 'italic');
});

test('P4-1: _formatDate konvertiert YYYY-MM-DD → DD.MM.YYYY', () => {
  const r = Aggregator.__internals._formatDate('2026-05-08');
  assert.match(r, /08\.05\.2026/);
});

test('P4-1: _sortByDateAndNr — datum ASC + nr ASC', () => {
  const items = [
    { datum: '2026-05-02', nr: 1 },
    { datum: '2026-05-01', nr: 2 },
    { datum: '2026-05-01', nr: 1 }
  ];
  items.sort(Aggregator.__internals._sortByDateAndNr);
  assert.strictEqual(items[0].datum, '2026-05-01');
  assert.strictEqual(items[0].nr, 1);
  assert.strictEqual(items[2].datum, '2026-05-02');
});

test('P4-1: buildTipTapDoc liefert doc-Type', () => {
  const doc = Aggregator.__internals.buildTipTapDoc({ auftrag: baseAuftrag, eintraege: [], fotos: [], skizzen: [] });
  assert.strictEqual(doc.type, 'doc');
  assert.ok(Array.isArray(doc.content));
});

test('P4-1: buildTipTapDoc mit Foto-Eintrag erzeugt image-Node', () => {
  const doc = Aggregator.__internals.buildTipTapDoc({
    auftrag: baseAuftrag,
    eintraege: [{ id: 'e1', typ: 'foto', nr: 1, datum: '2026-05-01', titel: 'F1', foto_ids: ['f1'] }],
    fotos: [{ id: 'f1', url: 'https://example/f.jpg', beschreibung: 'Schimmel' }],
    skizzen: []
  });
  const flat = JSON.stringify(doc);
  assert.match(flat, /https:\/\/example\/f\.jpg/);
  assert.match(flat, /Schimmel/);
});

test('P4-1: buildTipTapDoc mit Skizze-Eintrag erzeugt image + Marker-Liste', () => {
  const doc = Aggregator.__internals.buildTipTapDoc({
    auftrag: baseAuftrag,
    eintraege: [{ id: 's1', typ: 'skizze', nr: 1, datum: '2026-05-01', titel: 'Skizze A',
      image_url: 'https://example/s.png',
      skizze_data: { markers: [{ nr: 1, text: 'Riss', befund_id: 'B1' }, { nr: 2, text: 'Feucht' }] }
    }],
    fotos: [], skizzen: []
  });
  const flat = JSON.stringify(doc);
  assert.match(flat, /Marker-Liste/);
  assert.match(flat, /M1.*Riss/);
  assert.match(flat, /Befund #B1/);
  assert.match(flat, /M2.*Feucht/);
});

test('P4-1: buildTipTapDoc mit Diktat zeigt Original + KI-bereinigt mit highlight', () => {
  const doc = Aggregator.__internals.buildTipTapDoc({
    auftrag: baseAuftrag,
    eintraege: [{ id: 'd1', typ: 'diktat', nr: 1, datum: '2026-05-02', titel: 'D1',
      content: 'Original-Text mit ähm', ki_bereinigt_text: 'KI-strukturiert sauber' }],
    fotos: [], skizzen: []
  });
  const flat = JSON.stringify(doc);
  assert.match(flat, /Original/);
  assert.match(flat, /KI-strukturiert/);
  assert.match(flat, /highlight/);
  assert.match(flat, /#fff099/);  // Gelb
});

test('P4-1: buildTipTapDoc enthaelt §407a Footer', () => {
  const doc = Aggregator.__internals.buildTipTapDoc({ auftrag: baseAuftrag, eintraege: [], fotos: [], skizzen: [] });
  const flat = JSON.stringify(doc);
  assert.match(flat, /§\s*407a/);
  assert.match(flat, /BGH IX ZR|Wahrheit|Verantwortung|fachliche/i);
});

test('P4-1: buildTipTapDoc enthaelt EU AI Act + GPT-5.5 (KEIN gpt-4o)', () => {
  const doc = Aggregator.__internals.buildTipTapDoc({ auftrag: baseAuftrag, eintraege: [], fotos: [], skizzen: [] });
  const flat = JSON.stringify(doc);
  assert.match(flat, /EU AI Act/i);
  assert.match(flat, /2024\/1689/);
  assert.match(flat, /GPT-5\.5/);
  assert.doesNotMatch(flat, /gpt-4o/);
});

test('P4-1: buildTipTapDoc Sortierung — chronologisch ueber Mixed-Types', () => {
  const eintraege = [
    { id: 'e2', typ: 'text', nr: 1, datum: '2026-05-02', titel: 'Zweiter', content: 'Inhalt 2' },
    { id: 'e1', typ: 'text', nr: 1, datum: '2026-05-01', titel: 'Erster',  content: 'Inhalt 1' }
  ];
  const doc = Aggregator.__internals.buildTipTapDoc({ auftrag: baseAuftrag, eintraege, fotos: [], skizzen: [] });
  const flat = JSON.stringify(doc);
  // Erster muss vor Zweiter erscheinen
  assert.ok(flat.indexOf('Erster') < flat.indexOf('Zweiter'));
});

test('P4-1: buildTipTapDoc behandelt mix-Typ + foto_ids', () => {
  const doc = Aggregator.__internals.buildTipTapDoc({
    auftrag: baseAuftrag,
    eintraege: [{ id: 'm1', typ: 'mix', nr: 1, datum: '2026-05-01', titel: 'Mix', content: 'Mix-Text', foto_ids: ['f1'] }],
    fotos: [{ id: 'f1', url: 'http://e/f.jpg', beschreibung: 'Foto in mix' }],
    skizzen: []
  });
  const flat = JSON.stringify(doc);
  assert.match(flat, /Mix-Text/);
  assert.match(flat, /Foto in mix|http:\/\/e\/f\.jpg/);
});

// ─────────────────────────────────────────────────────────────────
//  P4-2 Editor-Integration
// ─────────────────────────────────────────────────────────────────

test('P4-2: editor-tiptap.js hat "📥 Einträge"-Button bei state.auftragId', () => {
  assert.match(editorSrc, /📥 Einträge/);
  assert.match(editorSrc, /state\.auftragId/);
  assert.match(editorSrc, /eintraege-pdf-aggregator\?auftrag_id=/);
});

test('P4-2: Editor-Integration zeigt Counts (Foto+Skizze+Diktat+Notiz)', () => {
  assert.match(editorSrc, /eintrag_count/);
  assert.match(editorSrc, /foto_count/);
  assert.match(editorSrc, /skizze_count/);
  assert.match(editorSrc, /diktat_count/);
});

// ─────────────────────────────────────────────────────────────────
//  P4-3 Source-Inspection + Compliance
// ─────────────────────────────────────────────────────────────────

test('P4-3: Aggregator hat requireAuth + Workspace-Check', () => {
  assert.match(aggSrc, /requireAuth/);
  assert.match(aggSrc, /Workspace-Zugriff verweigert/);
});

test('P4-3: Aggregator nutzt Bulk-Foto-Lookup via .in()', () => {
  assert.match(aggSrc, /\.in\(['"]id['"], allFotoIds\)/);
});

test('P4-3: Aggregator KEIN gpt-4o im Code-Path', () => {
  const codeOnly = aggSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /['"]gpt-4o['"]/);
});

test('P4-3: Performance: 50-Eintrag-Aggregation <100ms (Mock)', () => {
  const eintraege = [];
  for (let i = 0; i < 50; i++) {
    eintraege.push({ id: 'e' + i, typ: 'text', nr: i, datum: '2026-05-' + String(i % 28 + 1).padStart(2, '0'),
      titel: 'Eintrag ' + i, content: 'Lorem ipsum '.repeat(20) });
  }
  const t0 = Date.now();
  const doc = Aggregator.__internals.buildTipTapDoc({ auftrag: baseAuftrag, eintraege, fotos: [], skizzen: [] });
  const dt = Date.now() - t0;
  assert.ok(dt < 100, '50-Eintrag-Aggregation: ' + dt + 'ms (Limit: 100ms)');
  assert.ok(doc.content.length >= 50);
});
