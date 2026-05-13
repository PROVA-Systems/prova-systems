'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/ki-diktat-strukturierung');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'ki-diktat-strukturierung.js'), 'utf8');
const masterSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'KI-PROMPTS-MASTER.md'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'fachurteil.html'), 'utf8');
const libSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'diktat-struktur.js'), 'utf8');

test('D1: Lambda-File existiert + Action diktat_strukturierung exposed', () => {
  assert.strictEqual(Lambda.__ACTION, 'diktat_strukturierung');
});

test('D1: Action in MODELS_MAP von ai-router.js (gpt-5.4-mini)', () => {
  const Router = require('../../netlify/functions/lib/ai-router');
  assert.strictEqual(Router.MODEL_MAP.diktat_strukturierung, 'gpt-5.4-mini');
});

test('D1: KI-PROMPTS-MASTER.md dokumentiert diktat_strukturierung', () => {
  assert.match(masterSrc, /diktat_strukturierung/);
  assert.match(masterSrc, /Diktat-Strukturierung/i);
});

test('D1: System-Prompt mit §1-§5 Schema-Anweisung', () => {
  ['§1 Anlass', '§2 Sachverhalt', '§3 Anknüpfungstatsachen', '§4 Befunde', '§5 Beweisfragen'].forEach(p =>
    assert.match(Lambda.__SYSTEM_PROMPT, new RegExp(p)));
});

test('D1: Pseudonymisierungs-Check vor Call (Regel 17)', () => {
  const ok = Lambda.__pseudonymisierungOk('Pseudonymisiert ohne PII');
  const fail = Lambda.__pseudonymisierungOk('Email kontakt@example.com im Diktat');
  assert.strictEqual(ok, true);
  assert.strictEqual(fail, false);
});

test('D1: ki-cost-tracker.start/finish-Calls vorhanden', () => {
  assert.match(lambdaSrc, /Tracker\.start/);
  assert.match(lambdaSrc, /Tracker\.finish/);
});

test('D1: response_format json_object für strukturierten Output', () => {
  assert.match(lambdaSrc, /response_format:\s*\{\s*type:\s*['"]json_object['"]/);
});

test('D1: Stellungnahme.html Button btn-diktat-strukturieren', () => {
  assert.match(html, /id="btn-diktat-strukturieren"/);
  assert.match(html, /Diktat strukturieren/);
});

test('D1: lib/diktat-struktur.js fillBefunde-Function', () => {
  assert.match(libSrc, /fillBefunde/);
  ['befunde-auftrag', 'befunde-sachverhalt', 'befunde-anknuepfung', 'befunde-befunde', 'befunde-fragen'].forEach(id =>
    assert.match(libSrc, new RegExp(id)));
});

test('D1: lib eingebunden via script-tag', () => {
  assert.match(html, /\/lib\/diktat-struktur\.js/);
});
