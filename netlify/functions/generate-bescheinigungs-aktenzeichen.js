/**
 * PROVA — generate-bescheinigungs-aktenzeichen.js (MEGA³⁶ W4.6)
 *
 * POST {"jahr"?: number}  →  {"aktenzeichen": "BES-2026-007", "nr": 7, "jahr": 2026}
 *
 * Erzeugt das nächste Brief-Aktenzeichen pro Workspace + Jahr.
 * Nutzt bescheinigungs_sequences-Tabelle (Migration 23, Live in Supabase).
 *
 * Konkurrenz-Sicherheit: optimistic-locking mit Retry (max. 5 Versuche).
 * Für eine Solo-SV-App mit < 100 Briefen/Monat reicht das vollkommen
 * (echte Race-Condition unwahrscheinlich, Worst-Case = ein Retry).
 *
 * Auth: requireAuth + Rate-Limit (10 Calls/min/User).
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');

const MAX_RETRIES = 5;

function pad3(n) { return String(n).padStart(3, '0'); }

async function resolveWorkspaceId(sb, userEmail) {
  // Hole user_id über profiles oder auth.users (Email → ID)
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id')
    .eq('email', userEmail)
    .maybeSingle();
  if (pErr || !profile) return null;
  const { data: ms, error: mErr } = await sb
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('user_id', profile.id)
    .limit(1)
    .maybeSingle();
  if (mErr || !ms) return null;
  return ms.workspace_id;
}

async function nextNr(sb, workspace_id, jahr) {
  // 1) Sicherstellen, dass eine Zeile existiert (idempotent)
  await sb.from('bescheinigungs_sequences')
    .upsert(
      { workspace_id: workspace_id, jahr: jahr, letzte_nr: 0 },
      { onConflict: 'workspace_id,jahr', ignoreDuplicates: true }
    );

  // 2) Optimistic-Locking-Schleife: SELECT → UPDATE WHERE letzte_nr = old
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: cur, error: sErr } = await sb
      .from('bescheinigungs_sequences')
      .select('letzte_nr')
      .eq('workspace_id', workspace_id).eq('jahr', jahr)
      .maybeSingle();
    if (sErr) throw new Error('SELECT-Fehler: ' + sErr.message);
    const oldNr = (cur && cur.letzte_nr) || 0;
    const newNr = oldNr + 1;

    const { data: upd, error: uErr } = await sb
      .from('bescheinigungs_sequences')
      .update({ letzte_nr: newNr, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id).eq('jahr', jahr).eq('letzte_nr', oldNr)
      .select('letzte_nr')
      .maybeSingle();

    if (uErr) throw new Error('UPDATE-Fehler: ' + uErr.message);
    if (upd && upd.letzte_nr === newNr) return newNr;
    // Konflikt: parallel Update — kurz warten und neu versuchen
    await new Promise(r => setTimeout(r, 30 + attempt * 20));
  }
  throw new Error('Sequenz-Konflikt nach ' + MAX_RETRIES + ' Versuchen');
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  const rl = RateLimit.check(context.userEmail, 10, 60, {
    event: event, functionName: 'generate-bescheinigungs-aktenzeichen'
  });
  if (!rl.allowed) return jsonResponse(event, 429, { error: 'Rate-Limit erreicht' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const jahr = (typeof body.jahr === 'number' && body.jahr >= 2020 && body.jahr <= 2099)
    ? body.jahr : new Date().getFullYear();

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const workspace_id = await resolveWorkspaceId(sb, context.userEmail);
  if (!workspace_id) {
    return jsonResponse(event, 404, { error: 'Kein Workspace für User gefunden' });
  }

  try {
    const nr = await nextNr(sb, workspace_id, jahr);
    const aktenzeichen = 'BES-' + jahr + '-' + pad3(nr);
    return jsonResponse(event, 200, {
      aktenzeichen: aktenzeichen,
      nr: nr,
      jahr: jahr,
      workspace_id: workspace_id
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'generate-bescheinigungs-aktenzeichen' });

module.exports.__pad3 = pad3;
module.exports.__nextNr = nextNr;
module.exports.__resolveWorkspaceId = resolveWorkspaceId;
module.exports.__MAX_RETRIES = MAX_RETRIES;
