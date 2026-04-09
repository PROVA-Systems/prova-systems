// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Mahnung PDF Generator
// Netlify Function: mahnung-pdf
//
// Generiert Mahnungs-PDFs (Stufe 1/2/3) via PDFMonkey
// Templates:
//   Stufe 1: PROVA – F-06 – 1. MAHNUNG  (8ECAC2E4-D079-4B62-B71C-BE0D128BC020)
//   Stufe 2: PROVA – F-07 – 2. MAHNUNG  (A4E57F73-F6E6-4AEB-B48C-56A48698026B)
//   Stufe 3: PROVA – F-08 – 3. MAHNUNG  (6ADE8D9A-BDF4-4482-98D6-1B8027A4B239)
//
// Env: PDFMONKEY_API_KEY
// ══════════════════════════════════════════════════════════════════════════════

// Template-IDs direkt hier — keine ENV nötig (feste PDFMonkey-Templates)
const MAHNUNG_TEMPLATES = {
  1: '8ECAC2E4-D079-4B62-B71C-BE0D128BC020',
  2: 'A4E57F73-F6E6-4AEB-B48C-56A48698026B',
  3: '6ADE8D9A-BDF4-4482-98D6-1B8027A4B239',
};

// ── Mahngebühren (Standard — anpassbar) ────────────────────────────────────
const MAHNGEBUEHREN = { 1: 5.00, 2: 15.00, 3: 25.00 };
const EINSCHREIBEN_PORTO = 4.65; // Deutsche Post Einschreiben 2026

// Verzugszinsen §288 BGB berechnen (9% p.a. für Unternehmer)
function berechneVerzugszinsen(betrag, faelligIso) {
  if (!betrag || !faelligIso) return 0;
  const tage = Math.max(0, Math.floor((Date.now() - new Date(faelligIso).getTime()) / 86400000));
  return Math.round(betrag * 0.09 / 365 * tage * 100) / 100;
}

