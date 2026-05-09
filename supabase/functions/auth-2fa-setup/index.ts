/* PROVA Edge — auth-2fa-setup (Welle 6)
   Initiiert TOTP-Setup: generiert Secret + Recovery-Codes, encrypted in DB.
   totp_enabled bleibt FALSE bis verify-Endpoint einen gültigen Code prüft.
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
function bytesToB64(bytes: Uint8Array): string {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function getEncKey(): Promise<CryptoKey> {
  if (!/^[0-9a-fA-F]{64}$/.test(ENC_KEY_HEX)) {
    throw new Error('PROVA_TOTP_ENCRYPTION_KEY missing or not 64 hex chars (32 bytes)');
  }
  const raw = hexToBytes(ENC_KEY_HEX);
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encrypt(plain: string): Promise<string> {
  const key = await getEncKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plain);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc));
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0); combined.set(ct, iv.length);
  return 'v1:' + bytesToB64(combined);
}

function generateRecoveryCodes(n = 10): string[] {
  const out: string[] = [];
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < n; i++) {
    let s = '';
    const buf = crypto.getRandomValues(new Uint8Array(8));
    for (const b of buf) s += chars[b % chars.length];
    out.push(s.slice(0, 4) + '-' + s.slice(4, 8));
  }
  return out;
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
  const userEmail = userData.user.email ?? 'unknown';

  try {
    const secretObj = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: 'PROVA Systems',
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secretObj
    });
    const secret = secretObj.base32;
    const otpauthUrl = totp.toString();

    const recoveryCodes = generateRecoveryCodes(10);
    const encryptedSecret = await encrypt(secret);
    const encryptedRecoveryCodes = await Promise.all(recoveryCodes.map((c) => encrypt(c)));

    const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: updErr } = await sb.from('users').update({
      totp_secret: encryptedSecret,
      totp_recovery_codes: encryptedRecoveryCodes,
      totp_enabled: false,
      totp_setup_started_at: new Date().toISOString()
    }).eq('id', userId);
    if (updErr) return J({ error: 'Storage-Fehler', detail: updErr.message }, 500);

    return J({
      qr_url: otpauthUrl,
      secret_base32: secret,
      recovery_codes: recoveryCodes,
      hint: 'Recovery-Codes JETZT speichern! Werden nicht erneut angezeigt. Verifiziere mit auth-2fa-verify um 2FA zu aktivieren.'
    });
  } catch (e) {
    return J({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});
