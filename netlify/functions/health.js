/**
 * PROVA Health Check — /.netlify/functions/health
 * ════════════════════════════════════════════════
 * MEGA⁷ U1: Supabase-Check ergaenzt + Storage-Router-Path im Output.
 *
 * UptimeRobot / BetterUptime rufen diesen Endpoint alle 5 Minuten ab.
 *
 * Prüft: Airtable, Supabase, OpenAI, ENV-Variablen, System-Status
 */
'use strict';

const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase, getMigrationPath } = require('./lib/storage-router');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
  const start = Date.now();
  const checks = {};
  let allOk = true;

  // ── 1. ENV-Variablen vorhanden? ──────────────────────────────
  const requiredEnv = [
    'AIRTABLE_PAT', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY',
    'PDFMONKEY_API_KEY', 'PROVA_INTERNAL_WRITE_SECRET',
    'PROVA_SMTP_ENCRYPTION_KEY',
  ];
  const missingEnv = requiredEnv.filter(k => !process.env[k]);
  checks.env = {
    ok: missingEnv.length === 0,
    missing: missingEnv,
  };
  if (!checks.env.ok) allOk = false;

  // ── 2. Airtable erreichbar? ───────────────────────────────────
  try {
    const pat = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN || '';
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      'https://api.airtable.com/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB?maxRecords=1&fields[]=Email',
      {
        headers: { Authorization: 'Bearer ' + pat },
        signal: controller.signal,
      }
    );
    checks.airtable = {
      ok: res.status === 200 || res.status === 422, // 422 = Tabelle OK aber kein Ergebnis
      status: res.status,
      ms: Date.now() - start,
    };
  } catch (e) {
    checks.airtable = { ok: false, error: e.message };
    allOk = false;
  }

  // ── 2b. Supabase erreichbar? (MEGA⁷ U1) ───────────────────────
  try {
    const sb = getSupabase();
    if (sb) {
      const sbStart = Date.now();
      const { error } = await sb.from('audit_trail').select('id', { count: 'exact', head: true }).limit(1);
      checks.supabase = {
        ok: !error,
        ms: Date.now() - sbStart,
        error: error ? error.message : null
      };
      if (!checks.supabase.ok) allOk = false;
    } else {
      checks.supabase = { ok: false, hint: 'SUPABASE_SERVICE_ROLE_KEY fehlt' };
      // Supabase-Konfig fehlt: nur Warnung wenn migration-path != 'airtable'
      if (getMigrationPath() !== 'airtable') allOk = false;
    }
  } catch (e) {
    checks.supabase = { ok: false, error: e.message };
    if (getMigrationPath() !== 'airtable') allOk = false;
  }

  // ── 3. OpenAI erreichbar? (nur Ping, kein Token-Verbrauch) ───
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: 'Bearer ' + (process.env.OPENAI_API_KEY || '') },
      signal: controller.signal,
    });
    checks.openai = {
      ok: res.status === 200,
      status: res.status,
    };
  } catch (e) {
    checks.openai = { ok: false, error: e.message };
    // OpenAI-Ausfall = Warnung, kein kritischer Fehler
  }

  const ms = Date.now() - start;

  return {
    statusCode: allOk ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...getCorsHeaders(event),
    },
    body: JSON.stringify({
      status:  allOk ? 'ok' : 'degraded',
      version: 'prova-v101',
      migration_path: getMigrationPath(),
      ms,
      checks,
      ts: new Date().toISOString(),
    }, null, 2),
  };
};

function corsOptionsResponse(event) {
  return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
}
