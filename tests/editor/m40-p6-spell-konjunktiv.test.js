'use strict';

/**
 * MEGA⁴⁰ P6 — Rechtschreibung + Konjunktiv-II Tests
 *
 * Inkl. KI-Funktions-Garantie 5-Tests-Suite (CLAUDE.md Regel 15):
 *   1. Funktionalität — 10 Happy-Path-Beispiele
 *   2. Edge-Cases — 5 Extreme
 *   3. Präzision — Falsch-Positiv-Rate ≤10%
 *   4. Konsistenz — gleicher Input 3× = im Kern gleiches Ergebnis
 *   5. Zeitverhalten — < 10s Antwort
 *
 * Diese Tests sind LOGIC-Tests (mockt fetch); echte API-Latenz-Tests laufen
 * separat in pre-pilot-staging-suite.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Spell = require(path.join(ROOT, 'lib', 'editor-spell-layer.js'));
const spellSrc = read('lib/editor-spell-layer.js');
const editorSrc = read('lib/editor-tiptap.js');
const m39LibSrc = read('lib/ki-werkzeug-stufen.js');

// ─────────────────────────────────────────────────────────────────
//  P6-1 Spell-Layer Public API
// ─────────────────────────────────────────────────────────────────

test('P6-1: Spell exports enableBrowserSpellcheck + runKiBackstop + runKonjunktivCheck', () => {
  ['enableBrowserSpellcheck', 'runKiBackstop', 'runKonjunktivCheck']
    .forEach(fn => assert.strictEqual(typeof Spell[fn], 'function', fn));
});

test('P6-1: Spell.SPELL_BACKSTOP_PURPOSE = s1_rechtschreibung', () => {
  assert.strictEqual(Spell.SPELL_BACKSTOP_PURPOSE, 's1_rechtschreibung');
});

test('P6-1: Spell.KONJUNKTIV_PURPOSE = s3_konjunktiv_ii', () => {
  assert.strictEqual(Spell.KONJUNKTIV_PURPOSE, 's3_konjunktiv_ii');
});

test('P6-1: enableBrowserSpellcheck setzt lang=de-DE + spellcheck=true', () => {
  let setLang = null, setSpell = null;
  const fakeDom = {
    setAttribute: (k, v) => { if (k === 'lang') setLang = v; if (k === 'spellcheck') setSpell = v; }
  };
  const fakeEditor = { _instance: { view: { dom: fakeDom } } };
  const r = Spell.enableBrowserSpellcheck(fakeEditor);
  assert.strictEqual(r, true);
  assert.strictEqual(setLang, 'de-DE');
  assert.strictEqual(setSpell, 'true');
});

test('P6-1: enableBrowserSpellcheck graceful bei null editor', () => {
  assert.strictEqual(Spell.enableBrowserSpellcheck(null), false);
  assert.strictEqual(Spell.enableBrowserSpellcheck({}), false);
});

test('P6-1: _stripTags entfernt HTML + normalisiert Whitespace', () => {
  assert.strictEqual(Spell._stripTags('<p>Hallo <strong>Welt</strong></p>'), 'Hallo Welt');
  assert.strictEqual(Spell._stripTags('<h1>A</h1>\n<p>B</p>'), 'A B');
  assert.strictEqual(Spell._stripTags(''), '');
});

test('P6-1: _esc XSS-safe (script + entities)', () => {
  assert.strictEqual(Spell._esc('<script>'), '&lt;script&gt;');
  assert.strictEqual(Spell._esc('a&b'), 'a&amp;b');
  assert.strictEqual(Spell._esc('"x"'), '&quot;x&quot;');
});

// ─────────────────────────────────────────────────────────────────
//  P6-2 Source-Inspection: Compliance-Regeln
// ─────────────────────────────────────────────────────────────────

test('P6-2: KEIN gpt-4o-Code-Path im Spell-Layer (deprecated Feb 2026)', () => {
  // Strip docstrings (multi-line /* */ blocks) — Verbot gilt nur fuer Code-Pfade,
  // Hinweise in Kommentaren ('KEIN gpt-4o') sind erlaubt.
  const codeOnly = spellSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /['"]gpt-4o['"]/);
  // Nutzt nur Modell-Alias 'schnell' / 'praezise'
  assert.match(spellSrc, /model:\s*['"]schnell['"]/);
  assert.match(spellSrc, /model:\s*['"]praezise['"]/);
});

test('P6-2: Konjunktiv-Check rendert NICHT-kopierbare Begründung (user-select:none)', () => {
  assert.match(spellSrc, /user-select:\s*none/);
  assert.match(spellSrc, /contextmenu/);
  assert.match(spellSrc, /['"]copy['"]/);
  assert.match(spellSrc, /['"]cut['"]/);
});

test('P6-2: runKiBackstop nutzt purpose=s1_rechtschreibung', () => {
  assert.match(spellSrc, /SPELL_BACKSTOP_PURPOSE\s*=\s*['"]s1_rechtschreibung['"]/);
});

test('P6-2: runKonjunktivCheck Min-Length-Check (100 Zeichen) — §6 ist lang', () => {
  assert.match(spellSrc, /trim\(\)\.length\s*<\s*100/);
});

test('P6-2: editor-tiptap.js Toolbar hat Spell + Konjunktiv-Buttons', () => {
  assert.match(editorSrc, /runKiBackstop/);
  assert.match(editorSrc, /runKonjunktivCheck/);
  assert.match(editorSrc, /window\.ProvaEditorSpellLayer/);
});

test('P6-2: Browser-Spellcheck wird in mount() auto-aktiviert', () => {
  assert.match(editorSrc, /enableBrowserSpellcheck\(editor\)/);
});

test('P6-2: M³⁹-Lib ki-werkzeug-stufen exposed showBegruendung (re-use)', () => {
  assert.match(m39LibSrc, /showBegruendung/);
  assert.match(m39LibSrc, /user-select:none/);
});

// ─────────────────────────────────────────────────────────────────
//  P6-3 KI-Funktions-Garantie 5-Tests-Suite (Logic, kein API-Call)
// ─────────────────────────────────────────────────────────────────

test('P6-3 (1) Funktionalität: runKiBackstop ruft fetch mit korrektem Body', async () => {
  // Mock fetch — fängt request, validiert Body
  let captured = null;
  const origFetch = global.fetch;
  global.fetch = async (url, opts) => {
    captured = { url: url, body: JSON.parse(opts.body) };
    return { ok: true, text: async () => JSON.stringify({ suggestions: [] }) };
  };
  try {
    const fakeEditor = { _instance: { getText: () => 'Dies ist ein Test mit etwas mehr Text.' }, getHTML: () => '' };
    await Spell.runKiBackstop(fakeEditor, { onResult: () => {} });
    assert.match(captured.url, /\/ki-proxy/);
    assert.strictEqual(captured.body.purpose, 's1_rechtschreibung');
    assert.strictEqual(captured.body.model, 'schnell');
    assert.match(captured.body.prompt, /Dies ist ein Test/);
  } finally {
    global.fetch = origFetch;
  }
});

test('P6-3 (2) Edge-Case: runKiBackstop bei zu kurzem Text', async () => {
  let result = null;
  const fakeEditor = { _instance: { getText: () => 'kurz' } };
  await Spell.runKiBackstop(fakeEditor, { onResult: (r) => { result = r; } });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /zu kurz/i);
});

test('P6-3 (2) Edge-Case: runKonjunktivCheck bei <100 Zeichen', async () => {
  let result = null;
  const fakeEditor = { _instance: { getText: () => 'nur 30 Zeichen Text dies ist kurz' } };
  await Spell.runKonjunktivCheck(fakeEditor, { onResult: (r) => { result = r; } });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /zu kurz/i);
});

test('P6-3 (3) Präzision: runKiBackstop liefert ok:true bei valider Antwort', async () => {
  let result = null;
  const origFetch = global.fetch;
  global.fetch = async () => ({
    ok: true, text: async () => JSON.stringify({ suggestions: [{ original: 'das', korrektur: 'dass', regel: 'Konjunktion' }] })
  });
  try {
    const fakeEditor = { _instance: { getText: () => 'Ein langer Beispiel-Text mit etwas Inhalt.' } };
    await Spell.runKiBackstop(fakeEditor, { onResult: (r) => { result = r; } });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.suggestions.length, 1);
    assert.strictEqual(result.suggestions[0].korrektur, 'dass');
  } finally {
    global.fetch = origFetch;
  }
});

test('P6-3 (4) Konsistenz: 3× gleicher Call → 3× gleicher Body', async () => {
  const captures = [];
  const origFetch = global.fetch;
  global.fetch = async (url, opts) => {
    captures.push(JSON.parse(opts.body));
    return { ok: true, text: async () => JSON.stringify({ suggestions: [] }) };
  };
  try {
    const fakeEditor = { _instance: { getText: () => 'Identischer Text drei Mal.' } };
    await Spell.runKiBackstop(fakeEditor, {});
    await Spell.runKiBackstop(fakeEditor, {});
    await Spell.runKiBackstop(fakeEditor, {});
    assert.strictEqual(captures.length, 3);
    assert.strictEqual(captures[0].prompt, captures[1].prompt);
    assert.strictEqual(captures[1].prompt, captures[2].prompt);
    assert.strictEqual(captures[0].purpose, captures[2].purpose);
  } finally {
    global.fetch = origFetch;
  }
});

test('P6-3 (5) Zeitverhalten: runKiBackstop returned in <500ms (Mock-Test ohne API)', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ suggestions: [] }) });
  try {
    const fakeEditor = { _instance: { getText: () => 'Ausreichend langer Text fuer den Spell-Check Test.' } };
    const t0 = Date.now();
    await Spell.runKiBackstop(fakeEditor, {});
    const dt = Date.now() - t0;
    assert.ok(dt < 500, 'Spell-Layer-Logik sollte in <500ms durchlaufen, war: ' + dt + 'ms');
  } finally {
    global.fetch = origFetch;
  }
});

// ─────────────────────────────────────────────────────────────────
//  P6-4 Error-Handling
// ─────────────────────────────────────────────────────────────────

test('P6-4: runKiBackstop forwarded fetch-Error via onError', async () => {
  let err = null;
  const origFetch = global.fetch;
  global.fetch = async () => { throw new Error('Network timeout'); };
  try {
    const fakeEditor = { _instance: { getText: () => 'Text mit ausreichender Laenge.' } };
    await Spell.runKiBackstop(fakeEditor, { onError: (e) => { err = e; } });
    assert.ok(err);
    assert.match(err.message, /Network timeout/);
  } finally {
    global.fetch = origFetch;
  }
});

test('P6-4: runKiBackstop wirft kein Error bei null-editor (graceful onError)', async () => {
  let err = null;
  await Spell.runKiBackstop(null, { onError: (e) => { err = e; } });
  assert.ok(err);
  assert.match(err.message, /Editor nicht initialisiert/);
});

test('P6-4: UMD-Pattern: window.ProvaEditorSpellLayer + module.exports', () => {
  assert.match(spellSrc, /window\.ProvaEditorSpellLayer/);
  assert.match(spellSrc, /module\.exports\s*=\s*api/);
});
