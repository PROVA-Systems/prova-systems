/**
 * PROVA — admin-pilot-list.js
 * MEGA-MEGA N3 (03.05.2026) — Admin-Cockpit Bereich 1
 *
 * Liefert Pilot-Liste fuer Marcel-Cockpit.
 * Nur Marcel-Whitelist + Audit-Trail + Rate-Limit (10/min).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });
  }

  const filter = (event.queryStringParameters && event.queryStringParameters.status) || 'all';

  // Workspaces mit Stripe-Status + Activity-Counts
  let query = sb
    .from('workspaces')
    .select('id, name, billing_email, abo_tier, abo_status, abo_aktiv_seit, abo_trial_endet_am, stripe_customer_id, stripe_subscription_id, gesamtzahlungen_lifetime_eur, letzte_zahlung_am, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filter === 'trial')      query = query.eq('abo_status', 'trial');
  if (filter === 'active')     query = query.eq('abo_status', 'aktiv');
  if (filter === 'cancelled')  query = query.eq('abo_status', 'gekuendigt');
  if (filter === 'overdue')    query = query.eq('abo_status', 'ueberfaellig');

  const { data: workspaces, error } = await query;
  if (error) {
    return jsonResponse(event, 500, { error: 'DB-Query fehlgeschlagen: ' + error.message });
  }

  // Pro Workspace: Akten-Count + letzter Login
  const enriched = [];
  for (const ws of (workspaces || [])) {
    const [aktenRes, mshipRes] = await Promise.all([
      sb.from('auftraege').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id),
      sb.from('workspace_memberships')
        .select('user_id, users(email, last_login_at, last_active_at)')
        .eq('workspace_id', ws.id)
        .eq('is_active', true)
        .limit(5)
    ]);

    const members = (mshipRes.data || []).map(m => ({
      email: (m.users && m.users.email) || null,
      last_login_at: (m.users && m.users.last_login_at) || null,
      last_active_at: (m.users && m.users.last_active_at) || null
    }));

    const trialDay = ws.abo_aktiv_seit
      ? Math.floor((Date.now() - new Date(ws.abo_aktiv_seit).getTime()) / 86400000)
      : null;

    enriched.push({
      id: ws.id,
      name: ws.name,
      email: ws.billing_email,
      abo_tier: ws.abo_tier,
      abo_status: ws.abo_status,
      abo_aktiv_seit: ws.abo_aktiv_seit,
      abo_trial_endet_am: ws.abo_trial_endet_am,
      trial_day: trialDay,
      stripe_customer_id: ws.stripe_customer_id,
      stripe_subscription_id: ws.stripe_subscription_id,
      gesamtzahlungen_lifetime_eur: Number(ws.gesamtzahlungen_lifetime_eur || 0),
      letzte_zahlung_am: ws.letzte_zahlung_am,
      created_at: ws.created_at,
      anzahl_akten: aktenRes.count || 0,
      members: members
    });
  }

  return jsonResponse(event, 200, {
    ok: true,
    filter: filter,
    total: enriched.length,
    pilots: enriched,
    fetched_at: new Date().toISOString()
  });
}, { functionName: 'admin-pilot-list', rateLimit: { max: 30, windowSec: 60 } }), { functionName: 'admin-pilot-list' });
