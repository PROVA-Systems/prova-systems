/**
 * PROVA — login.html AGB-Checkboxes + Solo-only Pricing Tests (MEGA²⁰ W85)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HTML = fs.readFileSync(path.join(ROOT, 'login.html'), 'utf8');

describe('login.html — Pricing-Strip Solo-only', () => {
  test('Solo 179 €/Monat sichtbar (MEGA²¹ Pricing-Update)', () => {
    assert.match(HTML, /Solo 179\s*€\/Monat/);
  });

  test('14 Tage kostenlos testen', () => {
    assert.match(HTML, /14 Tage kostenlos testen/);
  });

  test('Starter Coming Soon Badge (MEGA²¹: mit 89€ + Juni)', () => {
    assert.match(HTML, /<span class="tier-coming-soon" data-tier="starter">Starter 89€ · Coming Soon Juni<\/span>/);
  });

  test('Team Coming Soon Badge (MEGA²¹: mit 379€ + Juli)', () => {
    assert.match(HTML, /<span class="tier-coming-soon" data-tier="team">Team 379€ · Coming Soon Juli<\/span>/);
  });

  test('Founding Members 125€ Hint (MEGA²¹ NEU)', () => {
    assert.match(HTML, /🎁 Founding Members.*125\s*€/);
  });

  test('CSS-Klasse .tier-coming-soon definiert', () => {
    assert.match(HTML, /\.tier-coming-soon\s*\{/);
  });
});

describe('login.html — Legal-Checkboxes (3 Pflicht + 1 Newsletter)', () => {
  test('AGB-Checkbox mit data-required="1"', () => {
    assert.match(HTML, /id="cb-agb".*data-required="1"/);
    assert.match(HTML, /<a href="\/agb\.html"/);
  });

  test('AVV-Checkbox mit data-required="1"', () => {
    assert.match(HTML, /id="cb-avv".*data-required="1"/);
    assert.match(HTML, /<a href="\/avv\.html"/);
  });

  test('DSE-Checkbox mit data-required="1"', () => {
    assert.match(HTML, /id="cb-dse".*data-required="1"/);
    assert.match(HTML, /<a href="\/datenschutz\.html"/);
  });

  test('Newsletter-Checkbox OHNE data-required (optional)', () => {
    const idx = HTML.indexOf('id="cb-newsletter"');
    assert.ok(idx > 0);
    // 200 Zeichen um den Newsletter-Input pruefen — kein data-required
    const window = HTML.substring(idx - 100, idx + 200);
    assert.doesNotMatch(window, /id="cb-newsletter"[^>]*data-required/);
  });

  test('Pflicht-CSS-Klasse "required" mit Asterisk', () => {
    assert.match(HTML, /\.legal-cb\.required::after\s*\{[\s\S]{0,80}content:\s*['"]\*['"]/);
  });

  test('legal-error Element fuer Validierungs-Hinweis', () => {
    assert.match(HTML, /id="legal-error".*role="alert"/);
    assert.match(HTML, /aria-live="polite"/);
  });
});

describe('login.html — Submit-Validation', () => {
  test('Submit-Button initial disabled', () => {
    assert.match(HTML, /<button type="submit" id="signup-submit" disabled>/);
  });

  test('validateLegalCheckboxes Function', () => {
    assert.match(HTML, /function validateLegalCheckboxes/);
  });

  test('querySelectorAll fuer required Checkboxes', () => {
    assert.match(HTML, /querySelectorAll\(['"]#signup-form\s+\.legal-cb\s+input\[data-required="1"\]['"]\)/);
  });

  test('Live-Validation auf change-Event', () => {
    assert.match(HTML, /cb\.addEventListener\(['"]change['"], validateLegalCheckboxes\)/);
  });

  test('Initial-Check ruft validateLegalCheckboxes auf', () => {
    assert.match(HTML, /\/\/ Initial-Check[\s\S]{0,80}validateLegalCheckboxes\(\)/);
  });
});

describe('login.html — Mobile-friendly', () => {
  test('@media max-width 480px reduziert font-size', () => {
    assert.match(HTML, /@media \(max-width: 480px\)/);
    assert.match(HTML, /\.pricing-strip \{ font-size: 11px/);
    assert.match(HTML, /\.legal-checkboxes \{ font-size: 11px/);
  });
});
