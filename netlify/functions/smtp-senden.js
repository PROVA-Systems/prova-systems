/**
 * PROVA — smtp-senden.js v97
 * Direktversand via SV-eigenem SMTP.
 * Passwort wird NICHT aus dem Request-Body gelesen —
 * sondern intern aus smtp-credentials.js (AES-256-GCM verschlüsselt in Airtable).
 * Das Passwort verlässt den Server NIE im Klartext.
 */
const nodemailer = require('nodemailer');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

function json(event, status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(event) },
    body: JSON.stringify(obj)
  };
}

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'Method Not Allowed' });

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) return json(event, 401, { error: 'Anmeldung erforderlich' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { to, subject, text, html, az } = body;
  if (!to || !subject || (!text && !html)) {
    return json(event, 400, { error: 'Pflichtfelder fehlen: to, subject, text/html' });
  }

  // ── Credentials intern aus smtp-credentials.js laden ─────────────────────
  // Das Passwort kommt NIEMALS aus dem Frontend
  const internalSecret = process.env.PROVA_INTERNAL_WRITE_SECRET || '';
  const credsUrl = process.env.URL
    ? process.env.URL + '/.netlify/functions/smtp-credentials'
    : 'https://prova-systems.de/.netlify/functions/smtp-credentials';

  // JWT-Token aus clientContext weitergeben für Auth in smtp-credentials
  const authToken = (event.headers && event.headers.authorization) || '';

  let creds;
  try {
    const credsRes = await fetch(credsUrl, {
      method: 'GET',
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json'
      }
    });
    if (!credsRes.ok) {
      const err = await credsRes.json().catch(()=>({}));
      return json(event, 503, { error: 'SMTP nicht konfiguriert: ' + (err.error || 'Bitte in Einstellungen → E-Mail einrichten') });
    }
    creds = await credsRes.json();
  } catch(e) {
    return json(event, 503, { error: 'SMTP-Credentials nicht abrufbar: ' + e.message });
  }

  // Fallback auf ENV-Vars (für Systembetrieb ohne SV-Einstellungen)
  const host     = creds.smtp_host || process.env.PROVA_SMTP_HOST || '';
  const port     = parseInt(creds.smtp_port || process.env.PROVA_SMTP_PORT || '587');
  const smtpUser = creds.smtp_user || process.env.PROVA_SMTP_USER || '';
  const smtpPass = creds.smtp_pass || process.env.PROVA_SMTP_PASS || '';
  const fromName = creds.smtp_from_name || process.env.PROVA_SMTP_FROM_NAME || 'PROVA Systems';
  const fromAddr = smtpUser;

  if (!host || !smtpUser || !smtpPass) {
    return json(event, 503, { error: 'SMTP nicht vollständig konfiguriert. Bitte unter Einstellungen → E-Mail (SMTP) einrichten.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host, port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to, subject,
      text: text || '',
      html: html || undefined
    });

    return json(event, 200, { ok: true, message: 'E-Mail versendet an ' + to });
  } catch(e) {
    let tipp = '';
    if (e.message.includes('535') || e.message.includes('Authentication')) tipp = 'SMTP-Passwort prüfen.';
    else if (e.message.includes('ECONNREFUSED')) tipp = 'SMTP-Server nicht erreichbar.';
    return json(event, 502, { ok: false, error: e.message, tipp });
  }
};
