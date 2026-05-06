/**
 * PROVA — admin-conversion-funnel.js (MEGA³² W11-I6)
 *
 * 4-Stage-Funnel:
 * 1. Signup (workspaces created)
 * 2. Demo-Fall erstellt (auftraege.is_demo=true)
 * 3. Erster echter Auftrag (auftraege.is_demo=false)
 * 4. Trial → Paid (workspaces.abo_status='aktiv')
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

exports.handler = withSentry(requireAdmin(async function (event) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const sb = getSupabaseAdmin();
  if (!sb) return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });

  try {
    // Stage 1: alle workspaces (Signups)
    const { count: signups } = await sb.from('workspaces').select('id', { count: 'exact', head: true });

    // Stage 2: Workspaces mit demo-auftrag
    const { data: demoWs } = await sb.from('auftraege').select('workspace_id').eq('is_demo', true);
    const demoSet = new Set((demoWs || []).map(d => d.workspace_id));

    // Stage 3: Workspaces mit echtem auftrag
    const { data: realWs } = await sb.from('auftraege').select('workspace_id').eq('is_demo', false);
    const realSet = new Set((realWs || []).map(d => d.workspace_id));

    // Stage 4: Active subscription (Stripe-Status)
    const { count: paidCount } = await sb.from('workspaces').select('id', { count: 'exact', head: true })
      .eq('abo_status', 'aktiv');

    const stages = [
      { name: 'Signup', count: signups || 0 },
      { name: 'Demo-Fall erstellt', count: demoSet.size },
      { name: 'Echter Auftrag', count: realSet.size },
      { name: 'Trial → Paid', count: paidCount || 0 }
    ];

    // Drop-off-Rate pro Stage (relativ zur vorigen)
    for (let i = 1; i < stages.length; i++) {
      const prev = stages[i - 1].count;
      stages[i].dropoff_rate = prev > 0 ? Math.round((1 - stages[i].count / prev) * 100) : 0;
    }

    return jsonResponse(event, 200, { stages, generated_at: new Date().toISOString() });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}, { functionName: 'admin-conversion-funnel', rateLimit: { max: 30, windowSec: 60 } }), { functionName: 'admin-conversion-funnel' });
