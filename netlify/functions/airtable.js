// PROVA Systems — Airtable Proxy Function
// Hält den Airtable PAT sicher auf dem Server (nie im Frontend)
// Wird von app-starter.html, app-pro.html, freigabe.html aufgerufen

const AIRTABLE_BASE_URL = 'https://api.airtable.com';

exports.handler = async function (event) {
  // Nur POST erlaubt
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // PAT aus Netlify Environment Variable
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return { statusCode: 500, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht konfiguriert' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Request-Body' }) };
  }

  const { method = 'GET', path = '', body = null } = payload;

  // Nur Airtable-Pfade erlaubt (Sicherheit)
  if (!path.startsWith('/v0/')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Pfad' }) };
  }

  const url = AIRTABLE_BASE_URL + path;

  const fetchOptions = {
    method,
    headers: {
      'Authorization': 'Bearer ' + pat,
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Airtable nicht erreichbar: ' + err.message }),
    };
  }
};
