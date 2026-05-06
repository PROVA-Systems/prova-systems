/**
 * PROVA — parse-beweisbeschluss.js (Mode-A Beweisbeschluss-PDF-Foundation)
 * MEGA²¹+²² W116 (2026-05-05)
 * Marcel-Decision B1: pdf-parse (simpler)
 * Marcel-Decision C1: Pattern-Matching only (KEIN KI in MEGA²² Tranche 1)
 *
 * POST /netlify/functions/parse-beweisbeschluss
 *   Body: { auftrag_id, pdf_base64, source_filename? }
 *   → Lambda dekodiert PDF, ruft pdf-parse fuer Text-Extraction
 *   → Pattern-Matching extrahiert: aktenzeichen, frist_datum,
 *     hauptfragen[], parteien[]
 *   → Speichert in auftraege.beweisbeschluss_pdf_extrakt JSONB (Migration 11)
 *   → returnt: { ok, extrakt, version: 1 }
 *
 * Storage: PDF-Upload zu Supabase-Storage 'sv-files' Bucket (best-effort)
 *
 * Anti-Patterns vermieden:
 *   - KEINE KI in dieser Tranche (Marcel-C1: zu frueh)
 *   - File-Size-Limit (PDF max 10MB)
 *   - Magic-Bytes-Check fuer .pdf (%PDF-1.x)
 *   - Disclaimer-Hint in Response (lib/prova-disclaimer beweisbeschluss-Variant)
 *
 * Voraussetzung: Migration 11 appliziert (auftraege.beweisbeschluss_pdf_*)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const RateLimit = require('./lib/rate-limit-user'); // MEGA²⁸ W5-I5: KI-Cost-Schutz
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
const PDF_MAGIC = '%PDF-';

/**
 * pdf-parse via dynamic-import (CDN). Fuer Lambda-bundle-size optimization
 * versuchen wir zuerst lokales npm-Paket, sonst esm.sh-Fallback.
 */
let _pdfParsePromise = null;
async function _loadPdfParse() {
  if (_pdfParsePromise) return _pdfParsePromise;
  _pdfParsePromise = (async () => {
    try {
      const lib = require('pdf-parse');
      return lib;
    } catch (e) {
      // Fallback: dynamic-import von CDN (analog mammoth in parse-docx)
      try {
        const mod = await import('https://esm.sh/pdf-parse@1');
        return mod.default || mod;
      } catch (e2) {
        throw new Error('pdf-parse not available: ' + e.message);
      }
    }
  })();
  return _pdfParsePromise;
}

/**
 * Pattern-Matching fuer Beweisbeschluss-Felder.
 * Marcel-C1: nur Regex, kein LLM.
 *
 * @param {string} text — Volltext aus pdf-parse
 * @returns {object} { aktenzeichen, frist_datum, hauptfragen, parteien, raw_text_preview }
 */
