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

const { resolveUser, logAuthFailure } = require('./lib/auth-resolve');

const AT_BASE        = 'appJ7bLlAHZoxENWE';
const AT_PUSH_TABLE  = 'PUSH_SUBSCRIPTIONS';   // Neue Tabelle anlegen
const AT_FAELLE      = 'tblSxV8bsXwd1pwa0';
const AT_TERMINE     = 'tblyMTTdtfGQjjmc2';

// S-SICHER P4B.6: Origin-Check fuer User-Actions.
// Allow-List der erlaubten Frontend-Origins. Make.com-Webhooks (send-fristen)
// und der oeffentliche vapid-key-Endpoint sind ausgenommen — sie haben
// entweder eigene Auth (geplant Sprint 04) oder sind public.
const ALLOWED_ORIGINS = [
  'https://prova-systems.de',
  'https://www.prova-systems.de',
  'https://app.prova-systems.de',
  'https://admin.prova-systems.de',
  'https://prova-systems.netlify.app',
  'http://localhost:8888',
  'http://localhost:3000'
];

function isAllowedOrigin(event) {
  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(function (o) {
    return origin === o || origin === (o + '/');
  });
}

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

  const { aktion, email, subscription, titel, nachricht, url, typ, prefs } = body;

  // Public/Webhook-Actions ohne Origin-Check + Auth
  if (aktion === 'vapid-key')    return handleVapidKey();
  if (aktion === 'send-fristen') return await handleFristenCheck(pat);

  // S-SICHER P4B.6: Origin-Check VOR JWT-Check.
  // Bei fremder/fehlender Origin: 403 ohne Hint warum (Security).
  if (!isAllowedOrigin(event)) {
    logAuthFailure('Origin-Block', event, {
      function: 'push-notify',
      origin: (event.headers && (event.headers.origin || event.headers.Origin)) || 'missing'
    });
    return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // JWT-Check
  const u = resolveUser(event);
  if (u.mismatch) {
    logAuthFailure('Auth-Mismatch', event, u.mismatch);
    return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'Auth-Mismatch: Token-Subject und Request-Identitaet stimmen nicht ueberein' }) };
  }
  if (!u.email) {
    logAuthFailure('Auth-Required', event, { function: 'push-notify' });
    return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'Authentifizierung erforderlich' }) };
  }

  // body.email muss mit Token-sub uebereinstimmen — User darf nur fuer
  // sich selbst Subscriptions/Sends triggern.
  if (email && String(email).toLowerCase() !== u.email) {
    logAuthFailure('Auth-Mismatch', event, {
      tokenEmail: u.email, otherEmail: String(email).toLowerCase(), otherSource: 'body.email'
    });
    return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'Auth-Mismatch: body.email weicht vom Token ab' }) };
  }
  // Wenn body.email fehlt: aus Token nehmen.
  const userEmail = (email && String(email).toLowerCase()) || u.email;

  switch (aktion) {
    case 'subscribe':    return await handleSubscribe(pat, userEmail, subscription);
    case 'unsubscribe':  return await handleUnsubscribe(pat, userEmail);
    case 'send':         return await handleSend(pat, userEmail, { titel, nachricht, url, typ });
    case 'save-prefs':   return await handleSavePrefs(pat, userEmail, prefs || {});
    case 'get-prefs':    return await handleGetPrefs(pat, userEmail);
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

// ══════════════════════════════════════════════════════════════════════════
// BENACHRICHTIGUNGS-PRÄFERENZEN v1.0 (Session 18)
// ══════════════════════════════════════════════════════════════════════════
// Speichert die Einstellungen pro User (bn_fristen/bn_zahlung/bn_stillezeit)
// als JSON-String im Feld `Prefs` der PUSH_SUBSCRIPTIONS-Tabelle.
//
// Wenn das Feld in Airtable nicht existiert, wird die Präferenz einfach nicht
// persistiert — das System fällt dann auf Defaults zurück (alles aktiv, keine
// Stillezeit). Marcel kann das Feld `Prefs` vom Typ "Long text" anlegen.
// ══════════════════════════════════════════════════════════════════════════

const DEFAULT_PREFS = {
  bn_fristen:    true,   // Default: Fristen-Pushes aktiv
  bn_zahlung:    true,   // Default: Zahlungs-Pushes aktiv
  bn_stillezeit: false,  // Default: keine Stillezeit (User muss aktivieren)
};

function parsePrefs(prefsField) {
  if (!prefsField) return { ...DEFAULT_PREFS };
  try {
    const parsed = typeof prefsField === 'string' ? JSON.parse(prefsField) : prefsField;
    return { ...DEFAULT_PREFS, ...(parsed || {}) };
  } catch (e) {
    return { ...DEFAULT_PREFS };
  }
}

function istStillezeit(prefs) {
  if (!prefs.bn_stillezeit) return false;
  // Europe/Berlin-Approximation — Netlify läuft in UTC, daher +1/+2h
  const nowUtc = new Date();
  const hour   = (nowUtc.getUTCHours() + 2) % 24;  // Sommerzeit-Offset; bei Bedarf dynamisch
  // Stillezeit: 22:00-08:00
  return hour >= 22 || hour < 8;
}

function shouldSend(prefs, typ) {
  if (istStillezeit(prefs)) return false;
  if (typ === 'fristen' && prefs.bn_fristen === false) return false;
  if (typ === 'zahlung' && prefs.bn_zahlung === false) return false;
  return true;
}

async function handleSavePrefs(pat, email, prefs) {
  if (!email) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'email erforderlich' }) };
  }
  try {
    const existing = await atFetch(pat,
      `/v0/${AT_BASE}/${AT_PUSH_TABLE}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`
    );
    const cleanPrefs = {
      bn_fristen:    prefs.bn_fristen    !== false,
      bn_zahlung:    prefs.bn_zahlung    !== false,
      bn_stillezeit: prefs.bn_stillezeit === true,
    };
    const prefsJson = JSON.stringify(cleanPrefs);

    if (existing.records && existing.records.length > 0) {
      // Update existierende Subscription
      await atPatch(pat, `/v0/${AT_BASE}/${AT_PUSH_TABLE}/${existing.records[0].id}`, {
        fields: { Prefs: prefsJson }
      });
    } else {
      // Noch kein Subscription-Record — Prefs parken ohne Subscription
      await atCreate(pat, `/v0/${AT_BASE}/${AT_PUSH_TABLE}`, {
        fields: { Email: email, Prefs: prefsJson, Aktiv: false }
      });
    }
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true, prefs: cleanPrefs }) };
  } catch (e) {
    // Airtable-Feld fehlt evtl. — trotzdem nicht blockieren
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: false, warning: e.message, prefs: DEFAULT_PREFS }) };
  }
}

