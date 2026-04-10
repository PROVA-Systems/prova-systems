/**
 * PROVA — AUDIT_TRAIL logging endpoint
 * Writes lightweight metadata only.
 */
const AIRTABLE_API = 'https://api.airtable.com';
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
/** Default = admin-dashboard AUDIT_LOG; sonst PROVA_AUDIT_TRAIL_TABLE in Netlify setzen. */
const TABLE_AUDIT =
  process.env.PROVA_AUDIT_TRAIL_TABLE || process.env.AIRTABLE_AUDIT_TRAIL_TABLE || 'tblqQmMwJKxltXXXl';

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

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
    await fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_AUDIT, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Typ: typ,
          Email: email,
          AZ: az,
          Details: details,
          Zeitstempel: ts,
          IP_Hint: hint
        }
      })
    });
  } catch (e2) {
    // never block app flow
  }
  return json(200, { ok: true });
};
