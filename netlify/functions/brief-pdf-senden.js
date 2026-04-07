// PROVA brief-pdf-senden.js
// Flow: PROVA → PDFMonkey PDF generieren → nodemailer mit PDF-Attachment versenden
// SMTP-Credentials kommen vom Browser, PDFMonkey-Key aus ENV

const nodemailer = require('nodemailer');

const PDFMONKEY_KEY  = process.env.PDFMONKEY_API_KEY;
const BRIEF_TPL_ID   = process.env.PDFMONKEY_BRIEF_TEMPLATE_ID;
const K3_WEBHOOK     = process.env.MAKE_K3_WEBHOOK;

exports.handler = async function(event) {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const {
    // Brief-Inhalt
    to, betreff, inhalt,
    empfaenger_name, empfaenger_strasse, empfaenger_plz, empfaenger_ort,
    aktenzeichen, brief_typ,
    // SV-Profil für Letterhead
    sv_name, sv_firma, sv_strasse, sv_plz, sv_ort,
    sv_telefon, sv_email, sv_steuer_nr, sv_ort_fuer_sig,
    // SMTP-Credentials
    smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name,
  } = body;

  if (!to || !betreff || !inhalt) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'to, betreff, inhalt sind Pflicht' }) };
  }
  if (!PDFMONKEY_KEY || !BRIEF_TPL_ID) {
    return { statusCode: 503, headers: cors, body: JSON.stringify({ error: 'PDFMonkey nicht konfiguriert', code: 'NO_PDFMONKEY' }) };
  }
  if (!smtp_user || !smtp_pass) {
    return { statusCode: 422, headers: cors, body: JSON.stringify({ error: 'SMTP nicht konfiguriert', code: 'SMTP_NOT_CONFIGURED', link: '/einstellungen.html#email' }) };
  }

  // ── 1. PDFMonkey: PDF generieren ─────────────────────────────────────────
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dokumentDaten = {
    sv_name:          sv_name || '',
    sv_firma:         sv_firma || '',
    sv_strasse:       sv_strasse || '',
    sv_plz_ort:       [sv_plz, sv_ort].filter(Boolean).join(' '),
    sv_telefon:       sv_telefon || '',
    sv_email:         sv_email || '',
    sv_steuer_nr:     sv_steuer_nr || '',
    empfaenger_name:  empfaenger_name || '',
    empfaenger_strasse: empfaenger_strasse || '',
    empfaenger_plz_ort: [empfaenger_plz, empfaenger_ort].filter(Boolean).join(' '),
    datum:            heute,
    ort:              sv_ort_fuer_sig || sv_ort || '',
    betreff:          betreff,
    aktenzeichen:     aktenzeichen || '',
    inhalt:           inhalt,
    brief_typ:        brief_typ || '',
  };

  let pdfUrl = null;
  try {
    // Generierung anstoßen
    const genRes = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + PDFMONKEY_KEY
      },
      body: JSON.stringify({
        document: {
          document_template_id: BRIEF_TPL_ID,
          status: 'pending',
          payload: JSON.stringify(dokumentDaten),
          meta: { _filename: 'PROVA-Brief-' + (aktenzeichen || 'Schreiben') + '.pdf' }
        }
      })
    });
    const genData = await genRes.json();
    const docId = genData.document?.id;
    if (!docId) throw new Error('PDFMonkey: Kein Dokument-ID erhalten');

    // Polling bis PDF fertig (max 15s)
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch('https://api.pdfmonkey.io/api/v1/documents/' + docId, {
        headers: { 'Authorization': 'Bearer ' + PDFMONKEY_KEY }
      });
      const pollData = await pollRes.json();
      const status = pollData.document?.status;
      if (status === 'success') { pdfUrl = pollData.document.download_url; break; }
      if (status === 'error') throw new Error('PDFMonkey Generierungsfehler: ' + JSON.stringify(pollData.document.errors));
    }
    if (!pdfUrl) throw new Error('PDF-Generierung Timeout (15s)');
  } catch(e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'PDF-Generierung fehlgeschlagen: ' + e.message }) };
  }

  // ── 2. PDF herunterladen ──────────────────────────────────────────────────
  let pdfBuffer;
  try {
    const dlRes = await fetch(pdfUrl);
    const arrayBuf = await dlRes.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuf);
  } catch(e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'PDF-Download fehlgeschlagen: ' + e.message }) };
  }

  // ── 3. E-Mail mit PDF-Attachment versenden ────────────────────────────────
  const port = parseInt(smtp_port) || 587;
  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host, port, secure: port === 465,
      auth: { user: smtp_user, pass: smtp_pass },
      tls: { rejectUnauthorized: false }
    });
    await transporter.verify();

    const dateiname = 'PROVA-Brief-' + (aktenzeichen || 'Schreiben').replace(/[^a-z0-9äöü\-]/gi, '-') + '.pdf';
    await transporter.sendMail({
      from:    '"' + (smtp_from_name || sv_name || '').replace(/"/g, '') + '" <' + smtp_user + '>',
      to,
      subject: betreff,
      text:    inhalt,
      html:    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">'
               + inhalt.replace(/\n/g, '<br>') + '</div>'
               + '<br><hr style="margin-top:20px"><p style="font-size:11px;color:#666;">Brief als PDF im Anhang · Erstellt mit PROVA</p>',
      attachments: [{
        filename: dateiname,
        content:  pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  } catch(e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'E-Mail-Versand fehlgeschlagen: ' + e.message, tipp: 'App-Passwort prüfen' }) };
  }

  // ── 4. K3 Log (async) ─────────────────────────────────────────────────────
  if (K3_WEBHOOK) {
    fetch(K3_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sv_email, empfaenger_email: to, betreff, inhalt: inhalt.slice(0, 500),
        aktenzeichen: aktenzeichen || '', brief_typ: brief_typ || 'Allgemein', status: 'Gesendet'
      })
    }).catch(() => {});
  }

  return { statusCode: 200, headers: cors, body: JSON.stringify({
    success: true, absender: smtp_user, empfaenger: to, pdf_url: pdfUrl
  })};
};
