// ══════════════════════════════════════════════════
// PROVA Systems — E-Mail-Router Netlify Function
// Netlify Function: emails
// 
// Leitet E-Mail-Events an Make.com Webhooks weiter.
// Typen: willkommen, trial_erinnerung, kauf_bestaetigung
// ══════════════════════════════════════════════════

// Make.com Webhook-URLs (L1, L2, L3 Szenarien)
// WICHTIG: Diese URLs musst du nach dem Aktivieren der Szenarien in Make.com hier eintragen!
const WEBHOOKS = {
  willkommen:         process.env.MAKE_WEBHOOK_WILLKOMMEN || '',
  trial_erinnerung:   process.env.MAKE_WEBHOOK_TRIAL || '',
  kauf_bestaetigung:  process.env.MAKE_WEBHOOK_KAUF || '',
  support:            process.env.MAKE_WEBHOOK_SUPPORT || '',
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PROVA-Secret',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{"error":"Method Not Allowed"}' };

  try {
    const input = JSON.parse(event.body || '{}');
    const typ = input.typ;

    if (!typ) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Feld "typ" fehlt' }) };
    }

    const webhookUrl = WEBHOOKS[typ];

    if (!webhookUrl) {
      console.log(`E-Mail-Typ "${typ}" hat keinen Webhook konfiguriert — wird übersprungen.`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'Kein Webhook konfiguriert für: ' + typ }) };
    }

    // An Make.com weiterleiten
    // Schutz: interne Typen nur mit Secret oder JWT-Admin
    const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
      ? String(event.clientContext.user.email).toLowerCase()
      : '';
    const isAdmin = jwtEmail.endsWith('@prova-systems.de') || jwtEmail === 'admin@prova-systems.de';
    const secret = event.headers['x-prova-secret'] || '';
    const okSecret = process.env.EMAILS_SECRET && secret === process.env.EMAILS_SECRET;
    if (typ !== 'support' && !isAdmin && !okSecret) {
      return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'UNAUTHORIZED' }) };
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      console.error(`Make.com Webhook ${typ} fehlgeschlagen:`, res.status);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'Webhook fehlgeschlagen' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, typ }) };

  } catch (err) {
    console.error('emails function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
