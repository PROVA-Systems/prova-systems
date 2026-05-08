/**
 * PROVA — status-check.js (MEGA³² W12b-I6 Schema-Reconciled)
 *
 * Public-GET: aggregierter Service-Status für status.html (latest pro Service).
 * Schreib-POST (mit X-Cron-Secret): triggert aktive Health-Checks und persistiert in system_health.
 *
 * Schema (W12-I0): public.system_health mit kategorie health_check_kategorie ENUM,
 *                  component TEXT, status TEXT, response_time_ms, details JSONB, sampled_at.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

// 6 Services mit kategorie ENUM-Mapping
const SERVICES = [
  { kategorie: 'database', component: 'supabase-postgres' },
  { kategorie: 'stripe', component: 'stripe-api' },
  { kategorie: 'email_smtp', component: 'resend-api' },
  { kategorie: 'openai', component: 'openai-api' },
  { kategorie: 'pdfmonkey', component: 'pdfmonkey-api' },
  { kategorie: 'frontend', component: 'netlify-frontend' }
];

function jsonRes(event, code, body) {
  return {
    statusCode: code,
    headers: Object.assign({}, getCorsHeaders(event), { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  };
}

async function probe(svc) {
  const fetch = global.fetch;
  const t0 = Date.now();
  try {
    let url, opts = {};
    switch (svc.kategorie) {
      case 'database':
        url = (process.env.SUPABASE_URL || '') + '/rest/v1/';
        opts.headers = { 'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '' };
        break;
      case 'stripe':
        url = 'https://api.stripe.com/healthcheck';
        break;
      case 'email_smtp':
        url = 'https://api.resend.com/domains';
        opts.headers = { 'Authorization': 'Bearer ' + (process.env.RESEND_API_KEY || '') };
        break;
      case 'openai':
        url = 'https://api.openai.com/v1/models';
        opts.headers = { 'Authorization': 'Bearer ' + (process.env.OPENAI_API_KEY || '') };
        break;
      case 'pdfmonkey':
        url = 'https://api.pdfmonkey.io/api/v1/document_cards';
        opts.headers = { 'Authorization': 'Bearer ' + (process.env.PDFMONKEY_PRIVATE_KEY || process.env.PDFMONKEY_API_KEY || '') };
        break;
      case 'frontend':
        url = 'https://prova-systems.de/';
        break;
      default:
        return { kategorie: svc.kategorie, component: svc.component, status: 'unknown', response_time_ms: 0,
          details: { reason: 'unknown service' } };
    }
    const res = await fetch(url, opts);
    const ms = Date.now() - t0;
    const status = res.status >= 200 && res.status < 500 ? 'up' : (res.status >= 500 ? 'down' : 'degraded');
    return {
      kategorie: svc.kategorie,
      component: svc.component,
      status: status,
      response_time_ms: ms,
      details: { http_status: res.status, url: url }
    };
  } catch (e) {
    return {
      kategorie: svc.kategorie,
      component: svc.component,
      status: 'down',
      response_time_ms: Date.now() - t0,
      error_message: e.message,
      details: { error: e.message }
    };
  }
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };

  // POST = aktive Checks + persist (Cron-Secret-Auth)
  if (event.httpMethod === 'POST') {
    const expected = process.env.PROVA_STATUS_CRON_SECRET || process.env.STATUS_CRON_SECRET;
    const provided = (event.headers && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'])) || '';
    if (!expected || provided !== expected) return jsonRes(event, 401, { error: 'Unauthorized' });

    const results = [];
    for (const s of SERVICES) {
      const r = await probe(s);
      results.push(r);
    }
    const sb = getSupabase();
    if (sb) {
      // Insert in system_health (Schema W12-I0)
      const inserts = results.map(r => ({
        kategorie: r.kategorie,
        component: r.component,
        status: r.status,
        response_time_ms: r.response_time_ms,
        details: r.details || null,
        error_message: r.error_message || null
      }));
      await sb.from('system_health').insert(inserts);
    }
    return jsonRes(event, 200, { sampled_at: new Date().toISOString(), results });
  }

  // GET = latest pro Service aus system_health
  if (event.httpMethod === 'GET') {
    const sb = getSupabase();
    if (!sb) return jsonRes(event, 200, { services: SERVICES.map(s => ({ component: s.component, status: 'unknown' })) });

    const services = [];
    for (const s of SERVICES) {
      const { data } = await sb.from('system_health').select('*')
        .eq('kategorie', s.kategorie).eq('component', s.component)
        .order('sampled_at', { ascending: false }).limit(1).maybeSingle();
      services.push(data || {
        kategorie: s.kategorie, component: s.component, status: 'unknown',
        response_time_ms: null, sampled_at: null
      });
    }
    const overall = services.every(x => x.status === 'up') ? 'operational'
      : services.some(x => x.status === 'down') ? 'major-outage'
      : services.some(x => x.status === 'degraded' || x.status === 'unknown') ? 'partial-outage'
      : 'partial-outage';
    return jsonRes(event, 200, { overall, services, checked_at: new Date().toISOString() });
  }

  return jsonRes(event, 405, { error: 'Method Not Allowed' });
}, { functionName: 'status-check' });

module.exports.__SERVICES = SERVICES;
module.exports.__probe = probe;
