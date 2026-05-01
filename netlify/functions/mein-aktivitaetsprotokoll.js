const { AIRTABLE_API, BASE_ID, TABLE_AUDIT } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');
const { requireAuth } = require('./lib/jwt-middleware');

// S6 Phase 1.9: per-request event-Capture (siehe ki-proxy.js Begruendung)
let _currentEvent = null;

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(_currentEvent, ['GET', 'OPTIONS'])
    },
    body: JSON.stringify(obj)
  };
}

exports.handler = requireAuth(async function (event, context) {
  _currentEvent = event;
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  // P4B.7b: HMAC-Token-Email statt Identity-clientContext
  const user = { email: context.userEmail };

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) return json(500, { error: 'AIRTABLE_PAT nicht konfiguriert' });

  const email = String(user.email).trim().toLowerCase().replace(/"/g, '\\"');
  const formula = '{Email}="' + email + '"';
  const url =
    AIRTABLE_API +
    '/v0/' +
    BASE_ID +
    '/' +
    TABLE_AUDIT +
    '?maxRecords=50&sort[0][field]=Zeitstempel&sort[0][direction]=desc&filterByFormula=' +
    encodeURIComponent(formula);

  try {
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + pat } });
    if (!res.ok) {
      return json(200, { ok: true, records: [] });
    }
    const data = await res.json();
    return json(200, { ok: true, records: data.records || [] });
  } catch (e) {
    return json(200, { ok: true, records: [] });
  }
});
