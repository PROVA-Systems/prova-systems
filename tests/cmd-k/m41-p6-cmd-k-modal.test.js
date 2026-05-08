'use strict';

/**
 * MEGA⁴¹ P6 — Cmd-K Modal Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Cmdk = require(path.join(ROOT, 'lib', 'cmd-k-modal.js'));
const cmdkSrc = read('lib/cmd-k-modal.js');

// ─────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────

test('P6-1: Cmdk exports open + close + init + Recent-Search-Funktionen', () => {
  ['open', 'close', 'init', 'addRecentSearch', 'getRecentSearches']
    .forEach(fn => assert.strictEqual(typeof Cmdk[fn], 'function', fn));
});

test('P6-1: Cmdk Konstanten — DEBOUNCE_MS=80, MAX_RECENT=10, MIN_QUERY_LEN=1', () => {
  assert.strictEqual(Cmdk.DEBOUNCE_MS, 80);
  assert.strictEqual(Cmdk.MAX_RECENT, 10);
  assert.strictEqual(Cmdk.MIN_QUERY_LEN, 1);
});

// ─────────────────────────────────────────────────────────────────
//  Highlight-Logic (Drilldown-Kern)
// ─────────────────────────────────────────────────────────────────

test('P6-2: _highlight markiert Match-Substring mit cmdk-mark', () => {
  const r = Cmdk._highlight('DIN 4108-2', 'DIN');
  assert.match(r, /<span class="cmdk-mark">DIN<\/span>/);
});

test('P6-2: _highlight case-insensitive', () => {
  const r = Cmdk._highlight('schimmel', 'SCHIMMEL');
  assert.match(r, /<span class="cmdk-mark">schimmel<\/span>/);
});

test('P6-2: _highlight Drilldown DIN→DIN9→DIN98 → progressive Matches', () => {
  const text = 'DIN 985 (Schraube)';
  assert.match(Cmdk._highlight(text, 'DIN'), /<span class="cmdk-mark">DIN<\/span> 985/);
  assert.match(Cmdk._highlight(text, 'DIN 9'), /<span class="cmdk-mark">DIN 9<\/span>85/);
  assert.match(Cmdk._highlight(text, 'DIN 98'), /<span class="cmdk-mark">DIN 98<\/span>5/);
  assert.match(Cmdk._highlight(text, 'DIN 985'), /<span class="cmdk-mark">DIN 985<\/span>/);
});

test('P6-2: _highlight escaped XSS', () => {
  const r = Cmdk._highlight('<script>x</script>', 'script');
  assert.doesNotMatch(r, /<script>x<\/script>/);
  assert.match(r, /&lt;<span class="cmdk-mark">script<\/span>&gt;/);
});

test('P6-2: _highlight handhabt Regex-Special-Chars im Query', () => {
  // Query mit . * + sollte nicht crashen
  const r = Cmdk._highlight('Test (1+1)', '1+1');
  assert.match(r, /1\+1/);
});

test('P6-2: _highlight ohne Query → einfacher escape', () => {
  const r = Cmdk._highlight('<b>test</b>', '');
  assert.strictEqual(r, '&lt;b&gt;test&lt;/b&gt;');
});

test('P6-2: _typeIcon liefert Emojis fuer 9 Typen', () => {
  ['akte', 'auftrag', 'kontakt', 'dokument', 'termin', 'eintrag', 'textbaustein', 'template', 'norm']
    .forEach(t => {
      const icon = Cmdk._typeIcon(t);
      assert.ok(icon && icon.length >= 1, t + ': ' + icon);
    });
});

test('P6-2: _typeIcon Fallback fuer unbekannte Typen', () => {
  assert.strictEqual(Cmdk._typeIcon('unknown'), '🔍');
});

// ─────────────────────────────────────────────────────────────────
//  Recent-Searches via localStorage Mock
// ─────────────────────────────────────────────────────────────────

test('P6-3: Recent-Searches Roundtrip + Dedup + Max-10', () => {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; }
  };
  try {
    // 12 Add → max 10 erhalten
    for (let i = 0; i < 12; i++) Cmdk.addRecentSearch('Query ' + i);
    const recent = Cmdk.getRecentSearches();
    assert.strictEqual(recent.length, 10);
    // Neueste zuerst
    assert.strictEqual(recent[0], 'Query 11');

    // Dedup: re-add eines existing query → an erste Position, kein Duplikat
    Cmdk.addRecentSearch('Query 5');
    const recent2 = Cmdk.getRecentSearches();
    assert.strictEqual(recent2[0], 'Query 5');
    assert.strictEqual(recent2.filter(q => q === 'Query 5').length, 1);
  } finally {
    delete global.localStorage;
  }
});

test('P6-3: Recent-Searches ignoriert leere Query', () => {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; }
  };
  try {
    Cmdk.addRecentSearch('');
    Cmdk.addRecentSearch(null);
    assert.deepStrictEqual(Cmdk.getRecentSearches(), []);
  } finally {
    delete global.localStorage;
  }
});

// ─────────────────────────────────────────────────────────────────
//  Source-Inspection
// ─────────────────────────────────────────────────────────────────

test('P6-4: Cmdk Keybinding Cmd+K (metaKey) UND Ctrl+K (ctrlKey)', () => {
  assert.match(cmdkSrc, /e\.metaKey \|\| e\.ctrlKey/);
  assert.match(cmdkSrc, /e\.key === ['"]k['"]/);
});

test('P6-4: Cmdk auto-init nach DOMContentLoaded', () => {
  assert.match(cmdkSrc, /addEventListener\(['"]DOMContentLoaded['"], init\)/);
});

test('P6-4: Cmdk Keyboard-Navigation (ArrowUp/ArrowDown/Enter/Escape)', () => {
  ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].forEach(k => {
    assert.match(cmdkSrc, new RegExp("e\\.key === ['\"]" + k + "['\"]"));
  });
});

test('P6-4: Cmdk nutzt /global-search Lambda', () => {
  assert.match(cmdkSrc, /\/\.netlify\/functions\/global-search/);
});

test('P6-4: Cmdk Group-by-Type-Sektion (akte/auftrag/kontakt/...)', () => {
  ['akte', 'auftrag', 'kontakt', 'dokument', 'termin', 'norm']
    .forEach(t => assert.match(cmdkSrc, new RegExp("'" + t + "'")));
});

test('P6-4: Cmdk @media prefers-reduced-motion respect', () => {
  assert.match(cmdkSrc, /prefers-reduced-motion/);
});

test('P6-4: UMD-Pattern (window + module.exports)', () => {
  assert.match(cmdkSrc, /window\.ProvaCmdK/);
  assert.match(cmdkSrc, /module\.exports\s*=\s*api/);
});
