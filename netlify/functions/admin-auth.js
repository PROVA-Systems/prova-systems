// PROVA Systems — Admin Auth Function
// Vergleicht SHA-256 Hash des eingegebenen Passworts
// gegen ADMIN_PASSWORD_HASH in Netlify Env Vars

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedHash) {
    // Fallback: Hardcoded Hash (Selina_NOEL2025!)
    // Wird verwendet bis ADMIN_PASSWORD_HASH in Netlify gesetzt ist
    const fallbackHash = 'd4da837c5946bb39b6930baf2b95d0ffb4c273d600b045b95ae2500a38527119';
    let body;
    try { body = JSON.parse(event.body); } catch(e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: body.hash === fallbackHash })
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

  const { hash } = body;
  if (!hash) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing hash' })
    };
  }

  // Sicherer Vergleich
  const ok = hash.toLowerCase() === expectedHash.toLowerCase();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok })
  };
};
