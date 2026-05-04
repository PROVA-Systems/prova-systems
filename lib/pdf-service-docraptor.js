/**
 * PROVA — PDF-Service Adapter: DocRaptor (STUB)
 * MEGA¹⁸ W67 (2026-05-08)
 *
 * Drop-in-Replacement-Skeleton fuer pdf-service-interface.
 * Implementation in MEGA²⁰ falls Marcel von PDFMonkey migrieren will.
 *
 * Migration-Pfad (in MEGA²⁰ aufzulösen):
 *
 * 1. Marcel-Pflicht (Setup):
 *    - DocRaptor-Account anlegen (https://docraptor.com)
 *    - API-Key erzeugen + ENV: DOCRAPTOR_API_KEY
 *    - Plan waehlen (Test-Mode kostenlos, Production-Plan ab $15/mo)
 *
 * 2. Implementation (~80 LOC, analog zu pdfmonkey-Adapter):
 *    - POST https://docraptor.com/docs
 *      Body: { user_credentials, doc: { document_content, type: 'pdf', test: bool } }
 *    - Response ist direkter PDF-Stream (synchron, kein Polling!)
 *    - Vorteil: schneller (kein Job-Queue), Nachteil: Lambda-Timeout-Risk bei großen PDFs
 *
 * 3. ENV-Switch zum Aktivieren:
 *    - PDF_SERVICE = 'docraptor'  (statt 'pdfmonkey')
 *    - PDFMonkey-ENV bleiben als Rollback-Option erhalten
 *
 * 4. Template-Mapping:
 *    DocRaptor erwartet self-contained HTML (keine Liquid-Templates).
 *    → Liquid-Rendering muss serverside passieren (interpolateHtml ist bereits da
 *      in lib/prova-mode-c.js). MODE_C_GENERIC.html bleibt Goldstandard.
 *
 * 5. Tests in tests/pdf-service/docraptor-impl.test.js:
 *    - Smoke-Test mit Test-Mode-Credentials
 *    - Mock-fetch fuer 200/4xx/5xx
 *    - Timeout-Verhalten
 *    - HTML-Sanitization
 */
'use strict';

const Interface = require('./pdf-service-interface.js');

const SERVICE_NAME = 'docraptor';

function isAvailable() {
  // Stub: bewusst false — Marcel muss in MEGA²⁰ implementieren + ENV setzen.
  // Falls jemand das Service vorzeitig aktiviert, fail-soft mit klarer Message.
  const key = process.env.DOCRAPTOR_API_KEY;
  return !!(key && typeof key === 'string' && key.length > 10);
}

async function generatePdf(html, options) {
  if (!isAvailable()) {
    return Interface.errorResult(
      'DocRaptor noch nicht implementiert — siehe lib/pdf-service-docraptor.js Migration-TODO. '
        + 'Aktuell PDF_SERVICE=pdfmonkey verwenden.',
      'NOT_IMPLEMENTED'
    );
  }

  // TODO MEGA²⁰: Echte Implementation. Beispiel-Skelett unten.
  /*
  const apiKey = process.env.DOCRAPTOR_API_KEY;
  const isTest = process.env.DOCRAPTOR_TEST_MODE === '1';

  try {
    const res = await fetch('https://docraptor.com/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_credentials: apiKey,
        doc: {
          document_content: html,
          type: 'pdf',
          test: isTest,
          name: options.title || 'mode-c-document.pdf',
          prince_options: { media: 'print' }
        }
      })
    });

    if (!res.ok) {
      return Interface.errorResult(
        `DocRaptor ${res.status}: ${(await res.text()).slice(0, 200)}`,
        'CREATE_FAILED'
      );
    }

    // DocRaptor liefert direkt das PDF-Binary zurück.
    // Wir muessten es ueber Storage uploaden + signed-URL bauen.
    // Strategy: in MEGA²⁰ via Supabase-Storage 'sv-files' Bucket.
    const pdfBuffer = Buffer.from(await res.arrayBuffer());
    const storageUrl = await uploadToSupabaseStorage(pdfBuffer, options); // TODO
    return Interface.successResult(storageUrl, {
      service: SERVICE_NAME
    });
  } catch (e) {
    return Interface.errorResult('Network: ' + e.message, 'NETWORK');
  }
  */

  return Interface.errorResult(
    'DocRaptor-Adapter noch nicht implementiert (Stub-Modus)',
    'NOT_IMPLEMENTED'
  );
}

module.exports = {
  serviceName: SERVICE_NAME,
  isAvailable: isAvailable,
  generatePdf: generatePdf,
  // Test-Exports
  _isStub: true
};
