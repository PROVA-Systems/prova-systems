/**
 * PROVA — import-validate.js (MEGA⁴¹ P1)
 *
 * POST { source_format?, target_entity, csv_data?, json_data?, mapping? }
 * → 200 { valid, errors[], preview[5], detected_format, suggested_mapping, total_rows }
 *
 * Pre-Validation BEVOR import-execute. Zeigt Fehler + Auto-Mapping-Vorschlag.
 *
 * Auth: requireAuth + Workspace-Resolve.
 * RateLimit: 30/min (Validation ist günstig, aber Anti-Brute).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');
const Detector = require('../../lib/import-format-detector');

const VALID_TARGETS = ['kontakte', 'auftraege', 'rechnungen', 'mixed'];
const PREVIEW_ROWS = 5;
const MAX_ROWS_PER_IMPORT = 1000;

const KONTAKT_REQUIRED = ['name'];
const AUFTRAG_REQUIRED = ['aktenzeichen'];
const RECHNUNG_REQUIRED = ['rechnungsnr'];

function _emailValid(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function _validateRow(row, target, rowIdx, mapping) {
  const errors = [];
  // Apply mapping (source-key → prova-key)
  const mapped = {};
  Object.keys(row).forEach(srcKey => {
    const provaKey = mapping[srcKey] || srcKey;
    if (provaKey && !provaKey.startsWith('_')) mapped[provaKey] = row[srcKey];
  });

  if (target === 'kontakte') {
    if (!mapped.name || String(mapped.name).trim() === '') {
      errors.push({ row: rowIdx, col: 'name', msg: 'Name pflicht' });
    }
    if (mapped.email && !_emailValid(mapped.email)) {
      errors.push({ row: rowIdx, col: 'email', msg: 'E-Mail-Format invalid' });
    }
  } else if (target === 'auftraege') {
    if (!mapped.aktenzeichen || String(mapped.aktenzeichen).trim() === '') {
      errors.push({ row: rowIdx, col: 'aktenzeichen', msg: 'Aktenzeichen pflicht' });
    }
  } else if (target === 'rechnungen') {
    if (!mapped.rechnungsnr || String(mapped.rechnungsnr).trim() === '') {
      errors.push({ row: rowIdx, col: 'rechnungsnr', msg: 'Rechnungsnummer pflicht' });
    }
  }
  return { mapped, errors };
}

function _suggestMapping(headers, format, target) {
  const mappings = Detector.FIELD_MAPPINGS[format] || {};
  const targetMap = mappings[target] || {};
  const result = {};
  headers.forEach(h => {
    if (targetMap[h]) result[h] = targetMap[h];
  });
  return result;
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event, functionName: 'import-validate' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  if (!body.target_entity || VALID_TARGETS.indexOf(body.target_entity) < 0) {
    return jsonResponse(event, 400, { error: 'target_entity invalid', valid: VALID_TARGETS });
  }
  if (!body.csv_data && !body.json_data) {
    return jsonResponse(event, 400, { error: 'csv_data oder json_data pflicht' });
  }

  try {
    let parsed;
    let headers;
    if (body.csv_data) {
      parsed = Detector.parseCsv(body.csv_data);
      headers = parsed.headers;
    } else {
      parsed = Detector.parseJson(body.json_data);
      headers = parsed.rows.length > 0 ? Object.keys(parsed.rows[0]) : [];
    }

    if (parsed.rows.length === 0) {
      return jsonResponse(event, 400, { error: 'Keine Daten gefunden' });
    }
    if (parsed.rows.length > MAX_ROWS_PER_IMPORT) {
      return jsonResponse(event, 413, {
        error: 'Zu viele Zeilen (max ' + MAX_ROWS_PER_IMPORT + ' pro Import). Bitte in Batches aufteilen.',
        total_rows: parsed.rows.length
      });
    }

    // Format-Detection (Override durch User-Input möglich)
    const detection = Detector.detectFormat(headers);
    const format = body.source_format || detection.format;

    // Mapping (User-Override oder Auto-Suggest)
    const mapping = body.mapping || _suggestMapping(headers, format, body.target_entity);

    // Row-Validation
    const allErrors = [];
    parsed.rows.slice(0, MAX_ROWS_PER_IMPORT).forEach((row, idx) => {
      const { errors } = _validateRow(row, body.target_entity, idx + 1, mapping);
      errors.forEach(e => allErrors.push(e));
    });

    const preview = parsed.rows.slice(0, PREVIEW_ROWS).map((row, idx) => {
      const { mapped } = _validateRow(row, body.target_entity, idx + 1, mapping);
      return { row_idx: idx + 1, original: row, mapped: mapped };
    });

    return jsonResponse(event, 200, {
      valid: allErrors.length === 0,
      errors: allErrors.slice(0, 100),  // max 100 errors zur Anzeige
      total_errors: allErrors.length,
      preview: preview,
      total_rows: parsed.rows.length,
      headers: headers,
      detected_format: detection.format,
      detection_confidence: detection.confidence,
      detection_matched: detection.matched,
      suggested_mapping: mapping,
      delimiter: parsed.delimiter || null
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'import-validate' });

module.exports.__internals = {
  _validateRow,
  _suggestMapping,
  _emailValid,
  VALID_TARGETS,
  PREVIEW_ROWS,
  MAX_ROWS_PER_IMPORT
};