function extractPatterns(text) {
  if (!text || typeof text !== 'string') {
    return { aktenzeichen: null, frist_datum: null, hauptfragen: [], parteien: [], raw_text_preview: '' };
  }

  // Aktenzeichen-Patterns: "AZ: 1 O 234/25" oder "Aktenzeichen 5 C 678/26"
  // Pattern: 1-2 Ziffern + Buchstabe + Ziffern + / + Ziffern (4 oder 6)
  let aktenzeichen = null;
  const azRegex = /\b(?:AZ|Aktenzeichen|Az\.?|Az\s+)[:\s.]+(\d{1,3}\s*[A-Z]+\s*\d{1,5}\/\d{2,4})/i;
  const azMatch = text.match(azRegex);
  if (azMatch) aktenzeichen = azMatch[1].replace(/\s+/g, ' ').trim();

  // Frist-Datum: "Frist: 15.06.2026" oder "Frist zur Erstattung des Gutachtens: 1.7.2026"
  // Defensive: alles zwischen "Frist" und Datum ist optional (max 80 Zeichen Buffer)
  let frist_datum = null;
  const fristDirektRegex = /Frist[\s\S]{0,80}?(\d{1,2}\.\d{1,2}\.\d{4})/i;
  const fristMatch = text.match(fristDirektRegex);
  if (fristMatch) frist_datum = fristMatch[1];

  // Hauptfragen: nummerierte Items "1. Es soll Beweis erhoben werden ueber die Frage, ob..."
  // Pattern: Zeilenanfang mit Nummerierung + erstes Statement bis Punkt+Leerzeichen+Nummerierung
  const hauptfragen = [];
  // Multi-line regex fuer "1. ... 2. ..." Pattern
  const hfRegex = /^[\s]*(\d+)\.[\s]+(.+?)(?=\n\s*\d+\.|\n\s*$|$)/gms;
  let hfMatch;
  let safety = 0;
  while ((hfMatch = hfRegex.exec(text)) !== null && safety < 20) {
    safety++;
    const fragetext = hfMatch[2].replace(/\s+/g, ' ').trim();
    if (fragetext.length > 20 && fragetext.length < 800) {
      // Nur wenn substantiell (>20 chars) und nicht ueberlang
      hauptfragen.push({
        nr: parseInt(hfMatch[1], 10),
        text: fragetext.slice(0, 500)  // Cap fuer DB
      });
    }
  }

  // Parteien-Namen: defensive Patterns mit \r?\n und Whitespace-Tolerance
  const parteien = [];
  const parteiPatterns = [
    // Klaeger: bis "gegen" / Komma / Beklagt / Anwalt / Newline
    [/Kl[aä]ger(?:in)?[:\s]+([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s.&-]{3,80}?)\s*(?:gegen|,|\r?\n|Beklagt|Anwalt)/i, 'Klaeger'],
    // Beklagter: bis Komma / Anwalt / Gericht / Newline
    [/Beklagt(?:e[rn]?|er)[:\s]+([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s.&-]{3,80}?)\s*(?:,|\r?\n|Anwalt|Gericht)/i, 'Beklagter'],
    // Antragsteller: bis "gegen" / Komma / Newline
    [/Antragsteller(?:in)?[:\s]+([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s.&-]{3,80}?)\s*(?:gegen|,|\r?\n|Antragsgegner)/i, 'Antragsteller']
  ];
  parteiPatterns.forEach(([rx, rolle]) => {
    const m = text.match(rx);
    if (m && m[1]) {
      parteien.push({ rolle: rolle, name: m[1].replace(/\s+/g, ' ').trim() });
    }
  });

  return {
    aktenzeichen: aktenzeichen,
    frist_datum: frist_datum,
    hauptfragen: hauptfragen,
    parteien: parteien,
    raw_text_preview: text.slice(0, 1000)
  };
}

