'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/public-status');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'public-status.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'public-status.html'), 'utf8');
const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase-migrations', '21_add_incidents.sql'), 'utf8');
const netlifyToml = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify.toml'), 'utf8');

test('B3: public-status.html Hero + Service-Grid + Incidents-Liste', () => {
  assert.match(html, /All Systems Operational/);
  assert.match(html, /id="ps-services"/);
  assert.match(html, /id="ps-incidents"/);
});

test('B3: 7 Services definiert (web, landing, api, db, pdf, ki, email)', () => {
  ['web', 'landing', 'api', 'db', 'pdf', 'ki', 'email'].forEach(s => {
    assert.match(html, new RegExp(`id:\\s*['"]${s}['"]`));
  });
});

test('B3: 30-Tage-Uptime-Grid renderUptime-Function', () => {
  assert.match(html, /renderUptime/);
  assert.match(html, /length:\s*30/);
});

test('B3: Lambda __aggregate liefert overall-Status', () => {
  assert.strictEqual(Lambda.__aggregate({a: {status:'green'}, b: {status:'green'}}), 'green');
  assert.strictEqual(Lambda.__aggregate({a: {status:'green'}, b: {status:'yellow'}}), 'yellow');
  assert.strictEqual(Lambda.__aggregate({a: {status:'yellow'}, b: {status:'red'}}), 'red');
});

test('B3: Lambda __defaultUptime liefert 30-Tage-Array', () => {
  const u = Lambda.__defaultUptime();
  assert.strictEqual(u.length, 30);
  assert.ok(u.every(d => ['up', 'degraded', 'down'].includes(d)));
});

test('B3: Lambda checkDatabase Health-Check', () => {
  assert.match(lambdaSrc, /async function checkDatabase/);
  assert.match(lambdaSrc, /from\(['"]workspaces['"]\)\.select/);
});

test('B3: Schema-Migration 21 incidents-Tabelle + Severity-Check', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.incidents/);
  assert.match(sql, /'minor', 'major', 'critical'/);
});

test('B3: netlify.toml Routing /status → public-status.html', () => {
  assert.match(netlifyToml, /from\s*=\s*"\/status"/);
  assert.match(netlifyToml, /to\s*=\s*"\/public-status\.html"/);
});

test('B3: Lambda Cache-Control 5 Min', () => {
  assert.match(lambdaSrc, /max-age=300/);
});

test('B3: HTML Auto-Refresh 5 Min (setInterval)', () => {
  assert.match(html, /setInterval\(loadStatus,\s*5\s*\*\s*60\s*\*\s*1000\)/);
});
