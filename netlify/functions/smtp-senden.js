// PROVA smtp-senden.js — Direktversand via SV-eigenem SMTP (nodemailer)
// Credentials kommen vom Browser, werden nie gespeichert
// Fallback: PROVA-eigener IONOS-Account

const nodemailer = require('nodemailer');

exports.handler = async function(event) {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    // Mail-Inhalt
    to, betreff, inhalt, from_name, from_email,
    // SMTP-Credentials des SV (optional — Fallback auf PROVA-SMTP)
    smtp_host, smtp_port, smtp_user, smtp_pass,
    // Metadaten für Log
    sv_email, aktenzeichen, brief_typ
  } = body;

  if (!to || !betreff || !inhalt) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'to, betreff und inhalt sind Pflicht' }) };
  }

  // Nur eingeloggte User dürfen SMTP nutzen (Missbrauch / Spam verhindern)
  const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  if (!jwtEmail) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };
  }

  // sv_email darf nicht frei behauptet werden
  const svEmailNorm = String(sv_email || '').toLowerCase().trim();
  if (svEmailNorm && svEmailNorm !== jwtEmail) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'FORBIDDEN' }) };
  }

  // ── SMTP-Konfiguration: SV-eigener Account hat Vorrang ──────────────────
  let transportConfig;
  let absenderEmail;
  let absenderName;

  const svHatSMTP = smtp_host && smtp_user && smtp_pass;

  if (svHatSMTP) {
    // SV's eigener SMTP — Mail kommt von seiner echten Adresse
    const port = parseInt(smtp_port) || 587;
    transportConfig = {
      host:   smtp_host,
      port:   port,
      secure: port === 465,
      auth:   { user: smtp_user, pass: smtp_pass },
      tls:    { rejectUnauthorized: false }
    };
    absenderEmail = from_email || smtp_user;
    absenderName  = from_name  || sv_email || '';
  } else {
    // Kein eigenes SMTP konfiguriert → klare Fehlermeldung mit direktem Link
    return { statusCode: 422, headers: cors, body: JSON.stringify({
      error: 'E-Mail-Versand nicht eingerichtet',
      code:  'SMTP_NOT_CONFIGURED',
      hinweis: 'Bitte richten Sie Ihren E-Mail-Account unter Einstellungen → E-Mail-Versand ein.',
      link: '/einstellungen.html#email'
    })};
  }

  // ── Mail senden ──────────────────────────────────────────────────────────
  let gesendet = false;
  let fehler    = null;

  try {
    const transporter = nodemailer.createTransport(transportConfig);

    // Verbindung prüfen (max 8s Timeout)
    await Promise.race([
      transporter.verify(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('SMTP Timeout (8s)')), 8000))
    ]);

    const mail = {
      from:    '"' + absenderName.replace(/"/g, '') + '" <' + absenderEmail + '>',
      to:      to,
      subject: betreff,
      text:    inhalt,
      html:    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">' + inhalt.replace(/\n/g,'<br>') + '</div>',
      replyTo: svHatSMTP ? absenderEmail : (sv_email || absenderEmail)
    };

    await transporter.sendMail(mail);
    gesendet = true;

  } catch(e) {
    fehler = e.message;
    console.error('[smtp-senden] Fehler:', e.message);
  }

  // ── K3 Webhook für Airtable-Log (async, egal ob Send OK oder nicht) ─────
  const K3 = process.env.MAKE_K3_WEBHOOK;
  if (K3) {
    fetch(K3, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sv_email:         sv_email || absenderEmail,
        empfaenger_email: to,
        betreff:          betreff,
        inhalt:           inhalt.slice(0, 2000),
        aktenzeichen:     aktenzeichen || '',
        brief_typ:        brief_typ || 'Allgemein',
        status:           gesendet ? 'Gesendet' : 'Fehler'
      })
    }).catch(() => {});
  }

  if (!gesendet) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({
      error: fehler,
      smtp_host: smtp_host || 'PROVA-Fallback',
      tipp: smtp_pass ? 'Bitte App-Passwort prüfen' : 'SMTP-Passwort fehlt'
    })};
  }

  return { statusCode: 200, headers: cors, body: JSON.stringify({
    success:     true,
    absender:    absenderEmail,
    empfaenger:  to,
    via:         svHatSMTP ? 'eigener-smtp' : 'prova-fallback'
  })};
};
