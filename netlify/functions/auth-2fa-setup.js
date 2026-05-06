/**
 * PROVA — auth-2fa-setup.js (MEGA²⁹ W9-I1)
 *
 * 2FA-Setup-Endpoint: User initiiert TOTP-Konfiguration.
 * - Generiert neues TOTP-Secret + Recovery-Codes
 * - Speichert verschlüsselt in users-Table (totp_enabled BLEIBT FALSE bis verify)
 * - Returns QR-URL + Recovery-Codes (1× sichtbar!)
 *
 * Auth: requireAuth (workspace_member)
 * Rate-Limit: 5/60s pro User (Setup ist seltene Operation)
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

  // Strict Rate-Limit: 5/60s (Brute-Force-Schutz)
  const rl = RateLimit.check(context.userEmail, 5, 60, { event: event, functionName: 'auth-2fa-setup' });
  if (!rl.allowed) {
    return jsonResponse(event, 429, { error: 'Rate-Limit erreicht. Bitte ' + rl.retryAfter + 's warten.' },
      { 'Retry-After': String(rl.retryAfter) });
  }

  const userId = context.userId || context.user_id;
  const userEmail = context.userEmail;
  if (!userId) return jsonResponse(event, 401, { error: 'Authentication required' });

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // 1. Generiere TOTP-Secret + Recovery-Codes
    const { secret, qr_url } = TotpHelper.generateTotpSecret({ issuer: 'PROVA', account: userEmail });
    const recoveryCodes = TotpHelper.generateRecoveryCodes(10);

    // 2. Verschlüsseln für Storage
    const encryptedSecret = TotpHelper.encryptSecret(secret);
    const encryptedRecoveryCodes = recoveryCodes.map(c => TotpHelper.encryptSecret(c));

    // 3. Speichern (totp_enabled BLEIBT FALSE bis verify-Endpoint)
    const { error } = await sb.from('users')
      .update({
        totp_secret: encryptedSecret,
        totp_recovery_codes: encryptedRecoveryCodes,
        totp_enabled: false, // explizit
        totp_setup_started_at: new Date().toISOString()
      })
      .eq('id', userId);
    if (error) return jsonResponse(event, 500, { error: 'Storage-Fehler', detail: error.message });

    // 4. Response: QR-URL + Recovery-Codes (1× sichtbar!)
    return jsonResponse(event, 200, {
      qr_url: qr_url,
      recovery_codes: recoveryCodes,
      hint: 'Recovery-Codes JETZT sicher speichern! Werden nicht erneut angezeigt. Nach Verifikation via auth-2fa-verify wird 2FA aktiv.'
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'auth-2fa-setup' });
