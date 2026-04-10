// PROVA — Airtable Proxy; SV-Tabelle: nur mit gültigem Abo/Trial (serverseitig)
const AIRTABLE_BASE_URL = 'https://api.airtable.com';
const { hasProvaAccess, TABLE_SV } = require('./lib/prova-subscription.js');

function isSvTablePath(path) {
  return typeof path === 'string' && path.indexOf(TABLE_SV) >= 0;
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return { statusCode: 500, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht konfiguriert' }) };
  }

  let clientPayload;
  try {
    clientPayload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Request-Body' }) };
  }

  const method = (clientPayload.method || 'GET').toUpperCase();
  const path = clientPayload.path || '';
  const bodyForAirtable = Object.prototype.hasOwnProperty.call(clientPayload, 'body')
    ? clientPayload.body
    : clientPayload.payload;

  if (!path.startsWith('/v0/')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Pfad' }) };
  }

  const internal =
    (event.headers['x-prova-internal'] || event.headers['X-Prova-Internal'] || '').trim();
  const internalOk =
    process.env.PROVA_INTERNAL_WRITE_SECRET &&
    internal === process.env.PROVA_INTERNAL_WRITE_SECRET;

  if (isSvTablePath(path)) {
    if (!internalOk) {
      const user = context.clientContext && context.clientContext.user;
      if (!user || !user.email) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Anmeldung erforderlich (Authorization: Bearer …)' })
        };
      }
      const access = await hasProvaAccess(String(user.email).trim().toLowerCase(), pat);
      if (!access.ok) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Kein Zugriff — Testphase beendet oder kein aktives Abo', reason: access.reason })
        };
      }
    }
  }

  const url = AIRTABLE_API + path;

  const fetchOptions = {
    method,
    headers: {
      Authorization: 'Bearer ' + pat,
      'Content-Type': 'application/json'
    }
  };

  if (bodyForAirtable != null && method !== 'GET') {
    fetchOptions.body = JSON.stringify(bodyForAirtable);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Airtable nicht erreichbar: ' + err.message })
    };
  }
};
