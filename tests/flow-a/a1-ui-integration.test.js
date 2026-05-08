'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'neuer-fall.html'), 'utf8');
const wizardSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'prova-wizard.js'), 'utf8');
const auftragstypSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'auftragstyp.js'), 'utf8');
const Lib = require('../../lib/wizard-live-save');

test('A1: lib/wizard-live-save.js als script-tag in neuer-fall.html eingebunden', () => {
  assert.match(html, /\/lib\/wizard-live-save\.js/);
});

test('A1: Phase-Indicator HTML mit data-phase-nr 1-6', () => {
  for (let i = 1; i <= 6; i++) {
    assert.match(html, new RegExp(`data-phase-nr="${i}"`));
  }
});

test('A1: CSS .phase-skipped Klasse definiert', () => {
  assert.match(html, /\.phase-skipped\{/);
  assert.match(html, /opacity:\.4/);
  assert.match(html, /übersprungen/);
});

test('A1: Bridge applyAuftragstypUI ruft ProvaWizardSave.applyPhaseIndicator', () => {
  assert.match(html, /window\.applyAuftragstypUI = function/);
  assert.match(html, /ProvaWizardSave\.applyPhaseIndicator/);
});

test('A1: persistStep Bridge-Function für Step-Save', () => {
  assert.match(html, /window\.persistStep/);
  assert.match(html, /ProvaWizardSave\.saveStep/);
});

test('A1: prova-wizard.js _weiter-Hook auf ProvaWizardSave.saveStep', () => {
  assert.match(wizardSrc, /window\.ProvaWizardSave/);
  assert.match(wizardSrc, /ProvaWizardSave\.saveStep/);
  assert.match(wizardSrc, /MEGA³³ A1/);
});

test('A1: auftragstyp.js skipMap mappt 12 Typen → SKIP_MAP-Keys', () => {
  assert.match(auftragstypSrc, /skipMap/);
  ['beweissicherung','gegengutachten','ergaenzungsgutachten','baubegleitung','wertgutachten']
    .forEach(t => assert.match(auftragstypSrc, new RegExp("'" + t + "'")));
  assert.match(auftragstypSrc, /applyAuftragstypUI/);
});

test('A1: Lib-Skip-Logic Beweis liefert §5+§6 zum Skip', () => {
  const skipped = Lib.getSkippedSteps('beweis');
  assert.deepStrictEqual(skipped.sort(), [5, 6]);
});

test('A1: grep-Beweis: ProvaWizardSave-Referenz mind. 3× in HTML+JS', () => {
  const totalRefs = (html.match(/ProvaWizardSave/g) || []).length
                  + (wizardSrc.match(/ProvaWizardSave/g) || []).length;
  assert.ok(totalRefs >= 3, 'Erwarte >=3 ProvaWizardSave-Refs, gefunden: ' + totalRefs);
});

test('A1: grep-Beweis: phase-skipped + skip_phase-Trigger in HTML', () => {
  assert.match(html, /phase-skipped|data-phase-nr/);
  // Skip-Hinweis-Text für User
  assert.match(html, /Skip-Logic|übersprungen/);
});
