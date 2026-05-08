/**
 * PROVA — editor-image-upload.js (MEGA⁴⁰ P2)
 *
 * POST { image_base64, mime_type, filename?, alt?, caption? }
 *
 * Workflow:
 *   - requireAuth + workspace via JWT
 *   - EXIF-Strip (re-use von foto-upload.js)
 *   - Upload zu Supabase Storage 'sv-files/editor-images/<workspace_id>/<uuid>.<ext>'
 *   - DB-Insert in document_images-Tabelle (workspace-isolated, DSGVO)
 *
 * Response: { image_id, url, alt, caption, workspace_id }
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const SUPPORTED_MIME = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/webp': 'webp'
};
const MAX_BYTES = 5 * 1024 * 1024;
const STORAGE_BUCKET = 'sv-files';

/* EXIF-Strip — wir re-importieren aus foto-upload.js, falls möglich.
   Sicherer Pfad: lokale Mini-Implementierung als Fallback (JPEG only — SVG/WebP/PNG passthrough). */
function _stripJpegExif(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return buf;
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return buf;
  const out = [Buffer.from([0xFF, 0xD8])];
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xFF) break;
    const marker = buf[i + 1];
    if (marker === 0xD9) { out.push(Buffer.from([0xFF, 0xD9])); break; }
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
      out.push(buf.slice(i, i + 2)); i += 2; continue;
    }
    if (i + 4 > buf.length) break;
    const segLen = buf.readUInt16BE(i + 2);
    const segEnd = i + 2 + segLen;
    if (marker === 0xE1) { i = segEnd; continue; }  // skip APP1 (EXIF+XMP)
    if (marker === 0xDA) { out.push(buf.slice(i, buf.length)); break; }
    out.push(buf.slice(i, segEnd));
    i = segEnd;
  }
  return Buffer.concat(out);
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event, functionName: 'editor-image-upload' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.image_base64 || typeof body.image_base64 !== 'string') {
    return jsonResponse(event, 400, { error: 'image_base64 (string) pflicht' });
  }
  const mime = String(body.mime_type || '').toLowerCase();
  if (!SUPPORTED_MIME[mime]) {
    return jsonResponse(event, 400, { error: 'mime_type nicht unterstützt', supported: Object.keys(SUPPORTED_MIME) });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // Workspace + Profile
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    // Decode + Validate Size
    let buf;
    try {
      const cleaned = body.image_base64.replace(/^data:image\/[a-z+]+;base64,/, '');
      buf = Buffer.from(cleaned, 'base64');
    } catch (e) { return jsonResponse(event, 400, { error: 'image_base64 decode failed' }); }
    if (buf.length === 0) return jsonResponse(event, 400, { error: 'image_base64 leer' });
    if (buf.length > MAX_BYTES) return jsonResponse(event, 413, { error: 'Bild zu groß (max 5 MB)' });

    // EXIF-Strip nur bei JPEG (PNG/SVG/WebP: passthrough — Editor-Bilder typisch Charts/Screenshots)
    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      buf = _stripJpegExif(buf);
    }

    // Upload-Path
    const ext = SUPPORTED_MIME[mime];
    const c = require('crypto');
    const uuid = c.randomUUID();
    const storagePath = 'editor-images/' + ms.workspace_id + '/' + uuid + '.' + ext;

    const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(storagePath, buf, {
      contentType: mime, upsert: false
    });
    if (upErr) return jsonResponse(event, 500, { error: 'Storage-Upload-Fehler', detail: upErr.message });

    // Public URL
    const { data: pubData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const url = pubData ? pubData.publicUrl : null;

    // DB-Insert (best-effort — Tabelle wird in Migration 34 angelegt; bei Fehlend graceful skip)
    let imageId = null;
    try {
      const { data: ins, error: insErr } = await sb.from('document_images').insert({
        workspace_id: ms.workspace_id,
        user_id: profile.id,
        storage_path: storagePath,
        url: url,
        mime_type: mime,
        byte_size: buf.length,
        alt: typeof body.alt === 'string' ? body.alt.slice(0, 500) : null,
        caption: typeof body.caption === 'string' ? body.caption.slice(0, 1000) : null,
        filename: typeof body.filename === 'string' ? body.filename.slice(0, 255) : null,
        exif_stripped: (mime === 'image/jpeg' || mime === 'image/jpg')
      }).select().maybeSingle();
      if (!insErr && ins) imageId = ins.id;
    } catch (_) { /* graceful — table fehlt evtl. noch */ }

    return jsonResponse(event, 200, {
      image_id: imageId,
      url: url,
      storage_path: storagePath,
      alt: body.alt || null,
      caption: body.caption || null,
      byte_size: buf.length,
      workspace_id: ms.workspace_id,
      exif_stripped: (mime === 'image/jpeg' || mime === 'image/jpg')
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'editor-image-upload' });

module.exports.__SUPPORTED_MIME = SUPPORTED_MIME;
module.exports.__MAX_BYTES = MAX_BYTES;
module.exports.__STORAGE_BUCKET = STORAGE_BUCKET;
