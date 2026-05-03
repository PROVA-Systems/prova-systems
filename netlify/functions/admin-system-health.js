/**
 * PROVA — admin-system-health.js
 * MEGA⁴ Q6 (04.05.2026) — AUTH-COCKPIT Voll-Sektion 3
 *
 * System-Health: Uptime, Response-Times, ENV-Status, External-Service-Status.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

async function checkUrl(url, timeoutMs) {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 5000);
  try {
    const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return { ok: r.ok, status: r.status, ms: Date.now() - start };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message, ms: Date.now() - start };
  }
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const start = Date.now();
  const sb = getSupabaseAdmin();

  // ENV-Status (kritische Variablen)
  const env = {
    SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.PROVA_SUPABASE_PROJECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    PDFMONKEY_API_KEY: !!process.env.PDFMONKEY_API_KEY,
    SENTRY_DSN_FUNCTIONS: !!process.env.SENTRY_DSN_FUNCTIONS,
    AUTH_HMAC_SECRET: !!process.env.AUTH_HMAC_SECRET,
    PROVA_SMTP_HOST: !!process.env.PROVA_SMTP_HOST
  };

  // External-Service-Health (parallel)
  const [stripeChk, supabaseChk, openaiChk, sentryChk] = await Promise.all([
    checkUrl('https://api.stripe.com/healthcheck', 4000),
    checkUrl((process.env.SUPABASE_URL || process.env.PROVA_SUPABASE_PROJECT_URL || '') + '/rest/v1/', 4000),
    checkUrl('https://api.openai.com/v1/models', 4000),
    checkUrl('https://de.sentry.io/', 4000)
  ]);

  // DB-Connection-Check (Supabase-Query)
  let dbCheck = { ok: false };
  if (sb) {
    const dbStart = Date.now();
    try {
      const { error } = await sb.from('audit_trail').select('id', { count: 'exact', head: true }).limit(1);
      dbCheck = { ok: !error, ms: Date.now() - dbStart, error: error ? error.message : null };
    } catch (e) {
      dbCheck = { ok: false, ms: Date.now() - dbStart, error: e.message };
    }
  }

  return jsonResponse(event, 200, {
    ok: true,
    fetched_at: new Date().toISOString(),
    response_ms: Date.now() - start,
    env: env,
    env_complete: Object.values(env).every(v => v),
    services: {
      stripe: stripeChk,
      supabase: supabaseChk,
      openai: openaiChk,
      sentry: sentryChk
    },
    database: dbCheck,
    netlify: {
      function_runtime: 'aws-lambda',
      region: process.env.AWS_REGION || 'unknown',
      memory_mb: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'unknown'
    }
  });
}, { functionName: 'admin-system-health', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-system-health' });
