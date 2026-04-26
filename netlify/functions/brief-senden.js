// PROVA brief-senden.js v2 — leitet an smtp-senden.js weiter
// Kompatibilitäts-Wrapper: alte Aufrufe (briefvorlagen-logic.js) funktionieren weiterhin

const { requireAuth } = require('./lib/jwt-middleware');

exports.handler = requireAuth(async function(event, context) {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  // Nur eingeloggte User (SMTP wird weiter unten erneut abgesichert)
  const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  if (!jwtEmail) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  // Payload für smtp-senden aufbereiten
  const smtpPayload = {
    to:           body.empfaenger_email,
    betreff:      body.betreff,
    inhalt:       body.inhalt,
    from_name:    body.smtp_from_name || body.sv_name || '',
    from_email:   body.smtp_user      || body.sv_email || '',
    // SMTP-Credentials (werden vom Browser mitgeschickt wenn konfiguriert)
    smtp_host:    body.smtp_host  || '',
    smtp_port:    body.smtp_port  || 587,
    smtp_user:    body.smtp_user  || '',
    smtp_pass:    body.smtp_pass  || '',
    // Metadaten
    sv_email:     body.sv_email,
    aktenzeichen: body.aktenzeichen || '',
    brief_typ:    body.brief_typ    || 'Allgemein'
  };

  // Intern an smtp-senden weiterleiten
  const { handler } = require('./smtp-senden');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
  return handler({
    httpMethod: 'POST',
    body: JSON.stringify(smtpPayload)
  });
});
