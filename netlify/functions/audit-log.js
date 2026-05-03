/**
 * PROVA — AUDIT_TRAIL logging endpoint
 * MEGA⁴-EXT Q3: Storage-Router (dual-write Airtable + Supabase audit_trail).
 *
 * Writes lightweight metadata only.
 * Default: PROVA_MIGRATION_PATH='airtable' → nur Airtable
 *          'dual' → beide (sichere Migration)
 *          'supabase' → nur Supabase (Ziel-Zustand)
 */
const { AIRTABLE_API, BASE_ID, TABLE_AUDIT } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');
const { requireAuth } = require('./lib/jwt-middleware');
const { writeDual, getSupabase } = require('./lib/storage-router');
// MEGA⁷ U2: Rate-Limit pro User (verhindert Audit-Log-Spam)
const RateLimitUser = require('./lib/rate-limit-user');

// S6 Phase 1.9: per-request event-Capture (siehe ki-proxy.js Begruendung)
let _currentEvent = null;

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(_currentEvent, ['POST', 'OPTIONS'])
    },
    body: JSON.stringify(obj)
  };
}

function ipHint(event) {
  const fwd = String(event.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const raw = fwd || String(event.headers['x-nf-client-connection-ip'] || '').trim();
  if (!raw) return '';
  if (raw.indexOf(':') >= 0) return raw.split(':').slice(0, 3).join(':');
  return raw.split('.').slice(0, 3).join('.');
}

exports.handler = requireAuth(async function (event, context) {
  _currentEvent = event;
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  // MEGA⁷ U2: Rate-Limit 30/min/User
  const rl = RateLimitUser.check(context.userEmail || 'anon', 30, 60, { event, functionName: 'audit-log' });
  if (!rl.allowed) {
    return json(200, { ok: true, skipped: 'rate_limit', retryAfter: rl.retryAfter });
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) return json(200, { ok: true, skipped: 'no_pat' });

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(200, { ok: true, skipped: 'bad_json' });
  }

  const jwtUser = context.clientContext && context.clientContext.user;
  const email = String((jwtUser && jwtUser.email) || body.email || 'unbekannt').trim().toLowerCase();
  const ts = String(body.timestamp || body.ts || new Date().toISOString());
  const typ = String(body.typ || body.type || 'Event').slice(0, 120);
  const az = String(body.az || '').slice(0, 240);
  const detailsObj = body.details && typeof body.details === 'object' ? body.details : {};
  const details = JSON.stringify(detailsObj).slice(0, 9000);
  const hint = ipHint(event);

  try {
    await writeDual({
      functionName: 'audit-log',
      airtable: async () => {
        return fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_AUDIT, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              Typ: typ, Email: email, AZ: az,
              Details: details, Zeitstempel: ts, IP_Hint: hint
            }
          })
        });
      },
      supabase: async () => {
        const sb = getSupabase();
        if (!sb) return null;
        return sb.from('audit_trail').insert({
          typ: typ,
          sv_email: email,
          details: JSON.stringify(Object.assign({ az: az, ip_hint: hint }, detailsObj)),
          created_at: ts
        });
      }
    });
  } catch (e2) {
    // never block app flow
  }
  return json(200, { ok: true });
});
