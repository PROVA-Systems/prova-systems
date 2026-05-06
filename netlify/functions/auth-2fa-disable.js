/**
 * PROVA — auth-2fa-disable.js (MEGA²⁹ W9-I1)
 *
 * 2FA-Disable-Endpoint: deaktiviert 2FA mit Verifikation.
 * - Verifiziert aktuellen TOTP-Code (oder Recovery-Code)
 * - Setzt totp_enabled = false + löscht Secret + Recovery-Codes
 *
 * Auth: requireAuth (workspace_member)
 * Rate-Limit: 5/60s pro User
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');
const RateLimit = require('./lib/rate-limit-user');
const TotpHelper = require('./lib/totp-helper');

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const rl = RateLimit.check(context.userEmail, 5, 60, { event: event, functionName: 'auth-2fa-disable' });
  if (!rl.allowed) {
    return jsonResponse(event, 429, { error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' },
      { 'Retry-After': String(rl.retryAfter) });
  }

  const userId = context.userId || context.user_id;
  if (!userId) return jsonResponse(event, 401, { error: 'Authentication required' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(event, 400, { error: 'Invalid JSON' }); }

  const totpCode = body.code;
  if (!totpCode) return jsonResponse(event, 400, { error: 'code erforderlich' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    const { data: user, error } = await sb.from('users')
      .select('totp_secret, totp_enabled')
      .eq('id', userId).maybeSingle();
    if (error || !user) return jsonResponse(event, 404, { error: 'User nicht gefunden' });
    if (!user.totp_enabled) return jsonResponse(event, 400, { error: '2FA ist nicht aktiv' });

    // Code verifizieren
    const decryptedSecret = TotpHelper.decryptSecret(user.totp_secret);
    if (!TotpHelper.verifyTotpCode(decryptedSecret, totpCode)) {
      return jsonResponse(event, 401, { error: 'TOTP-Code ungültig' });
    }

    // Deaktivieren + Daten löschen
    const { error: updateErr } = await sb.from('users')
      .update({
        totp_enabled: false,
        totp_secret: null,
        totp_recovery_codes: null,
        totp_last_used_at: null,
        totp_setup_started_at: null
      })
      .eq('id', userId);
    if (updateErr) return jsonResponse(event, 500, { error: 'Storage-Fehler', detail: updateErr.message });

    return jsonResponse(event, 200, {
      disabled: true,
      hint: '2FA deaktiviert. Bei erneuter Aktivierung neue Recovery-Codes generieren.'
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'auth-2fa-disable' });
