/**
 * PROVA — status-check.js (MEGA³⁰ W10b-I7)
 *
 * Public-GET: aggregierter Service-Status für status.html
 * Schreib-POST (mit X-Cron-Secret): triggert aktive Health-Checks und persistiert.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const SERVICES = ['supabase', 'stripe', 'resend', 'openai', 'pdfmonkey', 'frontend'];

function jsonRes(event, code, body) {
  return {
    statusCode: code,
    headers: Object.assign({}, getCorsHeaders(event), { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  };
}

async function probe(service) {
  const fetch = global.fetch || require('node-fetch');
  const t0 = Date.now();
  try {
    let url, opts = {};
    switch (service) {
      case 'supabase':
        url = (process.env.SUPABASE_URL || '') + '/rest/v1/';
        opts.headers = { 'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '' };
        break;
      case 'stripe':
        url = 'https://api.stripe.com/healthcheck';
        break;
      case 'resend':
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
        return { service, status: 'unknown', latency_ms: 0, detail: 'unknown service' };
    }
    const res = await fetch(url, opts);
    const ms = Date.now() - t0;
    const status = res.status >= 200 && res.status < 500 ? 'up' : (res.status >= 500 ? 'down' : 'degraded');
    return { service, status, latency_ms: ms, detail: 'HTTP ' + res.status };
  } catch (e) {
    return { service, status: 'down', latency_ms: Date.now() - t0, detail: e.message };
  }
}

exports.handler = withSentry(async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };

  // POST = aktive Checks + persist (Cron-Secret-Auth)
  if (event.httpMethod === 'POST') {
    const expected = process.env.STATUS_CRON_SECRET;
    const provided = (event.headers && (event.headers['x-cron-secret'] || event.headers['X-Cron-Secret'])) || '';
    if (!expected || provided !== expected) return jsonRes(event, 401, { error: 'Unauthorized' });

    const results = [];
    for (const s of SERVICES) {
      const r = await probe(s);
      results.push(r);
    }
    const sb = getSupabase();
    if (sb) await sb.from('service_health').insert(results);
    return jsonRes(event, 200, { checked_at: new Date().toISOString(), results });
  }

  // GET = letzter Status pro Service aus DB
  if (event.httpMethod === 'GET') {
    const sb = getSupabase();
    if (!sb) return jsonRes(event, 200, { services: SERVICES.map(s => ({ service: s, status: 'unknown' })) });
    const services = [];
    for (const s of SERVICES) {
      const { data } = await sb.from('service_health').select('*')
        .eq('service', s).order('checked_at', { ascending: false }).limit(1).maybeSingle();
      services.push(data || { service: s, status: 'unknown', latency_ms: null, checked_at: null });
    }
    const overall = services.every(x => x.status === 'up') ? 'operational'
      : services.some(x => x.status === 'down') ? 'major-outage'
      : 'partial-outage';
    return jsonRes(event, 200, { overall, services, checked_at: new Date().toISOString() });
  }

  return jsonRes(event, 405, { error: 'Method Not Allowed' });
}, { functionName: 'status-check' });

module.exports.__SERVICES = SERVICES;
module.exports.__probe = probe;
