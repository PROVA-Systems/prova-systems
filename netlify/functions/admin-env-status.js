/**
 * netlify/functions/admin-env-status.js — MEGA³⁶ W2.1
 * Admin-Cockpit ENV-Status-Endpoint (read-only Pre-Flight).
 * GET /.netlify/functions/admin-env-status
 * Returns: { netlify_envs, supabase_status, stripe_status, last_check }
 */
'use strict';

const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

const ENV_KEYS_SAFE = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY', 'PDFMONKEY_API_KEY',
  'SENTRY_DSN', 'PROVA_INTERNAL_WRITE_SECRET',
  'PROVA_EMAIL_CRON_SECRET', 'PROVA_ADMIN_PRIMARY_EMAIL'
];

function envStatus() {
  const out = {};
  ENV_KEYS_SAFE.forEach(k => {
    const v = process.env[k];
    out[k] = v ? { set: true, length: v.length, preview: v.slice(0, 4) + '…' } : { set: false };
  });
  return out;
}

async function isFounder(sb, email) {
  if (!sb || !email) return false;
  const { data } = await sb.from('users')
    .select('id, workspace_memberships!inner(rolle)')
    .eq('email', email)
    .maybeSingle();
  if (!data) return false;
  const m = data.workspace_memberships || [];
  return m.some(x => x.rolle === 'owner' || x.rolle === 'admin');
}

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'admin-env-status' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  // Admin-Check
  const isAdmin = await isFounder(sb, context.userEmail);
  if (!isAdmin) return jsonResponse(event, 403, { error: 'Admin-Rolle erforderlich' });

  // Supabase-Health
  let supabaseStatus = 'green';
  try {
    const { error } = await sb.from('workspaces').select('id').limit(1);
    if (error) supabaseStatus = 'red';
  } catch (e) { supabaseStatus = 'red'; }

  // Stripe-Health (nur basic — STRIPE_SECRET_KEY-Existenz)
  const stripeStatus = process.env.STRIPE_SECRET_KEY ? 'green' : 'yellow';

  return jsonResponse(event, 200, {
    netlify_envs: envStatus(),
    supabase_status: supabaseStatus,
    stripe_status: stripeStatus,
    last_check: new Date().toISOString()
  });
});

module.exports.__envStatus = envStatus;
module.exports.__ENV_KEYS_SAFE = ENV_KEYS_SAFE;
module.exports.__isFounder = isFounder;
