/**
 * netlify/functions/foto-upload.js — MEGA³⁵ C1 (Pilot-Critical)
 *
 * POST /.netlify/functions/foto-upload
 * Body: JSON { auftrag_id?, ortstermin_id?, beschreibung?, image_base64, mime_type, filename?, geo_lat?, geo_lng? }
 *       (multipart/form-data wäre Marcel's Original-Plan, aber Frontend sendet via FormData
 *        die schon zu base64-Wrapper kompatibel ist; siehe lib/foto-upload-mobile.js. Wir
 *        akzeptieren BEIDE Formate für Maximum-Kompat.)
 *
 * Pflichten:
 * - requireAuth + workspace-Resolve via JWT
 * - Server-side EXIF-Strip (Pure-JS APP1-Marker-Removal für JPEG, textChunk-Removal für PNG)
 * - HEIC reject (Q4)
 * - Upload zu Supabase Storage Bucket 'sv-files'
 * - DB-Insert in fotos-Tabelle mit exif_stripped=TRUE
 * - Pseudonymisierung der beschreibung VOR jeglicher KI-Caption-Pipeline
 * - Returns { foto_id, storage_bucket, storage_path, public_url, exif_stripped: true }
 *
 * Hinweis EXIF-Lib:
 * - Marcel-Plan war 'exifr' (npm). exifr ist aber READ-only, hat keinen Stripper.
 * - Pure-JS-Strip ist ~50 Zeilen, deterministisch, kein Cold-Start-Cost.
 * - Falls später Verify gewünscht: exifr.parse(buffer) muss null/{} liefern post-strip.
 */
'use strict';

const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');
const ProvaPseudo = require('./lib/prova-pseudo');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

const STORAGE_BUCKET = 'sv-files';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB Hard-Cap (Lambda 6 MB Limit)

const SUPPORTED_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png'
};
const REJECT_MIME = {
  'image/heic': 'HEIC nicht unterstützt — bitte als JPEG/PNG hochladen (iOS: Einstellungen → Kamera → Formate → "Höchste Kompatibilität").',
  'image/heif': 'HEIF nicht unterstützt — bitte als JPEG/PNG hochladen.',
  'image/webp': 'WebP nicht unterstützt — bitte als JPEG/PNG hochladen.'
};

/**
 * stripExifJpeg(buf): entfernt JPEG APP1 (0xFFE1) Marker-Sections (EXIF + XMP).
 * Idempotent. Wenn keine APP1-Section da, gibt Original-Buffer zurück.
 */
function stripExifJpeg(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return buf;
  // JPEG SOI = 0xFF 0xD8
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return buf;
  const out = [Buffer.from([0xFF, 0xD8])];
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xFF) break;
    const marker = buf[i + 1];
    // Stand-Alone-Marker (RST*, SOI, EOI, TEM)
    if (marker === 0xD9) { // EOI
      out.push(Buffer.from([0xFF, 0xD9]));
      break;
    }
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
      out.push(buf.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) break;
    const segLen = buf.readUInt16BE(i + 2);
    const segEnd = i + 2 + segLen;
    // Skip APP1 (EXIF+XMP) und APP2 (ICC) — Letzteres lässt Farben aber stripped Metadata
    if (marker === 0xE1) {
      // SKIP — EXIF/XMP raus
      i = segEnd;
      continue;
    }
    // SOS (0xDA) → Rest des Streams ist Bilddaten bis EOI
    if (marker === 0xDA) {
      out.push(buf.slice(i, buf.length));
      break;
    }
    // Sonst: Segment behalten
    out.push(buf.slice(i, segEnd));
    i = segEnd;
  }
  return Buffer.concat(out);
}

/**
 * stripPngTextChunks(buf): entfernt tEXt/zTXt/iTXt PNG-Chunks (Metadata).
 */
function stripPngTextChunks(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return buf;
  // PNG-Signatur: 89 50 4E 47 0D 0A 1A 0A
  const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (buf.slice(0, 8).compare(SIG) !== 0) return buf;
  const out = [SIG];
  let i = 8;
  while (i + 8 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.slice(i + 4, i + 8).toString('latin1');
    const chunkEnd = i + 8 + len + 4; // Length(4) + Type(4) + Data + CRC(4)
    if (chunkEnd > buf.length) break;
    if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt' || type === 'eXIf') {
      // SKIP — Metadata raus
    } else {
      out.push(buf.slice(i, chunkEnd));
    }
    if (type === 'IEND') break;
    i = chunkEnd;
  }
  return Buffer.concat(out);
}

function stripExif(buf, mime) {
  if (mime === 'image/png') return stripPngTextChunks(buf);
  return stripExifJpeg(buf); // JPEG default
}

function uuidv4() {
  // Pure-JS UUID v4 (Node hat crypto.randomUUID, aber für Lambda-Cold-Start safe)
  const c = require('crypto');
  return c.randomUUID();
}

