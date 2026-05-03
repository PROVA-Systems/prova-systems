// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — emails.js
// FIX #005: CORS wildcard entfernt → process.env.URL
// FIX #006: support-Webhook als env-Variable (kein Hardcode-Fallback)
// ══════════════════════════════════════════════════════════════════════════════

// WICHTIG: Alle Webhooks als Netlify Env-Variablen setzen:
// MAKE_WEBHOOK_WILLKOMMEN, MAKE_WEBHOOK_TRIAL, MAKE_WEBHOOK_KAUF, MAKE_WEBHOOK_SUPPORT
const { requireAuth } = require('./lib/jwt-middleware');

const WEBHOOKS = {
  willkommen:         process.env.MAKE_WEBHOOK_WILLKOMMEN || '',
  trial_erinnerung:   process.env.MAKE_WEBHOOK_TRIAL      || '',
  kauf_bestaetigung:  process.env.MAKE_WEBHOOK_KAUF       || '',
  support:            process.env.MAKE_WEBHOOK_SUPPORT    || '',  // FIX: kein Hardcode-Fallback
};

exports.handler = requireAuth(async (event, context) => {
  const allowedOrigin = process.env.URL || 'https://prova-systems.de'; // FIX: kein Wildcard
  const headers = {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  // JWT-Auth prüfen (Netlify Identity)
  const jwtUser = event.clientContext && event.clientContext.user;
  const jwtEmail = jwtUser ? String(jwtUser.email).toLowerCase() : '';
  const isAdmin = jwtEmail.endsWith('@prova-systems.de');

  // Geheimnis-Token für interne Aufrufe (z.B. Stripe-Webhook)
  const okSecret = (event.headers['x-prova-secret'] || '') === (process.env.PROVA_INTERNAL_SECRET || '');

  try {
    const body = JSON.parse(event.body || '{}');
    const { typ } = body;

    // S6 X4 H-19: Whitelist + Format-Checks
    const ALLOWED_TYPES = ['willkommen', 'trial_erinnerung', 'kauf_bestaetigung', 'support'];
    if (!typ || !ALLOWED_TYPES.includes(typ)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Feld "typ" fehlt oder ungueltig (erlaubt: ' + ALLOWED_TYPES.join(', ') + ')' }) };
    }

    // Email-Format-Check (verhindert Header-Injection wenn Email weitergeleitet)
    const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (body.email && (typeof body.email !== 'string' || !EMAIL_RE.test(body.email) || body.email.length > 254)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email-Format ungueltig' }) };
    }
    // CRLF-Injection-Schutz fuer Subject + Body
    if (body.subject && (String(body.subject).includes('\r') || String(body.subject).includes('\n') || String(body.subject).length > 200)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Subject ungueltig (CRLF oder zu lang)' }) };
    }
    // Body-Size-Limit
    const bodyText = body.body || body.text || body.html || '';
    if (String(bodyText).length > 10000) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'Body zu gross (max 10k)' }) };
    }

    // Support-Emails: jeder angemeldete User darf; andere Typen nur Admin oder interner Aufruf
    if (typ !== 'support' && !isAdmin && !okSecret) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };
    }

    const webhookUrl = WEBHOOKS[typ];
    if (!webhookUrl) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'Kein Webhook konfiguriert für: ' + typ }) };
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'Webhook fehlgeschlagen' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, typ }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
});