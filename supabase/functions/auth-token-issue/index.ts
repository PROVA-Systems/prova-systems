/* PROVA Edge — auth-token-issue (Welle 6)
   Service-Role: Mintet Custom HMAC-JWT für admin-impersonate.
   Aufruf nur von admin-impersonate (intern) oder mit ADMIN_TOKEN_ISSUE_SECRET.
   Body: { target_email, ttl_seconds?, impersonator_email, reason }
*/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const HMAC_SECRET = Deno.env.get('AUTH_HMAC_SECRET') ?? '';
const ISSUE_SECRET = Deno.env.get('ADMIN_TOKEN_ISSUE_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function b64urlEncode(bytes: Uint8Array | string): string {
  let s = typeof bytes === 'string' ? bytes : '';
  if (typeof bytes !== 'string') for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signHmac(payload: Record<string, unknown>, ttl: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + ttl };
  const headerB64 = b64urlEncode(JSON.stringify(header));
  const claimsB64 = b64urlEncode(JSON.stringify(claims));
  const data = headerB64 + '.' + claimsB64;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return data + '.' + b64urlEncode(sigBytes);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const internalSecret = req.headers.get('x-internal-secret');
  if (!ISSUE_SECRET || internalSecret !== ISSUE_SECRET) {
    return J({ error: 'Forbidden — only callable internally with x-internal-secret header' }, 403);
  }
  if (!HMAC_SECRET) return J({ error: 'Server misconfigured: AUTH_HMAC_SECRET fehlt' }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }

  const targetEmail = String(body?.target_email ?? '').toLowerCase().trim();
  const impersonatorEmail = String(body?.impersonator_email ?? '').toLowerCase().trim();
  const reason = String(body?.reason ?? '').slice(0, 500);
  const ttl = Math.min(Math.max(Number(body?.ttl_seconds ?? 1800), 60), 3600);
  if (!targetEmail || !impersonatorEmail || !reason) {
    return J({ error: 'target_email, impersonator_email, reason required' }, 400);
  }

  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: target, error } = await sb.from('users')
    .select('id, email').eq('email', targetEmail).maybeSingle();
  if (error || !target) return J({ error: 'Target user not found' }, 404);

  const token = await signHmac({
    sub: target.email,
    user_id: target.id,
    impersonating: true,
    impersonator: impersonatorEmail,
    reason
  }, ttl);

  await sb.from('audit_trail').insert({
    user_id: target.id, action: 'login', entity_typ: 'admin_impersonation', entity_id: target.id,
    payload: { impersonator: impersonatorEmail, reason, ttl_seconds: ttl }
  });

  return J({ token, expires_in: ttl, target_email: target.email, target_user_id: target.id });
});
