'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { __buildHtml } = require('../../netlify/functions/eintraege-jveg-export');

test('JVEG-Export: Summe Min + Std + Betrag stimmen', () => {
  const html = __buildHtml({
    eintraege: [
      { datum: '2026-04-01', eintrag_typ: 'ortstermin', beschreibung_text: 'Ortstermin Kunde X', dauer_min: 120 },
      { datum: '2026-04-05', eintrag_typ: 'gutachten-arbeit', beschreibung_text: 'Schreiben Teil 3', dauer_min: 180 }
    ],
    stundensatz: 100,
    az: 'SCH-2026-001',
    sv_name: 'M. Schreiber',
    from: '2026-04-01',
    to: '2026-04-30'
  });
  assert.match(html, /SCH-2026-001/);
  assert.match(html, /M\. Schreiber/);
  assert.match(html, /300/, 'Summe Minuten 120+180=300');
  assert.match(html, /5,00/, 'Summe Stunden 5,00');
  assert.match(html, /500,00.{0,5}€/, 'Summe Betrag 500,00 €');
});

test('JVEG-Export: HTML escapt < und >', () => {
  const html = __buildHtml({
    eintraege: [{ datum: '2026-04-01', eintrag_typ: 'sonstiges', beschreibung_text: '<script>alert(1)</script>', dauer_min: 30 }],
    stundensatz: 100, az: 'X', sv_name: 'Y', from: 'a', to: 'b'
  });
  assert.ok(!html.includes('<script>alert(1)</script>'), 'kein roher Script-Tag');
  assert.match(html, /&lt;script&gt;/);
});

test('JVEG-Export: leere Liste = Summe 0', () => {
  const html = __buildHtml({ eintraege: [], stundensatz: 100, az: 'X', sv_name: 'Y', from: 'a', to: 'b' });
  assert.match(html, /0,00/);
  assert.match(html, /JVEG/);
  assert.match(html, /§ 8\/12/);
});

test('JVEG-Export: Stundensatz 120€/h × 60min = 120€', () => {
  const html = __buildHtml({
    eintraege: [{ datum: '2026-01-01', eintrag_typ: 'ortstermin', beschreibung_text: 'A', dauer_min: 60 }],
    stundensatz: 120, az: 'X', sv_name: 'Y', from: 'a', to: 'b'
  });
  assert.match(html, /120,00.{0,5}€/);
});

test('JVEG-Export: Beschreibung wird auf 200 Zeichen gekürzt', () => {
  const longText = 'X'.repeat(500);
  const html = __buildHtml({
    eintraege: [{ datum: '2026-01-01', eintrag_typ: 'ortstermin', beschreibung_text: longText, dauer_min: 30 }],
    stundensatz: 100, az: 'X', sv_name: 'Y', from: 'a', to: 'b'
  });
  const match = html.match(/X{200,}/);
  assert.ok(match);
  assert.ok(match[0].length === 200, 'genau 200 X-Zeichen, nicht 500');
});

test('JVEG-Export: § 12 Verweis vorhanden', () => {
  const html = __buildHtml({ eintraege: [], stundensatz: 100, az: 'X', sv_name: 'Y', from: 'a', to: 'b' });
  assert.match(html, /§ 12 Abs. 1 Nr. 1/);
});

test('JVEG-Export: deutsche Zahlen-Formatierung mit Komma', () => {
  const html = __buildHtml({
    eintraege: [{ datum: '2026-01-01', eintrag_typ: 'ortstermin', beschreibung_text: 'A', dauer_min: 75 }],
    stundensatz: 100, az: 'X', sv_name: 'Y', from: 'a', to: 'b'
  });
  assert.match(html, /1,25/, 'Stunden 1,25 mit Komma');
  assert.match(html, /125,00/, 'Betrag 125,00');
});
