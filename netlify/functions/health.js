/**
 * PROVA Health Check — /.netlify/functions/health
 * ════════════════════════════════════════════════
 * Standard bei allen professionellen SaaS-Systemen.
 * UptimeRobot / BetterUptime rufen diesen Endpoint alle 5 Minuten ab.
 * Schlägt er fehl → sofortige Benachrichtigung bevor ein SV es merkt.
 *
 * Prüft: Airtable, ENV-Variablen, System-Status
 */
'use strict';

const { getCorsHeaders } = require('./lib/cors-helper');

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
      ms,
      checks,
      ts: new Date().toISOString(),
    }, null, 2),
  };
};
