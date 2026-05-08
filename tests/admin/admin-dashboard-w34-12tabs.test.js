'use strict';

/**
 * MEGA³⁶ W3.4 — admin-dashboard.html: 12-Tabs-Live-Daten Tests
 *
 * Verifiziert:
 *  - Alle 12 Tab-Panels (overview, kunden, finanzen, ki-stats, tickets,
 *    health, audit, push, sessions, timing, pipeline, settings) existieren
 *  - Alle 12 Tab-Buttons in der tab-nav sind vorhanden
 *  - Keine doppelten Tab-IDs (Duplikat-Bug aus Vorgänger gefixt)
 *  - Die 4 neuen Tab-Loader (loadAuditW34, loadPushW34, loadSessionsW34,
 *    loadTimingW34) existieren und rufen ihre admin-* Lambdas auf
 *  - showTab dispatcht zu allen 4 neuen Tabs
 *  - Kein "Coming Soon" / "TODO" in den 4 neuen Tabs
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'admin-dashboard.html'), 'utf8');

const TABS_12 = ['overview', 'kunden', 'finanzen', 'ki-stats', 'tickets',
                 'health', 'audit', 'push', 'sessions', 'timing', 'pipeline', 'settings'];

test('W3.4: alle 12 Tab-Panels (id="tab-*") vorhanden', () => {
  TABS_12.forEach(name => {
    const re = new RegExp('<div\\s+id="tab-' + name + '"\\s+class="tab-panel"');
    assert.match(html, re, 'Tab-Panel "' + name + '" fehlt');
  });
});

test('W3.4: keine duplizierten Tab-IDs (Bug aus Vorgänger gefixt)', () => {
  TABS_12.forEach(name => {
    const occurs = (html.match(new RegExp('id="tab-' + name + '"', 'g')) || []).length;
    assert.strictEqual(occurs, 1, 'Tab-ID "tab-' + name + '" kommt ' + occurs + 'x vor (erwartet: 1)');
  });
});

test('W3.4: alle 12 Tab-Buttons (data-tab="*") in der tab-nav vorhanden', () => {
  TABS_12.forEach(name => {
    const re = new RegExp('class="tab-btn[^"]*"\\s+data-tab="' + name + '"');
    assert.match(html, re, 'Tab-Button "' + name + '" fehlt');
  });
});

test('W3.4: 4 neue Tab-Loader-Funktionen sind definiert', () => {
  ['loadAuditW34', 'loadPushW34', 'loadSessionsW34', 'loadTimingW34'].forEach(fn => {
    assert.match(html, new RegExp('async function ' + fn + '\\s*\\('),
      fn + ' nicht definiert');
  });
});

test('W3.4: showTab dispatcht zu allen 4 neuen Tabs', () => {
  ['audit', 'push', 'sessions', 'timing'].forEach(name => {
    const re = new RegExp("name === '" + name + "'");
    assert.match(html, re, 'showTab-Dispatch für "' + name + '" fehlt');
  });
});

test('W3.4: Audit-Loader ruft admin-audit-trail Lambda auf', () => {
  assert.match(html, /admin-audit-trail\?limit=100/);
});

test('W3.4: Push-Loader ruft admin-push-alerts Lambda auf', () => {
  assert.match(html, /admin-push-alerts\?stats=1/);
});

test('W3.4: Sessions-Loader ruft admin-live-sessions Lambda auf', () => {
  assert.match(html, /admin-live-sessions/);
});

test('W3.4: Timing-Loader ruft admin-time-tracking Lambda auf', () => {
  assert.match(html, /admin-time-tracking\?range=24h/);
});

test('W3.4: Audit-Tab hat Filter-Select für Action-Typ', () => {
  assert.match(html, /id="auditFilter"/);
  assert.match(html, /value="auftrag\.create"/);
  assert.match(html, /value="ki\.call"/);
});

test('W3.4: Timing-Tab hat 3 KPI-Tiles (P50/P95/KI)', () => {
  ['timingP50', 'timingP95', 'timingKi'].forEach(id => {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
});

test('W3.4: Sessions-Tab hat aktiv-Badge mit "online"-Suffix', () => {
  assert.match(html, /id="sessionsActiveBadge"/);
  assert.match(html, /online/);
});

test('W3.4: Loader-Error-Pfad zeigt "nicht erreichbar"-Meldung (kein Coming-Soon)', () => {
  // Ehrlicher Empty-State statt Placeholder
  ['admin-audit-trail', 'admin-push-alerts', 'admin-live-sessions', 'admin-time-tracking']
    .forEach(lambda => {
      const re = new RegExp('Lambda /' + lambda + ' nicht erreichbar');
      assert.match(html, re, 'Error-State für ' + lambda + ' fehlt');
    });
});

test('W3.4: keine "Coming Soon"/"🚧"-Placeholder in den 4 neuen Tabs', () => {
  // Extrahiere die 4 Tab-Panels und prüfe sie isoliert
  const tabBlocks = ['audit', 'push', 'sessions', 'timing'].map(name => {
    const re = new RegExp('<div\\s+id="tab-' + name + '"[\\s\\S]*?<!-- MEGA');
    const m = html.match(re);
    return m ? m[0] : '';
  });
  tabBlocks.forEach((blk, i) => {
    assert.doesNotMatch(blk, /Coming Soon/i, 'Tab #' + i + ' enthält "Coming Soon"');
    assert.doesNotMatch(blk, /🚧/, 'Tab #' + i + ' enthält 🚧');
    assert.doesNotMatch(blk, /TODO/, 'Tab #' + i + ' enthält TODO');
  });
});

test('W3.4: _w34EscHtml-Helper escaped HTML-Sonderzeichen (XSS-Schutz)', () => {
  assert.match(html, /function _w34EscHtml/);
  assert.match(html, /replace\(\/&\/g/);
  assert.match(html, /replace\(\/</);
});

test('W3.4: Tab-Panel-Reihenfolge im HTML matcht Tab-Button-Reihenfolge', () => {
  // Extrahiere Tab-IDs in Reihenfolge ihres Auftretens
  const panelOrder = [...html.matchAll(/<div\s+id="tab-([a-z-]+)"\s+class="tab-panel"/g)].map(m => m[1]);
  const buttonOrder = [...html.matchAll(/class="tab-btn[^"]*"\s+data-tab="([a-z-]+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(panelOrder, buttonOrder, 'Panel-Reihenfolge weicht von Button-Reihenfolge ab');
});
