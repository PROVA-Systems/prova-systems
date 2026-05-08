/**
 * PROVA — PDF-Service Adapter: PDFMonkey
 * MEGA¹⁸ W66 (2026-05-08)
 *
 * Implementiert das pdf-service-interface fuer PDFMonkey.io.
 *
 * Workflow:
 *   1. POST /api/v1/documents mit document_template_id + payload
 *   2. PDFMonkey rendert async → status 'pending' / 'generating' / 'success' / 'failure'
 *   3. Polling: GET /api/v1/documents/<id> bis status === 'success' (max 60s)
 *   4. Returnt download_url
 *
 * ENV:
 *   PDFMONKEY_API_KEY              — Bearer-Token (Pflicht)
 *   PDFMONKEY_MODE_C_TEMPLATE_ID   — Template-UUID fuer MODE_C_GENERIC (Pflicht
 *                                    wenn options.template_id fehlt)
 *
 * Anti-Patterns vermieden:
 *   - Polling ohne Timeout → MAX_POLL_MS Hard-Limit
 *   - download_url nicht persistiert (Caller entscheidet ob via pdf-proxy)
 *   - API-Key in Logs → defensiv stripped
 *   - Status 'failure' wird mit Detail propagiert
 */
'use strict';

const Interface = require('./pdf-service-interface.js');

const PDFMONKEY_API = 'https://api.pdfmonkey.io/api/v1';
const MAX_POLL_MS = 60 * 1000;          // 60s gesamt
const POLL_INITIAL_MS = 1500;            // 1.5s erstes Poll
const POLL_BACKOFF = 1.4;                // 1.5 → 2.1 → 2.94 → 4.1 → ...
const POLL_MAX_INTERVAL_MS = 8 * 1000;   // max 8s zwischen Polls

const SERVICE_NAME = 'pdfmonkey';

function isAvailable() {
  const key = process.env.PDFMONKEY_API_KEY;
  return !!(key && typeof key === 'string' && key.length > 10);
}

/**
 * Erzeugt einen PDF-Document-Job in PDFMonkey und pollt bis 'success'.
 *
 * @param {string} html — interpoliertes HTML (User-Content)
 * @param {object} options
 * @param {string} [options.template_id] — explizit, sonst PDFMONKEY_MODE_C_TEMPLATE_ID
 * @param {string} [options.title] — Document-Title
 * @param {string} [options.footer_text] — z.B. "Aktenzeichen XYZ"
 * @param {string} [options.custom_css] — optional CSS-Override
 * @param {object} [options.payload_extra] — weitere Liquid-Variablen
 * @returns {Promise<{ok, download_url, document_id?, error?, code?}>}
 */
async function generatePdf(html, options) {
  options = options || {};

  if (!isAvailable()) {
    return Interface.errorResult(
      'PDFMONKEY_API_KEY fehlt — Service nicht konfiguriert',
      'CONFIG_MISSING'
    );
  }

  const templateId = options.template_id
    || require('../netlify/functions/lib/env-config').parsePdfmonkeyTemplates().modeC;
  if (!templateId) {
    return Interface.errorResult(
      'Kein Template-ID — setze PDFMONKEY_MODE_C_TEMPLATE_ID oder pass options.template_id',
      'TEMPLATE_MISSING'
    );
  }

  if (!html || typeof html !== 'string' || !html.trim()) {
    return Interface.errorResult('html-Content leer', 'BAD_INPUT');
  }

  const apiKey = process.env.PDFMONKEY_API_KEY;
  const payload = Object.assign({
    title: options.title || 'Mode C Dokument',
    html_content: html,
    footer_text: options.footer_text || '',
    custom_css: options.custom_css || ''
  }, options.payload_extra || {});

  // 1) Document erstellen
  let documentId;
  try {
    const createRes = await fetch(`${PDFMONKEY_API}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document: {
          document_template_id: templateId,
          payload: payload,
          status: 'pending'
        }
      })
    });

    if (!createRes.ok) {
      const detail = await _safeText(createRes);
      return Interface.errorResult(
        `PDFMonkey-Create ${createRes.status}: ${detail.slice(0, 200)}`,
        'CREATE_FAILED'
      );
    }
    const created = await createRes.json();
    documentId = created.document && created.document.id;
    if (!documentId) {
      return Interface.errorResult('PDFMonkey lieferte keine document.id', 'CREATE_FAILED');
    }
  } catch (e) {
    return Interface.errorResult('Network: ' + e.message, 'NETWORK');
  }

  // 2) Polling bis 'success' oder Timeout
  const start = Date.now();
  let interval = POLL_INITIAL_MS;
  while ((Date.now() - start) < MAX_POLL_MS) {
    await _sleep(interval);
    try {
      const pollRes = await fetch(`${PDFMONKEY_API}/documents/${documentId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!pollRes.ok) {
        return Interface.errorResult(
          `PDFMonkey-Poll ${pollRes.status}`,
          'POLL_FAILED'
        );
      }
      const data = await pollRes.json();
      const doc = data.document || {};
      if (doc.status === 'success') {
        if (!doc.download_url) {
          return Interface.errorResult('Status success, aber kein download_url', 'NO_URL');
        }
        return Interface.successResult(doc.download_url, {
          document_id: documentId,
          service: SERVICE_NAME,
          created_at: doc.created_at || null
        });
      }
      if (doc.status === 'failure') {
        return Interface.errorResult(
          'PDFMonkey rendering failure: ' + (doc.failure_reason || 'unknown'),
          'RENDER_FAILED'
        );
      }
      // pending / generating → weiter pollen
    } catch (e) {
      return Interface.errorResult('Network during poll: ' + e.message, 'NETWORK');
    }

    interval = Math.min(interval * POLL_BACKOFF, POLL_MAX_INTERVAL_MS);
  }

  // 3) Timeout
  return Interface.errorResult(
    `PDFMonkey-Timeout nach ${MAX_POLL_MS}ms (document_id=${documentId})`,
    'TIMEOUT'
  );
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function _safeText(res) {
  try { return (await res.text()) || ''; } catch (_) { return ''; }
}

module.exports = {
  serviceName: SERVICE_NAME,
  isAvailable: isAvailable,
  generatePdf: generatePdf,
  // Test-Exports
  _config: {
    PDFMONKEY_API: PDFMONKEY_API,
    MAX_POLL_MS: MAX_POLL_MS,
    POLL_INITIAL_MS: POLL_INITIAL_MS,
    POLL_BACKOFF: POLL_BACKOFF,
    POLL_MAX_INTERVAL_MS: POLL_MAX_INTERVAL_MS
  }
};
