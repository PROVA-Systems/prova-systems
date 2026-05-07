'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'freigabe.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', '..', 'freigabe-logic.js'), 'utf8');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'audit-trail-write.js'), 'utf8');

test('B1: 3. Häkchen Stamm-/Auftragsdaten in freigabe.html', () => {
  assert.match(html, /id="check-stamm"/);
  assert.match(html, /id="cbstamm"/);
  assert.match(html, /Stamm- und Auftragsdaten korrekt/);
});

test('B1: toggle407a prüft alle 3 Checkboxes (cb407a + cb5pruef + cbstamm)', () => {
  assert.match(js, /cb407\s*&&\s*cb5\s*&&\s*cbStamm/);
  assert.match(js, /cb407\.checked\s*&&\s*cb5\.checked\s*&&\s*cbStamm\.checked/);
});

test('B1: _checks state mit 3 Keys', () => {
  assert.match(js, /_checks\s*=\s*\{\s*['"]407a['"]:\s*false,\s*['"]5pruef['"]:\s*false,\s*['"]stamm['"]:\s*false/);
});

test('B1: logComplianceBestaetigung-Function existiert', () => {
  assert.match(js, /async function logComplianceBestaetigung/);
  assert.match(js, /audit-trail-write/);
});

test('B1: payload enthält 3 Häkchen-Timestamps', () => {
  assert.match(js, /ts_407a/);
  assert.match(js, /ts_5pruef/);
  assert.match(js, /ts_stamm/);
});

test('B1: approveGutachten ruft logComplianceBestaetigung auf', () => {
  // Vor dem Toast/Workflow muss audit_trail-Insert stehen
  const idx = js.indexOf('async function approveGutachten');
  const slice = js.slice(idx, idx + 1000);
  assert.match(slice, /logComplianceBestaetigung/);
});

test('B1: Lambda audit-trail-write nutzt VALID_ACTIONS ENUM', () => {
  const { __VALID_ACTIONS } = require('../../netlify/functions/audit-trail-write');
  assert.ok(__VALID_ACTIONS.includes('create'));
  assert.ok(__VALID_ACTIONS.includes('data_export_dsgvo'));
  assert.strictEqual(__VALID_ACTIONS.length, 18);
});

test('B1: Lambda Defensive-Pattern (DB-Error → 200, nicht 5xx)', () => {
  // Code muss try/catch + 200 bei DB-Fehler haben
  assert.match(lambdaSrc, /logged:\s*false/);
  assert.match(lambdaSrc, /200/);
  // Keine 500 für DB-Errors (außer für client-Errors wie Invalid JSON)
});

test('B1: Lambda erfasst IP + User-Agent für Audit-Compliance', () => {
  assert.match(lambdaSrc, /ip_address/);
  assert.match(lambdaSrc, /user_agent/);
  assert.match(lambdaSrc, /x-forwarded-for/);
});

test('B1: Lambda RLS-konformer Workspace-Resolve', () => {
  assert.match(lambdaSrc, /workspace_memberships/);
  assert.match(lambdaSrc, /is_active/);
});

test('B1: Hinweis-Text aktualisiert auf "alle drei Bestätigungen"', () => {
  assert.match(html, /Alle drei Bestätigungen/);
  assert.match(html, /audit_trail/);
});
