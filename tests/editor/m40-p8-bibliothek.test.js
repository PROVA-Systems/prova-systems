'use strict';

/**
 * MEGA⁴⁰ P8 — Bibliothek-Toolbar-Adapter Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Adapter = require(path.join(ROOT, 'lib', 'editor-bibliothek-adapter.js'));
const adapterSrc = read('lib/editor-bibliothek-adapter.js');
const editorSrc = read('lib/editor-tiptap.js');

// ─────────────────────────────────────────────────────────────────
//  P8-1 Adapter Public API
// ─────────────────────────────────────────────────────────────────

test('P8-1: Adapter exports openModal + insertAtCursor + Recent-Funktionen', () => {
  ['openModal', 'insertAtCursor', 'getRecentItems', 'addRecentItem']
    .forEach(fn => assert.strictEqual(typeof Adapter[fn], 'function', fn));
});

test('P8-1: Adapter.KATEGORIEN hat 6 Kategorien (M⁴⁰ P8 Acceptance)', () => {
  assert.strictEqual(Adapter.KATEGORIEN.length, 6);
  const keys = Adapter.KATEGORIEN.map(k => k.key);
  ['normen', 'textbausteine', 'floskeln', 'paragraphen', 'kontakte', 'positionen']
    .forEach(k => assert.ok(keys.indexOf(k) >= 0, k + ' fehlt'));
});

test('P8-1: Adapter.MAX_RECENT = 5', () => {
  assert.strictEqual(Adapter.MAX_RECENT, 5);
});

// ─────────────────────────────────────────────────────────────────
//  P8-2 FOOTNOTE_PATTERN Auto-Detection
// ─────────────────────────────────────────────────────────────────

test('P8-2: FOOTNOTE_PATTERN matched DIN', () => {
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('DIN 4108'));
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('siehe DIN 18195'));
});

test('P8-2: FOOTNOTE_PATTERN matched WTA', () => {
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('WTA 4-5'));
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('WTA 6-2'));
});

test('P8-2: FOOTNOTE_PATTERN matched VOB + JVEG + ZPO', () => {
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('gemäß VOB/B'));
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('JVEG § 9'));
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('ZPO § 407a'));
});

test('P8-2: FOOTNOTE_PATTERN matched §-Verweise', () => {
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('§ 12'));
  assert.ok(Adapter.FOOTNOTE_PATTERN.test('§ 407a ZPO'));
});

test('P8-2: FOOTNOTE_PATTERN matched NICHT regular text', () => {
  assert.ok(!Adapter.FOOTNOTE_PATTERN.test('Sehr geehrte Damen und Herren'));
  assert.ok(!Adapter.FOOTNOTE_PATTERN.test('Schimmelbefall im Kellerbereich'));
});

// ─────────────────────────────────────────────────────────────────
//  P8-3 insertAtCursor Logic
// ─────────────────────────────────────────────────────────────────

test('P8-3: insertAtCursor returns false bei null editor', () => {
  assert.strictEqual(Adapter.insertAtCursor(null, 'Test'), false);
  assert.strictEqual(Adapter.insertAtCursor({}, 'Test'), false);
  assert.strictEqual(Adapter.insertAtCursor({ _instance: {} }, ''), false);
});

test('P8-3: insertAtCursor mit DIN-Text → ruft setFootnote', () => {
  const calls = [];
  const fakeChain = {
    focus: () => fakeChain,
    insertContent: (c) => { calls.push({ method: 'insertContent', arg: c }); return fakeChain; },
    run: () => { calls.push({ method: 'run' }); return true; }
  };
  const fakeTt = {
    chain: () => fakeChain,
    commands: { setFootnote: () => true }
  };
  Adapter.insertAtCursor({ _instance: fakeTt }, 'DIN 4108', { kategorie: 'normen', fullName: 'DIN 4108: Wärmeschutz' });
  // insertContent muss mit footnote-mark aufgerufen sein
  const insertCall = calls.find(c => c.method === 'insertContent');
  assert.ok(insertCall);
  assert.strictEqual(insertCall.arg.type, 'text');
  assert.ok(Array.isArray(insertCall.arg.marks));
  assert.strictEqual(insertCall.arg.marks[0].type, 'footnote');
});

test('P8-3: insertAtCursor mit Plain-Text → KEIN Footnote-Mark', () => {
  let captured = null;
  const fakeChain = {
    focus: () => fakeChain,
    insertContent: (c) => { captured = c; return fakeChain; },
    run: () => true
  };
  const fakeTt = {
    chain: () => fakeChain,
    commands: { setFootnote: () => true }
  };
  Adapter.insertAtCursor({ _instance: fakeTt }, 'Hallo Welt');
  // String, nicht Object mit Marks
  assert.strictEqual(typeof captured, 'string');
  assert.match(captured, /Hallo Welt/);
});

test('P8-3: insertAtCursor ohne setFootnote-Command → fallback Plain-Insert', () => {
  let captured = null;
  const fakeChain = {
    focus: () => fakeChain,
    insertContent: (c) => { captured = c; return fakeChain; },
    run: () => true
  };
  const fakeTt = {
    chain: () => fakeChain,
    commands: {}  // setFootnote nicht verfügbar
  };
  Adapter.insertAtCursor({ _instance: fakeTt }, 'DIN 4108');
  assert.strictEqual(typeof captured, 'string');
});

// ─────────────────────────────────────────────────────────────────
//  P8-4 Recent-Items via localStorage Mock
// ─────────────────────────────────────────────────────────────────

test('P8-4: getRecentItems returns leeres Array bei keiner LS', () => {
  // Node hat kein localStorage → graceful
  assert.deepStrictEqual(Adapter.getRecentItems('normen'), []);
});

test('P8-4: addRecentItem dedup + Max-5-Limit (mit fake LS)', () => {
  // Mock localStorage in Node
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; }
  };
  try {
    for (let i = 0; i < 7; i++) {
      Adapter.addRecentItem('normen', { text: 'Item ' + i, ts: i });
    }
    const items = Adapter.getRecentItems('normen');
    assert.strictEqual(items.length, 5);
    // Neueste zuerst
    assert.strictEqual(items[0].text, 'Item 6');
    assert.strictEqual(items[4].text, 'Item 2');

    // Duplikat hinzufügen → bleibt eindeutig
    Adapter.addRecentItem('normen', { text: 'Item 6', ts: 999 });
    const items2 = Adapter.getRecentItems('normen');
    assert.strictEqual(items2.length, 5);
    assert.strictEqual(items2[0].text, 'Item 6');
    assert.strictEqual(items2[0].ts, 999);
  } finally {
    delete global.localStorage;
  }
});

// ─────────────────────────────────────────────────────────────────
//  P8-5 Toolbar-Integration + Source-Inspection
// ─────────────────────────────────────────────────────────────────

test('P8-5: editor-tiptap.js Toolbar hat "📚 Bib" Button', () => {
  assert.match(editorSrc, /📚 Bib/);
  assert.match(editorSrc, /window\.ProvaEditorBibliothek\.openModal/);
});

test('P8-5: Adapter nutzt /global-search Lambda (re-use M³⁹ P5)', () => {
  assert.match(adapterSrc, /\/\.netlify\/functions\/global-search/);
});

test('P8-5: ESC + Click-outside schliesst Modal', () => {
  assert.match(adapterSrc, /e\.key === ['"]Escape['"]/);
  assert.match(adapterSrc, /e\.target === overlay/);
});

test('P8-5: Search-Debounce 250ms (Performance)', () => {
  assert.match(adapterSrc, /setTimeout\([^,]+,\s*250\)/);
});

test('P8-5: UMD-Pattern: window.ProvaEditorBibliothek + module.exports', () => {
  assert.match(adapterSrc, /window\.ProvaEditorBibliothek/);
  assert.match(adapterSrc, /module\.exports\s*=\s*api/);
});
