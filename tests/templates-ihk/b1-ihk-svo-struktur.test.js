'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '04-gutachten');
const SOURCES_DOC = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-33-B1-IHK-SVO-STRUKTUR-SOURCES.md');

const TRANCHE_1 = [
  'F-09-KURZGUTACHTEN.liquid.template.html',
  'F-10-BEWEISSICHERUNG.liquid.template.html',
  'F-11-BRANDSCHADEN.liquid.template.html',
  'F-12-FEUCHTE-SCHIMMEL.liquid.template.html',
  'F-13-ELEMENTARSCHADEN.liquid.template.html',
  'F-14-BAUMAENGEL.liquid.template.html',
  'F-15-GERICHTSGUTACHTEN.liquid.template.html'
];

function readTpl(name) { return fs.readFileSync(path.join(ROOT, name), 'utf8'); }

// Pro Template 2 Tests = 14 Tests gesamt
TRANCHE_1.forEach(name => {
  test(`B1: ${name} hat IHK-SVO Teil 1+2+3+4 Header`, () => {
    const src = readTpl(name);
    ['Teil 1', 'Teil 2', 'Teil 3', 'Teil 4'].forEach(t => {
      assert.ok(src.includes(t), `${name} fehlt: ${t}`);
    });
    // KEIN §1-§6-Struktur (alter Aufbau, sollte migriert sein)
    assert.doesNotMatch(src, /<h2>§[1-6]\s|<h3>§[1-6]\s/);
  });

  test(`B1: ${name} hat 3.4 Fachurteil-Marker (SV-eigenhändig)`, () => {
    const src = readTpl(name);
    assert.match(src, /3\.4|Fachurteil/);
    // KI-Frei-Hinweis muss vorhanden sein
    assert.match(src, /KI-frei|Sachverständigen.*persönlich|persönlich.*Sachverständigen|Eigenleistungs/i);
  });
});

test('B1: Audit-Doku MEGA-33-B1-IHK-SVO-STRUKTUR-SOURCES.md mit ≥10 Quellen', () => {
  const doc = fs.readFileSync(SOURCES_DOC, 'utf8');
  // Tabelle mit Quellen 1-12 (mind. 10)
  for (let i = 1; i <= 10; i++) {
    assert.match(doc, new RegExp(`\\|\\s*${i}\\s*\\|`));
  }
  assert.match(doc, /IHK-SVO/);
  assert.match(doc, /§ 407a ZPO/);
  assert.match(doc, /EU AI Act Art\. 50/);
});

test('B1: Audit-Doku listet alle 7 Tranche-1-Templates', () => {
  const doc = fs.readFileSync(SOURCES_DOC, 'utf8');
  TRANCHE_1.forEach(name => {
    const short = name.replace('.liquid.template.html', '');
    assert.match(doc, new RegExp(short));
  });
});
