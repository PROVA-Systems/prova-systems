/**
 * PROVA — admin-churn.js
 * MEGA⁶ S1 — Cockpit-Sektion 4/6 (Churn-Reasons)
 *
 * Quellen:
 *  - audit_trail typ='stripe.subscription.cancelled' (Detail-Reason)
 *  - workspaces.cancellation_reason (falls vorhanden)
 *
 * Aggregation pro Reason-Kategorie.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

const REASON_CATEGORIES = {
  'too_expensive':       'Zu teuer',
  'missing_feature':     'Feature fehlt',
  'low_quality':         'Qualitaet',
  'switched_service':    'Wechsel zu Konkurrenz',
  'unused':              'Nicht genutzt',
  'too_complex':         'Zu komplex',
  'customer_service':    'Kundenservice',
  'other':               'Sonstiges',
  'unknown':             'Unbekannt'
};

function categorizeReason(text) {
  if (!text) return 'unknown';
  const s = String(text).toLowerCase();
  if (s.match(/teuer|preis|kosten|expensive|cost/)) return 'too_expensive';
  if (s.match(/feature|funktion|missing|fehlt/)) return 'missing_feature';
  if (s.match(/qualit(ä|ae)t|fehler|bug/)) return 'low_quality';
  if (s.match(/konkurrenz|switch|wechsel|alternative/)) return 'switched_service';
  if (s.match(/ungenutzt|unused|nicht genutzt|not using/)) return 'unused';
  if (s.match(/komplex|complex|kompliziert|zu schwer/)) return 'too_complex';
  if (s.match(/support|service|kontakt|hilfe/)) return 'customer_service';
  return 'other';
}

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const since = new Date(Date.now() - 90 * 86400000).toISOString();

  const { data: cancelEvents } = await sb.from('audit_trail')
    .select('sv_email, workspace_id, details, created_at')
    .eq('typ', 'stripe.subscription.cancelled')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  // Categorize
  const buckets = {};
  Object.keys(REASON_CATEGORIES).forEach(k => { buckets[k] = { count: 0, examples: [] }; });

  for (const e of (cancelEvents || [])) {
    let det;
    try { det = typeof e.details === 'string' ? JSON.parse(e.details) : e.details; }
    catch { det = {}; }
    const reasonText = (det && (det.cancellation_reason || det.reason || det.feedback)) || null;
    const cat = categorizeReason(reasonText);
    buckets[cat].count++;
    if (reasonText && buckets[cat].examples.length < 3) {
      buckets[cat].examples.push({ text: String(reasonText).slice(0, 200), email: e.sv_email });
    }
  }

  const total = (cancelEvents || []).length;
  const summary = Object.entries(buckets)
    .map(([key, b]) => ({
      category: key,
      label: REASON_CATEGORIES[key],
      count: b.count,
      pct: total > 0 ? Math.round((b.count / total) * 100) : 0,
      examples: b.examples
    }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.count - a.count);

  return jsonResponse(event, 200, {
    ok: true, configured: true,
    fetched_at: new Date().toISOString(),
    since: since,
    total_cancellations: total,
    by_category: summary,
    hint: total === 0 ? 'Keine Cancellations in letzten 90 Tagen — gute Retention oder zu fruehe Cohort.' : null
  });
}, { functionName: 'admin-churn', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-churn' });
