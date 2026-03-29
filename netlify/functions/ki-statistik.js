// ══════════════════════════════════════════════════
// PROVA Systems — KI-Statistik Sync
// Netlify Function: ki-statistik
// Syncs KI_STATISTIK + KI_LERNPOOL to Airtable
// Env: AIRTABLE_PAT
// ══════════════════════════════════════════════════

const AT_BASE = 'appJ7bLlAHZoxENWE';
const AT_KI_STATISTIK = 'tblv9F8LEnUC3mKru';
const AT_KI_LERNPOOL = 'tbl4LEsMvcDKFCYaF';

// Field IDs — KI_STATISTIK
const STAT_FIELDS = {
  schadenart:        'fldZQKGGOmeT4Oud4',
  ursache_quelle:    'fldPp7EdxwoN53kzP',
  ursache_kategorien:'fld8W3PL7PuTpO1mJ',
  eigentext_zeichen: 'fldBpRtEXITRm6yBK',
  weg:               'fld2Yjtutvwv3tzAC',
  diktat:            'fldvMMUji3Z6cJGM8',
  datum:             'fldXeZEaROJflIvCm'
};

// Field IDs — KI_LERNPOOL
const POOL_FIELDS = {
  schadenart: 'flddmPeGNmWNK3J6v',
  sv_ursache: 'flduSZHy7f3zIeYME',
  datum:      'fld7z7wRgkHNUyjDf'
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const PAT = process.env.AIRTABLE_PAT;
  if (!PAT) return { statusCode: 500, headers, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht konfiguriert' }) };

  try {
    const input = JSON.parse(event.body || '{}');
    const results = {};

    // 1. KI_STATISTIK speichern
    if (input.statistik) {
      const s = input.statistik;
      const wegMapping = { 'A': 'Freitext', 'B': 'Kausalkette' };

      const fields = {};
      fields[STAT_FIELDS.schadenart] = s.schadenart || '';
      fields[STAT_FIELDS.ursache_quelle] = s.ursache_quelle || 'keine';
      fields[STAT_FIELDS.ursache_kategorien] = Array.isArray(s.ursache_kategorien) ? s.ursache_kategorien.join(', ') : (s.ursache_kategorien || '');
      fields[STAT_FIELDS.eigentext_zeichen] = parseInt(s.eigentext_zeichen) || 0;
      fields[STAT_FIELDS.weg] = wegMapping[s.weg] || s.weg || 'Freitext';
      fields[STAT_FIELDS.diktat] = !!s.diktat_verwendet;
      fields[STAT_FIELDS.datum] = s.datum || new Date().toISOString().split('T')[0];

      const statRes = await airtableCreate(PAT, AT_KI_STATISTIK, fields);
      results.statistik = statRes ? 'ok' : 'error';
    }

    // 2. KI_LERNPOOL speichern (wenn "Andere Ursache" vorhanden)
    if (input.lernpool && input.lernpool.length > 0) {
      for (const entry of input.lernpool) {
        if (!entry.ursache || !entry.ursache.trim()) continue;
        const fields = {};
        fields[POOL_FIELDS.schadenart] = entry.schadenart || '';
        fields[POOL_FIELDS.sv_ursache] = entry.ursache;
        fields[POOL_FIELDS.datum] = entry.datum || new Date().toISOString().split('T')[0];
        await airtableCreate(PAT, AT_KI_LERNPOOL, fields);
      }
      results.lernpool = 'ok';
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...results }) };
  } catch (err) {
    console.error('ki-statistik error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function airtableCreate(pat, tableId, fields) {
  try {
    const res = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields, typecast: true })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Airtable error ${res.status}:`, errText);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('Airtable create error:', err);
    return null;
  }
}
