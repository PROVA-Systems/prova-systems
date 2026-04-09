// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Rechnung PDF Generator
// Netlify Function: rechnung-pdf
//
// Generiert Rechnungs-PDFs via PDFMonkey — 3 Typen:
//   jveg      → PROVA – F-01 – JVEG GERICHTSRECHNUNG  (532BEA1F-9D1D-40CE-BA84-542C50898437)
//   pauschale → PROVA – F-02 – PAUSCHALRECHNUNG        (81C3E69D-6710-4123-8670-6C52BB926058)
//   stunden   → PROVA – F-03 – STUNDENRECHNUNG         (EA5CAC85-EE15-43BC-BC25-10C2C6368572)
//
// Env: PDFMONKEY_API_KEY
// ══════════════════════════════════════════════════════════════════════════════

const RECHNUNG_TEMPLATES = {
  jveg:              '532BEA1F-9D1D-40CE-BA84-542C50898437',
  pauschale:         '81C3E69D-6710-4123-8670-6C52BB926058',
  stunden:           'EA5CAC85-EE15-43BC-BC25-10C2C6368572',
  kurzstellungnahme: 'C4BB257B-2841-4AF7-93C1-0C795FCA6B8C',
  gutschrift:        '64BFD7F0-E90A-4F03-A65C-AE0D32DBA9C3',
};

