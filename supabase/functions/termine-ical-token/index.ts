import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TOKEN_VALIDITY_DAYS = 90;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function hmacHex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signToken(userId: string, expiresAt: string): Promise<string> {
  const secret = Deno.env.get('PROVA_ICAL_TOKEN_SECRET') ?? Deno.env.get('ICAL_TOKEN_SECRET') ?? '';
  if (!secret) throw new Error('ICAL_TOKEN_SECRET nicht konfiguriert');
  const payload = JSON.stringify({ uid: userId, exp: expiresAt });
  const payload64 = b64url(payload);
  const sig = await hmacHex(secret, payload64);
  return payload64 + '.' + sig;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await userClient.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const expiresAt = new Date(Date.now() + TOKEN_VALIDITY_DAYS * 86400000).toISOString();

  let token: string;
  try { token = await signToken(user.id, expiresAt); }
  catch (e) { return J({ error: e instanceof Error ? e.message : String(e) }, 503); }

  const tokenHash = await sha256Hex(token);

  try { await sb.from('ical_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', user.id).is('revoked_at', null); }
  catch { /* graceful */ }

  const { error: insErr } = await sb.from('ical_tokens').insert({
    user_id: user.id, token_hash: tokenHash, expires_at: expiresAt
  });
  if (insErr) return J({ error: 'Token-Insert fehlgeschlagen: ' + insErr.message }, 500);

  const host = req.headers.get('host') || 'app.prova-systems.de';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const subscribeUrl = `${proto}://${host}/.netlify/functions/termine-ical-export?token=${encodeURIComponent(token)}`;

  return J({
    subscribe_url: subscribeUrl,
    expires_at: expiresAt,
    valid_days: TOKEN_VALIDITY_DAYS,
    note: 'Vorherige Tokens revoked.'
  }, 201);
});
