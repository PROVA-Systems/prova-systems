// PROVA Systems — Airtable Proxy Function
// Löst CORS: Browser → /.netlify/functions/airtable → Airtable API
// API-Key liegt sicher in Netlify Env Var AIRTABLE_PAT

exports.handler = async function(event) {
  // Nur POST erlaubt
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'AIRTABLE_PAT not configured in Netlify environment variables' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { method = 'GET', path, payload } = body;

  if (!path) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing path parameter' })
    };
  }

  // Whitelist: nur Airtable API-Pfade erlaubt
  if (!path.startsWith('/v0/')) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid API path' })
    };
  }

  const url = `https://api.airtable.com${path}`;

  const fetchOptions = {
    method: method,
    headers: {
      'Authorization': `Bearer ${pat}`,
      ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {})
    }
  };

  if (payload && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    fetchOptions.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Airtable API unreachable', detail: e.message })
    };
  }
};
