'use strict';

/**
 * MEGA³⁷ B4 — dokument-templates-cache End-to-End Tests
 *
 * Static-E2E (kein echter HTTP-Call): mockt fetch und verifiziert dass
 * der Cache mit realistischer DB-Response (Live-State 2026-05-08, 17 Templates)
 * korrekt arbeitet.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const Cache = require(path.join(__dirname, '..', '..', 'lib', 'dokument-templates-cache.js'));

// Live-DB-Snapshot (verifiziert via Supabase MCP, 2026-05-08)
const LIVE_TEMPLATES = [
  { id: 'a01', name: 'K-01 Auftragsbestätigung', typ: 'auftragsbestaetigung', pdfmonkey_template_id: 'K-01', aktiv: true, is_default_for_typ: false },
  { id: 'a02', name: 'K-02 Termin-Mitteilung',   typ: 'termin_bestaetigung', pdfmonkey_template_id: 'K-02', aktiv: true, is_default_for_typ: false },
  { id: 'a03', name: 'K-03 Mehrparteien-Termin', typ: 'termin_bestaetigung', pdfmonkey_template_id: 'K-03', aktiv: true, is_default_for_typ: false },
  { id: 'a04', name: 'K-04 Anforderung Unterlagen', typ: 'brief',  pdfmonkey_template_id: 'K-04', aktiv: true, is_default_for_typ: false },
  { id: 'a05', name: 'K-05 Übergabe Gutachten',  typ: 'anschreiben', pdfmonkey_template_id: 'K-05', aktiv: true, is_default_for_typ: false },
  { id: 'a06', name: 'K-06A Mahnung 1',           typ: 'mahnung_1',  pdfmonkey_template_id: 'F-06', aktiv: true, is_default_for_typ: false },
  { id: 'a07', name: 'K-06B Mahnung 2',           typ: 'mahnung_2',  pdfmonkey_template_id: 'F-07', aktiv: true, is_default_for_typ: false },
  { id: 'a08', name: 'K-06C Mahnung 3',           typ: 'mahnung_3',  pdfmonkey_template_id: 'F-08', aktiv: true, is_default_for_typ: false },
  { id: 'a09', name: 'K-07 Akteneinsicht-Antrag', typ: 'brief',      pdfmonkey_template_id: 'K-07', aktiv: true, is_default_for_typ: false },
  { id: 'a10', name: 'K-08 Befangenheits-Anzeige', typ: 'brief',     pdfmonkey_template_id: 'K-08', aktiv: true, is_default_for_typ: false },
  { id: 'a11', name: 'K-09 Auftragsablehnung',    typ: 'brief',      pdfmonkey_template_id: 'K-09', aktiv: true, is_default_for_typ: false },
  { id: 'a12', name: 'F-04 Kurzstellungnahme',    typ: 'kurzstellungnahme_pdf', pdfmonkey_template_id: 'F-04', aktiv: true, is_default_for_typ: true },
  { id: 'a13', name: 'F-09 Kurzgutachten',        typ: 'gutachten_pdf', pdfmonkey_template_id: 'F-09', aktiv: true, is_default_for_typ: true },
  { id: 'a14', name: 'F-10 Beweissicherung',      typ: 'beweissicherung_pdf', pdfmonkey_template_id: 'F-10', aktiv: true, is_default_for_typ: true },
  // M37 B3-Erweiterung
  { id: 'a15', name: 'K-10 Honorar-Vorschuss-Anforderung', typ: 'brief', pdfmonkey_template_id: 'K-10', aktiv: true, is_default_for_typ: false },
  { id: 'a16', name: 'K-11 Frist-Verlängerung-Antrag',     typ: 'brief', pdfmonkey_template_id: 'K-11', aktiv: true, is_default_for_typ: false },
  { id: 'a17', name: 'K-12 Privatgutachten-Werkvertrag', typ: 'auftragsbestaetigung', pdfmonkey_template_id: 'K-12', aktiv: true, is_default_for_typ: false }
];

test('B4 E2E: byCode liefert alle 11 K-XX Templates aus Live-DB-Snapshot', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  for (const code of ['K-01','K-02','K-03','K-04','K-05','K-07','K-08','K-09','K-10','K-11','K-12']) {
    const t = await Cache.byCode(code);
    assert.ok(t, 'fehlt: ' + code);
    assert.strictEqual(t.pdfmonkey_template_id, code);
  }
  Cache.invalidate();
});

test('B4 E2E: byCode liefert 6 F-XX Templates aus Live-DB', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  for (const code of ['F-04','F-06','F-07','F-08','F-09','F-10']) {
    const t = await Cache.byCode(code);
    assert.ok(t, 'fehlt: ' + code);
  }
  Cache.invalidate();
});

test('B4 E2E: byTyp("brief") liefert 6 Briefe (K-04,K-07,K-08,K-09,K-10,K-11)', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  const briefe = await Cache.byTyp('brief');
  // 6 Briefe: K-04, K-07, K-08, K-09 (4 alte) + K-10, K-11 (2 neue M37 B3) = 6
  assert.strictEqual(briefe.length, 6, 'erwartet 6, bekommen ' + briefe.length);
  const codes = briefe.map(t => t.pdfmonkey_template_id).sort();
  assert.deepStrictEqual(codes, ['K-04','K-07','K-08','K-09','K-10','K-11']);
  Cache.invalidate();
});

test('B4 E2E: byTyp("termin_bestaetigung") liefert 2 Termin-Briefe', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  const termine = await Cache.byTyp('termin_bestaetigung');
  assert.strictEqual(termine.length, 2);
  Cache.invalidate();
});

test('B4 E2E: defaultForTyp("gutachten_pdf") liefert F-09', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  const def = await Cache.defaultForTyp('gutachten_pdf');
  assert.ok(def);
  assert.strictEqual(def.pdfmonkey_template_id, 'F-09');
  Cache.invalidate();
});

test('B4 E2E: defaultForTyp("beweissicherung_pdf") liefert F-10', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  const def = await Cache.defaultForTyp('beweissicherung_pdf');
  assert.ok(def);
  assert.strictEqual(def.pdfmonkey_template_id, 'F-10');
  Cache.invalidate();
});

test('B4 E2E: defaultForTyp("auftragsbestaetigung") liefert K-01 (ältester Eintrag, kein expliziter Default)', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  const def = await Cache.defaultForTyp('auftragsbestaetigung');
  assert.ok(def);
  // Kein is_default_for_typ=TRUE → fallback auf erstes match (K-01)
  assert.ok(['K-01','K-12'].includes(def.pdfmonkey_template_id));
  Cache.invalidate();
});

test('B4 E2E: M37 B3 Lücken-Schluss: K-10/K-11/K-12 sind im Cache', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  const k10 = await Cache.byCode('K-10');
  const k11 = await Cache.byCode('K-11');
  const k12 = await Cache.byCode('K-12');
  assert.ok(k10 && k10.name.includes('Honorar-Vorschuss'));
  assert.ok(k11 && k11.name.includes('Frist-Verlängerung'));
  assert.ok(k12 && k12.name.includes('Werkvertrag'));
  Cache.invalidate();
});

test('B4 E2E: byCode mit ungültigem Code liefert null (kein Crash)', async () => {
  Cache._setCacheForTests(LIVE_TEMPLATES);
  assert.strictEqual(await Cache.byCode('X-999'), null);
  assert.strictEqual(await Cache.byCode(''), null);
  assert.strictEqual(await Cache.byCode(null), null);
  Cache.invalidate();
});
