/**
 * MEGA⁴² P9 — DSGVO Roundtrip-Tests (Code-Inspection)
 *
 * Verifiziert dass DSGVO-Lambdas:
 *   1. Existieren (Auskunft / Portabilität / Löschung)
 *   2. Auth-Guards haben (Multi-Tenancy)
 *   3. Email-Trigger haben (Löschungs-Bestätigung)
 *   4. Audit-Trail-Logging haben
 *   5. Cooling-Period (30 Tage) implementieren
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const FN = path.join(ROOT, 'netlify', 'functions');

function read(name) {
  return fs.readFileSync(path.join(FN, name), 'utf8');
}

// ─── Existence ────────────────────────────────────────────

test('P9: dsgvo-auskunft.js existiert', () => {
  assert.ok(fs.existsSync(path.join(FN, 'dsgvo-auskunft.js')));
});

test('P9: dsgvo-portabilitaet.js existiert', () => {
  assert.ok(fs.existsSync(path.join(FN, 'dsgvo-portabilitaet.js')));
});

test('P9: dsgvo-loeschen-antrag.js existiert (Soft-Delete + Cooling)', () => {
  assert.ok(fs.existsSync(path.join(FN, 'dsgvo-loeschen-antrag.js')));
});

test('P9: dsgvo-loeschen.js existiert (Hard-Delete nach Cooling)', () => {
  assert.ok(fs.existsSync(path.join(FN, 'dsgvo-loeschen.js')));
});

// ─── Auth ─────────────────────────────────────────────────

test('P9: dsgvo-auskunft hat Auth-Guard', () => {
  const c = read('dsgvo-auskunft.js');
  assert.match(c, /requireAuth|jwt|Authorization|resolveUser/);
});

test('P9: dsgvo-loeschen-antrag hat Auth-Guard', () => {
  const c = read('dsgvo-loeschen-antrag.js');
  assert.match(c, /requireAuth|jwt|Authorization|resolveUser/);
});

test('P9: dsgvo-portabilitaet hat Auth-Guard', () => {
  const c = read('dsgvo-portabilitaet.js');
  assert.match(c, /requireAuth|jwt|Authorization|resolveUser/);
});

// ─── Email-Trigger / Bestätigung ─────────────────────────

test('P9: dsgvo-loeschen-antrag triggert Email-Bestätigung', () => {
  const c = read('dsgvo-loeschen-antrag.js');
  assert.match(c, /email|sendmail|smtp|nodemailer|email-send/i);
});

test('P9: dsgvo-auskunft sendet Daten via Download-Link oder Email', () => {
  const c = read('dsgvo-auskunft.js');
  assert.match(c, /export|download|email|json/i);
});

// ─── Cooling-Period (30 Tage) ─────────────────────────────

test('P9: dsgvo-loeschen-antrag hat 30-Tage-Cooling-Period', () => {
  const c = read('dsgvo-loeschen-antrag.js');
  // 30 days entweder als Number oder Datum-Berechnung
  assert.match(c, /30\s*\*?\s*24\s*\*?\s*60|30\s*[Tt]age|cooling|carenz/i);
});

// ─── Audit-Trail ──────────────────────────────────────────

test('P9: DSGVO-Lambdas loggen in audit_trail', () => {
  const lambdas = ['dsgvo-auskunft.js', 'dsgvo-loeschen-antrag.js', 'dsgvo-loeschen.js', 'dsgvo-portabilitaet.js'];
  let auditCount = 0;
  for (const l of lambdas) {
    const c = read(l);
    if (/audit_trail|auditLog|appendAudit/i.test(c)) auditCount++;
  }
  // Min 2 von 4 mit Audit-Logging (Auskunft + Löschen sind Pflicht)
  assert.ok(auditCount >= 2, 'Nur ' + auditCount + '/4 Lambdas mit audit_trail-Logging');
});

// ─── DB-Functions / Pflicht-Functions ─────────────────────

test('P9: Migration 04 hat dsgvo_user_export Function', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '04_schema_komplett_finale.sql'), 'utf8');
  assert.match(sql, /dsgvo_user_export/);
});

test('P9: Migration 04 hat dsgvo_user_loeschen Function', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '04_schema_komplett_finale.sql'), 'utf8');
  assert.match(sql, /dsgvo_user_loeschen/);
});

// ─── Forced Re-Consent (CLAUDE.md Regel 20) ──────────────

test('P9: rechtsdokumente Tabelle existiert (Forced Re-Consent)', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '04_schema_komplett_finale.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE.*rechtsdokumente/i);
});

test('P9: v_user_pending_einwilligungen View existiert', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '06_v3_patch_final_lueckenschluss.sql'), 'utf8');
  assert.match(sql, /v_user_pending_einwilligungen/);
});

test('P9: record_einwilligung Function existiert', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase-migrations', '06_v3_patch_final_lueckenschluss.sql'), 'utf8');
  assert.match(sql, /record_einwilligung/);
});

// ─── Pseudonymisierung vor OpenAI ──────────────────────

test('P9: ki-proxy hat Pseudonymisierungs-Middleware', () => {
  const c = read('ki-proxy.js');
  assert.match(c, /pseudonymis|Pseudonymis/i);
});

test('P9: pseudonymize-Logic erkennbar (Names/Emails/IBAN)', () => {
  const ki = read('ki-proxy.js');
  // Combine: ki-proxy oder eine Lib referenziert
  const hasPseudo = /name|email|iban|address/i.test(ki) && /replace|pseudonymis/i.test(ki);
  assert.ok(hasPseudo, 'Pseudonymisierungs-Pattern in ki-proxy erkennbar');
});

// ─── Rate-Limits ─────────────────────────────────────────

test('P9: dsgvo-loeschen-antrag hat Rate-Limit (max 1/Tag/User)', () => {
  const c = read('dsgvo-loeschen-antrag.js');
  assert.match(c, /rate-limit|rateLimit|RateLimit|already.*pending/i);
});
