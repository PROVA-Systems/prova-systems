// PROVA — normen.js Netlify Function
// Lädt alle aktiven Normen aus Airtable NORMEN-Tabelle (tblnceVJIW7BjHsPF)
// Korrekte Feld-IDs aus Airtable-Schema — Stand 17.04.2026

const AIRTABLE_BASE  = 'appJ7bLlAHZoxENWE';
const AIRTABLE_TABLE = 'tblnceVJIW7BjHsPF';

// Echte Feld-IDs aus Airtable (via list_tables_for_base ermittelt)
const FIELD_MAP = {
  'fldyeReuP8JN2ysfX': 'num',       // \ufeffNorm-Nummer (BOM-Zeichen!)
  'fldOoZMoaGeVvRrex': 'titel',
  'fldGi6sTQjrcFfkfc': 'bereich',
  'fld9fmLn0GyA9SDf9': 'sa',        // Schadensarten (multipleSelects)
  'flduiGXOUlExoE9PV': 'anw',       // Anwendung
  'fldSfEeDIFHWRX26u': 'gw',        // Grenzwerte
  'fldWwYKqbcRilMPoY': 'mess',      // Messtechnik
  'fldRb3LIxS7kbKJft': 'hint',      // Gutachter-Hinweis
  'fldket7RgxYYMFBrw': 'hf',        // Häufigkeit (singleSelect)
  'fldK4QeLnSDAbkQ8N': 'status',    // Status
  'fldbPPZwyU2BlyTco': 'aktiv',     // Aktiv (checkbox)
};

const FIELDS = Object.keys(FIELD_MAP).map(id => `fields[]=${encodeURIComponent(id)}`).join('&');

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': 'https://prova-systems.de',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300'
};

async function fetchPage(pat, offset) {
  // Aktiv ist ein Checkbox-Feld → TRUE() für aktive Datensätze
  const filter = encodeURIComponent('{Aktiv}=TRUE()');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${FIELDS}&filterByFormula=${filter}&pageSize=100${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${pat}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable HTTP ${res.status}: ${err.substring(0, 200)}`);
  }
  return res.json();
}

function mapRecord(rec) {
  const f = rec.fields || {};
  const mapped = {};
  for (const [fieldId, key] of Object.entries(FIELD_MAP)) {
    let val = f[fieldId];
    // singleSelect → String
    if (val && typeof val === 'object' && val.name) val = val.name;
    // multipleSelects → komma-separierter String
    if (Array.isArray(val)) val = val.map(v => v.name || v).join(',');
    mapped[key] = val !== undefined && val !== null ? val : '';
  }
  return mapped;
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const pat = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
  if (!pat) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht gesetzt' }) };
  }

  try {
    let all = [];
    let offset = null;

    do {
      const data = await fetchPage(pat, offset);
      const records = (data.records || []).map(mapRecord);
      all = all.concat(records);
      offset = data.offset || null;
    } while (offset);

    // Sortierung: hoch → mittel → niedrig
    const HF_ORDER = { 'hoch': 0, 'mittel': 1, 'niedrig': 2 };
    all.sort((a, b) => (HF_ORDER[a.hf] ?? 9) - (HF_ORDER[b.hf] ?? 9));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ normen: all, total: all.length, timestamp: new Date().toISOString() })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
