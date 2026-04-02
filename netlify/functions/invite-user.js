// PROVA Systems — User Invite Function
// Lädt neue Sachverständige per E-Mail ein (Netlify Identity)
// Env Vars: NETLIFY_SITE_ID, NETLIFY_ACCESS_TOKEN

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const siteId = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_ACCESS_TOKEN;

  if (!siteId || !token) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'NETLIFY_SITE_ID or NETLIFY_ACCESS_TOKEN not configured' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const { email, name, paket = 'Solo' } = body;

  if (!email) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'E-Mail ist Pflichtfeld' })
    };
  }

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/identity/users/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invites: [{
          email,
          data: {
            full_name: name || email,
            paket: paket || 'Solo',
            onboarding_done: false
          }
        }]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.msg || 'Einladung fehlgeschlagen', detail: data })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: `Einladung an ${email} gesendet`, data })
    };

  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Netlify API nicht erreichbar', detail: e.message })
    };
  }
};
