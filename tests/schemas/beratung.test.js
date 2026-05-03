/**
 * PROVA — Tests fuer Flow C Beratung Schema
 * MEGA⁴ Q7 (04.05.2026)
 *
 * USAGE: node --test tests/schemas/beratung.test.js
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  beratungAuftragSchema,
  beratungProtokollSchema,
  beratungAbschlussSchema,
  beratungstyp,
  beratungsthemenkategorie
} = require('../../lib/schemas/beratung');

const VALID_WS = '550e8400-e29b-41d4-a716-446655440000';
const VALID_BERATUNG_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('beratungAuftragSchema', () => {
  test('valid: minimaler Auftrag', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: VALID_WS,
      auftraggeber_name: 'Familie Weber',
      typ: 'telefon',
      thema: 'kaufberatung',
      thema_freitext: 'Kaufberatung fuer Bestandsgebaeude Bj. 1958'
    });
    assert.equal(r.success, true);
    assert.equal(r.data.status, 'angefragt'); // default
  });

  test('valid: voller Auftrag mit Termin + Honorar', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: VALID_WS,
      auftraggeber_name: 'Familie Weber',
      auftraggeber_email: 'weber@example.com',
      typ: 'vor-ort',
      thema: 'sanierung',
      thema_freitext: 'Detailberatung Sanierungsplan',
      termin_datum: '2026-05-15',
      termin_uhrzeit: '14:30',
      termin_dauer_min: 90,
      stundensatz_eur: 180
    });
    assert.equal(r.success, true);
  });

  test('invalid: workspace_id kein UUID', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: 'not-a-uuid',
      auftraggeber_name: 'XY',
      typ: 'telefon',
      thema: 'sonstiges',
      thema_freitext: 'test text test test'
    });
    assert.equal(r.success, false);
  });

  test('invalid: typ nicht in Enum', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: VALID_WS,
      auftraggeber_name: 'XY',
      typ: 'fax',
      thema: 'sonstiges',
      thema_freitext: 'lange genug text'
    });
    assert.equal(r.success, false);
  });

  test('invalid: thema_freitext zu kurz', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: VALID_WS,
      auftraggeber_name: 'XY',
      typ: 'telefon',
      thema: 'sonstiges',
      thema_freitext: 'kurz'
    });
    assert.equal(r.success, false);
  });

  test('invalid: termin_datum falsches Format', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: VALID_WS,
      auftraggeber_name: 'Familie X',
      typ: 'telefon',
      thema: 'sonstiges',
      thema_freitext: 'Genug Text fuer Validierung',
      termin_datum: '15.05.2026'
    });
    assert.equal(r.success, false);
  });

  test('edge: stundensatz_eur Untergrenze', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: VALID_WS,
      auftraggeber_name: 'XY',
      typ: 'telefon',
      thema: 'sonstiges',
      thema_freitext: 'Genug Text fuer Validierung',
      stundensatz_eur: 49
    });
    assert.equal(r.success, false);
  });

  test('edge: stundensatz_eur 50 OK', () => {
    const r = beratungAuftragSchema.safeParse({
      workspace_id: VALID_WS,
      auftraggeber_name: 'XY',
      typ: 'telefon',
      thema: 'sonstiges',
      thema_freitext: 'Genug Text fuer Validierung',
      stundensatz_eur: 50
    });
    assert.equal(r.success, true);
  });
});

describe('beratungProtokollSchema', () => {
  test('valid: minimal mit 1 Punkt', () => {
    const r = beratungProtokollSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      termin_realdauer_min: 60,
      besprochene_punkte: [{ titel: 'Titel A', text: 'Text dazu lang genug' }]
    });
    assert.equal(r.success, true);
  });

  test('invalid: keine besprochenen Punkte', () => {
    const r = beratungProtokollSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      termin_realdauer_min: 60,
      besprochene_punkte: []
    });
    assert.equal(r.success, false);
  });

  test('valid: mit Empfehlungen + Folge-Aktionen', () => {
    const r = beratungProtokollSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      termin_realdauer_min: 90,
      besprochene_punkte: [{ titel: 'AB', text: 'Text dazu' }],
      empfehlungen: [{ titel: 'Empf 1', text: 'Empfehlungs-Text', prioritaet: 'hoch' }],
      folge_aktionen: [{ text: 'Aktion machen', verantwortlich: 'Bauherr', bis_datum: '2026-06-01' }]
    });
    assert.equal(r.success, true);
  });

  test('edge: prioritaet niedrig OK', () => {
    const r = beratungProtokollSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      termin_realdauer_min: 60,
      besprochene_punkte: [{ titel: 'AB', text: 'Text-Inhalt' }],
      empfehlungen: [{ titel: 'XY', text: 'Empfehlung-Text', prioritaet: 'niedrig' }]
    });
    assert.equal(r.success, true);
  });

  test('invalid: prioritaet unknown', () => {
    const r = beratungProtokollSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      termin_realdauer_min: 60,
      besprochene_punkte: [{ titel: 'AB', text: 'Text' }],
      empfehlungen: [{ titel: 'XY', text: 'Empfehlung', prioritaet: 'sehr hoch' }]
    });
    assert.equal(r.success, false);
  });
});

describe('beratungAbschlussSchema', () => {
  test('valid: minimal-Abschluss', () => {
    const r = beratungAbschlussSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      rechnung_betrag_brutto: 214.20,
      abschluss_datum: '2026-05-04'
    });
    assert.equal(r.success, true);
  });

  test('valid: voll mit Bewertung', () => {
    const r = beratungAbschlussSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      rechnung_betrag_brutto: 350.00,
      abschluss_datum: '2026-05-04',
      bewertung_sv: 5,
      notizen_intern: 'Pilot war zufrieden'
    });
    assert.equal(r.success, true);
  });

  test('invalid: bewertung_sv > 5', () => {
    const r = beratungAbschlussSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      rechnung_betrag_brutto: 100,
      abschluss_datum: '2026-05-04',
      bewertung_sv: 6
    });
    assert.equal(r.success, false);
  });

  test('invalid: rechnung_betrag negativ', () => {
    const r = beratungAbschlussSchema.safeParse({
      beratung_id: VALID_BERATUNG_ID,
      rechnung_betrag_brutto: -10,
      abschluss_datum: '2026-05-04'
    });
    assert.equal(r.success, false);
  });
});

describe('beratungstyp Enum', () => {
  test('alle 4 Typen valid', () => {
    for (const t of ['telefon', 'vor-ort', 'online', 'schriftlich']) {
      assert.equal(beratungstyp.safeParse(t).success, true);
    }
  });
  test('unbekannter Typ invalid', () => {
    assert.equal(beratungstyp.safeParse('email').success, false);
  });
});

describe('beratungsthemenkategorie Enum', () => {
  test('alle 7 Kategorien valid', () => {
    for (const k of ['bauschaden', 'kaufberatung', 'sanierung', 'mangelbewertung', 'wertermittlung', 'streitfall', 'sonstiges']) {
      assert.equal(beratungsthemenkategorie.safeParse(k).success, true);
    }
  });
});
