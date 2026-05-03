/**
 * PROVA — admin-push-alerts.js
 * MEGA⁶ S1 — Cockpit-Sektion 6/6 (Push-Alerts Live-Stream)
 *
 * Live-Feed kritischer Events aus letzten N Stunden.
 * Quelle: audit_trail mit typ-Whitelist + Severity-Tagging.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

const ALERT_PATTERNS = [
  { typ: 'admin.%.forbidden',         severity: 'high',   label: 'Unauthorized Admin-Access' },
  { typ: 'admin.%.no_2fa',            severity: 'medium', label: 'Admin ohne 2FA' },
  { typ: 'admin.%.rate_limit',        severity: 'medium', label: 'Admin Rate-Limit' },
  { typ: 'auth.token.brute_force',    severity: 'high',   label: 'Auth Brute-Force' },
  { typ: 'stripe.payment_failed',     severity: 'high',   label: 'Stripe Payment Failed' },
  { typ: 'stripe.subscription.cancelled', severity: 'medium', label: 'Subscription Cancelled' },
  { typ: 'stripe.refund.created',     severity: 'medium', label: 'Stripe Refund' },
  { typ: 'frontend.error',            severity: 'low',    label: 'Frontend-Fehler' },
  { typ: 'pdf.failed',                severity: 'medium', label: 'PDF-Generation Failed' },
  { typ: 'ki.proxy.error',            severity: 'medium', label: 'KI-Proxy Fehler' },
  { typ: 'dsgvo.deletion_requested',  severity: 'high',   label: 'DSGVO Loeschung angefragt' }
];

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Query nach allen Alert-typ-Patterns
  // Nutze .or() mit like-Statements (Supabase-API-pattern)
  const orFilter = ALERT_PATTERNS.map(p => 'typ.like.' + p.typ).join(',');

  const { data, error } = await sb.from('audit_trail')
    .select('id, typ, sv_email, workspace_id, details, created_at')
    .or(orFilter)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return jsonResponse(event, 200, {
      ok: true, configured: false,
      hint: 'audit_trail-Query fehlgeschlagen', error: error.message
    });
  }

  // Tag Severity
  function severityFor(typ) {
    for (const p of ALERT_PATTERNS) {
      // Like-Pattern mit % als wildcard
      const pattern = '^' + p.typ.replace(/[.+*?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$';
      if (new RegExp(pattern).test(typ)) return { severity: p.severity, label: p.label };
    }
    return { severity: 'low', label: typ };
  }

  const alerts = (data || []).map(e => {
    const sev = severityFor(e.typ);
    let det;
    try { det = typeof e.details === 'string' ? JSON.parse(e.details) : e.details; }
    catch { det = {}; }
    return {
      id: e.id,
      typ: e.typ,
      severity: sev.severity,
      label: sev.label,
      sv_email: e.sv_email,
      workspace_id: e.workspace_id,
      created_at: e.created_at,
      details_short: typeof e.details === 'string' ? e.details.slice(0, 200) : JSON.stringify(det).slice(0, 200)
    };
  });

  // Severity-Counts
  const counts = { high: 0, medium: 0, low: 0 };
  for (const a of alerts) counts[a.severity]++;

  return jsonResponse(event, 200, {
    ok: true, configured: true,
    fetched_at: new Date().toISOString(),
    since: since,
    total: alerts.length,
    counts: counts,
    alerts: alerts
  });
}, { functionName: 'admin-push-alerts', rateLimit: { max: 60, windowSec: 60 }, require2FA: true }), { functionName: 'admin-push-alerts' });
