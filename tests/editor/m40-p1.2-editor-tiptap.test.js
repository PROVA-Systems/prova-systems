'use strict';

/**
 * MEGA⁴⁰ P1.2 — TipTap-UI-Integration Tests
 *
 * Tests fuer:
 *  - lib/editor-tiptap.js (Wrapper + Debounce-Logic)
 *  - lib/prova-editor.js (Underline + Align Extensions)
 *  - lib/editor-tiptap.css (Status-Bar + Versions-Panel)
 *  - editor-demo.html (Pattern A volle Page-Width Demo)
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const EditorTipTap = require(path.join(ROOT, 'lib', 'editor-tiptap.js'));
const provaEditorSrc = read('lib/prova-editor.js');
const editorTipTapSrc = read('lib/editor-tiptap.js');
const editorTipTapCssSrc = read('lib/editor-tiptap.css');
const demoHtml = read('editor-demo.html');

// ─────────────────────────────────────────────────────────────────
//  P1.2-1 ProvaEditor Underline + TextAlign Extensions
// ─────────────────────────────────────────────────────────────────

test('P1.2-1: ProvaEditor laedt @tiptap/extension-underline@2 via CDN', () => {
  assert.match(provaEditorSrc, /@tiptap\/extension-underline@2/);
});

test('P1.2-1: ProvaEditor laedt @tiptap/extension-text-align@2 via CDN', () => {
  assert.match(provaEditorSrc, /@tiptap\/extension-text-align@2/);
});

test('P1.2-1: ProvaEditor exportiert Underline + TextAlign in _tiptapModules', () => {
  assert.match(provaEditorSrc, /Underline:\s*underlineModule\.default\s*\|\|\s*underlineModule\.Underline/);
  assert.match(provaEditorSrc, /TextAlign:\s*textAlignModule\.default\s*\|\|\s*textAlignModule\.TextAlign/);
});

test('P1.2-1: ProvaEditor wires Underline + TextAlign in extensions[]', () => {
  assert.match(provaEditorSrc, /modules\.Underline,/);
  assert.match(provaEditorSrc, /modules\.TextAlign\.configure\(\{\s*types:\s*\['heading',\s*'paragraph'\]/);
});

test('P1.2-1: Toolbar hat Underline-Button (toggleUnderline)', () => {
  assert.match(provaEditorSrc, /toggleUnderline\(\)\.run\(\)/);
  assert.match(provaEditorSrc, /label:\s*'U'/);
});

test('P1.2-1: Toolbar hat 4 Align-Buttons (left/center/right/justify)', () => {
  assert.match(provaEditorSrc, /setTextAlign\('left'\)/);
  assert.match(provaEditorSrc, /setTextAlign\('center'\)/);
  assert.match(provaEditorSrc, /setTextAlign\('right'\)/);
  assert.match(provaEditorSrc, /setTextAlign\('justify'\)/);
});

// ─────────────────────────────────────────────────────────────────
//  P1.2-2 editor-tiptap.js Wrapper-Lib
// ─────────────────────────────────────────────────────────────────

test('P1.2-2: editor-tiptap exports SAVE_DEBOUNCE_MS = 5000', () => {
  assert.strictEqual(EditorTipTap.SAVE_DEBOUNCE_MS, 5000);
});

test('P1.2-2: editor-tiptap exports VALID_WEGE = ["weg_a", "weg_b", "weg_c"]', () => {
  assert.deepStrictEqual(EditorTipTap.VALID_WEGE, ['weg_a', 'weg_b', 'weg_c']);
});

test('P1.2-2: editor-tiptap exports SAVE_ENDPOINT + LOAD_ENDPOINT', () => {
  assert.strictEqual(EditorTipTap.SAVE_ENDPOINT, '/.netlify/functions/document-save');
  assert.strictEqual(EditorTipTap.LOAD_ENDPOINT, '/.netlify/functions/document-load');
});

test('P1.2-2: editor-tiptap source enthaelt window.ProvaEditorTipTap.mount', () => {
  assert.match(editorTipTapSrc, /window\.ProvaEditorTipTap\s*=\s*\{/);
  assert.match(editorTipTapSrc, /mount:\s*mount/);
});

test('P1.2-2: editor-tiptap mount() validiert weg gegen VALID_WEGE', () => {
  assert.match(editorTipTapSrc, /VALID_WEGE\.indexOf\(opts\.weg\)\s*===\s*-1/);
});

test('P1.2-2: editor-tiptap mount() prueft ProvaEditor verfuegbar', () => {
  assert.match(editorTipTapSrc, /window\.ProvaEditor.*\|\|\s*typeof window\.ProvaEditor\.create\s*!==\s*['"]function['"]/);
});

test('P1.2-2: editor-tiptap save() ruft POST /document-save mit weg + content_json', () => {
  assert.match(editorTipTapSrc, /SAVE_ENDPOINT.*body/s);
  assert.match(editorTipTapSrc, /body\.weg\s*=\s*state\.weg|weg:\s*state\.weg/);
  assert.match(editorTipTapSrc, /content_json:\s*json/);
});

test('P1.2-2: editor-tiptap setzt document_id + version_nr nach erfolgreichem Save', () => {
  assert.match(editorTipTapSrc, /state\.documentId\s*=\s*resp\.document_id/);
  assert.match(editorTipTapSrc, /state\.currentVersion\s*=\s*resp\.version_nr/);
});

test('P1.2-2: editor-tiptap loadVersion() ruft GET /document-load mit version-Param', () => {
  assert.match(editorTipTapSrc, /LOAD_ENDPOINT.*\?id=.*&version=/);
});

test('P1.2-2: Status-Bar hat 5 Status-Stati (idle/dirty/saving/saved/error)', () => {
  assert.match(editorTipTapSrc, /'idle'|--idle/);
  assert.match(editorTipTapSrc, /'dirty'|--dirty/);
  assert.match(editorTipTapSrc, /'saving'|--saving/);
  assert.match(editorTipTapSrc, /'saved'|--saved/);
  assert.match(editorTipTapSrc, /'error'|--error/);
});

test('P1.2-2: Versions-UI rendert max 10 Versionen (slice(0, 10))', () => {
  assert.match(editorTipTapSrc, /\.slice\(0,\s*10\)/);
});

test('P1.2-2: Page-Unload-Defense: debouncedSave.flush() on beforeunload', () => {
  assert.match(editorTipTapSrc, /addEventListener\(['"]beforeunload['"]/);
  assert.match(editorTipTapSrc, /debouncedSave\.flush\(\)/);
});

test('P1.2-2: Auth-Token-Resolver: Netlify-Identity + Supabase-LocalStorage', () => {
  assert.match(editorTipTapSrc, /netlifyIdentity/);
  assert.match(editorTipTapSrc, /sb-access-token|supabase\.auth\.token/);
});

test('P1.2-2: Defensive Wrapping — Module-Export ohne Window-Crash', () => {
  // Kein Crash beim require — wenn das hier durchlaeuft, ist's gruen
  assert.ok(EditorTipTap.SAVE_DEBOUNCE_MS);
  assert.ok(EditorTipTap._debounce);
});

// ─────────────────────────────────────────────────────────────────
//  P1.2-2 _debounce Logic-Tests
// ─────────────────────────────────────────────────────────────────

test('P1.2-2: _debounce verzoegert fn um ms Millisekunden', async () => {
  let called = 0;
  const fn = () => { called++; };
  const d = EditorTipTap._debounce(fn, 50);
  d(); d(); d();  // 3x rasch hintereinander
  assert.strictEqual(called, 0);  // noch nicht
  await new Promise(r => setTimeout(r, 80));
  assert.strictEqual(called, 1);  // nur 1x nach Delay
});

test('P1.2-2: _debounce.cancel() verhindert pending fn-Aufruf', async () => {
  let called = 0;
  const fn = () => { called++; };
  const d = EditorTipTap._debounce(fn, 50);
  d();
  d.cancel();
  await new Promise(r => setTimeout(r, 80));
  assert.strictEqual(called, 0);
});

test('P1.2-2: _debounce.flush() ruft fn sofort + cleart timer', async () => {
  let called = 0;
  const fn = () => { called++; };
  const d = EditorTipTap._debounce(fn, 1000);
  d();
  d.flush();
  assert.strictEqual(called, 1);  // sofort
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(called, 1);  // kein Doppel-Aufruf
});

// ─────────────────────────────────────────────────────────────────
//  P1.2-3 CSS Status-Bar + Versions-Panel
// ─────────────────────────────────────────────────────────────────

test('P1.2-3: CSS hat alle 5 Status-Stati (.pet-status--idle/dirty/saving/saved/error)', () => {
  ['idle', 'dirty', 'saving', 'saved', 'error'].forEach(s => {
    assert.match(editorTipTapCssSrc, new RegExp('\\.pet-status--' + s + '\\b'));
  });
});

test('P1.2-3: CSS hat Mobile-Touch-Targets (min-height 40px)', () => {
  assert.match(editorTipTapCssSrc, /min-height:\s*40px/);
});

test('P1.2-3: CSS respektiert prefers-reduced-motion', () => {
  assert.match(editorTipTapCssSrc, /prefers-reduced-motion/);
});

test('P1.2-3: CSS iOS-Zoom-Defense (font-size 16px in mobile breakpoint)', () => {
  assert.match(editorTipTapCssSrc, /font-size:\s*16px/);
});

// ─────────────────────────────────────────────────────────────────
//  P1.2-4 editor-demo.html Pattern A
// ─────────────────────────────────────────────────────────────────

test('P1.2-4: editor-demo.html hat Pattern-A max-width 1400px', () => {
  assert.match(demoHtml, /max-width:\s*1400px/);
});

test('P1.2-4: editor-demo.html laedt /lib/prova-editor.js + /lib/editor-tiptap.js', () => {
  assert.match(demoHtml, /\/lib\/prova-editor\.js/);
  assert.match(demoHtml, /\/lib\/editor-tiptap\.js/);
});

test('P1.2-4: editor-demo.html hat #editor-mount Container', () => {
  assert.match(demoHtml, /id=["']editor-mount["']/);
});

test('P1.2-4: editor-demo.html hat 3-Wege-Selector (weg_a/b/c)', () => {
  assert.match(demoHtml, /value=["']weg_a["']/);
  assert.match(demoHtml, /value=["']weg_b["']/);
  assert.match(demoHtml, /value=["']weg_c["']/);
});

test('P1.2-4: editor-demo.html ruft ProvaEditorTipTap.mount()', () => {
  assert.match(demoHtml, /ProvaEditorTipTap\.mount/);
});

test('P1.2-4: editor-demo.html setzt autoSaveMs: 5000', () => {
  assert.match(demoHtml, /autoSaveMs:\s*5000/);
});