function fmtBetragDE(val) {
  return Number(val || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Zahlungsfrist: +10 Tage von heute für Mahnung 1/2, +5 Tage für Mahnung 3
function zahlungsfristDatum(stufe) {
  const tage = stufe === 3 ? 5 : stufe === 2 ? 7 : 10;
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PDFMONKEY_API = 'https://api.pdfmonkey.io/api/v1/documents';
const POLL_MAX     = 15;   // max. Versuche
const POLL_DELAY   = 2000; // ms zwischen Polls

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  if (!jwtEmail) {
    return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'UNAUTHORIZED' }) };
  }

  const apiKey = process.env.PDFMONKEY_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'PDFMONKEY_API_KEY fehlt' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Ungültiger JSON-Body' }) };
  }

  const { mahnstufe, rechnung, sv } = body;

  // ── Validierung ────────────────────────────────────────────────────────────
  if (![1, 2, 3].includes(mahnstufe)) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Mahnstufe muss 1, 2 oder 3 sein' }) };
  }
  if (!rechnung || !sv) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'rechnung und sv sind Pflichtfelder' }) };
  }

  const templateId = MAHNUNG_TEMPLATES[mahnstufe];
  // ── Datum formatieren ──────────────────────────────────────────────────────
  function fmtDatum(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return iso; }
  }

  // ── Betrag formatieren ─────────────────────────────────────────────────────
  function fmtBetrag(val) {
    if (typeof val === 'string') return val;
    return Number(val).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Berechnungen ────────────────────────────────────────────────────────────
  const brutto         = parseFloat(rechnung.betragBrutto || 0);
  const verzugszinsen  = berechneVerzugszinsen(brutto, rechnung.faellig);
  const mgeb1          = MAHNGEBUEHREN[1];
  const mgeb2          = MAHNGEBUEHREN[2];
  const mgeb3          = MAHNGEBUEHREN[3];
  const porto          = EINSCHREIBEN_PORTO;

  // Gesamtforderung je nach Stufe
  let gesamtforderung = brutto + verzugszinsen;
  if (mahnstufe >= 1) gesamtforderung += mgeb1;
  if (mahnstufe >= 2) gesamtforderung += mgeb2;
  if (mahnstufe >= 3) { gesamtforderung += mgeb3; gesamtforderung += porto; }
  gesamtforderung = Math.round(gesamtforderung * 100) / 100;

  const verwendungszweck = `Rechnung ${rechnung.nr || ''}`
    + (rechnung.fallTitel ? ' / ' + rechnung.fallTitel : '')
    + (mahnstufe > 1 ? ` - ${mahnstufe}. Mahnung` : '');

  // ── PDFMonkey Payload — Basis (alle Stufen) ─────────────────────────────
  const payloadBasis = {
    sv_name:         sv.name         || '',
    sv_firma:        sv.firma        || '',
    sv_strasse:      sv.strasse      || '',
    sv_plz:          sv.plz          || '',
    sv_ort:          sv.ort          || '',
    sv_telefon:      sv.telefon      || '',
    sv_email:        sv.email        || '',
    sv_iban:         sv.iban         || '',
    sv_bic:          sv.bic          || '',
    sv_kontoinhaber: sv.kontoinhaber || sv.name || '',
    empfaenger_name:    rechnung.empfaenger  || '',
    empfaenger_strasse: rechnung.empfStrasse || '',
    empfaenger_plz:     rechnung.empfPlz    || '',
    empfaenger_ort:     rechnung.empfOrt    || '',
    datum:            fmtDatum(new Date().toISOString()),
    aktenzeichen:     rechnung.fallTitel || rechnung.fallId || '',
    rechnungsnummer:  rechnung.nr       || '',
    rechnungsdatum:   fmtDatum(rechnung.datum),
    faellig_am:       fmtDatum(rechnung.faellig),
    betrag:           fmtBetragDE(brutto),
    verwendungszweck: verwendungszweck,
    mahnstufe:        mahnstufe,
    zahlungsfrist:    zahlungsfristDatum(mahnstufe),
  };

  // ── Stufen-spezifisches Payload ─────────────────────────────────────────
  let payloadExtra = {};

  if (mahnstufe === 1) {
    payloadExtra = {
      mahnung_text:     'Wir erlauben uns, Sie an die Begleichung der nachstehenden Rechnung zu erinnern. Möglicherweise ist Ihre Zahlung unserer Erinnerung bereits unterwegs — in diesem Fall bitten wir Sie, dieses Schreiben als gegenstandslos zu betrachten.',
      naechste_schritte: 'Bitte überweisen Sie den offenen Betrag innerhalb von 10 Tagen auf das unten angegebene Konto.',
    };
  } else if (mahnstufe === 2) {
    payloadExtra = {
      hauptforderung:   fmtBetragDE(brutto),
      mahngebuehr:      fmtBetragDE(mgeb1 + mgeb2),
      verzugszinsen:    fmtBetragDE(verzugszinsen),
      gesamtforderung:  fmtBetragDE(gesamtforderung),
    };
  } else if (mahnstufe === 3) {
    payloadExtra = {
      hauptforderung:      fmtBetragDE(brutto),
      verzugszinsen:       fmtBetragDE(verzugszinsen),
      verzugszinsen_datum: fmtDatum(new Date().toISOString()),
      mahngebuehr_1:       fmtBetragDE(mgeb1),
      mahngebuehr_2:       fmtBetragDE(mgeb2),
      mahngebuehr_3:       fmtBetragDE(mgeb3),
      einschreiben_porto:  fmtBetragDE(porto),
      gesamtforderung:     fmtBetragDE(gesamtforderung),
      inkasso_hinweis:     'Sollte die Zahlung nicht fristgerecht eingehen, werden wir ohne weitere Ankündigung einen Rechtsanwalt mit der Einziehung der Forderung beauftragen. Die entstehenden Kosten tragen Sie als Schuldner.',
    };
  }

  const payload = { ...payloadBasis, ...payloadExtra };

  // ── PDFMonkey Document erstellen ───────────────────────────────────────────
  try {
    const createRes = await fetch(PDFMONKEY_API, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        document: {
          document_template_id: templateId,
          status:   'pending',
          payload:  payload,
          meta: {
            mahnstufe: String(mahnstufe),
            rechnungsnummer: rechnung.nr || '',
          },
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[MahnungPDF] PDFMonkey Create Fehler:', createRes.status, err);
      return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'PDFMonkey Fehler: ' + createRes.status }) };
    }

    const createData = await createRes.json();
    const docId      = createData.document?.id;

    if (!docId) {
      return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'Keine Document-ID von PDFMonkey erhalten' }) };
    }

    console.log(`[MahnungPDF] Mahnung ${mahnstufe} erstellt → DocID: ${docId}`);

    // ── Polling: auf PDF-Generierung warten ──────────────────────────────────
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < POLL_MAX; i++) {
      await sleep(POLL_DELAY);

      const pollRes  = await fetch(`${PDFMONKEY_API}/${docId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const pollData = await pollRes.json();
      const status   = pollData.document?.status;
      const pdfUrl   = pollData.document?.download_url;

      if (status === 'success' && pdfUrl) {
        console.log(`[MahnungPDF] PDF fertig: ${pdfUrl}`);
        return {
          statusCode: 200,
          headers:    corsHeaders(),
          body: JSON.stringify({
            success:  true,
            pdf_url:  pdfUrl,
            doc_id:   docId,
            mahnstufe,
            rechnungsnummer: rechnung.nr,
          }),
        };
      }

      if (status === 'failed') {
        console.error('[MahnungPDF] Generierung fehlgeschlagen');
        return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'PDF-Generierung fehlgeschlagen' }) };
      }

      console.log(`[MahnungPDF] Warte... Status: ${status} (Versuch ${i + 1}/${POLL_MAX})`);
    }

    // Timeout — PDF noch nicht fertig, URL nicht verfügbar
    return {
      statusCode: 202,
      headers:    corsHeaders(),
      body: JSON.stringify({
        success:  true,
        pending:  true,
        doc_id:   docId,
        message:  'PDF wird noch generiert — DocID gespeichert, Link folgt.',
      }),
    };

  } catch (e) {
    console.error('[MahnungPDF] Exception:', e.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
};

function corsHeaders() {
  return {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin':  process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
