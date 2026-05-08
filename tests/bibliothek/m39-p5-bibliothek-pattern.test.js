'use strict';

/**
 * MEGA³⁹ P5 — Bibliothek-Pattern Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Bib = require(path.join(ROOT, 'lib', 'bibliothek-pattern.js'));
const libSrc = fs.readFileSync(path.join(ROOT, 'lib', 'bibliothek-pattern.js'), 'utf8');
const listSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'user-favoriten-list.js'), 'utf8');
const toggleSrc = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'user-favoriten-toggle.js'), 'utf8');
const Toggle = require(path.join(ROOT, 'netlify', 'functions', 'user-favoriten-toggle.js'));

test('P5: PROVA_BIBLIOTHEK 6 Default-Kategorien', () => {
  assert.deepStrictEqual(Bib._DEFAULT_KATEGORIEN,
    ['normen', 'textbausteine', 'floskeln', 'paragraphen', 'kontakte', 'positionen']);
});

test('P5: KATEGORIE_META hat label/icon/searchType pro Kategorie', () => {
  ['normen', 'textbausteine', 'floskeln', 'paragraphen', 'kontakte', 'positionen']
    .forEach(k => {
      const m = Bib._KATEGORIE_META[k];
      assert.ok(m && m.label && m.icon && m.searchType, 'meta fehlt: ' + k);
    });
});

test('P5: Public API exposed (init, search, insertAtCursor, getRecent, getFavoriten, toggleFavorit)', () => {
  ['init', 'search', 'insertAtCursor', 'getRecent', 'getFavoriten', 'toggleFavorit']
    .forEach(fn => assert.strictEqual(typeof Bib[fn], 'function', fn + ' fehlt'));
});

test('P5: search ruft global-search Lambda mit type-Filter', async () => {
  let calledUrl = null;
  Bib._setFetcherForTests(async (url) => {
    calledUrl = url;
    return { ok: true, json: async () => ({ results: [] }) };
  });
  await Bib.search('normen', 'din');
  assert.match(calledUrl, /\/global-search\?q=din/);
  assert.match(calledUrl, /type=normen/);
});

test('P5: search lehnt Query <2 Zeichen ab', async () => {
  Bib._setFetcherForTests(async () => ({ ok: true, json: async () => ({ results: [{}] }) }));
  const res = await Bib.search('normen', 'd');
  assert.strictEqual(res.length, 0);
});

test('P5: floskeln client-side gefiltert (subtitle "floskel")', async () => {
  Bib._setFetcherForTests(async () => ({
    ok: true,
    json: async () => ({ results: [
      { title: 'A', subtitle: 'baustein' },
      { title: 'B', subtitle: 'floskel' }
    ]})
  }));
  const res = await Bib.search('floskeln', 'test');
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].title, 'B');
});

test('P5: paragraphen client-side gefiltert (§ / ZPO / BGB / VOB / UStG)', async () => {
  Bib._setFetcherForTests(async () => ({
    ok: true,
    json: async () => ({ results: [
      { title: 'DIN 4108', subtitle: 'Bauphysik' },
      { title: 'ZPO § 407a', subtitle: 'Pflichten SV' },
      { title: 'BGB § 286', subtitle: 'Verzug' }
    ]})
  }));
  const res = await Bib.search('paragraphen', 'test');
  assert.strictEqual(res.length, 2);  // ZPO + BGB matchen, DIN nicht
});

test('P5: Recent-Items in localStorage (max 10, neueste zuerst)', () => {
  // Browser-Storage-Mock
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  Bib._addRecent('normen', { id: 'DIN 4108', title: 'Bauphysik', subtitle: 'Norm' });
  Bib._addRecent('normen', { id: 'DIN 985',  title: 'Mutter',    subtitle: 'Norm' });
  const list = Bib.getRecent('normen');
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].id, 'DIN 985');  // neuester zuerst
  delete global.localStorage;
});

test('P5: insertAtCursor in <textarea> setzt Text an Cursor-Position', () => {
  // Mock-DOM
  const editor = {
    tagName: 'TEXTAREA',
    value: 'Hello World',
    selectionStart: 5,
    selectionEnd: 5,
    focus: () => {},
    dispatchEvent: () => {}
  };
  Bib.insertAtCursor(editor, ' INSERTED');
  assert.strictEqual(editor.value, 'Hello INSERTED World');
});

test('P5: insertAtCursor mit Function-Editor ruft Callback', () => {
  let received = null;
  Bib.insertAtCursor((text) => { received = text; }, 'Hallo');
  assert.strictEqual(received, 'Hallo');
});

test('P5: toggleFavorit ruft user-favoriten-toggle Lambda', async () => {
  let posted = null;
  Bib._setFetcherForTests(async (url, opts) => {
    posted = { url, body: opts.body };
    return { ok: true, json: async () => ({ ok: true, is_favorit: true, action: 'added' }) };
  });
  const r = await Bib.toggleFavorit('normen', 'DIN 985', 'Mutter');
  assert.match(posted.url, /user-favoriten-toggle/);
  const body = JSON.parse(posted.body);
  assert.strictEqual(body.kategorie, 'normen');
  assert.strictEqual(body.item_id, 'DIN 985');
  assert.strictEqual(r.ok, true);
});

// ── Lambdas ──
test('P5: user-favoriten-list Lambda hat requireAuth + GET-only', () => {
  assert.match(listSrc, /requireAuth/);
  assert.match(listSrc, /event\.httpMethod !== ['"]GET['"]/);
});

test('P5: user-favoriten-toggle Lambda hat 6 valid kategorien + Toggle-Logic', () => {
  assert.match(toggleSrc, /VALID_KATEGORIEN/);
  ['normen', 'textbausteine', 'floskeln', 'paragraphen', 'kontakte', 'positionen']
    .forEach(k => assert.ok(Toggle.__VALID_KATEGORIEN.includes(k)));
  // Toggle: existing → DELETE, sonst INSERT
  assert.match(toggleSrc, /\.delete\(\)\.eq\(['"]id['"]/);
  assert.match(toggleSrc, /action:\s*['"]added['"]/);
  assert.match(toggleSrc, /action:\s*['"]removed['"]/);
});

test('P5: user-favoriten-toggle 400 bei ungültiger kategorie / fehlender item_id', () => {
  assert.match(toggleSrc, /kategorie ungültig/);
  assert.match(toggleSrc, /item_id \(String\) pflicht/);
});

test('P5: lib-Source enthält Toolbar-Builder (init mit container + editor)', () => {
  assert.match(libSrc, /function init\(opts\)/);
  assert.match(libSrc, /pb-toolbar/);
  assert.match(libSrc, /pb-btn/);
});

test('P5: 200ms Debounce für Live-Search', () => {
  // multiline setTimeout (async callback)
  assert.ok(/setTimeout\([\s\S]*?,\s*200\)/.test(libSrc), 'setTimeout 200ms nicht gefunden');
});
