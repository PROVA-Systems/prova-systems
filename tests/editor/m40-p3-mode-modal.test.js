'use strict';

/**
 * MEGA⁴⁰ P3 — 3-Wege-Auswahl-Modal Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Modal = require(path.join(ROOT, 'lib', 'document-mode-modal.js'));
const modalSrc = read('lib/document-mode-modal.js');
const modalCss = read('lib/document-mode-modal.css');
const editorTipTapSrc = read('lib/editor-tiptap.js');
const editorCssSrc = read('lib/editor-tiptap.css');
const dokNeuHtml = read('dokument-neu.html');
const briefHtml = read('briefvorlagen.html');

// ─────────────────────────────────────────────────────────────────
//  P3-1 Modal-Lib API
// ─────────────────────────────────────────────────────────────────

test('P3-1: Modal exports VALID_WEGE = ["weg_a", "weg_b", "weg_c"]', () => {
  assert.deepStrictEqual(Modal.VALID_WEGE, ['weg_a', 'weg_b', 'weg_c']);
});

test('P3-1: Modal.LOCKED_SECTION_KEYS hat 4 Compliance-Sektionen (M⁴⁰-Vision)', () => {
  assert.strictEqual(Modal.LOCKED_SECTION_KEYS.length, 4);
  assert.ok(Modal.LOCKED_SECTION_KEYS.indexOf('deckblatt') >= 0);
  assert.ok(Modal.LOCKED_SECTION_KEYS.indexOf('paragraph_407a_zpo') >= 0);
  assert.ok(Modal.LOCKED_SECTION_KEYS.indexOf('eu_ai_act_disclosure') >= 0);
  assert.ok(Modal.LOCKED_SECTION_KEYS.indexOf('unterschrift') >= 0);
});

test('P3-1: Modal.LOCKED_SECTION_LABELS hat 4 lesbare Strings', () => {
  Modal.LOCKED_SECTION_KEYS.forEach(k => {
    assert.ok(typeof Modal.LOCKED_SECTION_LABELS[k] === 'string');
    assert.ok(Modal.LOCKED_SECTION_LABELS[k].length > 5);
  });
});

test('P3-1: Modal.WEG_META hat alle 3 Wege mit Icon/Title/Pitch/Details/BestFor', () => {
  ['weg_a', 'weg_b', 'weg_c'].forEach(w => {
    const m = Modal.WEG_META[w];
    assert.ok(m, w);
    assert.ok(m.icon);
    assert.ok(m.title);
    assert.ok(m.pitch);
    assert.ok(Array.isArray(m.details) && m.details.length >= 3);
    assert.ok(m.bestFor);
  });
});

test('P3-1: Modal exports open + confirmModeSwitch Functions', () => {
  assert.strictEqual(typeof Modal.open, 'function');
  assert.strictEqual(typeof Modal.confirmModeSwitch, 'function');
});

test('P3-1: confirmModeSwitch returns true when no current OR no content', async () => {
  // hasContent=false → kein Verlust → auto-OK
  const r1 = await Modal.confirmModeSwitch({ currentWeg: 'weg_a', newWeg: 'weg_b', hasContent: false });
  assert.strictEqual(r1, true);
  // gleicher weg → auto-OK
  const r2 = await Modal.confirmModeSwitch({ currentWeg: 'weg_a', newWeg: 'weg_a', hasContent: true });
  assert.strictEqual(r2, true);
});

test('P3-1: Modal-Source: ESC + Click-outside schliesst Modal', () => {
  assert.match(modalSrc, /e\.key === 'Escape'/);
  assert.match(modalSrc, /e\.target === overlay/);
});

test('P3-1: Modal-Source: onSelect kann werfen (Modal bleibt offen)', () => {
  assert.match(modalSrc, /catch \(e\)\s*\{\s*card\.disabled = false/s);
});

test('P3-1: Modal-Source: Auto-Focus auf erste Karte oder current', () => {
  assert.match(modalSrc, /\.pdmm-card--current.*\.pdmm-card/s);
});

// ─────────────────────────────────────────────────────────────────
//  P3-1 CSS — 3-Karten-Grid + Animations
// ─────────────────────────────────────────────────────────────────

test('P3-1: CSS hat .pdmm-overlay mit z-index 9999 + backdrop-filter', () => {
  assert.match(modalCss, /\.pdmm-overlay\s*\{[\s\S]*?z-index:\s*9999/);
  assert.match(modalCss, /backdrop-filter:\s*blur/);
});

test('P3-1: CSS hat 3-Spalten-Grid → 1-Spalten ab 900px', () => {
  assert.match(modalCss, /grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  assert.match(modalCss, /@media \(max-width:\s*900px\)[\s\S]{0,100}grid-template-columns:\s*1fr/);
});

test('P3-1: CSS .pdmm-card--current visuell hervorgehoben (success-color)', () => {
  assert.match(modalCss, /\.pdmm-card--current/);
  assert.match(modalCss, /var\(--success/);
});

test('P3-1: CSS @keyframes pdmm-fade-in + prefers-reduced-motion', () => {
  assert.match(modalCss, /@keyframes pdmm-fade-in/);
  assert.match(modalCss, /prefers-reduced-motion/);
});

// ─────────────────────────────────────────────────────────────────
//  P3-2 Mode-Switcher Weg-Badge in editor-tiptap
// ─────────────────────────────────────────────────────────────────

test('P3-2: editor-tiptap.js hat WEG_BADGE_TEXTS Map (3 Eintraege)', () => {
  assert.match(editorTipTapSrc, /WEG_BADGE_TEXTS\s*=\s*\{/);
  assert.match(editorTipTapSrc, /weg_a:\s*['"]A · Wizard/);
  assert.match(editorTipTapSrc, /weg_b:\s*['"]B · Eigene Vorlage/);
  assert.match(editorTipTapSrc, /weg_c:\s*['"]C · Hybrid/);
});

test('P3-2: editor-tiptap.js Status-Bar baut wegBadge Button', () => {
  assert.match(editorTipTapSrc, /const wegBadge = document\.createElement\(['"]button['"]\)/);
  assert.match(editorTipTapSrc, /pet-weg-badge--/);
});

test('P3-2: Weg-Badge-Click oeffnet ProvaDocumentModeModal', () => {
  assert.match(editorTipTapSrc, /window\.ProvaDocumentModeModal\.open/);
  assert.match(editorTipTapSrc, /confirmModeSwitch/);
});

test('P3-2: Bei Mode-Switch zu weg_c werden LOCKED_SECTION_KEYS gesetzt', () => {
  assert.match(editorTipTapSrc, /newWeg === ['"]weg_c['"]/);
  assert.match(editorTipTapSrc, /LOCKED_SECTION_KEYS\.slice\(\)/);
});

test('P3-2: Bei Mode-Switch weg von weg_c werden lockedSections geleert', () => {
  assert.match(editorTipTapSrc, /state\.lockedSections\s*=\s*\[\]/);
});

test('P3-2: CSS hat .pet-weg-badge--weg_a/b/c mit eigenen Farben', () => {
  assert.match(editorCssSrc, /\.pet-weg-badge--weg_a/);
  assert.match(editorCssSrc, /\.pet-weg-badge--weg_b/);
  assert.match(editorCssSrc, /\.pet-weg-badge--weg_c/);
});

// ─────────────────────────────────────────────────────────────────
//  P3-3 3-Page-Integration
// ─────────────────────────────────────────────────────────────────

test('P3-3: dokument-neu.html laedt alle 4 Editor-Libs', () => {
  assert.match(dokNeuHtml, /\/lib\/prova-editor\.js/);
  assert.match(dokNeuHtml, /\/lib\/editor-extensions\.js/);
  assert.match(dokNeuHtml, /\/lib\/document-mode-modal\.js/);
  assert.match(dokNeuHtml, /\/lib\/editor-tiptap\.js/);
});

test('P3-3: dokument-neu.html ruft ProvaDocumentModeModal.open zuerst', () => {
  assert.match(dokNeuHtml, /ProvaDocumentModeModal\.open/);
  assert.match(dokNeuHtml, /ProvaEditorTipTap\.mount/);
});

test('P3-3: dokument-neu.html unterstuetzt ?weg=... Quick-Start-Param', () => {
  assert.match(dokNeuHtml, /URLSearchParams/);
  assert.match(dokNeuHtml, /params\.get\(['"]weg['"]\)/);
});

test('P3-3: briefvorlagen.html hat M⁴⁰-Banner mit open-modal-btn', () => {
  assert.match(briefHtml, /id=["']m40-editor-banner["']/);
  assert.match(briefHtml, /id=["']m40-open-modal-btn["']/);
});

test('P3-3: briefvorlagen.html laedt /lib/document-mode-modal.js + .css', () => {
  assert.match(briefHtml, /\/lib\/document-mode-modal\.css/);
  assert.match(briefHtml, /\/lib\/document-mode-modal\.js/);
});

test('P3-3: briefvorlagen.html Banner-Click → /dokument-neu.html?weg=...', () => {
  assert.match(briefHtml, /\/dokument-neu\.html\?weg=/);
});
