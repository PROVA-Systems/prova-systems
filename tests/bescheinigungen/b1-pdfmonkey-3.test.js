'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '02-bestaetigungen');
const sources = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-32-B-BESCHEINIGUNGEN-SOURCES.md'), 'utf8');

['B-04-MAENGELFREIHEIT', 'B-05-ZUSTANDSBESCHEINIGUNG', 'B-06-BEWEISSICHERUNGSBESTAETIGUNG'].forEach(name => {
  test('B1: ' + name + ' Template existiert', () => {
    assert.ok(fs.existsSync(path.join(dir, name + '.liquid.template.html')));
  });

  test('B1: ' + name + ' hat ö.b.u.v. SV-Markup', () => {
    const tpl = fs.readFileSync(path.join(dir, name + '.liquid.template.html'), 'utf8');
    assert.match(tpl, /öffentlich bestellt|öbuv|ö\.b\.u\.v\./);
  });

  test('B1: ' + name + ' zitiert Rechtsgrundlage (.law-Span)', () => {
    const tpl = fs.readFileSync(path.join(dir, name + '.liquid.template.html'), 'utf8');
    assert.match(tpl, /class="law"/);
  });
});

test('B1: B-04 zitiert VOB/B § 12 + DIN 18202', () => {
  const tpl = fs.readFileSync(path.join(dir, 'B-04-MAENGELFREIHEIT.liquid.template.html'), 'utf8');
  assert.match(tpl, /VOB\/B § 12/);
  assert.match(tpl, /DIN 18202/);
});

test('B1: B-05 hat bauteile-Tabelle mit forloop', () => {
  const tpl = fs.readFileSync(path.join(dir, 'B-05-ZUSTANDSBESCHEINIGUNG.liquid.template.html'), 'utf8');
  assert.match(tpl, /\{% for b in bauteile %\}/);
});

test('B1: B-06 zitiert § 411a ZPO + § 485 ZPO', () => {
  const tpl = fs.readFileSync(path.join(dir, 'B-06-BEWEISSICHERUNGSBESTAETIGUNG.liquid.template.html'), 'utf8');
  assert.match(tpl, /§ 411a ZPO/);
  assert.match(tpl, /§ 485 ZPO/);
});

test('B1: Recherche-Sources ≥10 URLs', () => {
  const urlCount = (sources.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10);
});

test('B1: Sources listet 7 Bescheinigungs-Arten', () => {
  ['SV-Bestätigung', 'Auftragsannahme', 'Termin-Bestätigung', 'Mängelfreiheit', 'Zustand', 'Beweissicherung', 'SV-Anerkennung']
    .forEach(art => assert.match(sources, new RegExp(art)));
});
