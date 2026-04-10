/**
 * PROVA — SMTP (IONOS) mit Netlify Identity JWT + BRIEFE-Protokoll + Make K3
 * POST JSON: { az, empfaenger, to | empfaenger_email, betreff, typ, html_body, text_body? }
 * sv_email nur aus JWT — niemals aus dem Client übernehmen.
 */
const nodemailer = require('nodemailer');
const { hasProvaAccess } = require('./lib/prova-subscription');

const AIRTABLE_API = 'https://api.airtable.com';
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
const TABLE_BRIEFE = process.env.AIRTABLE_BRIEFE_TABLE || 'tblSzxvnkRE6B0thx';

function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(obj)
  };
}

async function appendBriefe(pat, fields) {
  const url = AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_BRIEFE;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + pat,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: fields })
  });
  if (!res.ok) {
    const t = await res.text().catch(function () {
      return '';
    });
    throw new Error('BRIEFE Airtable: ' + res.status + ' ' + t.slice(0, 400));
  }
}

async function appendAudit(pat, email, az, typ) {
  var tableAudit =
    process.env.PROVA_AUDIT_TRAIL_TABLE || process.env.AIRTABLE_AUDIT_TRAIL_TABLE || 'tbloeYUDuu0wRxpM8';
  try {
    await fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + tableAudit, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Typ: 'Brief',
          Email: email,
          AZ: az || '',
          Details: JSON.stringify({ brief_typ: typ || 'Sonstiges' }),
          Zeitstempel: new Date().toISOString(),
          IP_Hint: ''
        }
      })
    });
  } catch (e) {}
}

async function forwardMakeK3(payload) {
  const secret = process.env.PROVA_INTERNAL_WRITE_SECRET || '';
  const site = (process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '');
  if (site && secret) {
    try {
      await fetch(site + '/.netlify/functions/make-proxy?key=k3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-prova-internal': secret
        },
        body: JSON.stringify(payload)
      });
      return;
    } catch (e) {
      /* fallback direct */
    }
  }
  const wh = process.env.MAKE_WEBHOOK_K3 || '';
  if (!wh) return;
  try {
    await fetch(wh, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e2) {
    /* ignore */
  }
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) {
    return json(401, { error: 'Anmeldung erforderlich (Authorization: Bearer …)' });
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return json(500, { error: 'AIRTABLE_PAT nicht konfiguriert' });
  }

  const access = await hasProvaAccess(String(user.email).trim().toLowerCase(), pat);
  if (!access.ok) {
    return json(403, { error: 'Kein Zugriff — Testphase beendet oder kein aktives Abo', reason: access.reason });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Ungültiger JSON-Body' });
  }

  const svEmail = String(user.email).trim().toLowerCase();
  const to = String(body.to || body.empfaenger_email || '').trim();
  const betreff = String(body.betreff || '').trim();
  const htmlBody = String(body.html_body || body.html || '');
  const textBody = String(body.text_body || body.text || '').trim();
  const az = String(body.az || '').trim();
  const empfaengerName = String(body.empfaenger || '').trim().slice(0, 500);
  const typ = String(body.typ || 'Sonstiges').trim().slice(0, 200);

  if (!to || !betreff) {
    return json(400, { error: 'to (E-Mail) und betreff sind Pflicht' });
  }
  if (!htmlBody && !textBody) {
    return json(400, { error: 'html_body oder text_body erforderlich' });
  }

  const host = process.env.PROVA_SMTP_HOST || process.env.SMTP_HOST || '';
  const port = parseInt(process.env.PROVA_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.PROVA_SMTP_USER || process.env.SMTP_USER || '';
  const smtpPass = process.env.PROVA_SMTP_PASS || process.env.SMTP_PASS || process.env.IONOS_SMTP_PASS || '';
  const fromAddr = (process.env.PROVA_SMTP_FROM || process.env.SMTP_FROM || smtpUser || '').trim();

  if (!host || !smtpUser || !smtpPass || !fromAddr) {
    return json(500, { error: 'SMTP nicht konfiguriert (PROVA_SMTP_HOST, PROVA_SMTP_USER, PROVA_SMTP_PASS, PROVA_SMTP_FROM)' });
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const gesendetAmIso = new Date().toISOString();

  try {
    await transporter.sendMail({
      from: fromAddr,
      to: to,
      subject: betreff,
      text: textBody || undefined,
      html: htmlBody || undefined
    });
  } catch (err) {
    return json(502, { ok: false, error: 'SMTP-Versand fehlgeschlagen: ' + String(err && err.message ? err.message : err) });
  }

  const briefeFields = {
    AZ: az,
    sv_email: svEmail,
    Empfaenger: empfaengerName || to.split('@')[0] || 'Empfänger',
    Betreff: betreff.slice(0, 500),
    Typ: typ,
    Gesendet_Am: gesendetAmIso.slice(0, 10),
    Status: 'Gesendet'
  };

  try {
    await appendBriefe(pat, briefeFields);
  } catch (e1) {
    /* protokollieren trotzdem über Make */
  }

  await forwardMakeK3({
    az: az,
    sv_email: svEmail,
    typ: typ,
    empfaenger: briefeFields.Empfaenger,
    betreff: betreff,
    gesendet_am: gesendetAmIso
  });

  await appendAudit(pat, svEmail, az, typ);

  return json(200, { ok: true });
};
