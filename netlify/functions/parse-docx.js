/**
 * PROVA — parse-docx.js (Mode-C Word-Import)
 * MEGA¹⁶ W45 (2026-05-07/08)
 *
 * POST /netlify/functions/parse-docx
 *   Body: { name, docx_base64 }
 *   → Parses .docx Datei nach HTML via mammoth
 *   → Detected variables: $Var und {{Var}}
 *   → Speichert in user_vorlagen (Supabase)
 *   → returns: { id, name, parsed_html, variables, file_size }
 *
 * GET /netlify/functions/parse-docx
 *   → Liste alle eigene Vorlagen
 *   → returns: [{ id, name, variables, created_at }, ...]
 *
 * DELETE /netlify/functions/parse-docx?id=<uuid>
 *   → Soft-Delete (is_active = false)
 *
 * Anti-Pattern vermieden:
 *   - File-Size-Limit 10MB (Schema-Constraint matched)
 *   - Magic-Bytes-Check (.docx ist ZIP, beginnt mit PK\x03\x04)
 *   - Mammoth via npm-Bundle? — NEIN, via dynamic-import von esm.sh
 *     (CLAUDE.md Vanilla, kein build-step)
 *   - Audit-Log fuer Upload (DSGVO + Storage-Tracking)
 *   - Validation server-side (kein Trust auf Client)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
const DOCX_MAGIC = [0x50, 0x4B, 0x03, 0x04];  // PK\x03\x04 (ZIP)

// Variable-Detection Patterns (beide gaengigen Word-Formate)
const VAR_PATTERNS = [
  /\$([A-Za-z_][A-Za-z0-9_]*)/g,         // $Variable
  /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g  // {{Variable}}
];

/**
 * Validiert dass Buffer mit DOCX-Magic-Bytes beginnt.
 */
function _isDocx(buffer) {
  if (!buffer || buffer.length < 4) return false;
  for (let i = 0; i < DOCX_MAGIC.length; i++) {
    if (buffer[i] !== DOCX_MAGIC[i]) return false;
  }
  return true;
}

/**
 * Extrahiert Platzhalter aus Text/HTML.
 *
 * @param {string} text
 * @returns {string[]} unique sorted variables
 */
function detectVariables(text) {
  if (!text) return [];
  const found = new Set();
  for (const pattern of VAR_PATTERNS) {
    let match;
    pattern.lastIndex = 0;  // Reset (global regex)
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) found.add(match[1]);
    }
  }
  return Array.from(found).sort();
}

/**
 * Mammoth-Konvertierung via dynamic CDN-import.
 * Cached per Lambda-Container (warm-period).
 */
let _mammothPromise = null;
async function _loadMammoth() {
  if (_mammothPromise) return _mammothPromise;
  _mammothPromise = (async () => {
    try {
      // mammoth-Browser-build wegen Vanilla-Approach
      // Alternative: lib/mammoth.browser.min.js fest im Repo (ohne Build)
      // Hier: dynamic-import aus esm.sh — Lambda hat fetch + dynamic-import
      const mod = await import('https://esm.sh/mammoth@1');
      return mod.default || mod;
    } catch (e) {
      throw new Error('mammoth-CDN-load failed: ' + e.message);
    }
  })();
  return _mammothPromise;
}

async function _parseDocx(buffer) {
  // Workaround: mammoth braucht Buffer, Lambda hat Buffer-Polyfill
  const mammoth = await _loadMammoth();
  if (!mammoth || !mammoth.convertToHtml) {
    throw new Error('mammoth API not available');
  }
  const result = await mammoth.convertToHtml({ buffer: buffer });
  return {
    html: result.value || '',
    messages: result.messages || []  // Warnings/Errors aus mammoth
  };
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

  const sb = getSupabase();
  if (!sb) {
    return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  // ─── GET: Liste der eigenen Vorlagen ──────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await sb.from('user_vorlagen')
        .select('id, name, source_filename, file_size, variables, variable_mapping, created_at, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        if (/does not exist/i.test(error.message)) {
          return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ ok: true, vorlagen: [], _migration_pending: true }) };
        }
        return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'query failed', detail: error.message }) };
      }
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ ok: true, vorlagen: data || [] }) };
    } catch (e) {
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'unexpected', detail: e.message }) };
    }
  }

  // ─── POST: Word-Datei parsen + speichern ──────────────────────────
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid JSON' }) };
    }

    const name = String(body.name || '').trim().slice(0, 200);
    const docxBase64 = body.docx_base64;

    if (!name) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'name required' }) };
    }
    if (!docxBase64 || typeof docxBase64 !== 'string') {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'docx_base64 required' }) };
    }

    let buffer;
    try {
      buffer = Buffer.from(docxBase64, 'base64');
    } catch (e) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid base64' }) };
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return { statusCode: 413, headers: baseHeaders, body: JSON.stringify({ error: 'file too large (max 10MB)', size: buffer.length }) };
    }

    if (!_isDocx(buffer)) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'not a valid .docx file (magic bytes missing)' }) };
    }

    let parsedHtml = '';
    let parseMessages = [];
    try {
      const result = await _parseDocx(buffer);
      parsedHtml = result.html;
      parseMessages = result.messages;
    } catch (e) {
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'docx parse failed', detail: e.message }) };
    }

    const variables = detectVariables(parsedHtml);

    // Speichern in Supabase
    try {
      const { data, error } = await sb.from('user_vorlagen').insert({
        user_id: userId,
        name: name,
        source_filename: body.source_filename || null,
        file_size: buffer.length,
        parsed_html: parsedHtml,
        variables: variables,
        variable_mapping: null,
        is_active: true
      }).select().maybeSingle();

      if (error) {
        if (/does not exist/i.test(error.message)) {
          return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: 'user_vorlagen-table not migrated', migration: '08_user_vorlagen.sql' }) };
        }
        return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'insert failed', detail: error.message }) };
      }

      // Audit-Log fire-and-forget
      try {
        await sb.from('audit_trail').insert({
          function_name: 'parse-docx',
          action: 'vorlage.uploaded',
          payload: { user_id: userId, vorlage_id: data.id, name, file_size: buffer.length, variables_count: variables.length },
          result: 'ok'
        });
      } catch (_) { /* fire-and-forget */ }

      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({
        ok: true,
        id: data.id,
        name: data.name,
        parsed_html: data.parsed_html,
        variables: data.variables,
        file_size: data.file_size,
        parse_messages: parseMessages.slice(0, 10)  // erste 10 mammoth-warnings
      }) };
    } catch (e) {
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'unexpected', detail: e.message }) };
    }
  }

  // ─── DELETE: Soft-Delete ─────────────────────────────────────────
  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid id' }) };
    }
    try {
      const { error } = await sb.from('user_vorlagen')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('id', id);
      if (error) {
        return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'delete failed', detail: error.message }) };
      }
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ ok: true, id }) };
    } catch (e) {
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'unexpected', detail: e.message }) };
    }
  }

  return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'Method Not Allowed', allowed: ['GET','POST','DELETE'] }) };
}), { functionName: 'parse-docx' });

// Test-Exports
exports._test = {
  detectVariables,
  _isDocx,
  MAX_FILE_SIZE,
  DOCX_MAGIC
};
