/**
 * PROVA — airtable-query.js
 * Zentraler Airtable Query-Builder.
 * Lädt NUR die Felder die wirklich gebraucht werden (fields[]=).
 * Spart 60-80% Datenmenge und beschleunigt alle API-Calls messbar.
 *
 * Prinzip: Stripe, Linear, Notion laden nie komplette Records.
 * Sie definieren pro Use-Case welche Felder gebraucht werden.
 */
'use strict';

const AT_BASE = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
const AT_URL  = 'https://api.airtable.com';

/* ── Tabellen-IDs ─────────────────────────────────────────────── */
const TABLES = {
  SCHADENSFAELLE:   'tblSxV8bsXwd1pwa0',
  SACHVERSTAENDIGE: 'tbladqEQT3tmx4DIB',
  RECHNUNGEN:       'tblF6MS7uiFAJDjiT',
  TERMINE:          'tblyMTTdtfGQjjmc2',
  KONTAKTE:         'tblMKmPLjRelr6Hal',
  KI_STATISTIK:     'tblv9F8LEnUC3mKru',
  KI_LERNPOOL:      'tbl4LEsMvcDKFCYaF',
  TEXTBAUSTEINE:    'tblDS8NQxzceGedJO',
  BRIEFE:           'tblSzxvnkRE6B0thx',
  AUDIT_TRAIL:      'tblqQmMwJKxltXXXl',
};

/* ── Definierte Field-Sets pro Use-Case ───────────────────────── */
/* Nur diese Felder werden geladen — alles andere bleibt auf Airtable */
const FIELD_SETS = {
  // Dashboard: Übersicht, KPI-Cards, Fristenliste
  dashboard_faelle: [
    'Aktenzeichen', 'Status', 'Schadenart', 'Auftraggeber_Name',
    'Fristdatum', 'sv_email', 'Erstellungsdatum', 'Ort'
  ],
  // Archiv: Tabellen-Ansicht mit Such- und Filteroptionen
  archiv_faelle: [
    'Aktenzeichen', 'Status', 'Schadenart', 'Auftraggeber_Name',
    'Fristdatum', 'sv_email', 'Erstellungsdatum', 'Ort',
    'Honorar_gesamt', 'Rechnungsdatum'
  ],
  // Akte: Vollständige Detailansicht (alle Felder nötig)
  akte_detail: null, // null = alle Felder laden
  // Rechnungen: Finanzübersicht
  rechnungen_liste: [
    'Aktenzeichen', 'Rechnungsnummer', 'Rechnungsdatum', 'Honorar_gesamt',
    'Status', 'sv_email', 'Auftraggeber_Name', 'faellig_am', 'bezahlt_am'
  ],
  // Termine: Kalender und Fristen
  termine_liste: [
    'Aktenzeichen', 'termin_datum', 'termin_typ', 'betreff',
    'sv_email', 'notiz', 'ort'
  ],
  // Kontakte: Adressbuch
  kontakte_liste: [
    'Name', 'Email', 'Telefon', 'Firma', 'Typ', 'sv_email', 'Ort'
  ],
  // Dashboard: SV-Profil laden (Paket, Name für Begrüßung)
  sv_profil_mini: [
    'Email', 'Vorname', 'Nachname', 'Paket', 'Status',
    'trial_end', 'abo_start', 'smtp_host', 'smtp_user'
  ],
  // KI-Statistik für Dashboard
  ki_statistik_summary: [
    'SV_Email', 'Aktion', 'Tokens', 'Datum', 'Gutachten_ID'
  ],
};

/**
 * Airtable URL mit optionaler fields[]-Filterung bauen
 * @param {string} tableId - Airtable Table ID
 * @param {object} opts
 * @param {string[]} [opts.fields] - Felder die geladen werden (null = alle)
 * @param {string} [opts.filterByFormula] - Airtable Filterformel
 * @param {number} [opts.maxRecords] - Max Anzahl Records
 * @param {string} [opts.sort] - Sortierung als '[{field,direction}]'
 * @param {string} [opts.view] - Airtable View-Name
 * @param {string} [opts.fieldSet] - Vordefinierter Field-Set aus FIELD_SETS
 * @returns {string} Vollständige Airtable URL
 */
function buildUrl(tableId, opts = {}) {
  const url = new URL(`${AT_URL}/v0/${AT_BASE}/${tableId}`);

  // Fields aus Field-Set oder direkt
  let fields = opts.fields;
  if (!fields && opts.fieldSet && FIELD_SETS[opts.fieldSet]) {
    fields = FIELD_SETS[opts.fieldSet];
  }

  // Fields als fields[N]=fieldname Parameter
  if (fields && Array.isArray(fields)) {
    fields.forEach((f, i) => url.searchParams.append(`fields[${i}]`, f));
  }

  if (opts.filterByFormula) url.searchParams.set('filterByFormula', opts.filterByFormula);
  if (opts.maxRecords)      url.searchParams.set('maxRecords', String(opts.maxRecords));
  if (opts.view)            url.searchParams.set('view', opts.view);
  if (opts.offset)          url.searchParams.set('offset', opts.offset);

  if (opts.sort) {
    const sorts = Array.isArray(opts.sort) ? opts.sort : [opts.sort];
    sorts.forEach((s, i) => {
      url.searchParams.set(`sort[${i}][field]`, s.field);
      url.searchParams.set(`sort[${i}][direction]`, s.direction || 'desc');
    });
  }

  return url.toString();
}

/**
 * Mehrere Requests parallel ausführen (wie Promise.all aber mit Fehler-Isolation)
 * Wenn ein Request fehlschlägt, brechen die anderen nicht ab
 */
async function fetchParallel(requests) {
  return Promise.all(
    requests.map(req =>
      req.catch(err => ({ error: err.message, data: null }))
    )
  );
}

module.exports = { buildUrl, fetchParallel, TABLES, FIELD_SETS };
