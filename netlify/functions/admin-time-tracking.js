/**
 * PROVA — admin-time-tracking.js
 * MEGA⁶ S1 — Cockpit-Sektion 1/6 (Gutachten-Time-Tracking)
 *
 * Misst die Lifecycle-Dauer pro Auftrag aus audit_trail-Events:
 *  auftrag.created -> auftrag.freigegeben (oder pdf.generated)
 *
 * Aggregation pro User + Auftragstyp.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

function parseSince(s) {
  const m = String(s || '30d').match(/^(\d+)([hd])$/);
  if (!m) return new Date(Date.now() - 30 * 86400000).toISOString();
  const n = parseInt(m[1]);
  const ms = n * (m[2] === 'h' ? 3600000 : 86400000);
  return new Date(Date.now() - ms).toISOString();
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const since = parseSince((event.queryStringParameters || {}).since || '30d');

  // Read created + completed events
  const { data: events, error } = await sb.from('audit_trail')
    .select('typ, sv_email, details, created_at')
    .in('typ', ['auftrag.created', 'auftrag.freigegeben', 'pdf.generated'])
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error) {
    return jsonResponse(event, 200, {
      ok: true, configured: false,
      hint: 'audit_trail-Query fehlgeschlagen oder noch keine Daten',
      error: error.message
    });
  }

  // Pair created with completed by aktenzeichen + sv_email
  const pairs = {};
  for (const e of (events || [])) {
    let det;
    try { det = typeof e.details === 'string' ? JSON.parse(e.details) : e.details; }
    catch { det = {}; }
    const az = (det && (det.aktenzeichen || det.az)) || null;
    const typ = (det && det.auftragstyp) || 'unknown';
    if (!az || !e.sv_email) continue;
    const k = e.sv_email + '|' + az;
    if (!pairs[k]) pairs[k] = { sv_email: e.sv_email, az: az, typ: typ };
    if (e.typ === 'auftrag.created') pairs[k].started = e.created_at;
    if (e.typ === 'auftrag.freigegeben' || e.typ === 'pdf.generated') {
      // erste Completion zaehlt
      if (!pairs[k].completed) pairs[k].completed = e.created_at;
    }
  }

  // Calculate durations
  const completed = Object.values(pairs).filter(p => p.started && p.completed).map(p => ({
    sv_email: p.sv_email,
    aktenzeichen: p.az,
    typ: p.typ,
    started: p.started,
    completed: p.completed,
    duration_min: Math.round((new Date(p.completed) - new Date(p.started)) / 60000)
  }));

  // Aggregate per user + per typ
  const perUser = {};
  const perTyp = {};
  for (const c of completed) {
    perUser[c.sv_email] = perUser[c.sv_email] || { sv_email: c.sv_email, count: 0, total_min: 0 };
    perUser[c.sv_email].count++;
    perUser[c.sv_email].total_min += c.duration_min;
    perTyp[c.typ] = perTyp[c.typ] || { typ: c.typ, count: 0, total_min: 0 };
    perTyp[c.typ].count++;
    perTyp[c.typ].total_min += c.duration_min;
  }
  const userStats = Object.values(perUser).map(u => ({
    ...u, avg_min: Math.round(u.total_min / u.count)
  })).sort((a, b) => b.count - a.count);
  const typStats = Object.values(perTyp).map(t => ({
    ...t, avg_min: Math.round(t.total_min / t.count)
  })).sort((a, b) => b.count - a.count);

  return jsonResponse(event, 200, {
    ok: true, configured: true,
    fetched_at: new Date().toISOString(),
    since: since,
    completed_total: completed.length,
    per_user: userStats.slice(0, 20),
    per_typ: typStats,
    recent: completed.slice(-10).reverse()
  });
}, { functionName: 'admin-time-tracking', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-time-tracking' });
