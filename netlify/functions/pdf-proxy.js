/**
 * PROVA Systems — pdf-proxy.js  (Netlify Function)
 * ══════════════════════════════════════════════════════════════════════
 * Sicherer PDF-Download-Proxy — Category 2 Security Fix (F-08)
 *
 * Problem vorher:
 *   - PDFMonkey download_url direkt an Browser zurückgegeben
 *   - Kein Ablaufdatum, kein Eigentümer-Check
 *   - Gestohlener Link gibt jedem Zugriff auf das Gutachten
 *
 * Fix:
 *   1. JWT-Pflicht (Netlify Identity)
 *   2. Eigentümer-Check via Airtable (sv_email === jwtEmail)
 *   3. Server-seitig signierter Token (HMAC-SHA256, 15 min TTL)
 *   4. PDF wird server-seitig gestreamt — URL nie im Browser
 *
 * Endpunkt: /.netlify/functions/pdf-proxy
 *
 * Zwei Modi:
 *   POST /pdf-proxy  { action: 'sign', record_id, doc_type }
 *     → gibt { token, expires_at } zurück (15 min gültig)
 *
 *   GET  /pdf-proxy?token=<jwt>
 *     → prüft Token, lädt PDF von PDFMonkey, streamt es
 *
 * ENV: PDFMONKEY_API_KEY, PDF_PROXY_SECRET (min. 32 Zeichen)
 * ══════════════════════════════════════════════════════════════════════
 */

'use strict';

const crypto  = require('crypto');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

// ── Konfiguration ──────────────────────────────────────────────────────
const TOKEN_TTL_MS    = 15 * 60 * 1000;    // 15 Minuten
const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID   || 'appJ7bLlAHZoxENWE';
const AT_API          = 'https://api.airtable.com';

// Tabellen-Map: doc_type → Airtable-Tabellenname + PDF-URL-Felder
const DOC_TYPE_MAP = {
  gutachten:  { table: 'tblSxV8bsXwd1pwa0', urlFields: ['PDF_URL', 'pdf_url'],         ownerField: 'sv_email' },
  rechnung:   { table: 'tblRechnungen',      urlFields: ['PDF_URL', 'pdf_url'],         ownerField: 'sv_email' },
  brief:      { table: 'tblBriefe',          urlFields: ['PDF_URL', 'pdf_url'],         ownerField: 'sv_email' },
  mahnung:    { table: 'tblMahnungen',       urlFields: ['PDF_URL', 'pdf_url'],         ownerField: 'sv_email' },
  fotoanlage: { table: 'tblFotoAnlagen',     urlFields: ['PDF_URL', 'pdf_url'],         ownerField: 'sv_email' },
};

// ── Hilfsfunktionen ────────────────────────────────────────────────────

/**
 * Erstellt einen signierten Token für einen PDF-Download.
 * token = base64url( JSON-Payload ) + '.' + HMAC-Signatur
 */
function createToken(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verifiziert Token und gibt Payload zurück oder wirft.
 */
function verifyToken(token, secret) {
  const parts = (token || '').split('.');
  if (parts.length !== 2) throw new Error('INVALID_TOKEN_FORMAT');
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  // Timing-safe compare
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('INVALID_TOKEN_SIGNATURE');
  }
  let payload;
  try { payload = JSON.parse(Buffer.from(data, 'base64url').toString()); }
  catch(e) { throw new Error('INVALID_TOKEN_PAYLOAD'); }
  if (!payload.exp || Date.now() > payload.exp) throw new Error('TOKEN_EXPIRED');
  return payload;
}

/**
 * Airtable-Record laden und PDF-URL + Eigentümer extrahieren.
 */
async function getAirtableRecord(table, recordId, atKey) {
  const url = `${AT_API}/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}/${recordId}`;
  const res  = await fetch(url, {
    headers: { 'Authorization': `Bearer ${atKey}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Airtable ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * PDFMonkey download_url für eine Doc-ID holen (Polling 1x).
 */
async function getPdfMonkeyUrl(docId, pmKey) {
  const res  = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${docId}`, {
    headers: { 'Authorization': `Bearer ${pmKey}` }
  });
  if (!res.ok) throw new Error(`PDFMonkey ${res.status}`);
  const data = await res.json();
  if (data.document?.status !== 'success') throw new Error('PDF_NOT_READY');
  return data.document.download_url;
}

function jsonResponse(event, status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) },
    body: JSON.stringify(obj)
  };
}

