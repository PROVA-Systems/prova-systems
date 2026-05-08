'use strict';

/**
 * MEGA⁴¹ P7 — Kontakt-360-View Tests
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const Kontakt360 = require(path.join(ROOT, 'netlify', 'functions', 'kontakt-360.js'));
const lambdaSrc = read('netlify/functions/kontakt-360.js');
const pageHtml = read('kontakt-detail.html');

// ─────────────────────────────────────────────────────────────────
//  P7-1 Lambda-Internals
// ─────────────────────────────────────────────────────────────────

test('P7-1: TAB_KEYS hat 9 Tabs (Master-Prompt-Acceptance)', () => {
  assert.strictEqual(Kontakt360.__internals.TAB_KEYS.length, 9);
  ['auftraege', 'rechnungen', 'bescheinigungen', 'dokumente',
   'fotos', 'skizzen', 'eintraege', 'termine', 'korrespondenz']
    .forEach(t => assert.ok(Kontakt360.__internals.TAB_KEYS.indexOf(t) >= 0, t));
});

test('P7-1: computeStatistik berechnet Gesamtumsatz aus Rechnungen', () => {
  const stat = Kontakt360.__internals.computeStatistik({
    rechnungen: [
      { betrag_brutto: 1500, status: 'bezahlt' },
      { betrag_brutto: 800, status: 'offen' },
      { betrag_brutto: 200, status: 'mahnstufe_1' }
    ]
  });
  assert.strictEqual(stat.gesamtumsatz_eur, 2500);
  assert.strictEqual(stat.rechnungen_offen_eur, 1000);  // 800 offen + 200 mahn
  assert.strictEqual(stat.rechnungen_bezahlt_count, 1);
  assert.strictEqual(stat.rechnungen_offen_count, 2);
});

test('P7-1: computeStatistik berechnet durchschnitt_bearbeitungstage nur bei abgeschlossenen', () => {
  const stat = Kontakt360.__internals.computeStatistik({
    auftraege: [
      { status: 'abgeschlossen', created_at: '2026-01-01', abgeschlossen_at: '2026-01-15' },  // 14 Tage
      { status: 'abgeschlossen', created_at: '2026-02-01', abgeschlossen_at: '2026-02-21' },  // 20 Tage
      { status: 'aktiv', created_at: '2026-03-01' }  // ignoriert
    ]
  });
  assert.strictEqual(stat.durchschnitt_bearbeitungstage, 17);  // (14+20)/2 = 17
});

test('P7-1: computeStatistik durchschnitt_bearbeitungstage = null wenn keine completed', () => {
  const stat = Kontakt360.__internals.computeStatistik({
    auftraege: [{ status: 'aktiv', created_at: '2026-01-01' }]
  });
  assert.strictEqual(stat.durchschnitt_bearbeitungstage, null);
});

test('P7-1: computeStatistik Zahlungsverhalten-Score (% nicht-mahnstufe)', () => {
  const stat = Kontakt360.__internals.computeStatistik({
    rechnungen: [
      { status: 'bezahlt' },
      { status: 'bezahlt' },
      { status: 'bezahlt' },
      { status: 'mahnstufe_1' }
    ]
  });
  // 3 nicht-mahn von 4 = 75%
  assert.strictEqual(stat.zahlungsverhalten_score, 75);
});

test('P7-1: computeStatistik Score = null bei keinen Rechnungen', () => {
  const stat = Kontakt360.__internals.computeStatistik({});
  assert.strictEqual(stat.zahlungsverhalten_score, null);
});

test('P7-1: computeStatistik letzte_interaktion = max date über alle Tabs', () => {
  const stat = Kontakt360.__internals.computeStatistik({
    auftraege: [{ created_at: '2026-01-01' }],
    rechnungen: [{ created_at: '2026-03-01' }],
    termine: [{ start_at: '2026-05-15' }],
    eintraege: [{ created_at: '2026-04-01' }]
  });
  assert.strictEqual(stat.letzte_interaktion, '2026-05-15');
});

test('P7-1: computeStatistik liefert alle 9 Tab-Counts', () => {
  const stat = Kontakt360.__internals.computeStatistik({
    fotos: [{}, {}], skizzen: [{}], eintraege: [{}, {}, {}],
    termine: [{}], bescheinigungen: [{}], dokumente: [{}], korrespondenz: [{}]
  });
  assert.strictEqual(stat.fotos_count, 2);
  assert.strictEqual(stat.skizzen_count, 1);
  assert.strictEqual(stat.eintraege_count, 3);
  assert.strictEqual(stat.termine_count, 1);
});

// ─────────────────────────────────────────────────────────────────
//  P7-2 Lambda-Source-Inspection
// ─────────────────────────────────────────────────────────────────

test('P7-2: Lambda hat requireAuth + Workspace-Check (403)', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /Workspace-Zugriff verweigert/);
});

test('P7-2: Lambda nutzt Promise.all für Parallel-Queries', () => {
  assert.match(lambdaSrc, /Promise\.all\(\[/);
});

test('P7-2: Lambda Bulk-Foto-Lookup via .in()', () => {
  assert.match(lambdaSrc, /\.in\(['"]id['"], fotoIds\)/);
});

test('P7-2: Lambda M:N-Auflösung via auftrag_kontakte ODER kontakt_id-FK', () => {
  assert.match(lambdaSrc, /auftrag_kontakte/);
  assert.match(lambdaSrc, /kontakt_id\.eq/);
});

// ─────────────────────────────────────────────────────────────────
//  P7-3 kontakt-detail.html UI
// ─────────────────────────────────────────────────────────────────

test('P7-3: kontakt-detail.html ruft /kontakt-360 mit kontakt_id', () => {
  assert.match(pageHtml, /\/\.netlify\/functions\/kontakt-360\?kontakt_id=/);
});

test('P7-3: kontakt-detail.html hat 9 Tabs (data-tab Attribute)', () => {
  ['auftraege', 'rechnungen', 'bescheinigungen', 'dokumente',
   'fotos', 'skizzen', 'eintraege', 'termine', 'korrespondenz']
    .forEach(t => assert.match(pageHtml, new RegExp('data-tab="' + t + '"')));
});

test('P7-3: kontakt-detail.html hat 5 Quick-Actions (Auftrag/Brief/Termin/Bescheinigung/PDF)', () => {
  ['k360-act-auftrag', 'k360-act-brief', 'k360-act-termin', 'k360-act-bescheinigung', 'k360-act-pdf']
    .forEach(id => assert.match(pageHtml, new RegExp('id="' + id + '"')));
});

test('P7-3: kontakt-detail.html hat 6 Stats-Cards (Aufträge/Umsatz/Offen/Bearbeitung/Letzte/Score)', () => {
  ['Aufträge', 'Gesamtumsatz', 'Offen', 'Ø Bearbeitung', 'Letzte Aktion', 'Zahlungsverhalten']
    .forEach(label => assert.match(pageHtml, new RegExp(label)));
});

test('P7-3: kontakt-detail.html Filter-Search mit 200ms Debounce', () => {
  assert.match(pageHtml, /id="k360-search"/);
  assert.match(pageHtml, /setTimeout\([^,]+,\s*200\)/);
});

test('P7-3: kontakt-detail.html PDF-Export via window.open + print', () => {
  assert.match(pageHtml, /window\.open/);
  assert.match(pageHtml, /\.print\(\)/);
  assert.match(pageHtml, /size:A4/);
});

test('P7-3: kontakt-detail.html Quick-Action-Links übergeben kontakt_id-Param', () => {
  assert.match(pageHtml, /\/neuer-fall\.html\?kontakt_id=/);
  assert.match(pageHtml, /\/briefvorlagen\.html\?kontakt_id=/);
  assert.match(pageHtml, /\/termine\.html\?neuer=1&kontakt_id=/);
  assert.match(pageHtml, /\/bescheinigungen\.html\?kontakt_id=/);
});

test('P7-3: kontakt-detail.html Score-Color-Coding (success ≥90, warning <50)', () => {
  assert.match(pageHtml, /score >= 90/);
  assert.match(pageHtml, /score < 50/);
});

test('P7-3: kontakt-detail.html Mobile-Responsive (700px-Breakpoint)', () => {
  assert.match(pageHtml, /max-width:\s*700px/);
});
