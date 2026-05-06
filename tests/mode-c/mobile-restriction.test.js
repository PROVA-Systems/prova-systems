/**
 * PROVA — Mode-C Mobile-Restriction Tests
 * MEGA¹⁷-PERFECTION W62 (2026-05-08)
 *
 * Coverage:
 *   - workflow-mode-router.js: effectiveMode (Mobile-Fallback)
 *   - einstellungen.html CSS @media + Mobile-Hint
 *   - akte.html Mobile-Fallback-Toast
 *   - onboarding-trigger.js: Mobile-Hinweis bei Mode-C-Click
 */
'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const ROUTER_SRC = fs.readFileSync(path.join(ROOT, 'lib', 'workflow-mode-router.js'), 'utf8');
const EINST = fs.readFileSync(path.join(ROOT, 'einstellungen.html'), 'utf8');
const AKTE = fs.readFileSync(path.join(ROOT, 'akte.html'), 'utf8');
const ONBOARD = fs.readFileSync(path.join(ROOT, 'lib', 'onboarding-trigger.js'), 'utf8');

describe('lib/workflow-mode-router.js — effectiveMode (W58)', () => {
  let _origWindow;
  beforeEach(() => {
    _origWindow = global.window;
    global.window = { innerWidth: 1200 };
    delete require.cache[require.resolve(path.join(ROOT, 'lib', 'workflow-mode-router.js'))];
    require(path.join(ROOT, 'lib', 'workflow-mode-router.js'));
  });
  afterEach(() => {
    global.window = _origWindow;
  });

  test('effectiveMode existiert in Public API', () => {
    assert.equal(typeof global.window.ProvaWorkflowMode.effectiveMode, 'function');
  });

  test('Mobile (innerWidth=400) + Mode C → fallback A', () => {
    global.window.innerWidth = 400;
    const r = global.window.ProvaWorkflowMode.effectiveMode({ userDefault: 'C' });
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'mobile-fallback');
    assert.equal(r.original, 'C');
  });

  test('Desktop (innerWidth=1200) + Mode C → C bleibt', () => {
    global.window.innerWidth = 1200;
    const r = global.window.ProvaWorkflowMode.effectiveMode({ userDefault: 'C' });
    assert.equal(r.mode, 'C');
    assert.equal(r.source, 'default');
  });

  test('Mobile + Mode B → B bleibt (Editor mobile-tauglich)', () => {
    global.window.innerWidth = 400;
    const r = global.window.ProvaWorkflowMode.effectiveMode({ userDefault: 'B' });
    assert.equal(r.mode, 'B');
    assert.notEqual(r.source, 'mobile-fallback');
  });

  test('Mobile + Mode A → A bleibt (kein Fallback noetig)', () => {
    global.window.innerWidth = 400;
    const r = global.window.ProvaWorkflowMode.effectiveMode({ userDefault: 'A' });
    assert.equal(r.mode, 'A');
  });

  test('isMobile-Param ueberschreibt window.innerWidth', () => {
    global.window.innerWidth = 1200;
    const r = global.window.ProvaWorkflowMode.effectiveMode({ userDefault: 'C', isMobile: true });
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'mobile-fallback');
  });

  test('isMobile=false bei kleinem Window → C bleibt (override)', () => {
    global.window.innerWidth = 400;
    const r = global.window.ProvaWorkflowMode.effectiveMode({ userDefault: 'C', isMobile: false });
    assert.equal(r.mode, 'C');
  });

  test('auftragOverride hat Vorrang vor userDefault auch mit Mobile-Fallback', () => {
    // Override C + Mobile → fallback nimmt User-Default als Quelle, aber Override bleibt prioritaer
    global.window.innerWidth = 400;
    const r = global.window.ProvaWorkflowMode.effectiveMode({ auftragOverride: 'C', userDefault: 'A' });
    // Override ist Vorrang in resolve(), Mobile-Fallback greift dann auf das Override-Result
    assert.equal(r.mode, 'A');
    assert.equal(r.source, 'mobile-fallback');
    assert.equal(r.original, 'C');
  });

  test('source-Strings: override / default / fallback / mobile-fallback', () => {
    assert.match(ROUTER_SRC, /source:\s*['"]override['"]/);
    assert.match(ROUTER_SRC, /source:\s*['"]default['"]/);
    assert.match(ROUTER_SRC, /source:\s*['"]fallback['"]/);
    assert.match(ROUTER_SRC, /source:\s*['"]mobile-fallback['"]/);
  });
});

describe('einstellungen.html — Mobile-Restriction CSS', () => {
  test('@media (max-width: 768px) Block', () => {
    assert.match(EINST, /@media \(max-width:\s*768px\)/);
  });

  test('.mode-c-mobile-hint sichtbar auf Mobile', () => {
    assert.match(EINST, /\.mode-c-mobile-hint\s*\{\s*display:\s*block\s*!important/);
  });

  test('Hint-Text "Word-Vorlagen am Desktop"', () => {
    assert.match(EINST, /Word-Vorlagen am Desktop/);
  });

  test('Upload-Bereich gedimmt + pointer-events:none auf Mobile', () => {
    assert.match(EINST, /opacity:\s*0\.5;\s*pointer-events:\s*none/);
  });
});

describe('akte.html — Mobile-Fallback-Toast (W58)', () => {
  test('Toast nur bei mobile-fallback source', () => {
    assert.match(AKTE, /eff\.source === ['"]mobile-fallback['"]/);
    assert.match(AKTE, /eff\.original === ['"]C['"]/);
  });

  test('Toast-Text "Mobile: Standard-Modus aktiv"', () => {
    assert.match(AKTE, /Mobile.*Standard-Modus/i);
    assert.match(AKTE, /Mode C am Desktop/);
  });

  test('sessionStorage verhindert Mehrfach-Toast', () => {
    assert.match(AKTE, /sessionStorage\.getItem\(['"]prova_mobile_fallback_shown['"]\)/);
    assert.match(AKTE, /sessionStorage\.setItem\(['"]prova_mobile_fallback_shown['"]/);
  });
});

describe('onboarding-trigger.js — Mobile-Hinweis bei Mode-C-Wahl (W61)', () => {
  test('window.innerWidth check fuer Mode-C-Click', () => {
    assert.match(ONBOARD, /mode === ['"]C['"] && window\.innerWidth/);
  });

  test('Mobile-C-Toast-Text', () => {
    assert.match(ONBOARD, /Mode C wird am Desktop verwaltet/);
  });
});
