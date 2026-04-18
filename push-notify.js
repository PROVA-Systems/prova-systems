// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Web Push Notifications
// Netlify Function: push-notify
//
// Aktionen:
//   subscribe    → Push-Subscription in Airtable speichern
//   unsubscribe  → Subscription löschen
//   send         → Push an einzelnen User oder alle (Admin)
//   send-fristen → Täglicher Fristen-Check (von Make.com S8 getriggert)
//
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, AIRTABLE_PAT
//
// VAPID Keys generieren:
//   npx web-push generate-vapid-keys
// ══════════════════════════════════════════════════════════════════════════════

const AT_BASE        = 'appJ7bLlAHZoxENWE';
const AT_PUSH_TABLE  = 'PUSH_SUBSCRIPTIONS';   // Neue Tabelle anlegen
const AT_FAELLE      = 'tblSxV8bsXwd1pwa0';
const AT_TERMINE     = 'tblyMTTdtfGQjjmc2';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'AIRTABLE_PAT fehlt' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Ungültiger JSON' }) }; }

  const { aktion, email, subscription, titel, nachricht, url } = body;

  switch (aktion) {
    case 'subscribe':    return await handleSubscribe(pat, email, subscription);
    case 'unsubscribe':  return await handleUnsubscribe(pat, email);
    case 'send':         return await handleSend(pat, email, { titel, nachricht, url });
    case 'send-fristen': return await handleFristenCheck(pat);
    case 'vapid-key':    return handleVapidKey();
    default:
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: `Unbekannte Aktion: ${aktion}` }) };
  }
};

// ── VAPID Public Key liefern (für Client-seitiges Subscribe) ────────────────
function handleVapidKey() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'VAPID_PUBLIC_KEY nicht konfiguriert' }) };
  }
  return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ publicKey: key }) };
}

// ── Push-Subscription speichern ─────────────────────────────────────────────
async function handleSubscribe(pat, email, subscription) {
  if (!email || !subscription) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'email und subscription erforderlich' }) };
  }

  try {
    // Prüfen ob bereits vorhanden
    const existing = await atFetch(pat,
      `/v0/${AT_BASE}/${AT_PUSH_TABLE}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`
    );

    const fields = {
      Email:        email,
      Subscription: JSON.stringify(subscription),
      Endpoint:     subscription.endpoint,
      Aktiv:        true,
      Erstellt:     new Date().toISOString(),
      UserAgent:    subscription.userAgent || '',
    };

    if (existing.records?.length > 0) {
      // Update existing
      await atPatch(pat, `/v0/${AT_BASE}/${AT_PUSH_TABLE}/${existing.records[0].id}`, { fields });
    } else {
      // Create new
      await atPost(pat, `/v0/${AT_BASE}/${AT_PUSH_TABLE}`, { records: [{ fields }] });
    }

    console.log(`[Push] Subscription gespeichert: ${email}`);
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true }) };

  } catch (e) {
    // Airtable-Fehler sauber durchreichen mit klarer Diagnose für den Client
    if (e instanceof AirtableError) {
      console.error('[Push] Airtable-Fehler beim Subscribe:', e.status, e.body);
      const hint = (e.status === 404 || e.status === 403)
        ? `Airtable-Tabelle "${AT_PUSH_TABLE}" existiert nicht oder ist nicht erreichbar. Bitte in Airtable anlegen mit Feldern: Email (Text), Subscription (Long text), Endpoint (URL), Aktiv (Checkbox), Erstellt (Date), UserAgent (Text).`
        : 'Airtable-Zugriff fehlgeschlagen — bitte AIRTABLE_PAT-Env-Variable prüfen.';
      return {
        statusCode: 503,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Push-Infrastruktur nicht konfiguriert', hint, airtable_status: e.status })
      };
    }
    console.error('[Push] Subscribe Fehler:', e.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
}

// ── Push-Subscription löschen ───────────────────────────────────────────────
async function handleUnsubscribe(pat, email) {
  if (!email) return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'email erforderlich' }) };

  try {
    const existing = await atFetch(pat,
      `/v0/${AT_BASE}/${AT_PUSH_TABLE}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`
    );
    if (existing.records?.length > 0) {
      await atDelete(pat, `/v0/${AT_BASE}/${AT_PUSH_TABLE}/${existing.records[0].id}`);
    }
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
}

// ── Push-Notification senden ─────────────────────────────────────────────────
async function handleSend(pat, email, { titel, nachricht, url }) {
  if (!email || !titel) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'email und titel erforderlich' }) };
  }

  const webpush = requireWebPush();
  if (!webpush) return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'web-push nicht installiert' }) };

  try {
    const result = await atFetch(pat,
      `/v0/${AT_BASE}/${AT_PUSH_TABLE}?filterByFormula=${encodeURIComponent(`AND({Email}="${email}",{Aktiv}=TRUE())`)}&maxRecords=1`
    );

    if (!result.records?.length) {
      return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Keine aktive Subscription für diesen User' }) };
    }

    const sub  = JSON.parse(result.records[0].fields.Subscription || '{}');
    const sent = await sendPush(webpush, sub, { titel, nachricht, url });

    return {
      statusCode: 200,
      headers:    corsHeaders(),
      body: JSON.stringify({ success: true, gesendet: sent }),
    };
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
}

