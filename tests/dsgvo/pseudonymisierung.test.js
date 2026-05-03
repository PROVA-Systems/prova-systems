/**
 * PROVA — DSGVO-Pseudonymisierungs-Tests
 * MEGA⁶ S2 (04.05.2026)
 *
 * Verifikation: Server-side Pseudonymisierung VOR Drittland-Transfer (OpenAI).
 * Pflicht aus Art. 25 DSGVO + Art. 32 + DSFA.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ProvaPseudo = require('../../netlify/functions/lib/prova-pseudo');

describe('Pseudonymisierung — IBAN', () => {
  test('Deutsche IBAN wird ersetzt', () => {
    const out = ProvaPseudo.apply('Bezahlung an DE89370400440532013000 ueberwiesen.');
    assert.match(out, /\[IBAN\]/);
    assert.doesNotMatch(out, /DE89370400440532013000/);
  });

  test('IBAN mit Leerzeichen wird erkannt', () => {
    const out = ProvaPseudo.apply('IBAN: DE89 3704 0044 0532 0130 00');
    assert.match(out, /\[IBAN\]/);
  });

  test('Multiple IBANs alle ersetzt', () => {
    const out = ProvaPseudo.apply('From DE89370400440532013000 to DE89370400440532013001.');
    assert.equal((out.match(/\[IBAN\]/g) || []).length, 2);
  });
});

describe('Pseudonymisierung — Email', () => {
  test('Email wird ersetzt', () => {
    const out = ProvaPseudo.apply('Bitte kontaktieren Sie marcel@prova-systems.de bei Fragen.');
    assert.match(out, /\[EMAIL\]/);
    assert.doesNotMatch(out, /marcel@prova-systems\.de/);
  });

  test('Multiple Emails ersetzt', () => {
    const out = ProvaPseudo.apply('Cc: a@x.de; Bcc: b@y.com');
    assert.equal((out.match(/\[EMAIL\]/g) || []).length, 2);
  });
});

describe('Pseudonymisierung — Telefon', () => {
  test('Deutsche Telefonnummer ersetzt', () => {
    const out = ProvaPseudo.apply('Tel: +49 221 1234567');
    assert.match(out, /\[TELEFON\]/);
    assert.doesNotMatch(out, /\+49 221 1234567/);
  });

  test('Kurze Nummern (z.B. PLZ) NICHT als Telefon', () => {
    const out = ProvaPseudo.apply('PLZ 50667 Köln');
    // 50667 sollte NICHT als Telefon erkannt werden (zu kurz)
    assert.doesNotMatch(out.replace(/\[PLZ_ORT\]/g, ''), /\[TELEFON\]/);
  });
});

describe('Pseudonymisierung — Adresse', () => {
  test('Strasse + Hausnummer ersetzt', () => {
    const out = ProvaPseudo.apply('Wohnort: Hauptstrasse 12, 50667 Koeln');
    assert.match(out, /\[STRASSE\]|\[PLZ_ORT\]/);
  });

  test('PLZ + Ort kombination', () => {
    const out = ProvaPseudo.apply('Versand an 50667 Köln');
    assert.match(out, /\[PLZ_ORT\]/);
  });
});

describe('Pseudonymisierung — Person', () => {
  test('Anrede + Name ersetzt', () => {
    const out = ProvaPseudo.apply('Herr Mueller hat das Gutachten beauftragt.');
    assert.match(out, /\[PERSON\]/);
  });

  test('Frau Anrede ersetzt', () => {
    const out = ProvaPseudo.apply('Frau Schmitz war anwesend.');
    assert.match(out, /\[PERSON\]/);
  });
});

describe('Pseudonymisierung — Report', () => {
  test('Report enthaelt Zaehler', () => {
    ProvaPseudo.apply('Email a@b.de und IBAN DE89370400440532013000');
    const r = ProvaPseudo.lastReport;
    assert.equal(r.email, 1);
    assert.equal(r.iban, 1);
    assert.ok(r.length_in > 0);
    assert.ok(r.length_out > 0);
  });

  test('formatReport liefert lesbaren String', () => {
    ProvaPseudo.apply('Tel: +49 221 1234567');
    const txt = ProvaPseudo.formatReport(ProvaPseudo.lastReport);
    assert.match(txt, /Pseudonymisiert|Keine sensiblen/i);
  });
});

describe('Pseudonymisierung — Edge-Cases', () => {
  test('Leer-String returns leer', () => {
    assert.equal(ProvaPseudo.apply(''), '');
  });

  test('Null returns null', () => {
    assert.equal(ProvaPseudo.apply(null), null);
  });

  test('Nicht-String returns input', () => {
    assert.equal(ProvaPseudo.apply(42), 42);
  });

  test('Unverdaechtiger Text bleibt unveraendert', () => {
    const text = 'Das ist ein neutraler Befund-Text ohne sensible Daten.';
    const out = ProvaPseudo.apply(text);
    assert.equal(out, text);
  });

  test('Multi-Format-Mischung', () => {
    const text = 'Frau Mueller, Hauptstr. 5, 50667 Koeln, Tel +49 221 1234567, Email a@b.de, IBAN DE89370400440532013000';
    const out = ProvaPseudo.apply(text);
    assert.match(out, /\[PERSON\]/);
    assert.match(out, /\[STRASSE\]|\[PLZ_ORT\]/);
    assert.match(out, /\[TELEFON\]/);
    assert.match(out, /\[EMAIL\]/);
    assert.match(out, /\[IBAN\]/);
  });
});
