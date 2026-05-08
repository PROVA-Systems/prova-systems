/**
 * Tests für neuer-fall.html (MEGA²⁸ V3.2-W2 KORR-8)
 * Strukturelle Verifikation, dass Wizard-Stepper + Wiring + Fallbacks präsent sind.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(
  path.join(__dirname, '..', '..', 'neuer-fall.html'),
  'utf8'
);

test('neuer-fall.html: hat Auth-Guard für Token + Email', () => {
  assert.match(html, /prova_auth_token/);
  assert.match(html, /prova_sv_email/);
  assert.match(html, /window\.location\.replace\(['"]\/login/);
});

test('neuer-fall.html: bindet runAuthGuard via module', () => {
  assert.match(html, /import\s+\{\s*runAuthGuard\s*\}\s+from\s+['"]\/lib\/auth-guard\.js['"]/);
});

test('neuer-fall.html: 4-Schritt-Stepper sichtbar', () => {
  assert.match(html, /Auftragstyp/);
  assert.match(html, /Wo\s*&amp;\s*Was/);
  assert.match(html, /Auftraggeber/);
  assert.match(html, /Rahmen/);
  // 4 Stepper-Items mit Nummerierung 1-4
  assert.ok((html.match(/class="nf-step/g) || []).length >= 4, 'mindestens 4 Stepper-Steps');
});

test('neuer-fall.html: lädt auftragstyp.js + prova-wizard.js', () => {
  assert.match(html, /<script\s+src="auftragstyp\.js"/);
  assert.match(html, /<script\s+src="prova-wizard\.js"/);
});

test('neuer-fall.html: startWizard delegiert an PROVA.openAuftragstyp', () => {
  assert.match(html, /window\.PROVA\.openAuftragstyp\(\)/);
  assert.match(html, /window\.PROVA_START_WIZARD/);
});

test('neuer-fall.html: Fallback-Link auf app.html und archiv.html', () => {
  assert.match(html, /href="app\.html"/);
  assert.match(html, /href="archiv\.html"/);
});

test('neuer-fall.html: Auto-Trigger via sessionStorage flag', () => {
  assert.match(html, /prova_neuer_fall_auto/);
});

test('neuer-fall.html: Pflichtfeld-Hinweis sichtbar', () => {
  assert.match(html, /Pflichtfelder/);
});

test('neuer-fall.html: Loading-State + Actions-Container vorhanden', () => {
  assert.match(html, /id="nf-status"/);
  assert.match(html, /id="nf-actions"/);
  assert.match(html, /id="nf-start-btn"/);
});

test('neuer-fall.html: aria-current für active step', () => {
  assert.match(html, /aria-current="step"/);
});

test('neuer-fall.html: aria-live polite für Status-Updates', () => {
  assert.match(html, /aria-live="polite"/);
});

test('neuer-fall.html: sw-register defer eingebunden', () => {
  assert.match(html, /<script\s+src="sw-register\.js"\s+defer/);
});

test('neuer-fall.html: bindet global-search.js (Cmd+K)', () => {
  assert.match(html, /<script\s+src="global-search\.js"/);
});

test('neuer-fall.html: hat title + lang Attribut', () => {
  assert.match(html, /<title>[^<]*Neuer Fall/);
  assert.match(html, /<html\s+lang="de"/);
});

// ── MEGA³⁶ W3.1: Draft-Restore Wiring ──
test('neuer-fall.html: Draft-Restore-Banner-Wiring vorhanden', () => {
  assert.match(html, /tryRestoreBanner/);
  assert.match(html, /findActiveDraft/);
  assert.match(html, /showRestoreBanner/);
});

test('neuer-fall.html: Draft-Restore setzt sessionStorage-Bridge für Wizard', () => {
  assert.match(html, /prova_wizard_restore_id/);
  assert.match(html, /prova_wizard_restore_data/);
});
