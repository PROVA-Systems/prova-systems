/**
 * PROVA — Onboarding-Wizard Tests (W61)
 * MEGA¹⁷-PERFECTION 2026-05-08
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const ONBOARD = fs.readFileSync(path.join(ROOT, 'lib', 'onboarding-trigger.js'), 'utf8');
const DASHBOARD = fs.readFileSync(path.join(ROOT, 'dashboard.html'), 'utf8');

describe('lib/onboarding-trigger.js — Trigger-Logic', () => {
  test('STORAGE_KEY definiert', () => {
    assert.match(ONBOARD, /prova_onboarding_done/);
  });

  test('isDone() prueft localStorage', () => {
    assert.match(ONBOARD, /localStorage\.getItem\(STORAGE_KEY\)\s*===\s*['"]1['"]/);
  });

  test('maybeShow checkt isDone zuerst', () => {
    assert.match(ONBOARD, /async function maybeShow/);
    assert.match(ONBOARD, /if \(isDone\(\)\) return/);
  });

  test('URL-Param ?onboarding=force triggert', () => {
    assert.match(ONBOARD, /onboarding.*===\s*['"]force['"]/);
  });

  test('User-Settings-Check (kein Modal wenn schon Mode gewaehlt)', () => {
    assert.match(ONBOARD, /ProvaWorkflowMode\.fetchSettings/);
    assert.match(ONBOARD, /settings\.default_mode/);
  });
});

describe('lib/onboarding-trigger.js — MEGA¹⁹ W78 A11y + DB-Trigger', () => {
  test('Backdrop-Blur fuer Premium-Feel', () => {
    assert.match(ONBOARD, /backdrop-filter:blur/);
  });

  test('Scale-In Animation injected', () => {
    assert.match(ONBOARD, /provaOnbScaleIn/);
    assert.match(ONBOARD, /provaOnbFadeIn/);
  });

  test('Mobile-Responsive @media max-width:540px', () => {
    assert.match(ONBOARD, /@media \(max-width:540px\)/);
  });

  test('Esc-Key schliesst Modal', () => {
    assert.match(ONBOARD, /ev\.key === ['"]Escape['"]/);
    assert.match(ONBOARD, /addEventListener\(['"]keydown['"]/);
  });

  test('Click-outside auf Backdrop schliesst Modal', () => {
    assert.match(ONBOARD, /ev\.target === overlay/);
  });

  test('Focus-Trap mit Shift+Tab', () => {
    assert.match(ONBOARD, /ev\.shiftKey/);
    assert.match(ONBOARD, /document\.activeElement === first/);
  });

  test('Initial-Fokus auf erste Mode-Card', () => {
    assert.match(ONBOARD, /firstCard\.focus\(\)/);
  });

  test('_closeOverlay mit Cleanup + Fade-Out', () => {
    assert.match(ONBOARD, /function _closeOverlay/);
    assert.match(ONBOARD, /removeEventListener\(['"]keydown['"]/);
    assert.match(ONBOARD, /opacity 0\.2s ease-out/);
  });

  test('DB-Trigger via fetchSettings + _fallback-Defense', () => {
    assert.match(ONBOARD, /settings\._fallback/);
    assert.match(ONBOARD, /settings\.default_mode/);
    assert.match(ONBOARD, /defensive skip statt Modal-Spam/);
  });
});

describe('lib/onboarding-trigger.js — Modal-UI', () => {
  test('Modal hat role=dialog + aria-modal', () => {
    assert.match(ONBOARD, /role['"],\s*['"]dialog/);
    assert.match(ONBOARD, /aria-modal['"],\s*['"]true/);
  });

  test('3 Mode-Cards mit data-mode A/B/C', () => {
    assert.match(ONBOARD, /data-mode="A"/);
    assert.match(ONBOARD, /data-mode="B"/);
    assert.match(ONBOARD, /data-mode="C"/);
  });

  test('Mode-Beschreibungen vorhanden', () => {
    assert.match(ONBOARD, /Mode A — Standard/);
    assert.match(ONBOARD, /Mode B — Editor/);
    assert.match(ONBOARD, /Mode C — Eigene Vorlagen/);
  });

  test('"Spaeter entscheiden" Skip-Button', () => {
    assert.match(ONBOARD, /Spaeter entscheiden/);
    assert.match(ONBOARD, /id="prova-onb-skip"/);
  });
});

describe('lib/onboarding-trigger.js — Mode-Selection-Logic', () => {
  test('VALID_MODES check (A/B/C)', () => {
    assert.match(ONBOARD, /\['A','B','C'\]\.includes\(mode\)/);
  });

  test('updateDefault via ProvaWorkflowMode', () => {
    assert.match(ONBOARD, /ProvaWorkflowMode\.updateDefault\(mode\)/);
  });

  test('Mark-done nach erfolgreichem Update', () => {
    assert.match(ONBOARD, /_markDone\(\)/);
  });

  test('Public API: maybeShow + forceShow + isDone', () => {
    assert.match(ONBOARD, /window\.ProvaOnboarding\s*=/);
    assert.match(ONBOARD, /maybeShow:\s*maybeShow/);
    assert.match(ONBOARD, /forceShow:\s*forceShow/);
    assert.match(ONBOARD, /isDone:\s*isDone/);
  });
});

describe('dashboard.html — Onboarding-Integration', () => {
  test('workflow-mode-router.js eingebunden', () => {
    assert.match(DASHBOARD, /<script src="\/lib\/workflow-mode-router\.js"/);
  });

  test('onboarding-trigger.js eingebunden', () => {
    assert.match(DASHBOARD, /<script src="\/lib\/onboarding-trigger\.js"/);
  });

  test('Beide mit defer (kein Block des Renderings)', () => {
    assert.match(DASHBOARD, /<script src="\/lib\/onboarding-trigger\.js" defer>/);
  });
});