function _isPdf(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).toString('utf8') === PDF_MAGIC;
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  const baseHeaders = { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(event) };
  const userId = context.userId || context.user_id || null;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (!userId) {
    return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ error: 'no user_id' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed', allowed: ['POST'] }) };
  }

  // MEGA²⁸ W5-I5: KI-Cost-Rate-Limit (30/60s pro User)
  const rl = RateLimit.check(context.userEmail || userId, 30, 60, { event: event, functionName: 'parse-beweisbeschluss' });
  if (!rl.allowed) {
    return { statusCode: 429, headers: { ...baseHeaders, 'Retry-After': String(rl.retryAfter) },
      body: JSON.stringify({ error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid JSON' }) };
  }

  const auftragId = String(body.auftrag_id || '').trim();
  const pdfBase64 = body.pdf_base64;
  if (!/^[0-9a-f-]{36}$/i.test(auftragId)) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid auftrag_id' }) };
  }
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'pdf_base64 required' }) };
  }

  let buffer;
  try {
    buffer = Buffer.from(pdfBase64, 'base64');
  } catch (e) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid base64' }) };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return { statusCode: 413, headers: baseHeaders, body: JSON.stringify({ error: 'file too large (max 10MB)', size: buffer.length }) };
  }
  if (!_isPdf(buffer)) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'not a valid PDF (magic bytes missing)' }) };
  }

  const sb = getSupabase();
  if (!sb) {
    return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  // Auftrag-Existenz pruefen (RLS-implicit)
  try {
    const { data: a, error: aErr } = await sb.from('auftraege')
      .select('id, workspace_id')
      .eq('id', auftragId)
      .maybeSingle();
    if (aErr) {
      if (/does not exist|column.*beweisbeschluss/i.test(aErr.message)) {
        return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({
          error: 'auftraege.beweisbeschluss_*-columns not migrated',
          migration: '11_auftraege_beweisbeschluss.sql'
        }) };
      }
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'auftrag load failed', detail: aErr.message }) };
    }
    if (!a) {
      return { statusCode: 404, headers: baseHeaders, body: JSON.stringify({ error: 'Auftrag nicht gefunden' }) };
    }
  } catch (e) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'unexpected', detail: e.message }) };
  }

  // PDF-Parse via pdf-parse
  let pdfText = '';
  let pdfNumPages = 0;
  try {
    const pdfParse = await _loadPdfParse();
    const result = await pdfParse(buffer);
    pdfText = result.text || '';
    pdfNumPages = result.numpages || 0;
  } catch (e) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({
      error: 'pdf-parse failed',
      detail: e.message,
      hint: 'pdf-parse via npm install pdf-parse (Marcel-Pflicht falls noch nicht installiert)'
    }) };
  }

  // Pattern-Matching (Marcel-C1)
  const extrakt = extractPatterns(pdfText);
  extrakt.num_pages = pdfNumPages;
  extrakt.parsed_at = new Date().toISOString();
  extrakt.parser_version = 'pattern-v1';
  extrakt.disclaimer = '📌 Hinweis: Pattern-Matching-Resultate. Bitte gegen Original-Beweisbeschluss pruefen (§ 407a ZPO).';

  // Optional: PDF zu Supabase-Storage hochladen (best-effort)
  let storagePath = null;
  try {
    const fileName = 'beweisbeschluss-' + auftragId + '-' + Date.now() + '.pdf';
    storagePath = userId + '/' + fileName;
    const { error: storageErr } = await sb.storage.from('sv-files').upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (storageErr) {
      console.warn('[parse-beweisbeschluss] storage upload failed:', storageErr.message);
      storagePath = null;
    }
  } catch (e) {
    console.warn('[parse-beweisbeschluss] storage upload error:', e.message);
    storagePath = null;
  }

  // Update auftraege mit extrakt
  try {
    const updateData = {
      beweisbeschluss_pdf_extrakt: extrakt,
      beweisbeschluss_pdf_extrakt_version: 1,
      beweisbeschluss_pdf_uploaded_at: new Date().toISOString()
    };
    if (storagePath) updateData.beweisbeschluss_pdf_storage_path = storagePath;

    const { error: updErr } = await sb.from('auftraege')
      .update(updateData)
      .eq('id', auftragId);
    if (updErr) {
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({
        error: 'update failed', detail: updErr.message
      }) };
    }

    // Audit-Log fire-and-forget
    try {
      sb.from('audit_trail').insert({
        function_name: 'parse-beweisbeschluss',
        action: 'beweisbeschluss.parsed',
        payload: {
          user_id: userId,
          auftrag_id: auftragId,
          num_pages: pdfNumPages,
          aktenzeichen_found: !!extrakt.aktenzeichen,
          frist_found: !!extrakt.frist_datum,
          hauptfragen_count: extrakt.hauptfragen.length,
          parteien_count: extrakt.parteien.length
        },
        result: 'ok'
      }).then(() => {}).catch(() => {});
    } catch (_) { /* fire-and-forget */ }

    return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({
      ok: true,
      auftrag_id: auftragId,
      extrakt: extrakt,
      version: 1,
      storage_path: storagePath,
      // Marcel-Direktive: Disclaimer immer mitliefern
      disclaimer_html: '<div class="prova-ki-disclaimer" role="note" style="margin:8px 0;padding:8px 12px;background:rgba(245,158,11,0.08);border-left:3px solid rgba(245,158,11,0.4);border-radius:4px;font-size:11px;color:#92400e;line-height:1.5;"><strong>⚖️ Hinweis: Pattern-Matching-Foundation (Marcel-C1). Pruefen Sie alle Felder gegen Original-Beweisbeschluss. SV bleibt nach §407a ZPO letztverantwortlich.</strong></div>'
    }) };
  } catch (e) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'unexpected', detail: e.message }) };
  }
}), { functionName: 'parse-beweisbeschluss' });

// Test-Exports (Marcel-C1: Pattern-Matching pure-tested)
exports._test = {
  extractPatterns,
  _isPdf,
  PDF_MAGIC,
  MAX_FILE_SIZE
};
