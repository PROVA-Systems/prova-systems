'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test Schema-konforme Lambdas + Frontend nach W12-Reconciliation.

test('eintraege-list: ENUM typ hat 4 Werte (diktat|text|foto|mix)', () => {
  const { __EINTRAG_TYP } = require('../../netlify/functions/eintraege-list');
  assert.deepStrictEqual(__EINTRAG_TYP.sort(), ['diktat', 'foto', 'mix', 'text']);
});

test('eintraege-list: SELECT verwendet auftrag_id (NICHT schadensfall_id)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-list.js'), 'utf8');
  assert.match(src, /eq\(['"]auftrag_id['"]/);
  assert.ok(!/eq\(['"]schadensfall_id['"]/.test(src.replace(/Backwards-Compat[\s\S]*?schadensfall_id/, 'OK')), 'Code body sollte nur Backwards-Compat-Erwähnung haben');
});

test('eintraege-list: titel + content (NICHT beschreibung_text)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-list.js'), 'utf8');
  assert.match(src, /titel/);
  assert.match(src, /content/);
});

test('eintraege-create: ENUM typ Validation', () => {
  const { __EINTRAG_TYP } = require('../../netlify/functions/eintraege-create');
  assert.deepStrictEqual(__EINTRAG_TYP.sort(), ['diktat', 'foto', 'mix', 'text']);
});

test('eintraege-create: PII-Detection findet Email', () => {
  const { __detectPiiCandidates } = require('../../netlify/functions/eintraege-create');
  assert.strictEqual(__detectPiiCandidates('Kontakt: hans.muster@example.com'), true);
});

test('eintraege-create: PII-Detection findet IBAN', () => {
  const { __detectPiiCandidates } = require('../../netlify/functions/eintraege-create');
  assert.strictEqual(__detectPiiCandidates('IBAN DE89370400440532013000 für Überweisung'), true);
});

test('eintraege-create: PII-Detection findet Telefon', () => {
  const { __detectPiiCandidates } = require('../../netlify/functions/eintraege-create');
  assert.strictEqual(__detectPiiCandidates('Telefon +49 30 12345678 erreichbar'), true);
});

test('eintraege-create: PII-Detection findet "Herr <Name>"', () => {
  const { __detectPiiCandidates } = require('../../netlify/functions/eintraege-create');
  assert.strictEqual(__detectPiiCandidates('Herr Müller berichtete'), true);
  assert.strictEqual(__detectPiiCandidates('Frau Schmidt bestätigte'), true);
});

test('eintraege-create: PII-Detection NICHT triggered bei harmlosem Text', () => {
  const { __detectPiiCandidates } = require('../../netlify/functions/eintraege-create');
  assert.strictEqual(__detectPiiCandidates('Ortstermin durchgeführt, Mängel dokumentiert'), false);
});

test('eintraege-create: Backwards-Compat schadensfall_id → auftrag_id', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-create.js'), 'utf8');
  assert.match(src, /body\.schadensfall_id/);
  assert.match(src, /body\.auftrag_id/);
});

test('eintraege-create: pseudonymisiert + konjunktiv_check_passed Flags gesetzt', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-create.js'), 'utf8');
  assert.match(src, /pseudonymisiert:/);
  assert.match(src, /konjunktiv_check_passed:/);
});

test('eintraege-create: created_by_user_id (NICHT erstellt_von)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-create.js'), 'utf8');
  assert.match(src, /created_by_user_id:/);
  assert.ok(!/erstellt_von:/.test(src), 'erstellt_von darf nicht im Code-Body stehen');
});

test('eintraege-update: ALLOWED enthält titel + content + dauer_min + abrechenbar', () => {
  const { __ALLOWED } = require('../../netlify/functions/eintraege-update');
  ['titel', 'content', 'dauer_min', 'abrechenbar', 'typ', 'datum'].forEach(f =>
    assert.ok(__ALLOWED.indexOf(f) >= 0, `${f} muss in ALLOWED sein`));
});

test('eintraege-update: KEIN beschreibung_text in ALLOWED', () => {
  const { __ALLOWED } = require('../../netlify/functions/eintraege-update');
  assert.ok(__ALLOWED.indexOf('beschreibung_text') < 0);
});

test('eintraege-jveg-export: nutzt auftrag_id + az (NICHT aktenzeichen)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-jveg-export.js'), 'utf8');
  assert.match(src, /eq\(['"]auftrag_id['"]/);
  assert.match(src, /select\(['"]az['"]\)/);
  assert.ok(!/select\(['"]aktenzeichen['"]\)/.test(src));
});

test('eintraege-jveg-export: deNum-Helper für DE-Decimal', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-jveg-export.js'), 'utf8');
  assert.match(src, /function deNum/);
  assert.match(src, /deNum\(r\.stunden\)/);
});

test('eintraege-jveg-export: titel + content statt beschreibung_text', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'eintraege-jveg-export.js'), 'utf8');
  assert.match(src, /e\.titel/);
  assert.match(src, /e\.content/);
});

test('eintraege.html: 4-ENUM Dropdown (diktat|text|foto|mix)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'eintraege.html'), 'utf8');
  ['diktat', 'text', 'foto', 'mix'].forEach(t =>
    assert.match(html, new RegExp(`value="${t}"`)));
  // Alte Werte raus
  ['ortstermin', 'telefonat', 'recherche', 'gutachten-arbeit'].forEach(t =>
    assert.ok(!new RegExp(`value="${t}"`).test(html), `value="${t}" sollte raus aus eintraege.html`));
});

test('eintraege.html: m-auftrag_id Modal-Field (NICHT m-schadensfall_id)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'eintraege.html'), 'utf8');
  assert.match(html, /id="m-auftrag_id"/);
  assert.ok(!/id="m-schadensfall_id"/.test(html));
});

test('eintraege.html: m-titel + m-content (NICHT m-beschreibung_text)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'eintraege.html'), 'utf8');
  assert.match(html, /id="m-titel"/);
  assert.match(html, /id="m-content"/);
  assert.ok(!/id="m-beschreibung_text"/.test(html));
});

test('eintraege.html: Pseudonymisiert-Badge Logic', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'eintraege.html'), 'utf8');
  assert.match(html, /e\.pseudonymisiert/);
  assert.match(html, /konjunktiv_check_passed/);
});
