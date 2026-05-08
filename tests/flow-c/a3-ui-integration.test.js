'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'beratung.html'), 'utf8');
const logicSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'beratung-logic.js'), 'utf8');
const tplExists = fs.existsSync(path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '05-beratung', 'B-01-BERATUNGSBERICHT.liquid.template.html'));

test('A3: 3 Phasen-Cards mit data-phase-step="1|2|3"', () => {
  for (let i = 1; i <= 3; i++) {
    assert.match(html, new RegExp(`data-phase-step="${i}"`));
  }
});

test('A3: phase-step|beratung-phase Selector >= 3 Treffer', () => {
  const total = (html.match(/phase-step|beratung-phase/g) || []).length;
  assert.ok(total >= 3, 'Erwarte >=3 phase-step/beratung-phase-Refs, gefunden: ' + total);
});

test('A3: setBeratungPhase Function in beratung-logic.js', () => {
  assert.match(logicSrc, /window\.setBeratungPhase = function/);
  assert.match(logicSrc, /\.classList\.toggle\(['"]phase-active['"]/);
});

test('A3: Phase 1 → Bestätigungs-Brief-Generator', () => {
  assert.match(html, /id="btn-bestaetigung-brief"/);
  assert.match(html, /onclick="generateBestaetigungsBrief\(\)"/);
  assert.match(logicSrc, /window\.generateBestaetigungsBrief = function/);
});

test('A3: Phase 3 → Beratungs-Bericht-Generator (B-01 Template)', () => {
  assert.match(html, /id="btn-beratungs-bericht"/);
  assert.match(html, /onclick="generateBeratungsBericht\(\)"/);
  assert.match(logicSrc, /window\.generateBeratungsBericht = function/);
});

test('A3: B-01-BERATUNGSBERICHT Template-Reference in beratung-logic.js', () => {
  assert.match(logicSrc, /B-01-BERATUNGSBERICHT/);
  assert.match(logicSrc, /bescheinigung-generate/);
});

test('A3: Template-File existiert (docs/templates-goldstandard/05-beratung)', () => {
  assert.ok(tplExists, 'B-01-BERATUNGSBERICHT.liquid.template.html sollte existieren');
});

test('A3: KEIN §6 Fachurteil-Editor (Beratung != Gutachten)', () => {
  // Beratung darf KEINEN Fachurteil-Editor referenzieren
  assert.doesNotMatch(html, /§6.*Fachurteil-Editor|Fachurteil-Editor.*§6/);
  assert.doesNotMatch(html, /id="paragraph-6"|class="paragraph-6"/);
});

test('A3: Phase-Action-Bar mit data-phase-action 1+3', () => {
  assert.match(html, /data-phase-action="1"/);
  assert.match(html, /data-phase-action="3"/);
});

test('A3: persistStep-Hook (wizard-live-save bridge)', () => {
  assert.match(logicSrc, /window\.persistStep|wizard-live-save/);
  assert.match(logicSrc, /sessionStorage\.setItem\(['"]prova_beratung_phase/);
});
