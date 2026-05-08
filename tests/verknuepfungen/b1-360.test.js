'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/kontakt-aktivitaeten');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'kontakt-aktivitaeten.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'kontakte.html'), 'utf8');

test('B1: Lambda exposed __aggregateEvents Pure-Function', () => {
  assert.strictEqual(typeof Lambda.__aggregateEvents, 'function');
});

test('B1: aggregateEvents sortiert chronologisch absteigend', () => {
  const events = Lambda.__aggregateEvents({
    auftraege: [{ id: 'a1', az: 'TEST-1', created_at: '2026-01-01T10:00:00Z' }],
    rechnungen: [{ id: 'r1', rechnungsnr: '2026-001', auftrag_id: 'a1', created_at: '2026-05-01T10:00:00Z' }],
    termine: [{ id: 't1', titel: 'Ortstermin', auftrag_id: 'a1', start_at: '2026-03-01T10:00:00Z' }]
  });
  assert.strictEqual(events.length, 3);
  // Newest first
  assert.strictEqual(events[0].type, 'rechnung');
  assert.strictEqual(events[2].type, 'auftrag');
});

test('B1: aggregateEvents mappt 4 Event-Typen', () => {
  const events = Lambda.__aggregateEvents({
    auftraege: [{ id: 'a1', az: 'A1', created_at: '2026-05-01' }],
    rechnungen: [{ id: 'r1', auftrag_id: 'a1', created_at: '2026-05-02' }],
    termine: [{ id: 't1', titel: 'T1', start_at: '2026-05-03' }],
    dokumente: [{ id: 'd1', betreff: 'D1', auftrag_id: 'a1', created_at: '2026-05-04' }]
  });
  const types = events.map(e => e.type).sort();
  assert.deepStrictEqual(types, ['auftrag', 'dokument', 'rechnung', 'termin']);
});

test('B1: Events haben link-Feld für Tab-Navigation', () => {
  const events = Lambda.__aggregateEvents({
    auftraege: [{ id: 'a1', az: 'A1', created_at: '2026-05-01' }]
  });
  assert.strictEqual(events[0].link, '/akte.html?id=a1');
});

test('B1: Lambda nutzt auftrag_kontakte M:N-Tabelle', () => {
  assert.match(lambdaSrc, /from\(['"]auftrag_kontakte['"]\)/);
  assert.match(lambdaSrc, /\.eq\(['"]kontakt_id['"]/);
});

test('B1: kontakte.html hat 3 Tabs (Liste / Verknüpft / 360°)', () => {
  assert.match(html, /data-tab="liste"/);
  assert.match(html, /data-tab="verknuepft"/);
  assert.match(html, /data-tab="360"/);
});

test('B1: kontakte.html hat 360°-Pane + Events-Container', () => {
  assert.match(html, /id="kontakt-360-pane"/);
  assert.match(html, /id="kontakt-360-events"/);
  assert.match(html, /360°-Aktivitäts-Timeline/);
});

test('B1: setKontaktTab Function ruft Lambda', () => {
  assert.match(html, /setKontaktTab/);
  assert.match(html, /\/\.netlify\/functions\/kontakt-aktivitaeten\?kontakt_id=/);
});

test('B1: Tabs werden nur bei ?id=X angezeigt', () => {
  assert.match(html, /URLSearchParams\(location\.search\)/);
  assert.match(html, /kontakt-tabs.*\.display\s*=\s*['"]flex['"]/);
});

test('B1: Lambda hat requireAuth + Rate-Limit + 360-Marker', () => {
  assert.match(lambdaSrc, /requireAuth/);
  assert.match(lambdaSrc, /RateLimit/);
  assert.match(lambdaSrc, /MEGA³⁴ B1|360°/);
});
