// ══════════════════════════════════════════════════════════════
// PROVA — normen.js Netlify Function
// Lädt alle aktiven Normen aus Airtable NORMEN-Tabelle
// Unterstützt Paginierung für 230+ Normen
// ══════════════════════════════════════════════════════════════

const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE';
const AIRTABLE_TABLE = 'tblFVcMxntQhusY2i'; // NORMEN
const AIRTABLE_PAT   = process.env.AIRTABLE_PAT;

// Airtable Feld-IDs → JS-Objekt-Keys
const FIELD_MAP = {
  'fldyfHaL0ajQSbgeu': 'num',
  'fldcrhYniqdutfgxH': 'titel',
  'fld67tEzJPxJx9f2q': 'bereich',
  'fld5rdDlEzYbOYEWf': 'sa',
  'fldA3gcGvxbDPRnSx': 'anw',
  'fld8CLXyY8pcsByfT': 'gw',
  'fldP4e59fYiDlWkIS': 'mess',
  'fld6CRXiEAt8rkfRO': 'hf',
  'fldqR77SIunE5wV5z': 'hint',
  'fld8XmI7kpjk4WfBV': 'aktiv',
  'fldH3q7cZhbiknKaX': 'status',
  'fldMYoztCqevCM1a1': 'aenderungshinweis',
};

const FIELDS = Object.keys(FIELD_MAP).map(id => `fields[]=${encodeURIComponent(id)}`).join('&');

function json(event, status, obj) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 Minuten cachen
      ...getCorsHeaders(event),
    },
    body: JSON.stringify(obj),
  };
}

async function fetchPage(offset) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${FIELDS}&filterByFormula=${encodeURIComponent('{Aktiv}=1')}&pageSize=100${offset ? '&offset=' + offset : ''}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Airtable HTTP ${res.status}`);
  return res.json();
}

function mapRecord(rec) {
  const f = rec.fields || {};
  const mapped = {};
  for (const [fieldId, key] of Object.entries(FIELD_MAP)) {
    let val = f[fieldId];
    // singleSelect → String
    if (val && typeof val === 'object' && val.name) val = val.name;
    mapped[key] = val !== undefined ? val : '';
  }
  return mapped;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);

  if (!AIRTABLE_PAT) {
    return json(event, 500, { error: 'AIRTABLE_PAT nicht konfiguriert' });
  }

  try {
    const allNormen = [];
    let offset = null;

    // Paginierung: alle Seiten laden
    do {
      const page = await fetchPage(offset);
      const records = page.records || [];
      records.forEach(rec => {
        const n = mapRecord(rec);
        // Nur aktive, vollständige Einträge
        if (n.num && n.titel && n.aktiv !== false) {
          allNormen.push(n);
        }
      });
      offset = page.offset || null;
    } while (offset);

    // Sortierung: Häufigkeit hoch → mittel → niedrig, dann alphabetisch
    const HF_ORDER = { hoch: 0, mittel: 1, niedrig: 2 };
    allNormen.sort((a, b) => {
      const ha = HF_ORDER[a.hf] !== undefined ? HF_ORDER[a.hf] : 9;
      const hb = HF_ORDER[b.hf] !== undefined ? HF_ORDER[b.hf] : 9;
      if (ha !== hb) return ha - hb;
      return (a.num || '').localeCompare(b.num || '', 'de');
    });

    return json(event, 200, {
      normen: allNormen,
      count: allNormen.length,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[normen] Fehler:', err.message);
    return json(event, 500, { error: err.message });
  }
};
