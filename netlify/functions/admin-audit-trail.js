/**
 * PROVA — admin-audit-trail.js
 * MEGA-MEGA N3-EXT — Read-Only-View auf audit_trail
 *
 * Filter:
 *   ?typ_prefix=admin   (zeigt nur admin.*-Events)
 *   ?typ_prefix=stripe
 *   ?since=24h | 7d | 30d
 *   ?limit=100 (max 500)
 *   ?email=<sv_email>
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

function parseSince(s) {
  const m = String(s || '24h').match(/^(\d+)([hd])$/);
  if (!m) return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const n = parseInt(m[1]);
  const unit = m[2];
  const ms = n * (unit === 'h' ? 3600 * 1000 : 86400 * 1000);
  return new Date(Date.now() - ms).toISOString();
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const q = event.queryStringParameters || {};
  const typPrefix = q.typ_prefix || '';
  const since = parseSince(q.since || '24h');
  const limit = Math.min(parseInt(q.limit || '100'), 500);
  const email = q.email ? String(q.email).toLowerCase() : null;

  let qb = sb.from('audit_trail').select('id, typ, sv_email, workspace_id, user_id, details, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (typPrefix) qb = qb.like('typ', typPrefix + '%');
  if (email) qb = qb.eq('sv_email', email);

  const { data, error } = await qb;
  if (error) return jsonResponse(event, 500, { error: 'DB-Query fehlgeschlagen: ' + error.message });

  // Aggregation pro typ
  const counts = {};
  for (const r of (data || [])) {
    counts[r.typ] = (counts[r.typ] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return jsonResponse(event, 200, {
    ok: true,
    fetched_at: new Date().toISOString(),
    filter: { typ_prefix: typPrefix, since, limit, email },
    total: (data || []).length,
    top_events: top.map(([typ, count]) => ({ typ, count })),
    events: data || []
  });
}, { functionName: 'admin-audit-trail', rateLimit: { max: 30, windowSec: 60 } }), { functionName: 'admin-audit-trail' });