const UST_SATZ     = 19;
const PDFMONKEY_API = 'https://api.pdfmonkey.io/api/v1/documents';
const POLL_MAX     = 15;
const POLL_DELAY   = 2000;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  // Nur eingeloggte User (JWT via Netlify Identity)
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

  const { typ, sv, rechnung } = body;

  if (!RECHNUNG_TEMPLATES[typ]) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: `Unbekannter Rechnungstyp: ${typ}. Erlaubt: jveg, pauschale, stunden` }),
    };
  }
  if (!sv || !rechnung) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'sv und rechnung sind Pflichtfelder' }) };
  }

  // ── Hilfsfunktionen ────────────────────────────────────────────────────────
  function fmtDE(val) {
    return Number(val || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDatum(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return iso; }
  }

  // ── SV-Basis (für alle Typen gleich) ──────────────────────────────────────
  const svBasis = {
    sv_name:         sv.name          || '',
    sv_firma:        sv.firma         || '',
    sv_strasse:      sv.strasse       || '',
    sv_plz:          String(sv.plz    || ''),
    sv_ort:          sv.ort           || '',
    sv_telefon:      sv.telefon       || '',
    sv_email:        sv.email         || '',
    sv_steuer_nr:    sv.steuer_nr     || '',
    sv_iban:         sv.iban          || '',
    sv_bic:          sv.bic           || '',
    sv_kontoinhaber: sv.kontoinhaber  || sv.name || '',
    sv_bank:         sv.bank          || '',
  };

  // ── Empfänger-Basis ────────────────────────────────────────────────────────
  const empfaengerBasis = {
    empfaenger_name:    rechnung.empfaenger_name    || rechnung.empfaenger || '',
    empfaenger_strasse: rechnung.empfaenger_strasse || '',
    empfaenger_plz:     rechnung.empfaenger_plz     || '',
    empfaenger_ort:     rechnung.empfaenger_ort     || '',
  };

  // ── Payload je Typ aufbauen ────────────────────────────────────────────────
  let payload = {};
  const templateId = RECHNUNG_TEMPLATES[typ];

  if (typ === 'jveg') {
    payload = await buildJvegPayload(rechnung, svBasis, empfaengerBasis, fmtDE, fmtDatum);
  } else if (typ === 'pauschale') {
    payload = await buildPauschalePayload(rechnung, svBasis, empfaengerBasis, fmtDE, fmtDatum);
  } else if (typ === 'stunden') {
    payload = await buildStundenPayload(rechnung, svBasis, empfaengerBasis, fmtDE, fmtDatum);
  } else if (typ === 'kurzstellungnahme') {
    payload = await buildKurzstellungnahmePayload(rechnung, svBasis, empfaengerBasis, fmtDE, fmtDatum);
  } else if (typ === 'gutschrift') {
    payload = await buildGutschriftPayload(rechnung, svBasis, empfaengerBasis, fmtDE, fmtDatum);
  }

  // ── PDFMonkey aufrufen ─────────────────────────────────────────────────────
  try {
    const createRes = await fetch(PDFMONKEY_API, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          document_template_id: templateId,
          status:  'pending',
          payload: payload,
          meta: { typ, rechnungsnummer: rechnung.rechnungsnummer || '' },
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[RechnungPDF] PDFMonkey Fehler:', createRes.status, err);
      return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'PDFMonkey Fehler: ' + createRes.status }) };
    }

    const createData = await createRes.json();
    const docId      = createData.document?.id;
    if (!docId) return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'Keine Document-ID' }) };

    console.log(`[RechnungPDF] ${typ} → DocID: ${docId}`);

    // ── Polling ──────────────────────────────────────────────────────────────
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < POLL_MAX; i++) {
      await sleep(POLL_DELAY);
      const pollRes  = await fetch(`${PDFMONKEY_API}/${docId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      const pollData = await pollRes.json();
      const status   = pollData.document?.status;
      const pdfUrl   = pollData.document?.download_url;

      if (status === 'success' && pdfUrl) {
        console.log(`[RechnungPDF] PDF fertig: ${pdfUrl}`);
        return {
          statusCode: 200,
          headers:    corsHeaders(),
          body: JSON.stringify({ success: true, pdf_url: pdfUrl, doc_id: docId, typ, rechnungsnummer: rechnung.rechnungsnummer }),
        };
      }
      if (status === 'failed') {
        return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'PDF-Generierung fehlgeschlagen' }) };
      }
    }

    return {
      statusCode: 202,
      headers:    corsHeaders(),
      body: JSON.stringify({ success: true, pending: true, doc_id: docId, message: 'PDF wird noch generiert.' }),
    };

  } catch (e) {
    console.error('[RechnungPDF] Exception:', e.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: e.message }) };
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// PAYLOAD BUILDER: F-01 JVEG Gerichtsrechnung
// ══════════════════════════════════════════════════════════════════════════════
async function buildJvegPayload(r, sv, empf, fmtDE, fmtDatum) {
  const leistungen = (r.leistungen || []).map(l => ({
    datum:     fmtDatum(l.datum) || l.datum || '',
    taetigkeit: l.taetigkeit || '',
    std:       l.std || l.stunden || '',   // PDFMonkey F-01 erwartet 'std'
    betrag:    typeof l.betrag === 'number' ? fmtDE(l.betrag) : (l.betrag || ''),
  }));

  const summeHonorar    = parseFloat(r.summe_honorar    || 0);
  const fahrtkosten     = parseFloat(r.fahrtkosten      || 0);
  const abwesenheit     = parseFloat(r.abwesenheitsgeld || 0);
  const portoTel        = parseFloat(r.porto_tel        || 0);
  const kopienDruck     = parseFloat(r.kopien_druck     || 0);
  const fotos           = parseFloat(r.fotos            || 0);
  const sonstige        = parseFloat(r.sonstige_auslagen || 0);
  const summeAuslagen   = fahrtkosten + abwesenheit + portoTel + kopienDruck + fotos + sonstige;
  const zwischensumme   = summeHonorar + summeAuslagen;
  const ust             = Math.round(zwischensumme * UST_SATZ) / 100;
  const gesamtbetrag    = zwischensumme + ust;

  return {
    ...sv, ...empf,
    rechnungsnummer:       r.rechnungsnummer  || '',
    rechnungsdatum:        fmtDatum(r.rechnungsdatum) || r.rechnungsdatum || '',
    aktenzeichen:          r.aktenzeichen     || '',
    gerichts_az:           r.gerichts_az      || r.aktenzeichen || '',
    kostenstelle:          r.kostenstelle     || r.aktenzeichen || '',
    verguetungsgruppe:     r.verguetungsgruppe || '3',
    beweisbeschluss_datum: fmtDatum(r.beweisbeschluss_datum) || '',
    leistungen,
    summe_honorar:         fmtDE(summeHonorar),
    fahrtkosten:           fmtDE(fahrtkosten),
    fahrtkosten_basis:     r.fahrtkosten_basis    || '',
    abwesenheitsgeld:      fmtDE(abwesenheit),
    abwesenheitsgeld_basis: r.abwesenheitsgeld_basis || '',
    porto_tel:             fmtDE(portoTel),
    porto_tel_basis:       r.porto_tel_basis      || 'Pauschale (max. 15 €)',
    kopien_druck:          fmtDE(kopienDruck),
    kopien_druck_basis:    r.kopien_druck_basis   || '',
    fotos:                 fmtDE(fotos),
    fotos_basis:           r.fotos_basis          || '',
    sonstige_auslagen:     fmtDE(sonstige),
    sonstige_auslagen_basis: r.sonstige_auslagen_basis || '—',
    summe_auslagen:        fmtDE(summeAuslagen),
    zwischensumme:         fmtDE(zwischensumme),
    ust_satz:              String(UST_SATZ),
    ust_betrag:            fmtDE(ust),
    gesamtbetrag:          fmtDE(gesamtbetrag),
    zahlungsfrist:         r.zahlungsfrist || '30',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYLOAD BUILDER: F-02 Pauschalrechnung
// ══════════════════════════════════════════════════════════════════════════════
async function buildPauschalePayload(r, sv, empf, fmtDE, fmtDatum) {
  const positionen = (r.positionen || []).map((p, i) => ({
    pos:         p.pos         || String(i + 1),
    beschreibung: p.beschreibung || '',
    menge:       p.menge       || '1',
    einzelpreis: typeof p.einzelpreis === 'number' ? fmtDE(p.einzelpreis) : (p.einzelpreis || ''),
    gesamt:      typeof p.gesamt      === 'number' ? fmtDE(p.gesamt)      : (p.gesamt      || ''),
  }));

  // Zwischensumme aus Positionen berechnen wenn nicht übergeben
  let zwischensumme = parseFloat(r.zwischensumme || 0);
  if (!zwischensumme && positionen.length) {
    zwischensumme = (r.positionen || []).reduce((s, p) => s + parseFloat(String(p.gesamt || p.einzelpreis || 0).replace(',', '.')), 0);
  }
  const ust          = Math.round(zwischensumme * UST_SATZ) / 100;
  const gesamtbetrag = zwischensumme + ust;

  return {
    ...sv, ...empf,
    rechnungsnummer:  r.rechnungsnummer || '',
    rechnungsdatum:   fmtDatum(r.rechnungsdatum) || r.rechnungsdatum || '',
    schadensnummer:   r.schadensnummer  || r.aktenzeichen || '',
    aktenzeichen:     r.aktenzeichen    || r.schadensnummer || '',
    leistungszeitraum: r.leistungszeitraum || '',
    positionen,
    zwischensumme:    fmtDE(zwischensumme),
    ust_satz:         String(UST_SATZ),
    ust_betrag:       fmtDE(ust),
    gesamtbetrag:     fmtDE(gesamtbetrag),
    zahlungsfrist:    r.zahlungsfrist || '14',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYLOAD BUILDER: F-03 Stundenrechnung
// ══════════════════════════════════════════════════════════════════════════════
async function buildStundenPayload(r, sv, empf, fmtDE, fmtDatum) {
  const zeitnachweis = (r.zeitnachweis || []).map(z => ({
    datum:      fmtDatum(z.datum) || z.datum || '',
    taetigkeit: z.taetigkeit || '',
    std:        z.std   || '',
    satz:       typeof z.satz   === 'number' ? fmtDE(z.satz)   : (z.satz   || ''),
    betrag:     typeof z.betrag === 'number' ? fmtDE(z.betrag) : (z.betrag || ''),
  }));

  // Summe Honorar aus Zeitnachweis berechnen
  let summeHonorar = parseFloat(r.summe_honorar || 0);
  if (!summeHonorar && zeitnachweis.length) {
    summeHonorar = (r.zeitnachweis || []).reduce((s, z) => {
      const std   = parseFloat(String(z.std   || '0').replace(',', '.'));
      const satz  = parseFloat(String(z.satz  || '0').replace(',', '.'));
      const bet   = parseFloat(String(z.betrag || '0').replace(',', '.'));
      return s + (bet || std * satz);
    }, 0);
  }

  const auslagen      = parseFloat(String(r.auslagen || '0').replace(',', '.'));
  const zwischensumme = summeHonorar + auslagen;
  const ust           = Math.round(zwischensumme * UST_SATZ) / 100;
  const gesamtbetrag  = zwischensumme + ust;

  return {
    ...sv, ...empf,
    rechnungsnummer:   r.rechnungsnummer  || '',
    rechnungsdatum:    fmtDatum(r.rechnungsdatum) || r.rechnungsdatum || '',
    schadensnummer:    r.schadensnummer   || r.aktenzeichen || '',
    aktenzeichen:      r.aktenzeichen     || r.schadensnummer || '',
    leistungszeitraum: r.leistungszeitraum || '',
    stundensatz:       typeof r.stundensatz === 'number' ? fmtDE(r.stundensatz) : (r.stundensatz || ''),
    zeitnachweis,
    summe_honorar:     fmtDE(summeHonorar),
    auslagen:          fmtDE(auslagen),
    zwischensumme:     fmtDE(zwischensumme),
    ust_satz:          String(UST_SATZ),
    ust_betrag:        fmtDE(ust),
    gesamtbetrag:      fmtDE(gesamtbetrag),
    zahlungsfrist:     r.zahlungsfrist || '14',
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// PAYLOAD BUILDER: F-04 Kurzstellungnahme / Telefonische Beratung
// ══════════════════════════════════════════════════════════════════════════════
async function buildKurzstellungnahmePayload(r, sv, empf, fmtDE, fmtDatum) {
  const positionen = (r.positionen || []).map((p, i) => ({
    pos:                 p.pos || String(i + 1),
    leistungsbeschreibung: p.leistungsbeschreibung || p.beschreibung || '',
    betrag:              typeof p.betrag === 'number' ? fmtDE(p.betrag) : (p.betrag || ''),
  }));

  let zwischensumme = parseFloat(String(r.zwischensumme || '0').replace(',', '.'));
  if (!zwischensumme && positionen.length) {
    zwischensumme = (r.positionen || []).reduce((s, p) => {
      return s + parseFloat(String(p.betrag || '0').replace(',', '.').replace('-', ''));
    }, 0);
  }
  const ust          = Math.round(zwischensumme * UST_SATZ) / 100;
  const gesamtbetrag = zwischensumme + ust;

  return {
    ...sv, ...empf,
    rechnungsnummer: r.rechnungsnummer || '',
    rechnungsdatum:  fmtDatum(r.rechnungsdatum) || r.rechnungsdatum || '',
    schadensnummer:  r.schadensnummer  || r.aktenzeichen || '',
    objekt:          r.objekt          || r.adresse || '',
    positionen,
    zwischensumme:   fmtDE(zwischensumme),
    ust_satz:        String(UST_SATZ),
    ust_betrag:      fmtDE(ust),
    gesamtbetrag:    fmtDE(gesamtbetrag),
    zahlungsfrist:   r.zahlungsfrist || '14',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYLOAD BUILDER: F-05 Gutschrift / Stornorechnung
// ══════════════════════════════════════════════════════════════════════════════
async function buildGutschriftPayload(r, sv, empf, fmtDE, fmtDatum) {
  const positionen = (r.positionen || []).map((p, i) => ({
    pos:         p.pos || String(i + 1),
    beschreibung: p.beschreibung || '',
    betrag:      typeof p.betrag === 'number' ? fmtDE(p.betrag) : (p.betrag || ''),
  }));

  // Netto aus Positionen summieren (Beträge können negativ sein)
  let gutschriftNetto = parseFloat(String(r.gutschrift_netto || '0').replace(',', '.'));
  if (!gutschriftNetto && positionen.length) {
    gutschriftNetto = (r.positionen || []).reduce((s, p) => {
      return s + parseFloat(String(p.betrag || '0').replace(',', '.'));
    }, 0);
  }
  const ust               = Math.round(gutschriftNetto * UST_SATZ) / 100;
  const gutschriftBrutto  = gutschriftNetto + ust;

  return {
    ...sv, ...empf,
    gutschrift_nummer:         r.gutschrift_nummer       || '',
    datum:                     fmtDatum(r.datum) || r.datum || '',
    bezieht_sich_auf_rechnung: r.bezieht_sich_auf_rechnung || '',
    originalrechnungsdatum:    fmtDatum(r.originalrechnungsdatum) || r.originalrechnungsdatum || '',
    stornogrund:               r.stornogrund || '',
    positionen,
    gutschrift_netto:          fmtDE(gutschriftNetto),
    ust_satz:                  String(UST_SATZ),
    ust_betrag:                fmtDE(ust),
    gutschriftsbetrag_brutto:  fmtDE(gutschriftBrutto),
  };
}

function corsHeaders() {
  return {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin':  process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
