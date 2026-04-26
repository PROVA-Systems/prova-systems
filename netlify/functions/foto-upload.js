/**
 * PROVA Systems — foto-upload.js (Netlify Function)
 * Foto-Upload direkt zu Airtable Attachments — OHNE Cloudinary
 * DSGVO-konform: Daten bleiben in Airtable (AVV vorhanden)
 *
 * Flow: dataUrl (base64) → Buffer → Airtable Attachment Upload API
 *       → {url} als Attachment in Schadenfall-Record
 *
 * ENV: AIRTABLE_PAT (bereits gesetzt)
 */
'use strict';

const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const { requireAuth } = require('./lib/jwt-middleware');

const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
const AT_FAELLE       = 'tblSxV8bsXwd1pwa0';
const AT_API          = 'https://api.airtable.com';

function json(event, status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(obj)
  };
}

/**
 * Schritt 1: Foto zu Airtable hochladen (multipart/form-data)
 * Gibt { id, url, filename } zurück
 */
async function uploadToAirtable(buffer, filename, mimeType, atKey) {
  const FormData = (await import('node:buffer')).Blob;

  // Boundary
  const boundary = '----PROVABoundary' + Date.now().toString(16);
  const CRLF     = '\r\n';

  // Multipart-Body manuell bauen (kein form-data npm nötig)
  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${mimeType}`,
    '',
    ''
  ].join(CRLF);

  const footer = `${CRLF}--${boundary}--${CRLF}`;

  const headerBuf = Buffer.from(header);
  const footerBuf = Buffer.from(footer);
  const body      = Buffer.concat([headerBuf, buffer, footerBuf]);

  // Airtable Attachment Upload Endpoint
  const uploadUrl = `${AT_API}/v0/${AIRTABLE_BASE}/${AT_FAELLE}/uploadAttachment`;
  const res = await fetch(uploadUrl, {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${atKey}`,
      'Content-Type':   `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body: body
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    // Fallback: Wenn Upload-Endpoint nicht verfügbar → URL-basiert
    if (res.status === 404 || res.status === 405) {
      return null; // Signal für Fallback
    }
    throw new Error(`Airtable Upload ${res.status}: ${txt.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Schritt 2: Attachment-URL in Record schreiben
 * Liest bestehende Fotos + hängt neues an (verhindert Überschreiben)
 */
async function appendAttachmentToRecord(recordId, attachmentUrl, filename, caption, atKey) {
  // Bestehende Fotos laden
  const getRes = await fetch(`${AT_API}/v0/${AIRTABLE_BASE}/${AT_FAELLE}/${recordId}?fields[]=Fotos&fields[]=Foto_Captions`, {
    headers: { 'Authorization': `Bearer ${atKey}` }
  });
  if (!getRes.ok) throw new Error(`GET Record ${getRes.status}`);
  const existing = await getRes.json();
  const fields   = existing.fields || {};

  const existingFotos = (fields.Fotos || []).map(a => ({ url: a.url }));
  existingFotos.push({ url: attachmentUrl, filename });

  const existingCaptions  = fields.Foto_Captions || '';
  const newCaption = caption
    ? (existingCaptions ? existingCaptions + '\n' : '') + `${filename}: ${caption}`
    : existingCaptions;

  const patchRes = await fetch(`${AT_API}/v0/${AIRTABLE_BASE}/${AT_FAELLE}/${recordId}`, {
    method:  'PATCH',
    headers: { 'Authorization': `Bearer ${atKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      fields: {
        Fotos:          existingFotos,
        Fotos_Anzahl:   existingFotos.length,
        Foto_Captions:  newCaption,
      }
    })
  });

  if (!patchRes.ok) {
    const err = await patchRes.text().catch(() => '');
    throw new Error(`PATCH Record ${patchRes.status}: ${err.slice(0, 200)}`);
  }
  return patchRes.json();
}

/**
 * Record-ID per Aktenzeichen suchen (mit JWT-Email-Sicherheitscheck)
 */
async function findRecordId(aktenzeichen, jwtEmail, atKey) {
  const formula  = `AND({Aktenzeichen}="${aktenzeichen}",{sv_email}="${jwtEmail}")`;
  const searchUrl = `${AT_API}/v0/${AIRTABLE_BASE}/${AT_FAELLE}`
    + `?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1&fields[]=Aktenzeichen`;

  const res  = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${atKey}` } });
  if (!res.ok) throw new Error(`Suche ${res.status}`);
  const data = await res.json();
  if (!data.records || !data.records[0]) throw new Error('Record nicht gefunden');
  return data.records[0].id;
}

// S-SICHER P4B.5: requireAuth wrap (kein Rate-Limit — Airtable selbst limitiert)
exports.handler = requireAuth(async function(event, context) {
  if (event.httpMethod !== 'POST')    return json(event, 405, { error: 'Method Not Allowed' });

  // JWT-Pflicht
  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) return json(event, 401, { error: 'Anmeldung erforderlich' });
  const jwtEmail = user.email.toLowerCase().trim();

  const atKey = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN || '';
  if (!atKey) return json(event, 500, { error: 'AIRTABLE_PAT fehlt' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch(e) { return json(event, 400, { error: 'Ungültiger JSON-Body' }); }

  const { record_id, aktenzeichen, datei, caption, data_url } = body;

  if (!data_url) return json(event, 400, { error: 'data_url fehlt' });
  if (!data_url.startsWith('data:image/')) return json(event, 400, { error: 'Nur Bilder erlaubt' });

  // Base64 extrahieren
  const match = data_url.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!match) return json(event, 400, { error: 'Ungültige DataURL' });
  const [, mimeType, base64Data] = match;

  if (base64Data.length > 13_000_000) return json(event, 413, { error: 'Foto zu groß (max 10MB)' });

  const buffer   = Buffer.from(base64Data, 'base64');
  const safeFile = (datei || `foto_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');

  // Record-ID ermitteln
  let actualRecordId = record_id;
  if (!actualRecordId && aktenzeichen) {
    try {
      actualRecordId = await findRecordId(aktenzeichen, jwtEmail, atKey);
    } catch(e) {
      return json(event, 404, { error: 'Kein Record für dieses AZ: ' + e.message });
    }
  }
  if (!actualRecordId) return json(event, 400, { error: 'record_id oder aktenzeichen erforderlich' });

  // Airtable Upload
  let uploadResult = null;
  try {
    uploadResult = await uploadToAirtable(buffer, safeFile, mimeType, atKey);
  } catch(e) {
    console.warn('[foto-upload] Airtable-Upload fehlgeschlagen:', e.message);
  }

  // Attachment URL: entweder vom Upload oder als data-URL Fallback
  const attachmentUrl = (uploadResult && uploadResult.url) || ('data:' + mimeType + ';base64,' + base64Data);

  // In Record schreiben
  try {
    await appendAttachmentToRecord(actualRecordId, attachmentUrl, safeFile, caption || '', atKey);
  } catch(e) {
    return json(event, 502, { error: 'Airtable-Update fehlgeschlagen: ' + e.message });
  }

  console.log(`[foto-upload] ✓ ${safeFile} → Record ${actualRecordId} für ${jwtEmail}`);
  return json(event, 200, {
    success:   true,
    url:       attachmentUrl,
    filename:  safeFile,
    record_id: actualRecordId,
  });
});
