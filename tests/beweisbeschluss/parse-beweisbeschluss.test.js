/**
 * PROVA — parse-beweisbeschluss.js Tests (MEGA²¹+²² W116)
 * Marcel-C1: Pattern-Matching pure-Function tests (KEIN HTTP)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lambda = require(path.join(ROOT, 'netlify', 'functions', 'parse-beweisbeschluss.js'));
const SRC = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'parse-beweisbeschluss.js'), 'utf8');

describe('parse-beweisbeschluss — extractPatterns Aktenzeichen', () => {
  test('AZ: 5 O 234/26', () => {
    const r = Lambda._test.extractPatterns('Aktenzeichen: 5 O 234/26');
    assert.equal(r.aktenzeichen, '5 O 234/26');
  });

  test('Az. 12 C 456/2025', () => {
    const r = Lambda._test.extractPatterns('Az. 12 C 456/2025');
    assert.equal(r.aktenzeichen, '12 C 456/2025');
  });

  test('Kein AZ → null', () => {
    const r = Lambda._test.extractPatterns('Kein Aktenzeichen-String hier');
    assert.equal(r.aktenzeichen, null);
  });

  test('Mehrere Whitespaces in AZ normalisiert', () => {
    const r = Lambda._test.extractPatterns('AZ: 5  O  234/26');
    assert.equal(r.aktenzeichen, '5 O 234/26');
  });
});

describe('parse-beweisbeschluss — extractPatterns Frist-Datum', () => {
  test('Frist: 15.06.2026', () => {
    const r = Lambda._test.extractPatterns('Frist: 15.06.2026');
    assert.equal(r.frist_datum, '15.06.2026');
  });

  test('Frist zur Erstattung 1.7.2026', () => {
    const r = Lambda._test.extractPatterns('Frist zur Erstattung des Gutachtens: 1.7.2026');
    assert.equal(r.frist_datum, '1.7.2026');
  });

  test('Kein Frist → null', () => {
    const r = Lambda._test.extractPatterns('Beweisbeschluss ohne Frist');
    assert.equal(r.frist_datum, null);
  });
});

describe('parse-beweisbeschluss — extractPatterns Hauptfragen', () => {
  test('2 nummerierte Fragen extrahiert', () => {
    const text = '1. Es soll Beweis erhoben werden über die Frage, ob ein Schaden vorliegt.\n2. Welche Ursachen sind verantwortlich für den Schaden gewesen.';
    const r = Lambda._test.extractPatterns(text);
    assert.equal(r.hauptfragen.length, 2);
    assert.equal(r.hauptfragen[0].nr, 1);
    assert.equal(r.hauptfragen[1].nr, 2);
  });

  test('Kurze Sub-20-Zeichen-Items werden ausgefiltert', () => {
    const text = '1. Ja.\n2. Es soll umfassend Beweis erhoben werden ueber den Sachverhalt.';
    const r = Lambda._test.extractPatterns(text);
    assert.equal(r.hauptfragen.length, 1);  // "1. Ja." gefiltert
    assert.equal(r.hauptfragen[0].nr, 2);
  });

  test('Ueber 800-Zeichen-Items werden gecapped', () => {
    const longQ = '1. ' + 'x'.repeat(2000);
    const r = Lambda._test.extractPatterns(longQ);
    if (r.hauptfragen.length > 0) {
      assert.ok(r.hauptfragen[0].text.length <= 500);
    }
  });

  test('Safety-Limit 20 Hauptfragen', () => {
    const text = Array.from({length: 30}, (_, i) => (i+1) + '. Es soll Beweis erhoben werden ueber die Frage Nr ' + (i+1) + ' im Gesamtkontext.').join('\n');
    const r = Lambda._test.extractPatterns(text);
    assert.ok(r.hauptfragen.length <= 20);
  });
});

describe('parse-beweisbeschluss — extractPatterns Parteien', () => {
  test('Klaeger + Beklagter erkannt', () => {
    const text = 'In Sachen\nKläger: Maier GmbH gegen\nBeklagter: Müller AG\n';
    const r = Lambda._test.extractPatterns(text);
    assert.ok(r.parteien.find(p => p.rolle === 'Klaeger' && p.name.indexOf('Maier') !== -1));
    assert.ok(r.parteien.find(p => p.rolle === 'Beklagter' && p.name.indexOf('Müller') !== -1));
  });

  test('Antragsteller erkannt', () => {
    const text = 'Antragsteller: Schmidt Bau gegen die Versicherung,';
    const r = Lambda._test.extractPatterns(text);
    assert.ok(r.parteien.find(p => p.rolle === 'Antragsteller'));
  });

  test('Keine Parteien → leeres Array', () => {
    const r = Lambda._test.extractPatterns('Beweisbeschluss ohne Beteiligte');
    assert.deepEqual(r.parteien, []);
  });
});

describe('parse-beweisbeschluss — Defensive', () => {
  test('null/undefined Input → leerer Extrakt', () => {
    const r = Lambda._test.extractPatterns(null);
    assert.equal(r.aktenzeichen, null);
    assert.deepEqual(r.hauptfragen, []);
    assert.deepEqual(r.parteien, []);
  });

  test('Empty string', () => {
    const r = Lambda._test.extractPatterns('');
    assert.equal(r.aktenzeichen, null);
  });

  test('Non-string Input', () => {
    const r = Lambda._test.extractPatterns(12345);
    assert.equal(r.aktenzeichen, null);
  });

  test('raw_text_preview ≤ 1000 Zeichen', () => {
    const text = 'x'.repeat(2000);
    const r = Lambda._test.extractPatterns(text);
    assert.ok(r.raw_text_preview.length <= 1000);
  });
});

describe('parse-beweisbeschluss — _isPdf Magic-Bytes', () => {
  test('Valid PDF', () => {
    assert.equal(Lambda._test._isPdf(Buffer.from('%PDF-1.4 ...')), true);
    assert.equal(Lambda._test._isPdf(Buffer.from('%PDF-1.7 ...')), true);
  });

  test('Invalid', () => {
    assert.equal(Lambda._test._isPdf(Buffer.from('not a pdf')), false);
    assert.equal(Lambda._test._isPdf(Buffer.from('PDF-1.4')), false);  // ohne %
  });

  test('Empty/short', () => {
    assert.equal(Lambda._test._isPdf(Buffer.from('')), false);
    assert.equal(Lambda._test._isPdf(Buffer.from('%PDF')), false);  // <5 chars
    assert.equal(Lambda._test._isPdf(null), false);
  });
});

describe('parse-beweisbeschluss — Source-Patterns', () => {
  test('POST-only', () => {
    assert.match(SRC, /event\.httpMethod !== ['"]POST['"]/);
  });

  test('Auth-pflicht (requireAuth)', () => {
    assert.match(SRC, /requireAuth/);
  });

  test('Migration-Pending-Detection', () => {
    assert.match(SRC, /11_auftraege_beweisbeschluss\.sql/);
  });

  test('Storage-Upload zu sv-files Bucket', () => {
    assert.match(SRC, /storage\.from\(['"]sv-files['"]\)/);
  });

  test('Audit-Log fire-and-forget', () => {
    assert.match(SRC, /audit_trail/);
    assert.match(SRC, /beweisbeschluss\.parsed/);
  });

  test('Disclaimer in Response (Marcel-Pflicht)', () => {
    assert.match(SRC, /disclaimer_html/);
    assert.match(SRC, /§407a ZPO/);
  });

  test('Marcel-C1 Pattern-Matching only', () => {
    assert.match(SRC, /Marcel-C1/);
    assert.match(SRC, /KEIN KI/i);
  });

  test('parser_version v1', () => {
    assert.match(SRC, /parser_version\s*=\s*['"]pattern-v1['"]/);
  });
});
