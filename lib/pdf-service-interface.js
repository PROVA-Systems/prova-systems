/**
 * PROVA — PDF-Service-Interface (Service-Abstraction-Layer)
 * MEGA¹⁸ W65 (2026-05-08)
 *
 * Interface-Definition fuer austauschbare PDF-Generation-Services.
 * Implementations:
 *   - lib/pdf-service-pdfmonkey.js   (Default, MEGA¹⁸)
 *   - lib/pdf-service-docraptor.js   (Stub fuer MEGA²⁰ Migration)
 *
 * Jeder Adapter MUSS implementieren:
 *   async generatePdf(html, options) → { ok, download_url, document_id?, error? }
 *   isAvailable() → boolean
 *   serviceName: string  (e.g. 'pdfmonkey', 'docraptor')
 *
 * Der Frontend-/Backend-Code ruft NIE direkt einen Adapter auf, sondern via:
 *   const svc = require('./lib/pdf-service-interface').getService();
 *   const result = await svc.generatePdf(html, { template_id, title });
 *
 * ENV-Switch:
 *   PDF_SERVICE = 'pdfmonkey' (default) | 'docraptor'
 *
 * Anti-Patterns vermieden:
 *   - Kein Service-Lock-In
 *   - Eindeutiger Return-Shape (ok/download_url/error)
 *   - Adapter-Auswahl rein via ENV (kein Code-Patch fuer Migration)
 *   - Polling-Timeout im Adapter, nicht im Caller
 */
'use strict';

const SERVICE_NAMES = ['pdfmonkey', 'docraptor'];
const DEFAULT_SERVICE = 'pdfmonkey';

let _cachedService = null;
let _cachedServiceName = null;

/**
 * Resolved welcher Adapter via ENV gewuenscht ist.
 * @returns {string} service-name (z.B. 'pdfmonkey')
 */
function resolveServiceName() {
  const envName = (process.env.PDF_SERVICE || '').toLowerCase().trim();
  if (envName && SERVICE_NAMES.includes(envName)) {
    return envName;
  }
  return DEFAULT_SERVICE;
}

/**
 * Liefert den aktuell konfigurierten Service-Adapter.
 * Cached pro Lambda-Container (warm-period).
 *
 * @returns {object} { generatePdf, isAvailable, serviceName }
 */
function getService() {
  const wantedName = resolveServiceName();
  if (_cachedService && _cachedServiceName === wantedName) {
    return _cachedService;
  }
  switch (wantedName) {
    case 'pdfmonkey':
      _cachedService = require('./pdf-service-pdfmonkey.js');
      break;
    case 'docraptor':
      _cachedService = require('./pdf-service-docraptor.js');
      break;
    default:
      throw new Error('Unknown PDF_SERVICE: ' + wantedName);
  }
  _cachedServiceName = wantedName;
  return _cachedService;
}

/**
 * Validierung: garantiert dass ein Adapter die Interface-Pflicht erfuellt.
 * Wird in Tests genutzt + im Adapter-Modul-Load-Hook.
 *
 * @param {object} adapter
 * @returns {boolean}
 */
function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') return false;
  if (typeof adapter.generatePdf !== 'function') return false;
  if (typeof adapter.isAvailable !== 'function') return false;
  if (typeof adapter.serviceName !== 'string') return false;
  return true;
}

/**
 * Standard-Result-Shape fuer Adapter (Helper bei Error-Paths).
 *
 * @param {string} message
 * @param {string} [code] — z.B. 'CONFIG_MISSING', 'TIMEOUT'
 * @returns {object}
 */
function errorResult(message, code) {
  return {
    ok: false,
    download_url: null,
    error: String(message || 'unknown error'),
    code: code || 'UNKNOWN'
  };
}

/**
 * Standard-Success-Result.
 *
 * @param {string} downloadUrl
 * @param {object} [extras] — document_id, etc.
 * @returns {object}
 */
function successResult(downloadUrl, extras) {
  return Object.assign({
    ok: true,
    download_url: downloadUrl,
    error: null
  }, extras || {});
}

/**
 * Reset-Cache (nur fuer Tests genutzt).
 */
function _resetCache() {
  _cachedService = null;
  _cachedServiceName = null;
}

module.exports = {
  getService: getService,
  resolveServiceName: resolveServiceName,
  validateAdapter: validateAdapter,
  errorResult: errorResult,
  successResult: successResult,
  SERVICE_NAMES: SERVICE_NAMES,
  DEFAULT_SERVICE: DEFAULT_SERVICE,
  _resetCache: _resetCache
};
