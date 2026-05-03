const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const { requireAuth } = require('./lib/jwt-middleware');
const { writeDual, getSupabase } = require('./lib/storage-router');
// ══════════════════════════════════════════════════
// PROVA Systems — KI-Statistik Sync
// MEGA⁷ U1: Storage-Router (dual-write Airtable + Supabase ki_protokoll).
// Default PROVA_MIGRATION_PATH=airtable -> 0 Production-Risiko.
// Env: AIRTABLE_PAT (Airtable-Path), SUPABASE_SERVICE_ROLE_KEY (Supabase-Path)
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

exports.handler = requireAuth(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const PAT = process.env.AIRTABLE_PAT;
  if (!PAT) return { statusCode: 500, headers, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht konfiguriert' }) };

  try {
    // Nur eingeloggte User (JWT via Netlify Identity) — verhindert Missbrauch
    const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
      ? String(event.clientContext.user.email).toLowerCase()
      : '';
    if (!jwtEmail) return { statusCode: 401, headers, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };

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

      const wr = await writeDual({
        functionName: 'ki-statistik',
        airtable: async () => airtableCreate(PAT, AT_KI_STATISTIK, fields),
        supabase: async () => {
          const sb = getSupabase();
          if (!sb) return null;
          return sb.from('ki_protokoll').insert({
            workspace_id: null,
            sv_email: jwtEmail,
            funktion: 'ki-statistik-sync',
            modell: 'meta',
            tokens_in: 0,
            tokens_out: parseInt(s.eigentext_zeichen) || 0,
            kosten_eur: 0,
            metadata: {
              schadenart: s.schadenart,
              ursache_quelle: s.ursache_quelle,
              ursache_kategorien: s.ursache_kategorien,
              weg: s.weg,
              diktat_verwendet: !!s.diktat_verwendet
            }
          });
        }
      });
      results.statistik = (wr.airtable || wr.supabase) ? 'ok' : 'error';
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
});

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
