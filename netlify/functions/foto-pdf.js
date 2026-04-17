// PROVA — foto-pdf.js
// Generiert Fotodokumentation-PDF via PDFMonkey
// Aufgerufen von freigabe-logic.js

const PDFMONKEY_API = 'https://api.pdfmonkey.io/api/v1/documents';
const FOTO_TEMPLATE = process.env.PDFMONKEY_FOTO_TEMPLATE_ID || '0383BD85-FEA6-4AED-B477-48A2AA5F1373';
const POLL_MAX = 12;
const POLL_DELAY = 3000;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://prova-systems.de',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({error: 'Method not allowed'}) };

  const apiKey = process.env.PDFMONKEY_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: CORS, body: JSON.stringify({error: 'PDFMONKEY_API_KEY nicht konfiguriert'}) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({error: 'Ungültiger JSON-Body'}) }; }

  const { az, sv_name, auftraggeber, objekt_adresse, schadenart, datum, fotos } = body;

  if (!az) return { statusCode: 400, headers: CORS, body: JSON.stringify({error: 'az erforderlich'}) };

  // PDFMonkey aufrufen
  const createRes = await fetch(PDFMONKEY_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document: {
        document_template_id: FOTO_TEMPLATE,
        status: 'pending',
        payload: {
          aktenzeichen: az,
          sv_name: sv_name || '',
          auftraggeber: auftraggeber || '',
          objekt_adresse: objekt_adresse || '',
          schadenart: schadenart || '',
          datum: datum || new Date().toLocaleDateString('de-DE'),
          fotos: fotos || [],
          titel: 'Fotodokumentation'
        },
        meta: { az, typ: 'fotodoku' }
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    return { statusCode: 502, headers: CORS, body: JSON.stringify({error: 'PDFMonkey Fehler', details: err}) };
  }

  const createData = await createRes.json();
  const docId = createData.document?.id;
  if (!docId) return { statusCode: 502, headers: CORS, body: JSON.stringify({error: 'Keine Document-ID'}) };

  // Polling
  for (let i = 0; i < POLL_MAX; i++) {
    await sleep(POLL_DELAY);
    const pollRes = await fetch(`${PDFMONKEY_API}/${docId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const pollData = await pollRes.json();
    const status = pollData.document?.status;
    const pdfUrl = pollData.document?.download_url;

    if (status === 'success' && pdfUrl) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, pdf_url: pdfUrl, doc_id: docId }) };
    }
    if (status === 'failed') {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({error: 'PDF-Generierung fehlgeschlagen'}) };
    }
  }

  // Timeout — DocID zurückgeben
  return { statusCode: 202, headers: CORS, body: JSON.stringify({ success: true, pending: true, doc_id: docId }) };
};