// ── Täglicher Fristen-Check (von Make.com S8 oder Cron getriggert) ──────────
async function handleFristenCheck(pat) {
  const webpush = requireWebPush();
  if (!webpush) return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'web-push nicht installiert' }) };

  try {
    const heute     = new Date();
    const in7Tagen  = new Date(heute); in7Tagen.setDate(in7Tagen.getDate() + 7);
    const in3Tagen  = new Date(heute); in3Tagen.setDate(in3Tagen.getDate() + 3);
    const in1Tag    = new Date(heute); in1Tag.setDate(in1Tag.getDate() + 1);

    const formatDatum = (d) => d.toISOString().split('T')[0];

    // Alle Termine mit Frist in den nächsten 7 Tagen laden
    const formel = `AND({frist_datum}>"${formatDatum(heute)}",{frist_datum}<="${formatDatum(in7Tagen)}",{Status}!="Aktiv")`;
    const termine = await atFetch(pat,
      `/v0/${AT_BASE}/${AT_TERMINE}?filterByFormula=${encodeURIComponent(formel)}&fields[]=frist_datum&fields[]=SV_Email&fields[]=Betreff&fields[]=az`
    );

    let gesendet = 0;
    const errors = [];

    for (const termin of (termine.records || [])) {
      const f       = termin.fields;
      const email   = f.sv_email;
      const frist   = new Date(f.frist_datum);
      const tage    = Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
      const betreff = f.Betreff || 'Frist';
      const az      = f.az || '';

      // Nur bei 7, 3, 1 Tag(en) notifizieren
      if (![7, 3, 1].includes(tage)) continue;

      // Subscription laden
      const subResult = await atFetch(pat,
        `/v0/${AT_BASE}/${AT_PUSH_TABLE}?filterByFormula=${encodeURIComponent(`AND({Email}="${email}",{Aktiv}=TRUE())`)}&maxRecords=1`
      );

      if (!subResult.records?.length) continue;

      const sub = JSON.parse(subResult.records[0].fields.Subscription || '{}');
      if (!sub.endpoint) continue;

      // Push-Nachricht je nach Dringlichkeit
      const dringlichkeit = tage === 1 ? '🔴 DRINGEND' : tage === 3 ? '🟡 Bald fällig' : '🟢 Frist';
      const payload = {
        titel:    `${dringlichkeit}: ${betreff}`,
        nachricht: `${az ? `AZ: ${az} · ` : ''}Noch ${tage} Tag${tage === 1 ? '' : 'e'} bis zur Frist`,
        url:      `/termine.html${az ? `?az=${encodeURIComponent(az)}` : ''}`,
        badge:    '/icons/icon-192.svg',
        tag:      `frist-${az || betreff}-${formatDatum(frist)}`,  // Doppelte Push verhindern
      };

      try {
        await sendPush(webpush, sub, payload);
        gesendet++;
      } catch (e) {
        errors.push({ email, error: e.message });

        // Expired Subscription aufräumen
        if (e.statusCode === 410 || e.statusCode === 404) {
          await atDelete(pat, `/v0/${AT_BASE}/${AT_PUSH_TABLE}/${subResult.records[0].id}`)
            .catch(() => {});
        }
      }
    }

    console.log(`[Push] Fristen-Check: ${gesendet} Notifications gesendet, ${errors.length} Fehler`);
    return {
      statusCode: 200,
      headers:    corsHeaders(),
      body: JSON.stringify({ success: true, gesendet, errors }),
    };

  } catch (e) {
    console.error('[Push] Fristen-Check Fehler:', e);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
}

// ── Push senden (web-push Bibliothek) ───────────────────────────────────────
async function sendPush(webpush, subscription, { titel, nachricht, url, badge, tag }) {
  const payload = JSON.stringify({
    title:   titel,
    body:    nachricht,
    icon:    '/icons/icon-192.svg',
    badge:   badge  || '/icons/icon-192.svg',
    url:     url    || '/dashboard.html',
    tag:     tag    || 'prova-notification',
    data:    { url: url || '/dashboard.html' },
    actions: [
      { action: 'oeffnen', title: 'Öffnen' },
      { action: 'spaeter', title: 'Später' },
    ],
  });

  await webpush.sendNotification(subscription, payload);
  return true;
}

// ── web-push laden (optional installiert) ───────────────────────────────────
function requireWebPush() {
  try {
    const webpush = require('web-push');
    const pub  = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || 'mailto:hallo@prova-systems.de';

    if (!pub || !priv) {
      console.error('[Push] VAPID_PUBLIC_KEY oder VAPID_PRIVATE_KEY fehlt');
      return null;
    }

    webpush.setVapidDetails(subj, pub, priv);
    return webpush;
  } catch (e) {
    console.error('[Push] web-push nicht installiert:', e.message);
    return null;
  }
}

// ── Airtable Helpers (mit Status-Check, damit Fehler nicht silent durchlaufen) ─
class AirtableError extends Error {
  constructor(status, body) {
    super(`Airtable ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body   = body;
  }
}

async function atFetch(pat, path) {
  const res = await fetch(`https://api.airtable.com${path}`, {
    headers: { 'Authorization': `Bearer ${pat}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AirtableError(res.status, data);
  return data;
}
async function atPost(pat, path, payload) {
  const res = await fetch(`https://api.airtable.com${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AirtableError(res.status, data);
  return data;
}
async function atPatch(pat, path, payload) {
  const res = await fetch(`https://api.airtable.com${path}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AirtableError(res.status, data);
  return data;
}
async function atDelete(pat, path) {
  const res = await fetch(`https://api.airtable.com${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${pat}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new AirtableError(res.status, data);
  }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}