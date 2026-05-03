/**
 * PROVA — Frontend-Fehler → AUDIT_TRAIL (ohne JWT)
 * MEGA⁴-EXT Q4: Storage-Router (dual-write Airtable + Supabase audit_trail).
 * Rate-Limit: 10 POSTs / Minute / Client-IP
 * Antwort immer 200 (UI nicht blockieren)
 */
const { AIRTABLE_API, BASE_ID, TABLE_AUDIT } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');
const { writeDual, getSupabase } = require('./lib/storage-router');

const rateBuckets = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;

// S6 Phase 1.9: per-request event-Capture (siehe ki-proxy.js Begruendung)
let _currentEvent = null;

function corsHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    ...getCorsHeaders(_currentEvent, ['POST', 'OPTIONS'])
  };
}

function clientIp(event) {
  const xf = (event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || '').split(',')[0];
  if (xf && xf.trim()) return xf.trim();
  return (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown').trim();
}

function allowRate(ip) {
  const now = Date.now();
  let arr = rateBuckets.get(ip) || [];
  arr = arr.filter(function (t) {
    return now - t < WINDOW_MS;
  });
  if (arr.length >= MAX_PER_WINDOW) return false;
  arr.push(now);
  rateBuckets.set(ip, arr);
  return true;
}

exports.handler = async function (event) {
  _currentEvent = event;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  const okBody = JSON.stringify({ ok: true });

  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, headers: corsHeaders(), body: okBody };
  }

  const ip = clientIp(event);
  if (!allowRate(ip)) {
    return { statusCode: 200, headers: corsHeaders(), body: okBody };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 200, headers: corsHeaders(), body: okBody };
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return { statusCode: 200, headers: corsHeaders(), body: okBody };
  }

  const msg = String(payload.msg || '').slice(0, 500);
  const page = String(payload.page || '');
  const user = String(payload.user || 'unbekannt').slice(0, 320);
  const ts = String(payload.ts || new Date().toISOString());
  const line = payload.line != null ? String(payload.line) : '';
  const src = String(payload.src || '').slice(0, 500);

  const nachricht = msg + (src ? ' @ ' + src : '') + (line ? ' :' + line : '');

  const fields = {
    Typ: 'Frontend-Fehler',
    Email: user,
    Nachricht: nachricht.slice(0, 8000),
    Seite: page.slice(0, 2000),
    Zeitstempel: ts
  };

  try {
    await writeDual({
      functionName: 'error-log',
      airtable: async () => {
        const url = AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_AUDIT;
        return fetch(url, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fields })
        });
      },
      supabase: async () => {
        const sb = getSupabase();
        if (!sb) return null;
        return sb.from('audit_trail').insert({
          typ: 'frontend.error',
          sv_email: user,
          details: JSON.stringify({ msg: msg, src: src, line: line, page: page }),
          created_at: ts
        });
      }
    });
  } catch (e) {
    /* still 200 */
  }

  return { statusCode: 200, headers: corsHeaders(), body: okBody };
};
