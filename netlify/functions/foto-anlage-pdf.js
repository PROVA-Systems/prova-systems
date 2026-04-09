// ══════════════════════════════════════════════════
// PROVA Systems — Foto-Anlage PDF Generator
// Netlify Function: foto-anlage-pdf
// Env: PDFMONKEY_API_KEY, PDFMONKEY_FOTO_TEMPLATE_ID
// ══════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  if (!jwtEmail) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };
  }

  const API_KEY = process.env.PDFMONKEY_API_KEY;
  const TEMPLATE_ID = process.env.PDFMONKEY_FOTO_TEMPLATE_ID;

  if (!API_KEY || !TEMPLATE_ID) {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ fallback: true, reason: 'PdfMonkey nicht konfiguriert — Browser-Export wird verwendet.' })
    };
  }

  try {
    const { aktenzeichen, sv_name, datum, fotos } = JSON.parse(event.body || '{}');

    if (!fotos || !fotos.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Keine Fotos' }) };
    }

    // PdfMonkey Document erstellen
    const payload = {
      document: {
        document_template_id: TEMPLATE_ID,
        status: 'pending',
        payload: {
          aktenzeichen: aktenzeichen || 'Ohne AZ',
          sv_name: sv_name || '',
          datum: datum || new Date().toLocaleDateString('de-DE'),
          anzahl_fotos: fotos.length,
          fotos: fotos.map((f, i) => ({
            nummer: i + 1,
            bild: f.dataUrl,
            beschriftung: f.caption || 'Ohne Beschriftung'
          }))
        }
      }
    };

    const res = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('PdfMonkey Error:', err);
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ fallback: true, reason: 'PdfMonkey-Fehler — Browser-Export wird verwendet.' })
      };
    }

    const doc = await res.json();
    const docId = doc?.document?.id;

    if (!docId) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ fallback: true, reason: 'Kein Dokument erstellt.' })
      };
    }

    // Warte auf PDF-Generierung (max 30s, polling)
    let pdfUrl = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const check = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      const status = await check.json();
      if (status?.document?.status === 'success') {
        pdfUrl = status.document.download_url;
        break;
      }
      if (status?.document?.status === 'failure') {
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ fallback: true, reason: 'PDF-Generierung fehlgeschlagen.' })
        };
      }
    }

    if (!pdfUrl) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ fallback: true, reason: 'Zeitüberschreitung — Browser-Export wird verwendet.' })
      };
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, url: pdfUrl, docId })
    };

  } catch (err) {
    console.error('Foto-Anlage PDF Error:', err);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ fallback: true, reason: err.message })
    };
  }
};