// ── Handler ────────────────────────────────────────────────────────────
exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);

  const secret  = process.env.PDF_PROXY_SECRET || '';
  const atKey   = process.env.AIRTABLE_API_KEY || '';
  const pmKey   = process.env.PDFMONKEY_API_KEY || '';

  if (!secret || secret.length < 32) {
    console.error('[pdf-proxy] PDF_PROXY_SECRET fehlt oder zu kurz (<32 Zeichen)');
    return jsonResponse(event, 500, { error: 'SERVER_MISCONFIGURED', code: 'NO_PROXY_SECRET' });
  }

  // ── GET: Token einlösen → PDF streamen ─────────────────────────────
  if (event.httpMethod === 'GET') {
    const token = (event.queryStringParameters || {}).token || '';
    if (!token) return jsonResponse(event, 400, { error: 'Token fehlt', code: 'NO_TOKEN' });

    let payload;
    try {
      payload = verifyToken(token, secret);
    } catch(e) {
      console.warn('[pdf-proxy] Token ungültig:', e.message);
      const code = e.message === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      return jsonResponse(event, 401, { error: 'Ungültiger oder abgelaufener Token', code });
    }

    const { pdf_url: pdfUrl } = payload;
    if (!pdfUrl) return jsonResponse(event, 400, { error: 'Kein PDF-URL im Token', code: 'NO_URL' });

    // PDF von CDN/PDFMonkey laden
    let pdfRes;
    try {
      pdfRes = await fetch(pdfUrl, { redirect: 'follow' });
      if (!pdfRes.ok) throw new Error(`CDN ${pdfRes.status}`);
    } catch(e) {
      console.error('[pdf-proxy] PDF-Fetch fehlgeschlagen:', e.message);
      return jsonResponse(event, 502, { error: 'PDF nicht abrufbar', code: 'PDF_FETCH_FAILED' });
    }

    // Als Binär-Response zurückgeben (Netlify Function: base64-encoded body)
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const filename  = (payload.filename || 'dokument.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

    console.log(`[pdf-proxy] PDF gestreamt: ${filename} (${pdfBuffer.length} bytes) für ${payload.email}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...getCorsHeaders(event)
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };
  }

  // ── POST: Token erstellen (Eigentümer-Check) ───────────────────────
  if (event.httpMethod === 'POST') {
    // JWT-Pflicht
    const user = context.clientContext && context.clientContext.user;
    if (!user || !user.email) {
      return jsonResponse(event, 401, { error: 'Anmeldung erforderlich', code: 'UNAUTHORIZED' });
    }
    const jwtEmail = user.email.toLowerCase().trim();

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch(e) { return jsonResponse(event, 400, { error: 'Ungültiger JSON-Body', code: 'INVALID_JSON' }); }

    const { action, record_id, doc_type, doc_id: pmDocId, pdf_url: directUrl, filename } = body;

    if (action !== 'sign') {
      return jsonResponse(event, 400, { error: 'Ungültige Aktion', code: 'INVALID_ACTION' });
    }

    // Validierung
    if (!record_id && !directUrl) {
      return jsonResponse(event, 400, { error: 'record_id oder pdf_url erforderlich', code: 'MISSING_PARAMS' });
    }

    let pdfUrl    = directUrl || null;
    let safeFilename = filename || 'dokument.pdf';

    // ── Pfad 1: Direkte URL + record_id → Eigentümer-Check via Airtable ──
    if (record_id && doc_type) {
      const docConfig = DOC_TYPE_MAP[doc_type];
      if (!docConfig) {
        return jsonResponse(event, 400, { error: `Unbekannter doc_type: ${doc_type}`, code: 'INVALID_DOC_TYPE' });
      }

      if (!atKey) {
        console.error('[pdf-proxy] AIRTABLE_API_KEY fehlt');
        return jsonResponse(event, 500, { error: 'Server nicht konfiguriert', code: 'NO_AT_KEY' });
      }

      let record;
      try {
        record = await getAirtableRecord(docConfig.table, record_id, atKey);
      } catch(e) {
        console.warn('[pdf-proxy] Airtable-Fehler:', e.message);
        return jsonResponse(event, 403, {
          error: 'Datensatz nicht gefunden oder kein Zugriff',
          code: 'RECORD_NOT_FOUND'
        });
      }

      const fields = record.fields || {};

      // ── Eigentümer-Check ─────────────────────────────────────────────
      const ownerEmail = (fields[docConfig.ownerField] || '').toLowerCase().trim();
      if (!ownerEmail) {
        console.warn(`[pdf-proxy] Kein Eigentümer-Feld "${docConfig.ownerField}" in Record ${record_id}`);
        return jsonResponse(event, 403, { error: 'Eigentümer nicht verifizierbar', code: 'OWNER_NOT_SET' });
      }
      if (ownerEmail !== jwtEmail) {
        console.warn(`[pdf-proxy] Zugriffsversuch: JWT=${jwtEmail}, Eigentümer=${ownerEmail}, Record=${record_id}`);
        return jsonResponse(event, 403, { error: 'Kein Zugriff auf dieses Dokument', code: 'ACCESS_DENIED' });
      }

      // PDF-URL aus Record-Feldern extrahieren
      if (!pdfUrl) {
        for (const field of docConfig.urlFields) {
          if (fields[field]) { pdfUrl = fields[field]; break; }
        }
      }

      // Fallback: PDFMonkey Doc-ID
      if (!pdfUrl && pmDocId && pmKey) {
        try {
          pdfUrl = await getPdfMonkeyUrl(pmDocId, pmKey);
        } catch(e) {
          console.warn('[pdf-proxy] PDFMonkey-Fehler:', e.message);
          return jsonResponse(event, 502, { error: 'PDF noch nicht bereit', code: e.message });
        }
      }

      if (!pdfUrl) {
        return jsonResponse(event, 404, { error: 'Kein PDF für diesen Datensatz', code: 'NO_PDF_URL' });
      }

      // Dateiname generieren
      const az = (fields.Aktenzeichen || fields.Rechnungsnummer || record_id || 'dok').replace(/[^a-zA-Z0-9-]/g, '_');
      safeFilename = filename || `PROVA_${az}.pdf`;

    } else if (!directUrl) {
      return jsonResponse(event, 400, { error: 'record_id + doc_type oder pdf_url erforderlich', code: 'MISSING_PARAMS' });
    }

    // ── URL-Validierung: Nur PDFMonkey CDN + bekannte sichere Quellen ──
    const allowedHosts = [
      'cdn.pdfmonkey.io',
      'storage.pdfmonkey.io',
      'app.pdfmonkey.io',
      's3.amazonaws.com',
      's3.eu-central-1.amazonaws.com',
    ];
    let parsedUrl;
    try { parsedUrl = new URL(pdfUrl); }
    catch(e) { return jsonResponse(event, 400, { error: 'Ungültige PDF-URL', code: 'INVALID_URL' }); }

    const hostAllowed = allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h));
    if (!hostAllowed) {
      console.warn(`[pdf-proxy] Nicht erlaubter Host: ${parsedUrl.hostname} für ${jwtEmail}`);
      return jsonResponse(event, 400, { error: 'PDF-Quelle nicht erlaubt', code: 'DISALLOWED_HOST' });
    }

    // ── Token ausstellen ──────────────────────────────────────────────
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const tokenPayload = {
      email:    jwtEmail,
      pdf_url:  pdfUrl,
      filename: safeFilename.replace(/[^a-zA-Z0-9._-]/g, '_'),
      record:   record_id || null,
      doc_type: doc_type  || null,
      iat:      Date.now(),
      exp:      expiresAt,
    };

    const token = createToken(tokenPayload, secret);

    console.log(`[pdf-proxy] Token ausgestellt: ${safeFilename} für ${jwtEmail}, läuft ab ${new Date(expiresAt).toISOString()}`);

    return jsonResponse(event, 200, {
      token,
      expires_at:   expiresAt,
      expires_in_s: Math.floor(TOKEN_TTL_MS / 1000),
      filename:     safeFilename,
      download_url: `/.netlify/functions/pdf-proxy?token=${encodeURIComponent(token)}`
    });
  }

  return jsonResponse(event, 405, { error: 'Method Not Allowed' });
};