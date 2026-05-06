/**
 * PROVA — auth-2fa-verify.js (MEGA²⁹ W9-I1)
 *
 * 2FA-Verify-Endpoint: prüft TOTP-Code und aktiviert 2FA.
 * - POST { code: "123456" } oder POST { recovery_code: "ABCD-EFGH" }
 * - Bei Setup-Phase (totp_enabled=false): aktiviert 2FA bei korrektem Code
 * - Bei aktivem 2FA: validiert Login-Code
 * - Recovery-Code wird nach Verwendung aus Array entfernt
 *
 * Auth: requireAuth (workspace_member)
 * Rate-Limit: 10/60s pro User (Brute-Force-Schutz)
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

  const rl = RateLimit.check(context.userEmail, 10, 60, { event: event, functionName: 'auth-2fa-verify' });
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
  const recoveryCode = body.recovery_code;
  if (!totpCode && !recoveryCode) {
    return jsonResponse(event, 400, { error: 'code oder recovery_code erforderlich' });
  }

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  try {
    // 1. User-Daten holen
    const { data: user, error } = await sb.from('users')
      .select('totp_secret, totp_enabled, totp_recovery_codes, totp_last_used_at')
      .eq('id', userId).maybeSingle();
    if (error || !user) return jsonResponse(event, 404, { error: 'User nicht gefunden' });
    if (!user.totp_secret) return jsonResponse(event, 400, { error: 'TOTP nicht konfiguriert. auth-2fa-setup zuerst.' });

    // 2a. Recovery-Code-Pfad
    if (recoveryCode && user.totp_recovery_codes && user.totp_recovery_codes.length > 0) {
      const cleanCode = String(recoveryCode || '').trim().toUpperCase();
      let matchedIndex = -1;
      for (let i = 0; i < user.totp_recovery_codes.length; i++) {
        try {
          const decrypted = TotpHelper.decryptSecret(user.totp_recovery_codes[i]);
          if (decrypted === cleanCode) { matchedIndex = i; break; }
        } catch (_) { /* skip corrupted */ }
      }
      if (matchedIndex === -1) {
        return jsonResponse(event, 401, { error: 'Recovery-Code ungültig' });
      }
      // Code aus Array entfernen
      const newCodes = [...user.totp_recovery_codes];
      newCodes.splice(matchedIndex, 1);
      await sb.from('users').update({
        totp_recovery_codes: newCodes,
        totp_enabled: true, // bei Recovery-Verify aktivieren falls noch nicht
        totp_last_used_at: new Date().toISOString()
      }).eq('id', userId);
      return jsonResponse(event, 200, {
        verified: true,
        method: 'recovery_code',
        remaining_codes: newCodes.length,
        warning: newCodes.length < 3 ? 'Nur ' + newCodes.length + ' Recovery-Codes übrig — neue generieren!' : null
      });
    }

    // 2b. TOTP-Code-Pfad
    const decryptedSecret = TotpHelper.decryptSecret(user.totp_secret);
    const isValid = TotpHelper.verifyTotpCode(decryptedSecret, totpCode);
    if (!isValid) return jsonResponse(event, 401, { error: 'TOTP-Code ungültig' });

    // 3. Anti-Replay: Code darf nicht 2× im selben 30s-Slot genutzt werden
    if (user.totp_last_used_at) {
      const lastUsed = new Date(user.totp_last_used_at).getTime();
      if (Date.now() - lastUsed < 30000) {
        return jsonResponse(event, 401, { error: 'Code bereits verwendet. Warte auf nächsten 30s-Slot.' });
      }
    }

    // 4. Aktivieren / Last-Used updaten
    await sb.from('users').update({
      totp_enabled: true,
      totp_last_used_at: new Date().toISOString()
    }).eq('id', userId);

    return jsonResponse(event, 200, {
      verified: true,
      method: 'totp',
      totp_enabled: true
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'auth-2fa-verify' });
