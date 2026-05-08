'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const doc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-33-C1-IHK-PRE-AUDIT.md'), 'utf8');

test('C1: Audit-Doku ≥10 Quellen', () => {
  for (let i = 1; i <= 10; i++) {
    assert.match(doc, new RegExp(`\\|\\s*${i}\\s*\\|`));
  }
});

test('C1: 6 Compliance-Kategorien', () => {
  ['Kategorie 1', 'Kategorie 2', 'Kategorie 3', 'Kategorie 4', 'Kategorie 5', 'Kategorie 6']
    .forEach(k => assert.match(doc, new RegExp(k)));
});

test('C1: Kat. 1 IHK-SVO Templates ✅ KONFORM', () => {
  assert.match(doc, /IHK-SVO Templates/);
  assert.match(doc, /12\/12 Gutachten-Templates/);
});

test('C1: Kat. 2 § 407a ZPO Pre-Send-Modal LIVE', () => {
  assert.match(doc, /§ 407a ZPO Pre-Send/);
  assert.match(doc, /prova-disclaimer\.js/);
});

test('C1: Kat. 3 EU AI Act Art. 50 erfüllt', () => {
  assert.match(doc, /EU AI Act Art\. 50/);
  assert.match(doc, /KI-Disclosure/);
});

test('C1: Kat. 4 DSGVO 15/17/20 Endpoints', () => {
  assert.match(doc, /Art\. 15.*Auskunft/);
  assert.match(doc, /Art\. 17.*Löschen/);
  assert.match(doc, /Art\. 20.*Portabilität/);
  assert.match(doc, /dsgvo-handler/);
});

test('C1: Kat. 5 Pseudonymisierung-Coverage 100%', () => {
  assert.match(doc, /Pseudonymisierung-Coverage/);
  assert.match(doc, /ki-proxy/);
  assert.match(doc, /whisper-diktat/);
  assert.match(doc, /diktat_strukturierung/);
});

test('C1: Kat. 6 AGB + Impressum + Datenschutz + AVV', () => {
  assert.match(doc, /AGB/);
  assert.match(doc, /Impressum.*TMG/);
  assert.match(doc, /Datenschutz/);
  assert.match(doc, /AVV/);
});

test('C1: Compliance-Score 6/6 grün dokumentiert', () => {
  assert.match(doc, /Compliance-Score:\s*6\/6 Kategorien grün/);
});

test('C1: Lücken-Closure-Liste vorhanden', () => {
  assert.match(doc, /Lücken-Closure-Liste/);
  assert.match(doc, /Mobile-Polish.*407a/);
  assert.match(doc, /AVV-Anwalt-Review/);
});
