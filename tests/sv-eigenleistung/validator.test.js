/**
 * PROVA — sv-eigenleistung-validator Tests (MEGA²⁸ W1-I3)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const Lib = require(path.join(ROOT, 'lib', 'sv-eigenleistung-validator.js'));

describe('sv-eigenleistung-validator — Min-Length-Check', () => {
  test('blockt < 500 Zeichen', () => {
    const r = Lib.validateP6Length('Kurz.');
    assert.ok(r);
    assert.equal(r.rule, 'min_length');
  });

  test('akzeptiert genau 500 Zeichen', () => {
    const r = Lib.validateP6Length('a'.repeat(500));
    assert.equal(r, null);
  });

  test('akzeptiert > 500 Zeichen', () => {
    const r = Lib.validateP6Length('a'.repeat(1000));
    assert.equal(r, null);
  });
});

describe('sv-eigenleistung-validator — Konjunktiv-II-Check', () => {
  test('blockt ohne Marker', () => {
    const r = Lib.validateKonjunktiv2('Das Bauteil ist defekt und wird ersetzt.');
    assert.ok(r);
    assert.equal(r.rule, 'konjunktiv_ii');
  });

  test('akzeptiert mit "dürfte"', () => {
    const r = Lib.validateKonjunktiv2('Das Bauteil dürfte defekt sein.');
    assert.equal(r, null);
  });

  test('akzeptiert mit "ließe sich"', () => {
    const r = Lib.validateKonjunktiv2('Aus dem Befund ließe sich vermuten...');
    assert.equal(r, null);
  });
});

describe('sv-eigenleistung-validator — KI-Disclosure-Check', () => {
  test('blockt fehlendes Template', () => {
    const r = Lib.validateKiDisclosure(null);
    assert.ok(r);
    assert.match(r.message, /Template fehlt/);
  });

  test('blockt Template ohne EU AI Act Marker', () => {
    const r = Lib.validateKiDisclosure('<html><body>Just a regular template.</body></html>');
    assert.ok(r);
    assert.match(r.message, /EU AI Act/);
  });

  test('akzeptiert Template mit EU AI Act', () => {
    const r = Lib.validateKiDisclosure('<div>EU AI Act Art. 50 Hinweis</div>');
    assert.equal(r, null);
  });

  test('akzeptiert Template mit §407a-Marker', () => {
    const r = Lib.validateKiDisclosure('<div>SV §407a ZPO eigenverantwortlich</div>');
    assert.equal(r, null);
  });

  test('akzeptiert Template mit prova-ki-disclaimer Klasse', () => {
    const r = Lib.validateKiDisclosure('<div class="prova-ki-disclaimer">…</div>');
    assert.equal(r, null);
  });
});

describe('sv-eigenleistung-validator — validate() E2E', () => {
  test('alle 3 grün → ok:true', () => {
    const longText = 'Aus den Messwerten ließe sich vermuten, dass eine Feuchtigkeit vorliegt. ' .repeat(20);
    const r = Lib.validate({
      p6_text: longText,
      template_html: '<div>EU AI Act Art. 50 KI-Strukturhilfe</div>'
    });
    assert.equal(r.ok, true);
    assert.equal(r.status, 'pass');
    assert.equal(r.fails.length, 0);
  });

  test('1 Fail → block', () => {
    const r = Lib.validate({
      p6_text: 'Kurz.',
      template_html: '<div>EU AI Act Art. 50</div>'
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 'block');
    assert.equal(r.fails.length, 2); // Length + Konjunktiv (kurzer Text hat keine Marker)
  });

  test('alle 3 Fails → block mit 3 fail-items', () => {
    const r = Lib.validate({ p6_text: '', template_html: '' });
    assert.equal(r.ok, false);
    assert.equal(r.fails.length, 3);
  });

  test('Faktische User-Message (kein "Bitte beachten...")', () => {
    const r = Lib.validate({ p6_text: 'Kurz.', template_html: 'x' });
    r.fails.forEach(f => {
      assert.doesNotMatch(f.message, /[Bb]itte beachten/);
      assert.match(f.message, /Voraussetzung.*erfüllt/);
    });
  });
});

describe('sv-eigenleistung-validator — Constants', () => {
  test('MIN_LENGTH = 500', () => {
    assert.equal(Lib._const.MIN_LENGTH, 500);
  });
});
