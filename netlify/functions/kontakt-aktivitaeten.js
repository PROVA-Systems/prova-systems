/**
 * netlify/functions/kontakt-aktivitaeten.js — MEGA³⁴ B1
 *
 * 360°-Aktivitäts-Timeline pro Kontakt.
 * GET /?kontakt_id=<uuid>
 *
 * Aggregiert chronologisch:
 *  - Aufträge (auftrag_kontakte M:N)
 *  - Rechnungen (über auftrag_id)
 *  - Briefe (korrespondenz)
 *  - Termine (über auftrag_id)
 *  - Dokumente (über auftrag_id)
 *
 * Returns: { events: [{date, type, title, link, auftrag_id?}] }
 */
'use strict';

const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const RateLimit = require('./lib/rate-limit-user');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    return _supabase;
  } catch (e) { return null; }
}

function aggregateEvents(buckets) {
  const events = [];
  (buckets.auftraege || []).forEach(a => events.push({
    date: a.created_at, type: 'auftrag',
    title: 'Auftrag ' + (a.az || a.id),
    link: '/akte.html?id=' + a.id,
    auftrag_id: a.id
  }));
  (buckets.rechnungen || []).forEach(r => events.push({
    date: r.created_at, type: 'rechnung',
    title: 'Rechnung ' + (r.rechnungsnr || r.id),
    link: '/rechnungen.html?id=' + r.id,
    auftrag_id: r.auftrag_id
  }));
  (buckets.termine || []).forEach(t => events.push({
    date: t.start_at || t.created_at, type: 'termin',
    title: t.titel || 'Termin',
    link: '/termine.html?id=' + t.id,
    auftrag_id: t.auftrag_id
  }));
  (buckets.dokumente || []).forEach(d => events.push({
    date: d.created_at, type: 'dokument',
    title: d.betreff || ('Dokument ' + (d.typ || '')),
    link: '/freigabe.html?id=' + d.id,
    auftrag_id: d.auftrag_id
  }));
  // Chronologisch absteigend (neuste oben)
  events.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
  return events;
}

exports.handler = requireAuth(async function (event, context) {
  const cors = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 30, 60, { event: event, functionName: 'kontakt-aktivitaeten' });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  const kontakt_id = event.queryStringParameters && event.queryStringParameters.kontakt_id;
  if (!kontakt_id) return jsonResponse(event, 400, { error: 'kontakt_id pflicht' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 200, { events: [], note: 'supabase-not-configured' });

  try {
    // Auftrag-IDs via auftrag_kontakte M:N
    const { data: links } = await sb.from('auftrag_kontakte')
      .select('auftrag_id').eq('kontakt_id', kontakt_id);
    const auftrIds = (links || []).map(l => l.auftrag_id).filter(Boolean);

    let auftraege = [], rechnungen = [], termine = [], dokumente = [];
    if (auftrIds.length) {
      const [aR, rR, tR, dR] = await Promise.all([
        sb.from('auftraege').select('id, az, created_at').in('id', auftrIds),
        sb.from('rechnungen').select('id, rechnungsnr, auftrag_id, created_at').in('auftrag_id', auftrIds),
        sb.from('termine').select('id, titel, auftrag_id, start_at, created_at').in('auftrag_id', auftrIds),
        sb.from('dokumente').select('id, betreff, typ, auftrag_id, created_at').in('auftrag_id', auftrIds)
      ]);
      auftraege = aR.data || [];
      rechnungen = rR.data || [];
      termine = tR.data || [];
      dokumente = dR.data || [];
    }

    const events = aggregateEvents({ auftraege, rechnungen, termine, dokumente });
    return jsonResponse(event, 200, {
      kontakt_id,
      events,
      counts: {
        auftraege: auftraege.length,
        rechnungen: rechnungen.length,
        termine: termine.length,
        dokumente: dokumente.length
      }
    });
  } catch (e) {
    console.warn('[kontakt-aktivitaeten] error:', e.message);
    return jsonResponse(event, 200, { events: [], note: 'fail-soft' });
  }
});

module.exports.__aggregateEvents = aggregateEvents;
