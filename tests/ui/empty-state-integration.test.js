/**
 * PROVA — Empty-State Integration-Tests (MEGA⁹ W2)
 * 04.05.2026
 *
 * Prueft, dass die 5 Ziel-Pages ProvaUI.emptyState wirklich aufrufen
 * (nicht nur Library importieren). Self-Critique aus MEGA⁸ V2:
 * "ProvaUI.emptyState NIE in einer Page angewendet".
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

describe('Empty-State Page-Integration (MEGA⁹ W2)', () => {

  test('archiv-logic.js ruft ProvaUI.emptyState auf', () => {
    const src = read('archiv-logic.js');
    assert.ok(src.includes('window.ProvaUI.emptyState'), 'archiv-logic.js sollte ProvaUI.emptyState aufrufen');
    assert.ok(src.includes('Demo-Fall'), 'archiv-logic.js sollte Demo-Fall-Link haben (CLAUDE.md Empty-States-Regel)');
  });

  test('rechnungen-logic.js ruft ProvaUI.emptyState auf', () => {
    const src = read('rechnungen-logic.js');
    assert.ok(src.includes('window.ProvaUI.emptyState'), 'rechnungen-logic.js sollte ProvaUI.emptyState aufrufen');
    assert.ok(src.includes('JVEG'), 'rechnungen-logic.js sollte JVEG-Rechner als Primary-Btn haben');
  });

  test('kontakte-logic.js ruft ProvaUI.emptyState auf (differenziert Filter/Onboarding)', () => {
    const src = read('kontakte-logic.js');
    assert.ok(src.includes('window.ProvaUI.emptyState'), 'kontakte-logic.js sollte ProvaUI.emptyState aufrufen');
    assert.ok(/hasFilter|isOnboarding|hasFilter\?/.test(src), 'kontakte-logic.js sollte Filter-State unterscheiden');
  });

  test('briefvorlagen-logic.js ruft ProvaUI.emptyState auf', () => {
    const src = read('briefvorlagen-logic.js');
    assert.ok(src.includes('window.ProvaUI.emptyState'), 'briefvorlagen-logic.js sollte ProvaUI.emptyState aufrufen');
  });

  test('dashboard-logic.js ruft ProvaUI.emptyState auf (mit Demo-Fall)', () => {
    const src = read('dashboard-logic.js');
    assert.ok(src.includes('window.ProvaUI.emptyState'), 'dashboard-logic.js sollte ProvaUI.emptyState aufrufen');
    assert.ok(src.includes('SCH-DEMO-001'), 'dashboard-logic.js sollte Demo-Fall-Link auf SCH-DEMO-001 haben');
  });

  test('Alle 5 Pages laden empty-states.js Library', () => {
    const pages = ['archiv.html', 'rechnungen.html', 'kontakte.html', 'briefvorlagen.html', 'dashboard.html'];
    for (const p of pages) {
      const html = read(p);
      assert.ok(html.includes('empty-states.js'), p + ' sollte /lib/empty-states.js laden');
    }
  });

  test('Fallback-Code (alter innerHTML-Empty-State) bleibt als Defense-in-Depth', () => {
    // Wenn ProvaUI nicht geladen ist, soll der alte Fallback noch funktionieren
    const archiv = read('archiv-logic.js');
    assert.ok(archiv.includes('list-empty'), 'archiv-logic.js sollte alten Fallback behalten');

    const rechn = read('rechnungen-logic.js');
    assert.ok(rechn.includes('liste-empty'), 'rechnungen-logic.js sollte alten Fallback behalten');
  });
});

describe('Toast-Migration (MEGA⁹ W2)', () => {

  test('rechnungen-logic.js Support-Form-Error nutzt ProvaUI.toast', () => {
    const src = read('rechnungen-logic.js');
    assert.ok(/ProvaUI.*\.toast.*support@prova-systems/s.test(src) || src.includes("ProvaUI.toast('Senden fehlgeschlagen"),
      'rechnungen-logic.js Support-Error sollte ProvaUI.toast nutzen');
  });

});
