/* ============================================================
   PROVA Edge — verify-recovery-code (MEGA⁸⁷ Block D)
   ============================================================
   Verifiziert einen 2FA Recovery-Code gegen public.users.totp_recovery_codes.
   Bei Match: Code aus Array entfernen + used_count erhoehen + Audit + temp JWT.

   Body { email, password, recovery_code }

   Flow:
     1. Standard supabase-Login (Email+Password) zur Pre-Auth
     2. Recovery-Code (Format XXXX-XXXX) gegen sha256-Hash im Array vergleichen
        (constant-time via crypto.timingSafeEqual-Aequivalent)
     3. Bei Match: Code aus Array entfernen, used_count++, last_used_at=NOW
     4. Audit-Trail-Eintrag via audit-log-v1 task=login action=login mit
        payload.recovery_code_used=true
     5. Return Supabase-Session (umgeht MFA-Step)
============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { withErrorHandling, HttpError } from '../_shared/auth.ts';

interface ReqBody {
  email?: string;
  password?: string;
  recovery_code?: string;
}

// Constant-time string compare
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeCode(raw: string): string {
  return String(raw || '').replace(/\s|-/g, '').toUpperCase();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { throw new HttpError('Invalid JSON', 400); }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const codeRaw = String(body.recovery_code ?? '').trim();
  if (!email || !password || codeRaw.length < 8) {
    throw new HttpError('email + password + recovery_code (min 8 chars) required', 400);
  }
  const codeNorm = normalizeCode(codeRaw);
  const codeHash = await sha256Hex(codeNorm);

  // Service-Client für users-Tabelle (RLS-bypass)
  const svc = createServiceClient();

  // 1. Pre-Auth via Email+Password (signInWithPassword als Anon-Client)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
    body: JSON.stringify({ email, password })
  });
  if (!loginRes.ok) {
    const errTxt = await loginRes.text().catch(() => '');
    if (loginRes.status === 400 || loginRes.status === 401) {
      throw new HttpError('Email oder Passwort falsch.', 401);
    }
    throw new HttpError(`Pre-Auth failed: ${loginRes.status} ${errTxt.slice(0,120)}`, 401);
  }
  const session = await loginRes.json();
  const userId = session?.user?.id;
  if (!userId) throw new HttpError('Pre-Auth lieferte keinen User-ID', 401);

  // 2. Recovery-Codes laden
  const { data: userRow, error: uErr } = await svc
    .from('users')
    .select('totp_enabled, totp_recovery_codes, totp_recovery_codes_used_count')
    .eq('id', userId)
    .single();
  if (uErr || !userRow) throw new HttpError('User-Profil nicht gefunden', 404);
  if (!userRow.totp_enabled) throw new HttpError('2FA für diesen Account nicht aktiv', 400);

  const storedCodes: string[] = Array.isArray(userRow.totp_recovery_codes) ? userRow.totp_recovery_codes : [];
  if (storedCodes.length === 0) {
    throw new HttpError('Keine Recovery-Codes verfügbar. Bitte 2FA neu einrichten.', 410);
  }

  // 3. Constant-time match gegen Hashes
  let matchIdx = -1;
  for (let i = 0; i < storedCodes.length; i++) {
    if (timingSafeEqual(storedCodes[i], codeHash)) { matchIdx = i; break; }
  }
  if (matchIdx === -1) throw new HttpError('Recovery-Code ungültig oder bereits verwendet.', 401);

  // 4. Code aus Array entfernen + used_count++ + last_used_at
  const newCodes = storedCodes.filter((_, i) => i !== matchIdx);
  await svc.from('users').update({
    totp_recovery_codes: newCodes,
    totp_recovery_codes_used_count: (userRow.totp_recovery_codes_used_count ?? 0) + 1,
    totp_last_used_at: new Date().toISOString()
  }).eq('id', userId);

  // 5. Audit-Log via audit-log-v1 (best-effort)
  try {
    await fetch(`${supabaseUrl}/functions/v1/audit-log-v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        task: 'login',
        action: 'login',
        entity_typ: 'user',
        entity_id: userId,
        payload: {
          recovery_code_used: true,
          remaining_codes: newCodes.length,
          source: 'verify-recovery-code'
        },
        source: 'verify-recovery-code',
        kategorie: 'AUTH'
      })
    });
  } catch(_) { /* best-effort */ }

  const warning = newCodes.length <= 3
    ? `⚠ Nur noch ${newCodes.length} von 10 Recovery-Codes übrig. Bitte unter Account → 2FA neue Codes generieren.`
    : null;

  return jsonResponse({
    ok: true,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type
    },
    user: session.user,
    remaining_codes: newCodes.length,
    warning
  });
};

Deno.serve(withErrorHandling(handler));
