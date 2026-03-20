// PROVA Systems — Admin Auth Function
// Prüft das Admin-Passwort serverseitig — Hash bleibt im Server, nie im Frontend

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiger Request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { hash } = body;
  if (!hash) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Hash aus Netlify Environment Variable — nie im Code
  const adminHash = Netlify.env.get('ADMIN_PASSWORD_HASH');
  if (!adminHash) {
    return new Response(JSON.stringify({ error: 'Server nicht konfiguriert' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const ok = hash === adminHash;

  return new Response(JSON.stringify({ ok }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  path: '/.netlify/functions/admin-auth'
};
