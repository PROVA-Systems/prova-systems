/**
 * PROVA — admin-force-logout.js
 * MEGA-MEGA N3-EXT — Admin-Cockpit Quick-Action: Force-Logout
 *
 * Beendet alle Sessions eines Users via Supabase Admin-API.
 * Nutzungsfall: Account-Kompromittierung, Pilot-Cancel, Notfall.
 *
 * Sicherheit:
 *  - Marcel-Whitelist (admin-auth-guard)
 *  - Audit-Trail mit Reason-Pflicht
 *  - Rate-Limit: 5/min (kritische Aktion)
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse, getSupabaseAdmin } = require('./lib/admin-auth-guard');

exports.handler = withSentry(requireAdmin(async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(event, 405, { error: 'Method Not Allowed' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const userId = body.user_id;
  const userEmail = body.user_email;
  const reason = String(body.reason || '').slice(0, 500);

  if (!userId && !userEmail) {
    return jsonResponse(event, 400, { error: 'user_id ODER user_email erforderlich' });
  }
  if (!reason || reason.length < 5) {
    return jsonResponse(event, 400, { error: 'reason (min 5 Zeichen) Pflicht' });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return jsonResponse(event, 500, { error: 'Supabase nicht konfiguriert' });
  }

  // User auflösen
  let resolvedUserId = userId;
  if (!resolvedUserId && userEmail) {
    const { data: user } = await sb.from('users').select('id, email').eq('email', userEmail.toLowerCase()).maybeSingle();
    if (!user) return jsonResponse(event, 404, { error: 'User nicht gefunden (email)' });
    resolvedUserId = user.id;
  }

  // Supabase Admin-API: Sessions invalidieren
  let signOutOk = false;
  let signOutErr = null;
  try {
    const { error } = await sb.auth.admin.signOut(resolvedUserId, 'global');
    if (error) { signOutErr = error.message; }
    else { signOutOk = true; }
  } catch (e) {
    signOutErr = e.message;
  }

  // Audit-Trail
  try {
    await sb.from('audit_trail').insert({
      workspace_id: null,
      user_id: resolvedUserId,
      typ: 'admin.force_logout',
      sv_email: context.adminEmail,
      details: JSON.stringify({
        target_user_id: resolvedUserId,
        target_email: userEmail || null,
        reason: reason,
        success: signOutOk,
        error: signOutErr,
        ts: new Date().toISOString()
      })
    });
  } catch (e) { console.warn('[admin-force-logout] audit insert fail:', e.message); }

  if (!signOutOk) {
    return jsonResponse(event, 502, { error: 'Force-Logout fehlgeschlagen: ' + signOutErr });
  }
  return jsonResponse(event, 200, { ok: true, user_id: resolvedUserId, message: 'Alle Sessions beendet' });
}, { functionName: 'admin-force-logout', rateLimit: { max: 5, windowSec: 60 } }), { functionName: 'admin-force-logout' });
