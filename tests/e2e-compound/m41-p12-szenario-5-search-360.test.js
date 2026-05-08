'use strict';

/**
 * MEGA⁴¹ P12 Szenario 5 — "Globale Suche und Kontakt-360"
 *
 * Pfad: Cmd-K → Suche "Müller" → Kontakt-Treffer → Kontakt-360-View → Quick-Action neuer Auftrag
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

test('SZ5-1: Cmd-K Modal-Lib mit Keybinding', () => {
  assert.ok(exists('lib/cmd-k-modal.js'));
  const src = read('lib/cmd-k-modal.js');
  assert.match(src, /e\.metaKey \|\| e\.ctrlKey/);
  assert.match(src, /e\.key === ['"]k['"]/);
});

test('SZ5-2: global-search Lambda mit 8 Bereichen', () => {
  assert.ok(exists('netlify/functions/global-search.js'));
  const src = read('netlify/functions/global-search.js');
  ['akten', 'kontakte', 'dokumente', 'termine', 'eintraege', 'textbausteine', 'templates', 'normen']
    .forEach(t => assert.match(src, new RegExp("typeFilter === ['\"]" + t + "['\"]")));
});

test('SZ5-3: Kontakt-360-Lambda mit 9 Tabs', () => {
  const Kontakt360 = require(path.join(ROOT, 'netlify/functions/kontakt-360.js'));
  assert.strictEqual(Kontakt360.__internals.TAB_KEYS.length, 9);
});

test('SZ5-4: kontakt-detail.html mit 9 Tabs + 5 Quick-Actions', () => {
  assert.ok(exists('kontakt-detail.html'));
  const html = read('kontakt-detail.html');
  // 9 Tabs
  ['auftraege', 'rechnungen', 'bescheinigungen', 'dokumente', 'fotos', 'skizzen', 'eintraege', 'termine', 'korrespondenz']
    .forEach(t => assert.match(html, new RegExp('data-tab="' + t + '"')));
  // 5 Quick-Actions
  ['k360-act-auftrag', 'k360-act-brief', 'k360-act-termin', 'k360-act-bescheinigung', 'k360-act-pdf']
    .forEach(id => assert.match(html, new RegExp('id="' + id + '"')));
});

test('SZ5-5: Quick-Action "neuer Auftrag" mit kontakt_id-Param', () => {
  const html = read('kontakt-detail.html');
  assert.match(html, /\/neuer-fall\.html\?kontakt_id=/);
});

test('SZ5-6: Cmd-K Drilldown via Live-Filter (DIN→DIN9→DIN98)', () => {
  const Cmdk = require(path.join(ROOT, 'lib/cmd-k-modal.js'));
  // Highlight-Funktion verifiziert progressive Match-Spans
  const text = 'DIN 985';
  assert.match(Cmdk._highlight(text, 'DIN'), /<span class="cmdk-mark">DIN<\/span>/);
  assert.match(Cmdk._highlight(text, 'DIN 9'), /<span class="cmdk-mark">DIN 9<\/span>/);
  assert.match(Cmdk._highlight(text, 'DIN 98'), /<span class="cmdk-mark">DIN 98<\/span>/);
});

test('SZ5-7: Recent-Searches via localStorage (max 10)', () => {
  const Cmdk = require(path.join(ROOT, 'lib/cmd-k-modal.js'));
  assert.strictEqual(Cmdk.MAX_RECENT, 10);
});

test('SZ5-8: Kontakt-360 Statistiken (Umsatz + Bearbeitungstage + Score)', () => {
  const Kontakt360 = require(path.join(ROOT, 'netlify/functions/kontakt-360.js'));
  const stat = Kontakt360.__internals.computeStatistik({
    auftraege: [{ status: 'abgeschlossen', created_at: '2026-01-01', abgeschlossen_at: '2026-01-15' }],
    rechnungen: [{ betrag_brutto: 1500, status: 'bezahlt' }, { betrag_brutto: 500, status: 'mahnstufe_1' }]
  });
  assert.strictEqual(stat.gesamtumsatz_eur, 2000);
  assert.strictEqual(stat.durchschnitt_bearbeitungstage, 14);
  assert.strictEqual(stat.zahlungsverhalten_score, 50);  // 1 von 2 nicht-mahn
});

test('SZ5-9: PDF-Bericht-Export für Kontakt', () => {
  const html = read('kontakt-detail.html');
  assert.match(html, /Kontakt-Bericht/);
  assert.match(html, /size:A4/);
  assert.match(html, /\.print\(\)/);
});

test('SZ5-10: Quick-Action-Links übergeben kontakt_id zu 4 Pages', () => {
  const html = read('kontakt-detail.html');
  ['/neuer-fall.html', '/briefvorlagen.html', '/termine.html', '/bescheinigungen.html']
    .forEach(p => assert.match(html, new RegExp(p.replace(/\./g, '\\.') + '\\?[^"]*kontakt_id=')));
});