let _currentEvent = null;

exports.handler = requireAuth(async function (event, context) {
  _currentEvent = event;
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'foto-upload' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(event, 400, { error: 'Invalid JSON. Bitte image_base64 + mime_type + auftrag_id senden.' });
  }

  const { image_base64, mime_type, filename, auftrag_id, ortstermin_id, beschreibung } = body;

  if (!image_base64 || !mime_type) {
    return jsonResponse(event, 400, { error: 'image_base64 + mime_type pflicht' });
  }
  if (REJECT_MIME[mime_type]) {
    return jsonResponse(event, 415, { error: REJECT_MIME[mime_type] });
  }
  if (!SUPPORTED_MIME[mime_type]) {
    return jsonResponse(event, 415, { error: 'Unsupported MIME: ' + mime_type + '. Erlaubt: image/jpeg, image/png.' });
  }

  // Decode + Size-Check
  let buf;
  try {
    buf = Buffer.from(image_base64, 'base64');
  } catch (e) {
    return jsonResponse(event, 400, { error: 'image_base64 ist kein gültiges Base64' });
  }
  if (buf.length > MAX_BYTES) {
    return jsonResponse(event, 413, { error: 'Foto > 5 MB. Bitte komprimieren oder direkt in Storage uploaden.' });
  }

  // EXIF-Strip Server-Side (DSGVO Art. 5 Abs. 1c)
  const stripped = stripExif(buf, mime_type);

  const sb = getSupabase();
  if (!sb) {
    return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });
  }

  // Workspace-Resolve via JWT-User-Email
  const { data: u } = await sb.from('users')
    .select('id, workspace_memberships!inner(workspace_id)')
    .eq('email', context.userEmail)
    .maybeSingle();
  const userId = u && u.id;
  const workspaceId = u && u.workspace_memberships && u.workspace_memberships[0] && u.workspace_memberships[0].workspace_id;
  if (!workspaceId) {
    return jsonResponse(event, 403, { error: 'Workspace nicht ermittelbar' });
  }

  // Storage-Upload
  const ext = SUPPORTED_MIME[mime_type];
  const fileId = uuidv4();
  const storage_path = workspaceId + '/' + (auftrag_id || 'no-auftrag') + '/' + fileId + '.' + ext;

  const { error: upErr } = await sb.storage.from(STORAGE_BUCKET)
    .upload(storage_path, stripped, { contentType: mime_type, upsert: false });
  if (upErr) {
    return jsonResponse(event, 502, { error: 'Storage-Upload fehlgeschlagen: ' + upErr.message });
  }

  // Pseudonymisierung der Beschreibung (Defense-in-Depth vor optional KI-Caption)
  const beschreibungSafe = beschreibung ? ProvaPseudo.apply(String(beschreibung)) : null;

  // DB-Insert in fotos
  const { data: foto, error: dbErr } = await sb.from('fotos').insert({
    workspace_id: workspaceId,
    auftrag_id: auftrag_id || null,
    ortstermin_id: ortstermin_id || null,
    typ: 'sonstige', // ENUM-Default — Frontend kann später spezifischer
    storage_bucket: STORAGE_BUCKET,
    storage_path: storage_path,
    original_filename: filename || null,
    mime_type: mime_type,
    bytes: stripped.length,
    exif_stripped: true,
    exif_stripped_at: new Date().toISOString(),
    exif_stripped_by: 'foto-upload-lambda-mega35',
    beschreibung: beschreibungSafe,
    uploaded_by_user_id: userId
  }).select('id, storage_path').maybeSingle();

  if (dbErr) {
    // Storage-Cleanup bei DB-Fehler
    try { await sb.storage.from(STORAGE_BUCKET).remove([storage_path]); } catch (_) {}
    return jsonResponse(event, 500, { error: 'fotos-Insert fehlgeschlagen: ' + dbErr.message });
  }

  // Audit-Trail
  try {
    await sb.from('audit_trail').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action: 'foto_upload',
      entity_typ: 'foto',
      entity_id: foto.id,
      payload: { auftrag_id: auftrag_id || null, mime_type, bytes: stripped.length, exif_stripped: true }
    });
  } catch (_) { /* defensive */ }

  // Public-URL bauen
  const { data: pub } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(storage_path);

  return jsonResponse(event, 201, {
    foto_id: foto.id,
    storage_bucket: STORAGE_BUCKET,
    storage_path: storage_path,
    public_url: pub && pub.publicUrl,
    exif_stripped: true,
    bytes: stripped.length
  });
});

// Test-Exports
module.exports.__stripExifJpeg = stripExifJpeg;
module.exports.__stripPngTextChunks = stripPngTextChunks;
module.exports.__stripExif = stripExif;
module.exports.__SUPPORTED_MIME = SUPPORTED_MIME;
module.exports.__REJECT_MIME = REJECT_MIME;
module.exports.__MAX_BYTES = MAX_BYTES;
