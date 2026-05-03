/**
 * PROVA — smtp-senden.js v97
 * Direktversand via SV-eigenem SMTP.
 * Passwort wird NICHT aus dem Request-Body gelesen —
 * sondern intern aus smtp-credentials.js (AES-256-GCM verschlüsselt in Airtable).
 * Das Passwort verlässt den Server NIE im Klartext.
 */
const nodemailer = require('nodemailer');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const log = require('./lib/prova-logger');
const { fetchWithRetry } = require('./lib/fetch-with-timeout');
const { provaFetch } = require('./lib/prova-fetch');
const { requireAuth } = require('./lib/jwt-middleware');
const RateLimit = require('./lib/rate-limit-user');
const { isValidEmail } = require('./lib/auth-validate');

function json(event, status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(event) },
    body: JSON.stringify(obj)
  };
}

exports.handler = requireAuth(async function(event, context) {
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'Method Not Allowed' });

  // S6 X4 H-15: Rate-Limit — 50 Mails / Stunde / User (Spam-Schutz)
  const rl = RateLimit.check(context.userEmail, 50, 60 * 60, { event, functionName: 'smtp-senden' });
  if (!rl.allowed) {
    return json(event, 429, {
      error: 'Mail-Limit erreicht (max 50/h). Bitte ' + Math.ceil(rl.retryAfter / 60) + ' Min warten.',
      retryAfter: rl.retryAfter
    });
  }

  // P4B.7b: HMAC-Token-Email aus context.userEmail
  const user = { email: context.userEmail };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { to, subject, text, html, az } = body;
  if (!to || !subject || (!text && !html)) {
    return json(event, 400, { error: 'Pflichtfelder fehlen: to, subject, text/html' });
  }

  // S6 X4 H-20: Empfänger-Validation + CRLF-Injection-Schutz
  // Verhindert SMTP-Header-Injection (Bcc-Smuggling, Spoof-From, etc.)
  const toStr = String(to);
  if (toStr.includes('\r') || toStr.includes('\n') ||
      toStr.includes(',') || toStr.includes(';')) {
    return json(event, 400, { error: 'Ungültiger Empfänger (Multi-Recipients oder CRLF nicht erlaubt)' });
  }
  if (!isValidEmail(toStr)) {
    return json(event, 400, { error: 'Empfänger-Email-Format ungültig' });
  }
  const subjStr = String(subject);
  if (subjStr.length > 200) {
    return json(event, 400, { error: 'Subject zu lang (max 200 Zeichen)' });
  }
  if (subjStr.includes('\r') || subjStr.includes('\n')) {
    return json(event, 400, { error: 'CRLF im Subject verboten (Header-Injection-Schutz)' });
  }
  if ((text || html || '').length > 100000) {
    return json(event, 413, { error: 'Mail-Body zu groß (max 100k Zeichen)' });
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
    const credsRes = await provaFetch(credsUrl, {
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

    log.info({fn:'smtp',event:'sent',to:to.replace(/@.*/,'@…')}); return json(event, 200, { ok: true, message: 'E-Mail versendet an ' + to });
  } catch(e) {
    let tipp = '';
    if (e.message.includes('535') || e.message.includes('Authentication')) tipp = 'SMTP-Passwort prüfen.';
    else if (e.message.includes('ECONNREFUSED')) tipp = 'SMTP-Server nicht erreichbar.';
    log.error({fn:'smtp',event:'send_failed',err:e.message}); return json(event, 502, { ok: false, error: e.message, tipp });
  }
});
