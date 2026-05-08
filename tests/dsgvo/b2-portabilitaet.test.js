'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'dsgvo-portabilitaet.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'dsgvo-mein-konto.html'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase', 'migrations', '2026_05_07_mega30_b2_dsgvo_portabilitaet.sql'), 'utf8');

test('B2: Migration enthält dsgvo_user_portabilitaet Function', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.dsgvo_user_portabilitaet/);
  assert.match(migration, /SECURITY DEFINER/);
});

test('B2: Migration berechtigungs-check eigene-Daten-oder-Admin', () => {
  assert.match(migration, /v_caller IS DISTINCT FROM p_user_id AND NOT v_is_admin/);
  assert.match(migration, /Forbidden/);
});

test('B2: Migration exportiert 6 Tabellen-Bereiche', () => {
  ['profile', 'workspaces', 'auftraege', 'kontakte', 'eintraege', 'einwilligungen'].forEach(t =>
    assert.match(migration, new RegExp("'" + t + "'")));
});

test('B2: Migration export_meta dokumentiert DSGVO Art. 20', () => {
  assert.match(migration, /Art\. 20 Datenportabilität/);
  assert.match(migration, /format_version/);
});

test('B2: Lambda ruft RPC dsgvo_user_portabilitaet', () => {
  assert.match(lambdaSrc, /rpc\(['"]dsgvo_user_portabilitaet['"]/);
  assert.match(lambdaSrc, /p_user_id:\s*context\.userId/);
});

test('B2: Lambda Forbidden-Behandlung 403 statt 500', () => {
  assert.match(lambdaSrc, /code\s*===?\s*['"]42501['"]/);
  assert.match(lambdaSrc, /403/);
});

test('B2: Lambda audit-trail-Insert action=data_export_dsgvo', () => {
  assert.match(lambdaSrc, /data_export_dsgvo/);
  assert.match(lambdaSrc, /audit_trail/);
});

test('B2: Lambda Rate-Limit 5/h (DSGVO-Export ist seltene Operation)', () => {
  assert.match(lambdaSrc, /5,\s*3600/);
});

test('B2: Lambda Content-Disposition mit Datum-Filename', () => {
  assert.match(lambdaSrc, /Content-Disposition[\s\S]*attachment[\s\S]*filename/);
});

test('B2: dsgvo-mein-konto.html zeigt 3 DSGVO-Aktionen', () => {
  assert.match(html, /Daten herunterladen.*PDF/i);
  assert.match(html, /JSON.*maschinenlesbar/i);
  assert.match(html, /Konto löschen/);
});

test('B2: HTML zeigt Art. 15 + Art. 17 + Art. 20 Verweise', () => {
  assert.match(html, /Art\. 15/);
  assert.match(html, /Art\. 17/);
  assert.match(html, /Art\. 20/);
});

test('B2: HTML 7-Tage-Cool-Off bei Löschung', () => {
  assert.match(html, /7-Tage-Cool-Off|7 Tage Cool-Off/i);
});

test('B2: HTML exportPortabilitaet-Function ruft Lambda', () => {
  assert.match(html, /\/\.netlify\/functions\/dsgvo-portabilitaet/);
});

test('B2: HTML Auth-Guard check (token + email + redirect)', () => {
  assert.match(html, /prova_auth_token/);
  assert.match(html, /prova_sv_email/);
});
