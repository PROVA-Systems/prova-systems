// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Jahresbericht PDF Export
// Netlify Function: jahresbericht-pdf
//
// Input: { year: 2026, records: [...] }  (records = Fälle-Daten, bereits mandantengetrennt via JWT)
// Output: { success: true, pdf_url, doc_id }
//
// Uses PDFMonkey template F-01 (ENV: PDFMONKEY_TEMPLATE_F01, default: S32BEA1F)
// Env: PDFMONKEY_API_KEY
// ══════════════════════════════════════════════════════════════════════════════

const PDFMONKEY_API = 'https://api.pdfmonkey.io/api/v1/documents';
const POLL_MAX     = 15;
const POLL_DELAY   = 2000;

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method Not Allowed' }) };

  // JWT required
  const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  if (!jwtEmail) return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'UNAUTHORIZED' }) };

  const apiKey = process.env.PDFMONKEY_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'PDFMONKEY_API_KEY fehlt' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const year = parseInt(body.year || String(new Date().getFullYear()), 10);
  const records = Array.isArray(body.records) ? body.records : [];
  const gutachtenAnzahl = typeof body.gutachten_anzahl === 'number' ? body.gutachten_anzahl : null;
  const umsatzEur = typeof body.umsatz_eur === 'number' ? body.umsatz_eur : null;
  const schadensarten = Array.isArray(body.schadensarten) ? body.schadensarten : null;
  if (!year || year < 2000 || year > 2100) return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid year' }) };
  // allow either raw records OR aggregated payload
  if (records.length === 0 && (gutachtenAnzahl === null && umsatzEur === null && !schadensarten)) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'No data' }) };
  }

  // Size guard
  try {
    const size = Buffer.byteLength(JSON.stringify({ year, records }), 'utf8');
    if (size > 400 * 1024) return { statusCode: 413, headers: corsHeaders(), body: JSON.stringify({ error: 'PAYLOAD_TOO_LARGE' }) };
  } catch {}

  // Aggregate metrics
  const safe = (v) => (v === null || v === undefined) ? '' : String(v);
  const parseNum = (v) => {
    const n = parseFloat(String(v || '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const getYear = (ts) => { try { return new Date(ts).getFullYear(); } catch { return 0; } };

  let payload;
  if (records.length > 0) {
    const rows = records
      .filter(r => getYear(r.fld7czLIYt5UlspZb || r.Timestamp || r.timestamp || r.Datum || r.datum) === year || true)
      .map(r => ({
        aktenzeichen: safe(r.flds4E8CirlbIVZ3U || r.Aktenzeichen || r.aktenzeichen),
        status:       safe(r.fldC75kXC7g6KYAqB || r.Status || r.status),
        schadensart:  safe(r.fldpICKzx0AzXKU6a || r.Schadenart || r.Schadensart || r.schadensart),
        ag_typ:       safe(r.fldS1hbbnBsaOc5tr || r.Auftraggeber_Typ || r.auftraggeber_typ),
        fotos:        parseInt(r.fld8GuceJoIVZhVYu || r.Fotos_Anzahl || r.fotos || 0, 10) || 0,
        zeit_min:     parseInt(r.fldexEdaixneFZMtH || r.Bearbeitungszeit_Min || r.zeit_min || 0, 10) || 0,
        ts:           safe(r.fld7czLIYt5UlspZb || r.Timestamp || r.timestamp || r.Datum || r.datum),
        paket:        safe(r.fld94vyx5A3wWcY6z || r.Paket || r.paket),
      }));

    const total = rows.length;
    const done  = rows.filter(x => x.status === 'Exportiert' || x.status === 'Freigegeben').length;
    const fotos = rows.reduce((s,x)=>s+(x.fotos||0),0);
    const avgMin = (() => {
      const zs = rows.map(x=>x.zeit_min).filter(x=>x>0);
      if (!zs.length) return 0;
      return Math.round(zs.reduce((a,b)=>a+b,0)/zs.length);
    })();

    function topCounts(keyFn, limit=8){
      const m = new Map();
      rows.forEach(r => {
        const k = keyFn(r) || 'Unbekannt';
        m.set(k, (m.get(k)||0) + 1);
      });
      return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([k,v])=>({label:k,count:v}));
    }

    payload = {
      jahr: year,
      sv_email: jwtEmail,
      gutachten_anzahl: total,
      gutachten_abgeschlossen: done,
      fotos_anzahl: fotos,
      avg_bearbeitungszeit_min: avgMin,
      schadensarten_verteilung: topCounts(r=>r.schadensart, 12),
      status_verteilung: topCounts(r=>r.status, 12),
      auftraggeber_verteilung: topCounts(r=>r.ag_typ, 12),
      umsatz_eur: null,
      erstellt_am: new Date().toISOString(),
    };
  } else {
    payload = {
      jahr: year,
      sv_email: jwtEmail,
      gutachten_anzahl: gutachtenAnzahl || 0,
      umsatz_eur: umsatzEur || 0,
      schadensarten_verteilung: schadensarten || [],
      erstellt_am: new Date().toISOString(),
    };
  }

  const templateId = process.env.PDFMONKEY_TEMPLATE_F01 || 'S32BEA1F';

  try {
    const createRes = await fetch(PDFMONKEY_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: { document_template_id: templateId, status: 'pending', payload, meta: { typ: 'jahresbericht', jahr: String(year) } } })
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[JahresberichtPDF] PDFMonkey Fehler:', createRes.status, err);
      return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'PDFMonkey error' }) };
    }
    const createData = await createRes.json();
    const docId = createData.document?.id;
    if (!docId) return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'No doc id' }) };

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i=0;i<POLL_MAX;i++){
      await sleep(POLL_DELAY);
      const pollRes = await fetch(`${PDFMONKEY_API}/${docId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      const pollData = await pollRes.json().catch(()=>({}));
      const status = pollData.document?.status;
      const pdfUrl = pollData.document?.download_url;
      if (status === 'success' && pdfUrl) {
        return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true, pdf_url: pdfUrl, doc_id: docId }) };
      }
      if (status === 'failed') return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'PDF failed' }) };
    }
    return { statusCode: 202, headers: corsHeaders(), body: JSON.stringify({ success: true, pending: true, doc_id: docId }) };
  } catch (e) {
    console.error('[JahresberichtPDF] Exception:', e.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
};

