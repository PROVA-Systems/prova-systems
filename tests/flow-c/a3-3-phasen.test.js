'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const tplPath = path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '05-beratung', 'B-01-BERATUNGSBERICHT.liquid.template.html');
const sourcesPath = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-32-A3-BERATUNG-SOURCES.md');
const Wizard = require('../../lib/wizard-live-save');

test('A3: Beratungs-Bericht-Template existiert', () => {
  assert.ok(fs.existsSync(tplPath));
});

test('A3: Template hat 3 Phasen-Sektionen', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  ['Phase 1 — Auftrag', 'Phase 2 — Vor-Ort', 'Phase 3 — Beratungs-Empfehlungen'].forEach(s =>
    assert.match(tpl, new RegExp(s)));
});

test('A3: Template hat 8+ Liquid-Variables', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  ['kunde_name', 'kunde_adresse', 'aktenzeichen', 'beratungs_datum', 'sv_name',
   'phase_1_auftrag', 'phase_2_termin_datum', 'phase_2_beobachtungen', 'phase_3_empfehlungen']
    .forEach(v => assert.match(tpl, new RegExp('\\{\\{\\s*' + v + '\\s*\\}\\}')));
});

test('A3: Template betont FORMLOS-Charakter (kein Gutachten)', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  assert.match(tpl, /FORMLOS|formlose|formloser/);
  assert.match(tpl, /KEIN Gutachten|KEIN gerichtsfestes Gutachten/);
});

test('A3: Template zitiert SVO § 18 (Beratungs-Rechtsgrundlage)', () => {
  const tpl = fs.readFileSync(tplPath, 'utf8');
  assert.match(tpl, /SVO § 18/);
});

test('A3: Wizard-SKIP-MAP für beratung skipt §4-§6 (kein Fachurteil)', () => {
  assert.deepStrictEqual(Wizard.getSkippedSteps('beratung'), [4, 5, 6]);
});

test('A3: Recherche-Sources ≥10 URLs', () => {
  const src = fs.readFileSync(sourcesPath, 'utf8');
  const urlCount = (src.match(/https?:\/\//g) || []).length;
  assert.ok(urlCount >= 10);
});

test('A3: Sources erwähnen SVO + BVS + IfS', () => {
  const src = fs.readFileSync(sourcesPath, 'utf8');
  assert.match(src, /SVO/);
  assert.match(src, /BVS/);
  assert.match(src, /IfS/);
});
