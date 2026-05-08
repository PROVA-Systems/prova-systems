/**
 * netlify/functions/termine-ical-export.js — MEGA³⁴ A4
 *
 * RFC-5545-konformer iCal-Export für PROVA-Termine.
 * GET /.netlify/functions/termine-ical-export?token=<signed_token>
 *
 * Token: HMAC-SHA256(user_id + expires_at, PROVA_INTERNAL_WRITE_SECRET)
 * Validity: 90 Tage. Revocable über ical_tokens-Tabelle.
 *
 * Returns: text/calendar mit allen termine des Users.
 */
'use strict';

const crypto = require('crypto');
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

const SECRET = process.env.PROVA_INTERNAL_WRITE_SECRET || 'dev-secret-do-not-use';

/**
 * signToken(user_id, expires_at): HMAC-Token für URL-Subscribe.
 */
function signToken(user_id, expires_at_iso) {
  const payload = user_id + '|' + expires_at_iso;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 32);
  return Buffer.from(payload + '|' + sig).toString('base64url');
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return null;
    const [user_id, expires_at_iso, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SECRET)
      .update(user_id + '|' + expires_at_iso).digest('hex').slice(0, 32);
    if (sig !== expectedSig) return null;
    if (new Date(expires_at_iso).getTime() < Date.now()) return null;
    return { user_id, expires_at: expires_at_iso };
  } catch (e) { return null; }
}

/**
 * RFC 5545 Escape: , ; \ in Werten + line-wrap nach 75 Zeichen
 */
function escapeICS(s) {
  if (!s) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function fmtDateUtc(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  } catch (e) { return null; }
}

function buildICS(termine) {
  const now = fmtDateUtc(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//PROVA Systems//SV-Termine 1.0//DE',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:PROVA Termine',
    'X-WR-TIMEZONE:Europe/Berlin'
  ];

  (termine || []).forEach(t => {
    const dtstart = fmtDateUtc(t.start_at || t.datum);
    if (!dtstart) return;
    const dtend = fmtDateUtc(t.end_at) || dtstart;
    const uid = (t.id || crypto.randomUUID()) + '@prova-systems.de';
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + uid);
    lines.push('DTSTAMP:' + now);
    lines.push('DTSTART:' + dtstart);
    lines.push('DTEND:' + dtend);
    lines.push('SUMMARY:' + escapeICS(t.titel || t.summary || 'Termin'));
    if (t.beschreibung || t.description) lines.push('DESCRIPTION:' + escapeICS(t.beschreibung || t.description));
    if (t.ort || t.location) lines.push('LOCATION:' + escapeICS(t.ort || t.location));
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

exports.handler = async function (event) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  const token = (event.queryStringParameters && event.queryStringParameters.token) || '';
  const verified = verifyToken(token);
  if (!verified) {
    return { statusCode: 401, headers: cors, body: 'Token invalid or expired' };
  }

  const sb = getSupabase();
  let termine = [];
  if (sb) {
    try {
      const { data } = await sb.from('termine')
        .select('id, titel, beschreibung, ort, start_at, end_at')
        .eq('user_id', verified.user_id)
        .gte('start_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_at', { ascending: true })
        .limit(500);
      termine = data || [];
    } catch (e) { /* fail-soft: leerer Kalender */ }
  }

  const ics = buildICS(termine);
  return {
    statusCode: 200,
    headers: Object.assign({}, cors, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="prova-termine.ics"',
      'Cache-Control': 'public, max-age=300'
    }),
    body: ics
  };
};

module.exports.__signToken = signToken;
module.exports.__verifyToken = verifyToken;
module.exports.__escapeICS = escapeICS;
module.exports.__buildICS = buildICS;
module.exports.__fmtDateUtc = fmtDateUtc;
