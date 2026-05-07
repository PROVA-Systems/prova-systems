/**
 * netlify/functions/cookie-consent-log.js — MEGA³⁴ A1
 * Cookie-Consent Audit-Trail Logger (DSGVO Art. 7 Beweispflicht).
 *
 * Public-Endpoint (kein Auth — Cookie-Consent läuft auch auf Public-Pages).
 * Defensive: bei fehlender Supabase-Config 200 mit logged=false zurückgeben.
 */
'use strict';

const { getCorsHeaders } = require('./lib/cors-helper');

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

function ipCountry(event) {
  const h = (event && event.headers) || {};
  return h['x-country'] || h['cf-ipcountry'] || h['x-vercel-ip-country'] || null;
}

exports.handler = async function (event) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
  if (!body.consent) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'consent fehlt' }) };
  }

  const sb = getSupabase();
  if (!sb) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ logged: false, reason: 'supabase-not-configured' }) };
  }

  try {
    const { error } = await sb.from('cookie_consents').insert({
      consent: body.consent,
      page: body.page || null,
      user_agent: (event.headers && event.headers['user-agent']) || null,
      ip_country: ipCountry(event)
    });
    if (error) {
      console.warn('[cookie-consent-log] insert error:', error.message);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ logged: false }) };
    }
    return { statusCode: 200, headers: cors, body: JSON.stringify({ logged: true }) };
  } catch (e) {
    console.warn('[cookie-consent-log] exception:', e.message);
    return { statusCode: 200, headers: cors, body: JSON.stringify({ logged: false }) };
  }
};
