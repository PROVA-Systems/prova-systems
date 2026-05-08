'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const toml = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify.toml'), 'utf8');
const auditDoc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-31-C1-APP-LANDING-SPLIT.md'), 'utf8');

test('C1: Audit-Doku-File existiert', () => {
  assert.ok(auditDoc.length > 1000);
});

test('C1: Audit-Doku enthält 3 Subdomains', () => {
  ['prova-systems\\.de', 'app\\.prova-systems\\.de', 'admin\\.prova-systems\\.de'].forEach(s =>
    assert.match(auditDoc, new RegExp(s)));
});

test('C1: Host-Conditions für /dashboard auf prova-systems.de', () => {
  assert.match(toml, /https:\/\/prova-systems\.de\/dashboard\*/);
  assert.match(toml, /https:\/\/app\.prova-systems\.de\/dashboard:splat/);
});

test('C1: Host-Conditions für /admin auf admin.prova-systems.de (NEU)', () => {
  assert.match(toml, /https:\/\/prova-systems\.de\/admin\*[\s\S]{0,200}admin\.prova-systems\.de\/admin:splat/);
});

test('C1: Host-Conditions für www-Variante (Doppelte Redirect-Regeln)', () => {
  assert.match(toml, /https:\/\/www\.prova-systems\.de\/dashboard/);
  assert.match(toml, /https:\/\/www\.prova-systems\.de\/admin/);
});

test('C1: APP-LANDING-SPLIT v6.0 Header dokumentiert', () => {
  assert.match(toml, /APP-LANDING-SPLIT|Phase 3/);
});

test('C1: Audit-Doku enthält Cookie-Cross-Domain-Status', () => {
  assert.match(auditDoc, /Cookie-Cross-Domain|localStorage[\s\S]{0,100}prova_auth_token/);
});

test('C1: Audit-Doku 4 Hardening-Empfehlungen', () => {
  ['Empfehlung 1', 'Empfehlung 2', 'Empfehlung 3', 'Empfehlung 4'].forEach(s =>
    assert.match(auditDoc, new RegExp(s)));
});

test('C1: netlify.toml top-down: Auth-Block A vor App-Block B', () => {
  const blockA = toml.indexOf('Block A: Auth/Login-Konsolidierung');
  const blockB = toml.indexOf('Cross-Domain LANDING → APP');
  assert.ok(blockA > 0 && blockB > 0);
  assert.ok(blockA < blockB);
});

test('C1: build.publish und functions-Verzeichnis konfiguriert', () => {
  assert.match(toml, /\[build\][\s\S]{0,200}publish\s*=\s*"\."/);
  assert.match(toml, /functions\s*=\s*"netlify\/functions"/);
});
