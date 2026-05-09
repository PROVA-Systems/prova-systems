/* PROVA Edge — auth-2fa-disable (Welle 6)
   POST { code } — Deaktiviert 2FA mit TOTP-Bestätigung. Löscht Secret + Recovery-Codes.
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
  const len = hex.length / 2; const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64); const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function decrypt(combined: string): Promise<string> {
  if (!/^[0-9a-fA-F]{64}$/.test(ENC_KEY_HEX)) throw new Error('PROVA_TOTP_ENCRYPTION_KEY invalid');
  const key = await crypto.subtle.importKey('raw', hexToBytes(ENC_KEY_HEX), { name: 'AES-GCM' }, false, ['decrypt']);
  const buf = b64ToBytes(combined.slice(3));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
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
  const code = body?.code;
  if (!code) return J({ error: 'code erforderlich' }, 400);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: user, error } = await sb.from('users')
    .select('totp_secret, totp_enabled')
    .eq('id', userId).maybeSingle();
  if (error || !user) return J({ error: 'User nicht gefunden' }, 404);
  if (!user.totp_enabled) return J({ error: '2FA ist nicht aktiv' }, 400);

  try {
    const decryptedSecret = await decrypt(user.totp_secret);
    const totp = new TOTP({ issuer: 'PROVA Systems', algorithm: 'SHA1', digits: 6, period: 30, secret: Secret.fromBase32(decryptedSecret) });
    const delta = totp.validate({ token: String(code), window: 1 });
    if (delta === null) return J({ error: 'TOTP-Code ungültig' }, 401);

    const { error: updErr } = await sb.from('users').update({
      totp_enabled: false,
      totp_secret: null,
      totp_recovery_codes: null,
      totp_last_used_at: null,
      totp_setup_started_at: null
    }).eq('id', userId);
    if (updErr) return J({ error: 'Storage-Fehler', detail: updErr.message }, 500);

    return J({ disabled: true, hint: '2FA deaktiviert. Bei erneuter Aktivierung neue Recovery-Codes.' });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
