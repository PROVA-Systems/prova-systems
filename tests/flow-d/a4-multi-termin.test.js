'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const begehungPath = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '05-beratung', 'B-02-BEGEHUNGSPROTOKOLL.liquid.template.html');
const schlussPath = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '05-beratung', 'B-03-SCHLUSSBERICHT-BAUBEGLEITUNG.liquid.template.html');
const sourcesPath = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-32-A4-BAUBEGLEITUNG-SOURCES.md');

test('A4: B-02 Begehungs-Protokoll-Template existiert', () => {
  assert.ok(fs.existsSync(begehungPath));
});

test('A4: B-03 Schluss-Bericht-Template existiert', () => {
  assert.ok(fs.existsSync(schlussPath));
});

test('A4: B-02 zitiert DIN 18205 + VOB/B § 4', () => {
  const tpl = fs.readFileSync(begehungPath, 'utf8');
  assert.match(tpl, /DIN 18205/);
  assert.match(tpl, /VOB\/B § 4/);
});

test('A4: B-02 hat Mängel-Tabelle mit forloop', () => {
  const tpl = fs.readFileSync(begehungPath, 'utf8');
  assert.match(tpl, /\{% for m in maengel %\}/);
  assert.match(tpl, /forloop\.index/);
});

test('A4: B-03 zitiert VOB/B § 12 + HOAI § 51', () => {
  const tpl = fs.readFileSync(schlussPath, 'utf8');
  assert.match(tpl, /VOB\/B § 12/);
  assert.match(tpl, /HOAI § 51/);
});

test('A4: B-03 aggregiert bau_phasen + maengel_chronologie', () => {
  const tpl = fs.readFileSync(schlussPath, 'utf8');
  assert.match(tpl, /\{% for phase in bau_phasen %\}/);
  assert.match(tpl, /maengel_chronologie/);
});

test('A4: B-03 referenziert BGB § 638 (Mängelansprüche-Verjährung 5J)', () => {
  const tpl = fs.readFileSync(schlussPath, 'utf8');
  assert.match(tpl, /VOB\/B § 13|§ 638|5 Jahre Bauwerk/);
});

test('A4: Recherche-Sources ≥10 URLs', () => {
  const src = fs.readFileSync(sourcesPath, 'utf8');
  const urlCount = (src.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10);
});
