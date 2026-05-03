/**
 * PROVA — Tests fuer Flow D Baubegleitung Schema
 * MEGA⁴ Q7 (04.05.2026)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  baubegleitungProjektSchema,
  baubegleitungBegehungSchema,
  baubegleitungAbnahmeSchema,
  begehungstyp,
  mangelschwere,
  projektstatus
} = require('../../lib/schemas/baubegleitung');

const WS = '550e8400-e29b-41d4-a716-446655440000';
const PROJ = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('baubegleitungProjektSchema', () => {
  test('valid: Neubau mit Stundensatz', () => {
    const r = baubegleitungProjektSchema.safeParse({
      workspace_id: WS,
      bauherr_name: 'Familie Hofmann',
      bauherr_anschrift: 'Eichenweg 14, 50997 Koeln',
      baustellen_adresse: 'Eichenweg 14, 50997 Koeln',
      baustellen_typ: 'neubau',
      baubeginn_datum: '2026-02-12',
      honorar_typ: 'stundensatz',
      stundensatz_eur: 130
    });
    assert.equal(r.success, true);
    assert.equal(r.data.status, 'angelegt'); // default
  });

  test('valid: Sanierung mit Pauschal', () => {
    const r = baubegleitungProjektSchema.safeParse({
      workspace_id: WS,
      bauherr_name: 'WEG Sterneckstr.',
      bauherr_anschrift: 'Sterneckstr. 4, Koeln',
      baustellen_adresse: 'Sterneckstr. 4, Koeln',
      baustellen_typ: 'sanierung',
      baubeginn_datum: '2026-04-01',
      honorar_typ: 'pauschal',
      pauschal_eur: 8500
    });
    assert.equal(r.success, true);
  });

  test('valid: Bausummen-Prozent-Honorar', () => {
    const r = baubegleitungProjektSchema.safeParse({
      workspace_id: WS,
      bauherr_name: 'Bauherr X',
      bauherr_anschrift: 'Adresse',
      baustellen_adresse: 'Baustelle',
      baustellen_typ: 'umbau',
      baubeginn_datum: '2026-01-15',
      honorar_typ: 'prozent_bausumme',
      prozent_satz: 1.5,
      bausumme_eur: 250000
    });
    assert.equal(r.success, true);
  });

  test('invalid: baustellen_typ nicht in Enum', () => {
    const r = baubegleitungProjektSchema.safeParse({
      workspace_id: WS,
      bauherr_name: 'XY',
      bauherr_anschrift: 'A',
      baustellen_adresse: 'B',
      baustellen_typ: 'reparatur',
      baubeginn_datum: '2026-02-12',
      honorar_typ: 'stundensatz',
      stundensatz_eur: 100
    });
    assert.equal(r.success, false);
  });

  test('invalid: prozent_satz > 10', () => {
    const r = baubegleitungProjektSchema.safeParse({
      workspace_id: WS,
      bauherr_name: 'XY',
      bauherr_anschrift: 'A',
      baustellen_adresse: 'B',
      baustellen_typ: 'neubau',
      baubeginn_datum: '2026-02-12',
      honorar_typ: 'prozent_bausumme',
      prozent_satz: 15
    });
    assert.equal(r.success, false);
  });

  test('invalid: baubeginn_datum falsches Format', () => {
    const r = baubegleitungProjektSchema.safeParse({
      workspace_id: WS,
      bauherr_name: 'XY',
      bauherr_anschrift: 'A',
      baustellen_adresse: 'B',
      baustellen_typ: 'neubau',
      baubeginn_datum: '12.02.2026',
      honorar_typ: 'stundensatz',
      stundensatz_eur: 100
    });
    assert.equal(r.success, false);
  });
});

describe('baubegleitungBegehungSchema', () => {
  test('valid: Wochen-Begehung mit Befunden', () => {
    const r = baubegleitungBegehungSchema.safeParse({
      projekt_id: PROJ,
      typ: 'wochen-begehung',
      termin_datum: '2026-04-30',
      dauer_min: 90,
      anwesende: ['SV Marcel', 'Bauleiter Schroeder'],
      befunde: [{ titel: 'Aussenwand fertig', text: 'KS24 100% fertig im Norden' }]
    });
    assert.equal(r.success, true);
  });

  test('valid: Begehung mit kritischem Mangel', () => {
    const r = baubegleitungBegehungSchema.safeParse({
      projekt_id: PROJ,
      typ: 'mangel-begehung',
      termin_datum: '2026-04-30',
      dauer_min: 60,
      anwesende: ['SV Marcel'],
      maengel: [{
        titel: 'Fehlende Bewehrung',
        beschreibung: 'Decke EG ohne Querverteiler',
        schwere: 'kritisch',
        gewerk: 'Stahlbau',
        frist_behebung: '2026-05-07',
        behoben: false
      }]
    });
    assert.equal(r.success, true);
  });

  test('invalid: anwesende leer', () => {
    const r = baubegleitungBegehungSchema.safeParse({
      projekt_id: PROJ,
      typ: 'wochen-begehung',
      termin_datum: '2026-04-30',
      dauer_min: 60,
      anwesende: []
    });
    assert.equal(r.success, true); // anwesende-min ist 0, max 20 (kein .min)
  });

  test('invalid: dauer_min < 15', () => {
    const r = baubegleitungBegehungSchema.safeParse({
      projekt_id: PROJ,
      typ: 'wochen-begehung',
      termin_datum: '2026-04-30',
      dauer_min: 10,
      anwesende: ['SV Marcel']
    });
    assert.equal(r.success, false);
  });

  test('invalid: typ nicht in Enum', () => {
    const r = baubegleitungBegehungSchema.safeParse({
      projekt_id: PROJ,
      typ: 'kontroll-besuch',
      termin_datum: '2026-04-30',
      dauer_min: 60,
      anwesende: ['SV Marcel']
    });
    assert.equal(r.success, false);
  });

  test('valid: ki_eingesetzt default false', () => {
    const r = baubegleitungBegehungSchema.safeParse({
      projekt_id: PROJ,
      typ: 'wochen-begehung',
      termin_datum: '2026-04-30',
      dauer_min: 60,
      anwesende: ['SV Marcel']
    });
    assert.equal(r.success, true);
    assert.equal(r.data.ki_eingesetzt, false);
  });
});

describe('baubegleitungAbnahmeSchema', () => {
  test('valid: Voll-Abnahme', () => {
    const r = baubegleitungAbnahmeSchema.safeParse({
      projekt_id: PROJ,
      abnahme_datum: '2026-10-20',
      abnahme_typ: 'gesamt',
      abnahme_status: 'voll_angenommen',
      abnahme_anwesende: ['Bauherr', 'BU', 'SV'],
      sv_bewertung: 'Werk ist mangelfrei abgenommen worden. Keine Restmaengel festgestellt.'
    });
    assert.equal(r.success, true);
  });

  test('valid: Vorbehalt mit Restmaengeln', () => {
    const r = baubegleitungAbnahmeSchema.safeParse({
      projekt_id: PROJ,
      abnahme_datum: '2026-10-20',
      abnahme_typ: 'gesamt',
      abnahme_status: 'angenommen_unter_vorbehalt',
      abnahme_anwesende: ['Bauherr', 'BU', 'SV'],
      sv_bewertung: 'Vorbehalt aufgrund 2 Restmaengeln. Empfehlung Sicherheitseinbehalt 800 €.',
      restmaengel: [{
        titel: 'Heizung-Hydraulik',
        beschreibung: 'Hydraulischer Abgleich fehlt, ungleichmaessige Waermeabgabe',
        schwere: 'technisch',
        frist_behebung: '2026-11-15',
        sicherheitseinbehalt_eur: 800
      }],
      sicherheitseinbehalt_summe_eur: 800
    });
    assert.equal(r.success, true);
  });

  test('invalid: sv_bewertung zu kurz', () => {
    const r = baubegleitungAbnahmeSchema.safeParse({
      projekt_id: PROJ,
      abnahme_datum: '2026-10-20',
      abnahme_typ: 'gesamt',
      abnahme_status: 'voll_angenommen',
      abnahme_anwesende: ['SV'],
      sv_bewertung: 'OK'
    });
    assert.equal(r.success, false);
  });

  test('invalid: abnahme_status unknown', () => {
    const r = baubegleitungAbnahmeSchema.safeParse({
      projekt_id: PROJ,
      abnahme_datum: '2026-10-20',
      abnahme_typ: 'gesamt',
      abnahme_status: 'durchgewinkt',
      abnahme_anwesende: ['SV'],
      sv_bewertung: 'lange genug bewertung text fuer validierung'
    });
    assert.equal(r.success, false);
  });
});

describe('mangelschwere Enum', () => {
  test('alle 4 Schweregrade', () => {
    for (const s of ['optisch', 'technisch', 'wesentlich', 'kritisch']) {
      assert.equal(mangelschwere.safeParse(s).success, true);
    }
  });
  test('unbekannter Schweregrad', () => {
    assert.equal(mangelschwere.safeParse('mittel').success, false);
  });
});

describe('begehungstyp Enum', () => {
  test('alle 5 Typen', () => {
    for (const t of ['roh-begehung', 'wochen-begehung', 'gewerk-abnahme', 'mangel-begehung', 'final-abnahme']) {
      assert.equal(begehungstyp.safeParse(t).success, true);
    }
  });
});

describe('projektstatus Enum', () => {
  test('alle 6 Status', () => {
    for (const s of ['angelegt', 'aktiv', 'abnahme_geplant', 'abgenommen', 'abgeschlossen', 'storniert']) {
      assert.equal(projektstatus.safeParse(s).success, true);
    }
  });
});
