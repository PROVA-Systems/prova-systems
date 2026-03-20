// Netlify Function: invite-user.js
// Lädt einen neuen Nutzer per GoTrue Admin-API ein
// Erwartet env var: INVITE_SECRET (Make.com muss diesen Header mitsenden)
// POST /.netlify/functions/invite-user
// Body: { "email": "sv@beispiel.de", "name": "Max Mustermann", "paket": "Starter", "secret": "..." }

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event, context) => {
  // Nur POST erlaubt
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  // Secret prüfen (Make.com muss diesen Wert mitsenden)
  const secret = process.env.INVITE_SECRET;
  if (!secret) return json(500, { error: 'INVITE_SECRET nicht konfiguriert' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Ungültiger JSON-Body' });
  }

  const { email, name, paket, secret: incomingSecret } = payload;

  // Sicherheit: Secret abgleichen
  if (!incomingSecret || incomingSecret !== secret) {
    return json(401, { error: 'Nicht autorisiert' });
  }

  // Pflichtfeld E-Mail
  if (!email || !email.includes('@')) {
    return json(400, { error: 'Ungültige E-Mail-Adresse' });
  }

  // GoTrue Admin-Token aus Netlify Identity Context
  // Dieser Token ist nur in Netlify Functions verfügbar wenn Identity aktiviert ist
  const identity = context?.clientContext?.identity;
  if (!identity?.token || !identity?.url) {
    return json(500, { error: 'Netlify Identity nicht konfiguriert oder kein Admin-Token verfügbar' });
  }

  try {
    // GoTrue /invite Endpoint aufrufen
    const res = await fetch(`${identity.url}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${identity.token}`,
      },
      body: JSON.stringify({
        email,
        data: {
          full_name: name || '',
          paket: paket || 'Starter',
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Bereits eingeladen / existiert schon → kein Fehler für Make.com
      if (data?.msg?.includes('already') || data?.code === 422) {
        return json(200, { ok: true, status: 'already_invited', email });
      }
      return json(res.status, { error: data?.msg || 'GoTrue Fehler', detail: data });
    }

    return json(200, {
      ok: true,
      status: 'invited',
      email,
      user_id: data?.id,
    });

  } catch (e) {
    return json(500, { error: 'Netzwerkfehler', detail: String(e?.message || e) });
  }
};