async function handleGetPrefs(pat, email) {
  if (!email) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'email erforderlich' }) };
  }
  try {
    const result = await atFetch(pat,
      `/v0/${AT_BASE}/${AT_PUSH_TABLE}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`
    );
    const record = result.records?.[0];
    const prefs  = record ? parsePrefs(record.fields?.Prefs) : { ...DEFAULT_PREFS };
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ prefs }) };
  } catch (e) {
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ prefs: DEFAULT_PREFS, warning: e.message }) };
  }
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
async function handleSend(pat, email, { titel, nachricht, url, typ }) {
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

    // Präferenzen des Users prüfen — Typ-basiertes Filtering + Stillezeit
    const prefs = parsePrefs(result.records[0].fields?.Prefs);
    if (!shouldSend(prefs, typ)) {
      return {
        statusCode: 200,
        headers:    corsHeaders(),
        body: JSON.stringify({ success: true, gesendet: false, grund: istStillezeit(prefs) ? 'stillezeit' : 'pref_deaktiviert', typ: typ || 'allgemein' }),
      };
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

      // Subscription + Prefs laden
      const subResult = await atFetch(pat,
        `/v0/${AT_BASE}/${AT_PUSH_TABLE}?filterByFormula=${encodeURIComponent(`AND({Email}="${email}",{Aktiv}=TRUE())`)}&maxRecords=1`
      );

      if (!subResult.records?.length) continue;

      // User-Präferenzen prüfen — respektiert bn_fristen und Stillezeit
      const prefs = parsePrefs(subResult.records[0].fields?.Prefs);
      if (!shouldSend(prefs, 'fristen')) continue;

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

// ── Airtable Helpers ─────────────────────────────────────────────────────────
async function atFetch(pat, path) {
  const res = await fetch(`https://api.airtable.com${path}`, {
    headers: { 'Authorization': `Bearer ${pat}` }
  });
  return res.json();
}
async function atPost(pat, path, payload) {
  const res = await fetch(`https://api.airtable.com${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}
async function atPatch(pat, path, payload) {
  const res = await fetch(`https://api.airtable.com${path}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}
async function atDelete(pat, path) {
  await fetch(`https://api.airtable.com${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${pat}` }
  });
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}