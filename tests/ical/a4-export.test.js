'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const Lambda = require('../../netlify/functions/termine-ical-export');
const lambdaSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'netlify', 'functions', 'termine-ical-export.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'termine.html'), 'utf8');
const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase-migrations', '19_add_ical_tokens.sql'), 'utf8');
const sources = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-34-A4-ICAL-SOURCES.md'), 'utf8');

test('A4: signToken + verifyToken Round-Trip', () => {
  const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const token = Lambda.__signToken('user-123', expires);
  const verified = Lambda.__verifyToken(token);
  assert.strictEqual(verified.user_id, 'user-123');
  assert.strictEqual(verified.expires_at, expires);
});

test('A4: verifyToken rejects expired Token', () => {
  const past = new Date(Date.now() - 1000).toISOString();
  const token = Lambda.__signToken('u1', past);
  assert.strictEqual(Lambda.__verifyToken(token), null);
});

test('A4: verifyToken rejects invalid Signature', () => {
  assert.strictEqual(Lambda.__verifyToken('garbage'), null);
  assert.strictEqual(Lambda.__verifyToken(''), null);
});

test('A4: escapeICS escaping (Komma + Semikolon + Backslash + Newline)', () => {
  assert.strictEqual(Lambda.__escapeICS('A, B; C\\D\nE'), 'A\\, B\\; C\\\\D\\nE');
});

test('A4: buildICS produziert RFC-5545-VCALENDAR + VEVENT', () => {
  const ics = Lambda.__buildICS([
    { id: 't1', titel: 'Ortstermin', beschreibung: 'AZ TEST-001', ort: 'Berlin', start_at: '2026-05-10T10:00:00Z', end_at: '2026-05-10T12:00:00Z' }
  ]);
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR$/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /UID:t1@prova-systems\.de/);
  assert.match(ics, /SUMMARY:Ortstermin/);
  assert.match(ics, /LOCATION:Berlin/);
  assert.match(ics, /DTSTART:20260510T100000Z/);
  assert.match(ics, /DTEND:20260510T120000Z/);
});

test('A4: buildICS Empty-State (keine Termine)', () => {
  const ics = Lambda.__buildICS([]);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR/);
  assert.doesNotMatch(ics, /BEGIN:VEVENT/);
});

test('A4: PRODID identifier konform RFC 5545 § 3.7.3', () => {
  const ics = Lambda.__buildICS([]);
  assert.match(ics, /PRODID:-\/\/PROVA Systems\/\/SV-Termine/);
});

test('A4: termine.html hat Subscribe-Button + showIcalSubscribe', () => {
  assert.match(html, /onclick="showIcalSubscribe\(\)"/);
  assert.match(html, /window\.showIcalSubscribe = async function/);
});

test('A4: Subscribe-Modal mit URL-Copy + webcal:// Link', () => {
  assert.match(html, /webcalUrl/);
  assert.match(html, /clipboard\.writeText/);
  assert.match(html, /In Apple Calendar öffnen/);
});

test('A4: Schema-Migration 19 ical_tokens-Tabelle', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ical_tokens/);
  assert.match(sql, /token_hash\s+TEXT NOT NULL/);
  assert.match(sql, /expires_at\s+TIMESTAMPTZ NOT NULL/);
  assert.match(sql, /revoked_at\s+TIMESTAMPTZ/);
});

test('A4: Audit-Doku mit ≥5 Quellen', () => {
  for (let i = 1; i <= 5; i++) {
    assert.match(sources, new RegExp(`\\|\\s*${i}\\s*\\|`));
  }
  assert.match(sources, /RFC 5545/);
});
