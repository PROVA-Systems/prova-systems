// MEGA⁴-EXT Q4: Storage-Router (read-dual fuer eigene Aktivitaets-History).
const { AIRTABLE_API, BASE_ID, TABLE_AUDIT } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');
const { requireAuth } = require('./lib/jwt-middleware');
const { readDual, getSupabase } = require('./lib/storage-router');

// S6 Phase 1.9: per-request event-Capture (siehe ki-proxy.js Begruendung)
let _currentEvent = null;

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(_currentEvent, ['GET', 'OPTIONS'])
    },
    body: JSON.stringify(obj)
  };
}

exports.handler = requireAuth(async function (event, context) {
  _currentEvent = event;
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  // P4B.7b: HMAC-Token-Email statt Identity-clientContext
  const user = { email: context.userEmail };

  const pat = process.env.AIRTABLE_PAT;
  const email = String(user.email).trim().toLowerCase().replace(/"/g, '\\"');

  try {
    const records = await readDual({
      functionName: 'mein-aktivitaetsprotokoll',
      airtable: async () => {
        if (!pat) return [];
        const formula = '{Email}="' + email + '"';
        const url = AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_AUDIT
          + '?maxRecords=50&sort[0][field]=Zeitstempel&sort[0][direction]=desc&filterByFormula='
          + encodeURIComponent(formula);
        const res = await fetch(url, { headers: { Authorization: 'Bearer ' + pat } });
        if (!res.ok) return [];
        const data = await res.json();
        return data.records || [];
      },
      supabase: async () => {
        const sb = getSupabase();
        if (!sb) return [];
        const { data } = await sb.from('audit_trail')
          .select('id, typ, sv_email, details, created_at')
          .eq('sv_email', email)
          .order('created_at', { ascending: false })
          .limit(50);
        // Format wie Airtable-Records (id + fields-Wrapper) fuer Frontend-Compat
        return (data || []).map(r => ({
          id: r.id,
          fields: {
            Typ: r.typ,
            Email: r.sv_email,
            Details: r.details,
            Zeitstempel: r.created_at
          }
        }));
      }
    });
    return json(200, { ok: true, records: records });
  } catch (e) {
    return json(200, { ok: true, records: [] });
  }
});
