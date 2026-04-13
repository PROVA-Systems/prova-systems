/**
 * PROVA — Frontend-Fehler → Airtable AUDIT_TRAIL (ohne JWT)
 * Rate-Limit: 10 POSTs / Minute / Client-IP
 * Antwort immer 200 (UI nicht blockieren)
 */
const { AIRTABLE_API, BASE_ID, TABLE_AUDIT } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');

const rateBuckets = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;

function corsHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': (event && event.headers && event.headers.origin && (event.headers.origin.includes('prova-systems') || event.headers.origin.includes('localhost')) ? event.headers.origin : (process.env.URL || 'https://prova-systems.de')),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const url = AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_AUDIT;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + pat,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: fields })
    });
  } catch (e) {
    /* still 200 */
  }

  return { statusCode: 200, headers: corsHeaders(), body: okBody };
};
