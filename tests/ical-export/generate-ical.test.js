/**
 * Tests für generate-ical.js (MEGA²⁹ V3.2-W9N-I5)
 * RFC 5545 Compliance + Lambda-Wraps + Defensive
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lambda = require(path.join(ROOT, 'netlify/functions/generate-ical.js'));
const T = Lambda._test;

describe('generate-ical helpers (RFC 5545)', () => {
  test('foldLine: kurze Zeilen unverändert', () => {
    assert.strictEqual(T.foldLine('SHORT'), 'SHORT');
  });

  test('foldLine: > 75 Zeichen mit CRLF + Space-Continuation', () => {
    const long = 'X'.repeat(150);
    const folded = T.foldLine(long);
    assert.ok(folded.includes('\r\n '));
    // Die Erste Zeile darf max 75 Zeichen haben
    const firstLine = folded.split('\r\n ')[0];
    assert.ok(firstLine.length <= 75);
  });

  test('escapeText: \\ ; , und LF korrekt', () => {
    assert.strictEqual(T.escapeText('hello;world,test\\foo\nbar'),
      'hello\\;world\\,test\\\\foo\\nbar');
  });

  test('escapeText: empty/null', () => {
    assert.strictEqual(T.escapeText(null), '');
    assert.strictEqual(T.escapeText(''), '');
  });

  test('toIcalDateTime: YYYYMMDDTHHMMSSZ Format', () => {
    const result = T.toIcalDateTime('2026-05-10T14:30:45Z');
    assert.strictEqual(result, '20260510T143045Z');
  });

  test('toIcalDateTime: invalid → null', () => {
    assert.strictEqual(T.toIcalDateTime('invalid'), null);
  });

  test('toIcalDateTime: Date-Objekt', () => {
    const d = new Date(Date.UTC(2026, 4, 10, 14, 30, 45));
    assert.strictEqual(T.toIcalDateTime(d), '20260510T143045Z');
  });
});

describe('generate-ical buildIcalBody (RFC 5545 Compliance)', () => {
  test('VCALENDAR-Header mit BEGIN:VCALENDAR + VERSION:2.0', () => {
    const ical = T.buildIcalBody([], 'test@x.de');
    assert.match(ical, /^BEGIN:VCALENDAR/);
    assert.match(ical, /VERSION:2\.0/);
    assert.match(ical, /PRODID:-\/\/PROVA Systems/);
    assert.match(ical, /END:VCALENDAR/);
  });

  test('CRLF-Line-Endings (RFC 5545 Section 3.1)', () => {
    const ical = T.buildIcalBody([], 'test@x.de');
    assert.ok(ical.includes('\r\n'));
    // Jede LF muss durch CR vorangegangen werden (RFC 5545)
    assert.ok(!/[^\r]\n/.test(ical), 'Jede LF muss CRLF sein');
  });

  test('Single VEVENT mit allen Pflicht-Properties', () => {
    const termine = [{
      id: 'evt-1',
      titel: 'Ortstermin SCH-2026-001',
      start: '2026-05-15T09:00:00Z',
      end: '2026-05-15T11:00:00Z',
      ort: 'Hauptstr 1 Köln',
      beschreibung: 'Schimmel-Begutachtung',
      az: 'SCH-2026-001'
    }];
    const ical = T.buildIcalBody(termine, 'test@x.de');
    assert.match(ical, /BEGIN:VEVENT/);
    assert.match(ical, /UID:evt-1@prova-systems\.de/);
    assert.match(ical, /DTSTAMP:\d{8}T\d{6}Z/);
    assert.match(ical, /DTSTART:20260515T090000Z/);
    assert.match(ical, /DTEND:20260515T110000Z/);
    assert.match(ical, /SUMMARY:Ortstermin SCH-2026-001/);
    assert.match(ical, /LOCATION:Hauptstr 1 Köln/);
    assert.match(ical, /CATEGORIES:Akte SCH-2026-001/);
    assert.match(ical, /STATUS:CONFIRMED/);
    assert.match(ical, /TRANSP:OPAQUE/);
    assert.match(ical, /END:VEVENT/);
  });

  test('Default-DTEND wenn end fehlt (1h nach DTSTART)', () => {
    const termine = [{ id: 'x', start: '2026-05-15T09:00:00Z', titel: 'Test' }];
    const ical = T.buildIcalBody(termine, 'x@y.de');
    assert.match(ical, /DTSTART:20260515T090000Z/);
    assert.match(ical, /DTEND:20260515T100000Z/); // +1h default
  });

  test('Multiple VEVENTs', () => {
    const termine = [
      { id: 'a', start: '2026-05-15T09:00:00Z', titel: 'A' },
      { id: 'b', start: '2026-05-16T10:00:00Z', titel: 'B' }
    ];
    const ical = T.buildIcalBody(termine, 'x@y.de');
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length;
    assert.strictEqual(eventCount, 2);
  });

  test('Text-Escaping: Komma + Semikolon im SUMMARY', () => {
    const termine = [{ id: 'x', start: '2026-05-15T09:00:00Z', titel: 'Foo, Bar; Baz' }];
    const ical = T.buildIcalBody(termine, 'x@y.de');
    assert.match(ical, /SUMMARY:Foo\\, Bar\\; Baz/);
  });

  test('X-WR-CALNAME mit SV-Email', () => {
    const ical = T.buildIcalBody([], 'sv@prova.de');
    assert.match(ical, /X-WR-CALNAME:PROVA Termine — sv@prova\.de/);
  });

  test('X-WR-TIMEZONE Europe/Berlin', () => {
    const ical = T.buildIcalBody([], 'x@y.de');
    assert.match(ical, /X-WR-TIMEZONE:Europe\/Berlin/);
  });

  test('Termine ohne start werden geskipped', () => {
    const termine = [
      { id: 'a', start: 'invalid-date', titel: 'No Start' },
      { id: 'b', start: '2026-05-15T09:00:00Z', titel: 'Has Start' }
    ];
    const ical = T.buildIcalBody(termine, 'x@y.de');
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length;
    assert.strictEqual(eventCount, 1);
  });
});

describe('generate-ical Lambda-Wraps', () => {
  const fs = require('node:fs');
  const SRC = fs.readFileSync(path.join(ROOT, 'netlify/functions/generate-ical.js'), 'utf8');

  test('requireAuth + withSentry + functionName', () => {
    assert.match(SRC, /requireAuth/);
    assert.match(SRC, /withSentry/);
    assert.match(SRC, /functionName:\s*['"]generate-ical['"]/);
  });

  test('Rate-Limit 30/60s', () => {
    assert.match(SRC, /RateLimit\.check\([\s\S]{0,100}30,\s*60/);
  });

  test('Content-Type: text/calendar', () => {
    assert.match(SRC, /'Content-Type':\s*'text\/calendar/);
  });

  test('Content-Disposition: attachment + filename', () => {
    assert.match(SRC, /Content-Disposition.*filename="prova-termine\.ics"/);
  });

  test('Defensive Fallback bei termine-Tabelle nicht present', () => {
    assert.match(SRC, /catch \(_\)/);
  });
});
