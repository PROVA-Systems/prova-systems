// PROVA termin-reminder.js
// Wird von Make T3 aufgerufen — sendet Termin-Erinnerungen an SVs
// Sendet von PROVA-System-E-Mail (nicht SV-eigene SMTP — kein Passwort nötig)

const nodemailer = require('nodemailer');

exports.handler = async function(event) {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, X-PROVA-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  // Einfacher Shared-Secret Schutz
  const secret = event.headers['x-prova-secret'] || '';
  if (process.env.TERMIN_REMINDER_SECRET && secret !== process.env.TERMIN_REMINDER_SECRET) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { sv_email, termin_datum, termin_typ, objekt_adresse, aktenzeichen, tage_bis, auftragstyp } = body;

  if (!sv_email || !termin_datum) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'sv_email + termin_datum erforderlich' }) };
  }

  // System-SMTP aus ENV (IONOS von PROVA — kein Upgrade nötig, normales IONOS-Hosting)
  const host = process.env.IONOS_SMTP_HOST || 'smtp.ionos.de';
  const user = process.env.IONOS_SMTP_USER;
  const pass = process.env.IONOS_SMTP_PASS;

  if (!user || !pass) {
    return { statusCode: 503, headers: cors, body: JSON.stringify({
      error: 'System-SMTP nicht konfiguriert',
      hinweis: 'IONOS_SMTP_USER + IONOS_SMTP_PASS in Netlify ENV setzen'
    })};
  }

  // E-Mail-Inhalt nach Dringlichkeit
  const datum = new Date(termin_datum).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const farbe   = tage_bis <= 1 ? '#ef4444' : tage_bis <= 3 ? '#f59e0b' : '#4f8ef7';
  const emoji   = tage_bis <= 1 ? '🚨' : tage_bis <= 3 ? '⚠️' : '📅';
  const zeitStr = tage_bis <= 0 ? 'HEUTE' : tage_bis === 1 ? 'MORGEN' : 'in ' + tage_bis + ' Tagen';

  const subject = emoji + ' Termin ' + zeitStr + ': ' + (termin_typ || 'Ortstermin')
    + (aktenzeichen ? ' · Az.: ' + aktenzeichen : '');

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0b1120;border-radius:14px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,${farbe}22,${farbe}11);border-bottom:2px solid ${farbe};padding:20px 24px;">
      <div style="font-size:13px;font-weight:700;color:${farbe};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">
        ${emoji} Termin-Erinnerung · PROVA
      </div>
      <div style="font-size:20px;font-weight:800;color:#f1f5f9;">
        ${termin_typ || 'Ortstermin'} ${zeitStr}
      </div>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#64748b;font-size:12px;width:120px;">Datum & Uhrzeit</td>
            <td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#e8eaf0;font-weight:600;font-size:13px;">${datum}</td></tr>
        ${objekt_adresse ? `<tr><td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#64748b;font-size:12px;">Objekt</td>
            <td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#e8eaf0;font-size:13px;">${objekt_adresse}</td></tr>` : ''}
        ${aktenzeichen ? `<tr><td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#64748b;font-size:12px;">Aktenzeichen</td>
            <td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#4f8ef7;font-weight:700;font-size:13px;">${aktenzeichen}</td></tr>` : ''}
        ${auftragstyp ? `<tr><td style="padding:8px 0;color:#64748b;font-size:12px;">Auftragstyp</td>
            <td style="padding:8px 0;color:#e8eaf0;font-size:13px;">${auftragstyp}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;text-align:center;">
        <a href="https://prova-systems.de/termine.html" style="display:inline-block;background:${farbe};color:#fff;padding:12px 24px;border-radius:9px;text-decoration:none;font-weight:700;font-size:13px;">
          Alle Termine ansehen →
        </a>
      </div>
    </div>
    <div style="padding:12px 24px;border-top:1px solid #1e3a5f;font-size:10px;color:#374151;text-align:center;">
      PROVA Systems · Automatische Termin-Erinnerung · <a href="https://prova-systems.de" style="color:#4f8ef7;">prova-systems.de</a>
    </div>
  </div>`;

  try {
    const transporter = nodemailer.createTransport({
      host, port: 587, secure: false,
      auth: { user, pass }
    });
    await transporter.sendMail({
      from: '"PROVA Terminkalender" <' + user + '>',
      to: sv_email, subject,
      html, text: subject + '\n\n' + datum + '\n' + (objekt_adresse || '') + '\nAz.: ' + (aktenzeichen || '')
    });
    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true, to: sv_email }) };
  } catch(e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
