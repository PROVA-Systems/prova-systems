// PROVA smtp-test.js — SMTP-Verbindung testen (vor dem Speichern)
// Sendet eine Test-Mail an den SV selbst

const nodemailer = require('nodemailer');

exports.handler = async function(event) {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, fehler: 'Invalid JSON' }) }; }

  const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name } = body;

  if (!smtp_host || !smtp_user || !smtp_pass) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, fehler: 'Host, Benutzer und Passwort erforderlich' }) };
  }

  const port = parseInt(smtp_port) || 587;

  try {
    const transporter = nodemailer.createTransport({
      host:   smtp_host,
      port:   port,
      secure: port === 465,
      auth:   { user: smtp_user, pass: smtp_pass },
      tls:    { rejectUnauthorized: false }
    });

    // Verbindung prüfen
    await Promise.race([
      transporter.verify(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout nach 10s — Server nicht erreichbar')), 10000))
    ]);

    // Test-Mail an SV selbst
    await transporter.sendMail({
      from:    '"' + (from_name || 'PROVA Test') + '" <' + smtp_user + '>',
      to:      smtp_user,
      subject: '✅ PROVA E-Mail-Test erfolgreich',
      text:    'Ihre E-Mail-Verbindung in PROVA funktioniert korrekt.\n\nServer: ' + smtp_host + '\nPort: ' + port + '\n\nSie können jetzt Briefe direkt aus PROVA versenden.'
    });

    return { statusCode: 200, headers: cors, body: JSON.stringify({
      ok:       true,
      meldung:  'Test-Mail gesendet an ' + smtp_user,
      server:   smtp_host + ':' + port
    })};

  } catch(e) {
    // Sprechende Fehlermeldungen für häufige Fehler
    let tipp = '';
    const msg = e.message || '';
    if (msg.includes('535') || msg.includes('Authentication'))
      tipp = 'Benutzername oder Passwort falsch. Bei Gmail/GMX bitte App-Passwort verwenden.';
    else if (msg.includes('ECONNREFUSED') || msg.includes('Timeout'))
      tipp = 'Server nicht erreichbar. Bitte Host und Port prüfen.';
    else if (msg.includes('530') || msg.includes('STARTTLS'))
      tipp = 'Port 587 mit STARTTLS versuchen.';
    else
      tipp = 'Einstellungen prüfen oder App-Passwort erstellen.';

    return { statusCode: 200, headers: cors, body: JSON.stringify({
      ok:     false,
      fehler: msg,
      tipp:   tipp
    })};
  }
};
