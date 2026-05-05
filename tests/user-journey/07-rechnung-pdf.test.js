/**
 * PROVA — User-Journey 07: Rechnung-Erstellung + PDF-Generation (MEGA²⁴ Block 6)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Journey 07 — Rechnungsschema-Validation', () => {
  function validateRechnung(r) {
    if (!r) return { ok: false, error: 'no data' };
    if (!r.aktenzeichen || r.aktenzeichen.length < 2) return { ok: false, error: 'aktenzeichen' };
    if (!r.empfaenger_name) return { ok: false, error: 'empfaenger' };
    if (!Array.isArray(r.positionen) || r.positionen.length === 0) return { ok: false, error: 'positionen' };
    let total = 0;
    for (const p of r.positionen) {
      const m = Number(p.menge);
      const ep = Number(p.einzelpreis);
      if (!isFinite(m) || !isFinite(ep) || m <= 0 || ep < 0) return { ok: false, error: 'invalid position' };
      total += m * ep;
    }
    return {
      ok: true,
      netto: Math.round(total * 100) / 100,
      mwst: Math.round(total * 0.19 * 100) / 100,
      brutto: Math.round(total * 1.19 * 100) / 100
    };
  }

  test('akzeptiert valide JVEG-Rechnung', () => {
    const r = validateRechnung({
      aktenzeichen: '1 O 234/25',
      empfaenger_name: 'Amtsgericht Köln',
      positionen: [
        { beschreibung: '§9 Honorar', menge: 5, einzelpreis: 95 },
        { beschreibung: '§8 Fahrt', menge: 100, einzelpreis: 0.42 }
      ]
    });
    assert.equal(r.ok, true);
    assert.equal(r.netto, 517);
    assert.equal(r.brutto, 615.23);
  });

  test('lehnt fehlende Positionen', () => {
    assert.equal(validateRechnung({
      aktenzeichen: 'AZ', empfaenger_name: 'X', positionen: []
    }).ok, false);
  });

  test('lehnt negative Einzelpreise', () => {
    assert.equal(validateRechnung({
      aktenzeichen: 'AZ', empfaenger_name: 'X',
      positionen: [{ menge: 1, einzelpreis: -5 }]
    }).ok, false);
  });

  test('lehnt fehlende Empfaenger', () => {
    assert.equal(validateRechnung({
      aktenzeichen: 'AZ', positionen: [{ menge: 1, einzelpreis: 1 }]
    }).ok, false);
  });
});

describe('Journey 07 — ZUGFeRD-Trigger-Logic', () => {
  function shouldTriggerZugferd(rechnung) {
    if (!rechnung) return false;
    // ZUGFeRD = strukturierte XML im PDF, fuer B2B-Kunden Pflicht ab 2025
    return Boolean(rechnung.empfaenger_typ === 'gewerbe' || rechnung.zugferd_pflicht === true);
  }

  test('Gewerbe-Empfaenger → ZUGFeRD ja', () => {
    assert.equal(shouldTriggerZugferd({ empfaenger_typ: 'gewerbe' }), true);
  });

  test('Privat-Empfaenger → ZUGFeRD nein', () => {
    assert.equal(shouldTriggerZugferd({ empfaenger_typ: 'privat' }), false);
  });

  test('explicit zugferd_pflicht override', () => {
    assert.equal(shouldTriggerZugferd({ empfaenger_typ: 'privat', zugferd_pflicht: true }), true);
  });
});

describe('Journey 07 — PDF-Endpoint-Routing', () => {
  function pickPdfEndpoint(typ) {
    const endpoints = {
      'jveg': '/.netlify/functions/rechnung-pdf',
      'pauschal': '/.netlify/functions/rechnung-pdf',
      'mahnung': '/.netlify/functions/mahnung-pdf',
      'zugferd': '/.netlify/functions/zugferd-rechnung'
    };
    return endpoints[typ] || endpoints['pauschal'];
  }

  test('JVEG nutzt rechnung-pdf', () => {
    assert.equal(pickPdfEndpoint('jveg'), '/.netlify/functions/rechnung-pdf');
  });

  test('Mahnung nutzt mahnung-pdf', () => {
    assert.equal(pickPdfEndpoint('mahnung'), '/.netlify/functions/mahnung-pdf');
  });

  test('ZUGFeRD nutzt zugferd-rechnung', () => {
    assert.equal(pickPdfEndpoint('zugferd'), '/.netlify/functions/zugferd-rechnung');
  });

  test('Unknown typ fallback auf pauschal', () => {
    assert.equal(pickPdfEndpoint('unknown'), '/.netlify/functions/rechnung-pdf');
  });
});
