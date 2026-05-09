/* PROVA Edge — auth-2fa-verify (Welle 6)
   POST { code } oder { recovery_code } — verifiziert TOTP und aktiviert 2FA.
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import { TOTP, Secret } from 'https://esm.sh/otpauth@9';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ENC_KEY_HEX = Deno.env.get('PROVA_TOTP_ENCRYPTION_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64); const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function getEncKey(): Promise<CryptoKey> {
  if (!/^[0-9a-fA-F]{64}$/.test(ENC_KEY_HEX)) throw new Error('PROVA_TOTP_ENCRYPTION_KEY missing/invalid');
  return await crypto.subtle.importKey('raw', hexToBytes(ENC_KEY_HEX), { name: 'AES-GCM' }, false, ['decrypt']);
}

async function decrypt(combined: string): Promise<string> {
  if (!combined.startsWith('v1:')) throw new Error('unknown ciphertext version');
  const buf = b64ToBytes(combined.slice(3));
  const iv = buf.slice(0, 12);
  const ct = buf.slice(12);
  const key = await getEncKey();
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(auth.slice(7));
  if (userErr || !userData?.user) return J({ error: 'UNAUTHORIZED' }, 401);
  const userId = userData.user.id;

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const totpCode = body?.code;
  const recoveryCode = body?.recovery_code;
  if (!totpCode && !recoveryCode) return J({ error: 'code oder recovery_code erforderlich' }, 400);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: user, error } = await sb.from('users')
    .select('totp_secret, totp_enabled, totp_recovery_codes, totp_last_used_at')
    .eq('id', userId).maybeSingle();
  if (error || !user) return J({ error: 'User nicht gefunden' }, 404);
  if (!user.totp_secret) return J({ error: 'TOTP nicht konfiguriert. Erst auth-2fa-setup.' }, 400);

  try {
    if (recoveryCode && Array.isArray(user.totp_recovery_codes) && user.totp_recovery_codes.length > 0) {
      const clean = String(recoveryCode).trim().toUpperCase();
      let matchedIdx = -1;
      for (let i = 0; i < user.totp_recovery_codes.length; i++) {
        try {
          if ((await decrypt(user.totp_recovery_codes[i])) === clean) { matchedIdx = i; break; }
        } catch (_) { /* skip */ }
      }
      if (matchedIdx === -1) return J({ error: 'Recovery-Code ungültig' }, 401);
      const newCodes = [...user.totp_recovery_codes];
      newCodes.splice(matchedIdx, 1);
      await sb.from('users').update({
        totp_recovery_codes: newCodes,
        totp_enabled: true,
        totp_last_used_at: new Date().toISOString()
      }).eq('id', userId);
      return J({
        verified: true, method: 'recovery_code',
        remaining_codes: newCodes.length,
        warning: newCodes.length < 3 ? 'Nur ' + newCodes.length + ' Recovery-Codes übrig' : null
      });
    }

    // TOTP-Code-Pfad
    const decryptedSecret = await decrypt(user.totp_secret);
    const totp = new TOTP({ issuer: 'PROVA Systems', algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(decryptedSecret) });
    const delta = totp.validate({ token: String(totpCode), window: 1 });
    if (delta === null) return J({ error: 'TOTP-Code ungültig' }, 401);

    if (user.totp_last_used_at) {
      const last = new Date(user.totp_last_used_at).getTime();
      if (Date.now() - last < 30000) return J({ error: 'Code bereits verwendet. Nächster Slot abwarten.' }, 401);
    }

    await sb.from('users').update({
      totp_enabled: true,
      totp_last_used_at: new Date().toISOString()
    }).eq('id', userId);

    return J({ verified: true, method: 'totp', totp_enabled: true });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
