// PROVA — normen.js Netlify Function
// MEGA⁴-EXT Q3: Storage-Router Pilot-Migration (Bundle A)
// Liest aus Airtable ODER Supabase je nach PROVA_MIGRATION_PATH ENV.
// Default: 'airtable' (Status-Quo). 'dual'/supabase' fuer graduellen Rollout.

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

const { getCorsHeaders } = require('./lib/cors-helper');
const { readDual, getSupabase } = require('./lib/storage-router');

// S6 Phase 1.9: dynamische CORS-Headers per Request (vorher hardcoded
// auf prova-systems.de — App-Subdomain wurde geblockt). Audit-8 M-03.
function corsBase(event) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    ...getCorsHeaders(event, ['GET', 'OPTIONS'])
  };
}

async function fetchPage(pat, offset) {
  // Aktiv ist ein Checkbox-Feld → TRUE() für aktive Datensätze
  // returnFieldsByFieldId=true: Airtable liefert Feld-IDs als Keys im Response
  //   (sonst Feldnamen — dann schlägt FIELD_MAP-Lookup fehl und alle Felder sind leer)
  const filter = encodeURIComponent('{Aktiv}=TRUE()');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${FIELDS}&filterByFormula=${filter}&pageSize=100&returnFieldsByFieldId=true${offset ? '&offset=' + encodeURIComponent(offset) : ''}`;
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
  const CORS = corsBase(event);
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const pat = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
  if (!pat) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht gesetzt' }) };
  }

  try {
    // Storage-Router: PROVA_MIGRATION_PATH='airtable' (default) | 'dual' | 'supabase'
    const all = await readDual({
      functionName: 'normen',
      airtable: async () => {
        let acc = [];
        let offset = null;
        do {
          const data = await fetchPage(pat, offset);
          const records = (data.records || []).map(mapRecord);
          acc = acc.concat(records);
          offset = data.offset || null;
        } while (offset);
        return acc;
      },
      supabase: async () => {
        const sb = getSupabase();
        if (!sb) return [];
        const { data, error } = await sb.from('textbausteine')
          .select('titel, kurzbeschreibung, inhalt, kategorie_subtyp, metadata, is_active')
          .eq('kategorie', 'norm')
          .eq('is_active', true)
          .limit(1000);
        if (error) throw new Error('Supabase: ' + error.message);
        return (data || []).map(t => ({
          num:    t.titel,
          titel:  t.kurzbeschreibung || '',
          bereich: t.kategorie_subtyp || '',
          sa:     (t.metadata && t.metadata.schadensarten) || '',
          anw:    (t.metadata && t.metadata.anwendung) || '',
          gw:     (t.metadata && t.metadata.grenzwerte) || '',
          mess:   (t.metadata && t.metadata.messtechnik) || '',
          hint:   (t.metadata && t.metadata.gutachter_hinweis) || '',
          hf:     (t.metadata && t.metadata.haeufigkeit) || 'mittel',
          status: 'aktiv',
          aktiv:  true
        }));
      }
    });

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
