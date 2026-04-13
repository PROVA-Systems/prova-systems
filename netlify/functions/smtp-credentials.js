/**
 * PROVA — smtp-credentials.js
 * SMTP-Passwort sicher speichern und abrufen.
 * Das Passwort verlässt NIEMALS den Server unverschlüsselt.
 *
 * POST { smtp_pass, smtp_host, smtp_port, smtp_user, smtp_from_name }
 *   → verschlüsselt alles in Airtable SACHVERSTAENDIGE
 *
 * GET (intern, von smtp-senden.js gerufen)
 *   → entschlüsselt und gibt Credentials zurück
 *
 * Env: PROVA_SMTP_ENCRYPTION_KEY (64-char hex = 32 Byte AES-256)
 *      AIRTABLE_PAT, AIRTABLE_TOKEN
 */
const crypto = require('crypto');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

const AT_BASE  = process.env.AIRTABLE_BASE_ID  || 'appJ7bLlAHZoxENWE';
const AT_SV    = process.env.AIRTABLE_TABLE_SV  || 'tbladqEQT3tmx4DIB';
const AT_URL   = 'https://api.airtable.com';
const AT_PAT   = process.env.AIRTABLE_PAT       || process.env.AIRTABLE_TOKEN || '';
const ENC_KEY  = process.env.PROVA_SMTP_ENCRYPTION_KEY || '';

function getKey() {
  if (!ENC_KEY || ENC_KEY.length < 64) throw new Error('PROVA_SMTP_ENCRYPTION_KEY nicht gesetzt oder zu kurz');
  return Buffer.from(ENC_KEY.slice(0, 64), 'hex');
}

function encrypt(text) {
  const key = getKey();
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(stored) {
  const key = getKey();
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Ungültiges Cipher-Format');
  const iv  = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const enc = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

async function atFetch(path, options) {
  return fetch(AT_URL + path, {
    ...options,
    headers: { Authorization: 'Bearer ' + AT_PAT, 'Content-Type': 'application/json', ...(options.headers||{}) }
  });
}

async function findSvRecord(email) {
  const url = `/v0/${AT_BASE}/${AT_SV}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`;
  const res = await atFetch(url, { method: 'GET' });
  const d = await res.json();
  return d.records && d.records[0] ? d.records[0] : null;
}

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) {
    return { statusCode: 401, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const email = user.email.toLowerCase().trim();

  // ── POST: Passwort speichern ──────────────────────────────────────────────
  if (event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch(e) {}

    const { smtp_pass, smtp_host, smtp_port, smtp_user, smtp_from_name } = body;

    if (!smtp_pass) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'smtp_pass fehlt' }) };
    }

    let encPass;
    try { encPass = encrypt(smtp_pass); } catch(e) {
      return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Verschlüsselung fehlgeschlagen: ' + e.message }) };
    }

    const rec = await findSvRecord(email);
    if (!rec) {
      return { statusCode: 404, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'SV-Datensatz nicht gefunden' }) };
    }

    const fields = { smtp_pass_encrypted: encPass };
    if (smtp_host) fields.smtp_host = smtp_host;
    if (smtp_port) fields.smtp_port = Number(smtp_port) || 587;
    if (smtp_user) fields.smtp_user = smtp_user;
    if (smtp_from_name) fields.smtp_from_name = smtp_from_name;

    const patchRes = await atFetch(`/v0/${AT_BASE}/${AT_SV}/${rec.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields })
    });

    if (!patchRes.ok) {
      const err = await patchRes.json().catch(()=>({}));
      return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Airtable-Fehler: ' + (err.error && err.error.message || patchRes.status) }) };
    }

    return { statusCode: 200, headers: getCorsHeaders(event), body: JSON.stringify({ ok: true, message: 'SMTP-Zugangsdaten sicher gespeichert' }) };
  }

  // ── GET: Für internen Gebrauch (smtp-senden.js ruft diese Funktion auf) ──
  if (event.httpMethod === 'GET') {
    const rec = await findSvRecord(email);
    if (!rec) return { statusCode: 404, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Nicht gefunden' }) };

    const f = rec.fields;
    if (!f.smtp_pass_encrypted) {
      return { statusCode: 404, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Keine SMTP-Zugangsdaten gespeichert. Bitte in Einstellungen → E-Mail konfigurieren.' }) };
    }

    let pass;
    try { pass = decrypt(f.smtp_pass_encrypted); } catch(e) {
      return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Entschlüsselung fehlgeschlagen' }) };
    }

    return {
      statusCode: 200,
      headers: { ...getCorsHeaders(event), 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        ok: true,
        smtp_host:      f.smtp_host || '',
        smtp_port:      f.smtp_port || 587,
        smtp_user:      f.smtp_user || '',
        smtp_from_name: f.smtp_from_name || 'PROVA Systems',
        smtp_pass:      pass
      })
    };
  }

  return { statusCode: 405, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
