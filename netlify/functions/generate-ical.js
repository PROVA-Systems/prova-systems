/**
 * PROVA — generate-ical.js (MEGA²⁹ V3.2-W9N-I5)
 *
 * iCal-Export für Termine nach RFC 5545.
 * - Liefert .ics-File mit VEVENT-Komponenten aus termine-Tabelle
 * - Subscribe-fähig via webcal://-URL
 *
 * Auth: requireAuth (workspace_member)
 * GET /.netlify/functions/generate-ical?range=30d
 *   → 200 text/calendar mit RFC 5545 VCALENDAR-Body
 *
 * RFC 5545 Pflicht-Properties pro VEVENT:
 *   - UID (globally unique)
 *   - DTSTAMP (creation timestamp)
 *   - DTSTART (event start, mit TZID)
 *   - SUMMARY (event title)
 */
'use strict';

const crypto = require('crypto');
const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

// HMAC-Token-Mode für webcal://-Subscribe (Calendar-Apps senden kein JWT)
// Token = HMAC-SHA256(secret, sv_email).slice(0, 32)
function generateIcalToken(svEmail) {
  const secret = process.env.ICAL_TOKEN_SECRET || '';
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(String(svEmail || '').toLowerCase()).digest('hex').slice(0, 32);
}

function verifyIcalToken(svEmail, token) {
  const expected = generateIcalToken(svEmail);
  if (!expected || !token) return false;
  if (expected.length !== token.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch (e) { return false; }
}

// RFC 5545 Section 3.7: Line-Folding bei > 75 Zeichen
function foldLine(line) {
  if (line.length <= 75) return line;
  let folded = '';
  let pos = 0;
  while (pos < line.length) {
    const chunk = line.slice(pos, pos + (pos === 0 ? 75 : 74));
    folded += (pos === 0 ? '' : '\r\n ') + chunk;
    pos += (pos === 0 ? 75 : 74);
  }
  return folded;
}

// RFC 5545 Section 3.3.11: Text-Escaping (\, ;, , und LF)
function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// RFC 5545 Section 3.3.5: DATE-TIME-Format YYYYMMDDTHHMMSSZ (UTC)
function toIcalDateTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z';
}

function buildIcalBody(termine, sv_email) {
  const now = toIcalDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PROVA Systems//SV-Termine//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine('X-WR-CALNAME:PROVA Termine — ' + escapeText(sv_email || 'SV')),
    'X-WR-TIMEZONE:Europe/Berlin'
  ];

  termine.forEach(t => {
    const uid = (t.id || (t.az + '-' + t.start)) + '@prova-systems.de';
    const dtstart = toIcalDateTime(t.start);
    const dtend = t.end ? toIcalDateTime(t.end) : toIcalDateTime(new Date(new Date(t.start).getTime() + 60 * 60 * 1000)); // default 1h
    if (!dtstart) return;
    lines.push('BEGIN:VEVENT');
    lines.push(foldLine('UID:' + uid));
    lines.push('DTSTAMP:' + now);
    lines.push('DTSTART:' + dtstart);
    if (dtend) lines.push('DTEND:' + dtend);
    lines.push(foldLine('SUMMARY:' + escapeText(t.titel || t.az || 'Termin')));
    if (t.beschreibung) lines.push(foldLine('DESCRIPTION:' + escapeText(t.beschreibung)));
    if (t.ort) lines.push(foldLine('LOCATION:' + escapeText(t.ort)));
    if (t.az) lines.push(foldLine('CATEGORIES:' + escapeText('Akte ' + t.az)));
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n'); // RFC 5545: CRLF-Line-Endings PFLICHT
}

// Inner handler – wird sowohl von JWT-Variante als auch von HMAC-Token-Variante aufgerufen
async function innerHandler(event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: getCorsHeaders(event), body: 'Method Not Allowed' };

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'generate-ical' });
  if (!rl.allowed) {
    return { statusCode: 429, headers: { ...getCorsHeaders(event), 'Retry-After': String(rl.retryAfter) },
      body: 'Rate-Limit erreicht' };
  }

  const sb = getSupabase();
  if (!sb) return { statusCode: 503, headers: getCorsHeaders(event), body: 'Supabase nicht konfiguriert' };

  // Range default: nächste 90 Tage
  const range = (event.queryStringParameters && event.queryStringParameters.range) || '90d';
  const days = parseInt((range.match(/^(\d+)d$/) || [])[1] || '90', 10);
  const fromIso = new Date().toISOString();
  const toIso = new Date(Date.now() + days * 86400000).toISOString();

  let termine = [];
  try {
    const { data } = await sb.from('termine')
      .select('id, az, titel, beschreibung, ort, start, end, sv_email')
      .gte('start', fromIso)
      .lte('start', toIso)
      .order('start', { ascending: true })
      .limit(500);
    termine = data || [];
  } catch (_) {
    // Tabelle vielleicht nicht da → leerer Kalender
    termine = [];
  }

  const ical = buildIcalBody(termine, context.userEmail);

  return {
    statusCode: 200,
    headers: {
      ...getCorsHeaders(event),
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="prova-termine.ics"',
      'Cache-Control': 'no-cache, no-store'
    },
    body: ical
  };
}

// Outer handler: HMAC-Token-Mode (?token=&email=) ODER JWT-Auth
exports.handler = withSentry(async function (event) {
  const q = event.queryStringParameters || {};
  if (q.token && q.email) {
    if (!verifyIcalToken(q.email, q.token)) {
      return { statusCode: 401, headers: getCorsHeaders(event), body: 'Invalid token' };
    }
    return innerHandler(event, { userEmail: q.email, userId: null });
  }
  return requireAuth(innerHandler)(event);
}, { functionName: 'generate-ical' });

// Internals exportiert für Tests
exports._test = { foldLine, escapeText, toIcalDateTime, buildIcalBody, generateIcalToken, verifyIcalToken };
