/**
 * PROVA — admin-funnel.js
 * MEGA⁶ S1 — Cockpit-Sektion 3/6 (Drop-off-Funnel)
 *
 * Funnel: Sign-Up -> Onboarding-Done -> 1.Akte -> 1.PDF -> Stripe-Aktivierung
 * Aus audit_trail (Pilot-Cohort, letzte 60 Tage).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

const FUNNEL_STAGES = [
  { key: 'signup',     label: 'Sign-Up',                typ_match: ['auth.signup', 'user.created'] },
  { key: 'onboarding', label: 'Onboarding abgeschlossen', typ_match: ['onboarding.completed'] },
  { key: 'first_akte', label: 'Erste Akte angelegt',     typ_match: ['auftrag.created'] },
  { key: 'first_pdf',  label: 'Erstes PDF generiert',     typ_match: ['pdf.generated'] },
  { key: 'paid',       label: 'Stripe-Aktivierung',      typ_match: ['stripe.subscription.activated', 'stripe.pilot.founding_paid'] }
];

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  const since = new Date(Date.now() - 60 * 86400000).toISOString();

  // First-Event pro User pro Stage
  const allTypes = FUNNEL_STAGES.flatMap(s => s.typ_match);
  const { data: events } = await sb.from('audit_trail')
    .select('typ, sv_email, created_at')
    .in('typ', allTypes)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(5000);

  // Per-user first-occurrence per stage
  const userStages = {};
  for (const e of (events || [])) {
    if (!e.sv_email) continue;
    userStages[e.sv_email] = userStages[e.sv_email] || {};
    for (const stage of FUNNEL_STAGES) {
      if (stage.typ_match.includes(e.typ) && !userStages[e.sv_email][stage.key]) {
        userStages[e.sv_email][stage.key] = e.created_at;
      }
    }
  }

  // Stage-Counts (kumulativ: User der Stage erreicht hat)
  const stageCounts = {};
  for (const stage of FUNNEL_STAGES) {
    stageCounts[stage.key] = 0;
  }
  for (const u of Object.values(userStages)) {
    for (const stage of FUNNEL_STAGES) {
      if (u[stage.key]) stageCounts[stage.key]++;
    }
  }

  // Funnel-Steps mit Conversion-Raten
  const funnel = [];
  let prevCount = null;
  for (const stage of FUNNEL_STAGES) {
    const count = stageCounts[stage.key];
    const dropoffPct = prevCount ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
    const cumulativePct = funnel.length > 0 && funnel[0].count > 0
      ? Math.round((count / funnel[0].count) * 100) : 100;
    funnel.push({
      stage: stage.key,
      label: stage.label,
      count: count,
      dropoff_pct: dropoffPct,
      cumulative_pct: cumulativePct
    });
    prevCount = count;
  }

  return jsonResponse(event, 200, {
    ok: true, configured: true,
    fetched_at: new Date().toISOString(),
    since: since,
    total_users_in_cohort: Object.keys(userStages).length,
    funnel: funnel
  });
}, { functionName: 'admin-funnel', rateLimit: { max: 30, windowSec: 60 }, require2FA: true }), { functionName: 'admin-funnel' });
