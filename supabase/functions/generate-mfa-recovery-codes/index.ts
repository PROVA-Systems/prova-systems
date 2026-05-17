/* ============================================================
   PROVA Edge — generate-mfa-recovery-codes (MEGA⁸⁷ Block D)
   ============================================================
   Generiert 10 frische Recovery-Codes fuer TOTP-Lockout-Recovery.
   Speichert nur sha256-Hashes in public.users.totp_recovery_codes.
   Zurueckgegeben: Klartext (NUR EINMAL — Frontend zeigt sie an).

   GET / POST (User-JWT)

   Voraussetzung: User muss aal2 erreicht haben (TOTP verifiziert).
============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, withErrorHandling, HttpError } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

// Format: XXXX-XXXX (8 chars total, A-Z2-9 excluding similar chars I/O/0/1)
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHA[bytes[i] % ALPHA.length];
  return out.slice(0, 4) + '-' + out.slice(4, 8);
}

function normalize(s: string): string {
  return String(s).replace(/[\s-]/g, '').toUpperCase();
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST' && req.method !== 'GET') return errorResponse('Method not allowed', 405);

  const ctx = await verifyJwt(req);
  const svc = createServiceClient();

  // MEGA88-C: TOTP-aktiv-Check robust — beide Quellen prüfen:
  //   1. auth.mfa_factors (Supabase MFA-API Source-of-Truth)
  //   2. users.totp_enabled (sekundär — App-Logic-Flag)
  // Wenn EINER true ist → 2FA gilt als aktiv (Trigger aus Migration 62 sollte
  // beide synchron halten, aber Defense-in-Depth).
  const { data: u, error: uErr } = await svc
    .from('users')
    .select('totp_enabled')
    .eq('id', ctx.user.id)
    .single();
  if (uErr || !u) throw new HttpError('User-Profil nicht gefunden', 404);

  let totpActive = !!u.totp_enabled;
  if (!totpActive) {
    // Sekundär-Check auf auth.mfa_factors
    try {
      const { data: factors } = await svc
        .from('mfa_factors').select('id,status').eq('user_id', ctx.user.id).eq('status', 'verified');
      if (Array.isArray(factors) && factors.length > 0) totpActive = true;
    } catch (_) {
      // auth.mfa_factors RLS könnte blocken — service-Client sollte aber bypassen.
    }
  }
  if (!totpActive) throw new HttpError('2FA muss erst aktiviert sein.', 400);

  // 10 frische Codes generieren
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = genCode();
    plainCodes.push(code);
    hashedCodes.push(await sha256Hex(normalize(code)));
  }

  // Speichern (alte werden ueberschrieben — used_count reset)
  const { error: updErr } = await svc.from('users').update({
    totp_recovery_codes: hashedCodes,
    totp_recovery_codes_generated_at: new Date().toISOString(),
    totp_recovery_codes_used_count: 0
  }).eq('id', ctx.user.id);
  if (updErr) throw new HttpError(`update fail: ${updErr.message}`, 500);

  // Audit-Log via audit-log-v1 (best-effort)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const auth = req.headers.get('Authorization') ?? '';
    await fetch(`${supabaseUrl}/functions/v1/audit-log-v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({
        task: 'generic',
        action: 'create',
        entity_typ: 'totp_recovery_codes',
        entity_id: ctx.user.id,
        payload: { count: 10, source: 'generate-mfa-recovery-codes' },
        source: 'generate-mfa-recovery-codes',
        kategorie: 'AUTH'
      })
    });
  } catch(_) {}

  return jsonResponse({
    ok: true,
    codes: plainCodes,
    generated_at: new Date().toISOString(),
    count: plainCodes.length,
    note: 'Diese Codes nur EINMAL anzeigen. Bei Verlust koennen sie NICHT mehr wiederhergestellt werden.'
  });
};

Deno.serve(withErrorHandling(handler));
