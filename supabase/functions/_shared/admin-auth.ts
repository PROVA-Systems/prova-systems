/* ============================================================
   PROVA Edge Functions — Admin-Auth-Guard
   MEGA⁴³ Welle 1 — Cockpit-Migration

   Port von netlify/functions/lib/admin-auth-guard.js fuer Deno/TS.

   Pattern wie verifyJwt + Email-Whitelist + 2FA + Audit-Trail.
   Rate-Limit aktuell skipped (kommt in Welle 1.5 via Postgres-RPC).

   Usage:
     import { requireAdmin } from '../_shared/admin-auth.ts';
     Deno.serve(async (req) => {
       const guard = await requireAdmin(req, { functionName: 'admin-system-health' });
       if (guard.response) return guard.response;
       const { adminEmail, sb } = guard;
       // ... handler logic
     });
   ============================================================ */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import { handleCors, errorResponse, jsonResponse } from './cors.ts';

// ── Config ─────────────────────────────────────────────────
const HARDCODED_ADMIN_EMAILS = [
    'marcel.schreiber891@gmail.com',
    'marcel@prova-systems.de',
    'kontakt@prova-systems.de',
    'admin@prova-systems.de'
];

const ENV_ADMIN_EMAILS = (Deno.env.get('PROVA_ADMIN_EMAILS') ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const ADMIN_EMAILS = Array.from(new Set([
    ...HARDCODED_ADMIN_EMAILS.map((e) => e.toLowerCase()),
    ...ENV_ADMIN_EMAILS
]));

const REQUIRE_2FA_GLOBAL =
    String(Deno.env.get('PROVA_ADMIN_REQUIRE_2FA') ?? 'true').toLowerCase() !== 'false';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// ── Types ─────────────────────────────────────────────────
export interface AdminGuardOptions {
    functionName: string;
    require2FA?: boolean;
}

export interface AdminGuardResult {
    /** Wenn gesetzt, MUSS der Handler diesen Response zurueckliefern (Reject). */
    response?: Response;
    /** Bei Success gesetzt: Email des authentifizierten Admins. */
    adminEmail?: string;
    /** Bei Success gesetzt: Service-Client fuer DB-Access (RLS bypass). */
    sb?: SupabaseClient;
    /** Bei Success gesetzt: Token-Claims des Users (z.B. aal). */
    claims?: Record<string, unknown>;
}

// ── Helpers ─────────────────────────────────────────────────
function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}

function getServiceClient(): SupabaseClient {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

function decodeJwtClaims(jwt: string): Record<string, unknown> | null {
    try {
        const parts = jwt.split('.');
        if (parts.length !== 3) return null;
        // Base64URL decode (Deno supports atob)
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

async function adminAuditLog(
    sb: SupabaseClient,
    adminEmail: string,
    fnName: string,
    subAction: string,
    details: Record<string, unknown>,
    req: Request
): Promise<void> {
    try {
        const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null;
        const ua = (req.headers.get('user-agent') ?? '').slice(0, 200);
        await sb.from('audit_trail').insert({
            workspace_id: null,
            user_id: null,
            action: 'read',
            entity_typ: 'admin_endpoint',
            entity_id: fnName,
            payload: {
                admin_email: adminEmail,
                admin_action: subAction,
                ...details
            },
            ip_address: ip,
            user_agent: ua,
            request_id: crypto.randomUUID()
        });
    } catch (e) {
        console.warn('[admin-audit] insert failed:', e instanceof Error ? e.message : String(e));
    }
}

// ── Main Guard ─────────────────────────────────────────────────
/**
 * Verifiziert JWT, Email-Whitelist, 2FA, und schreibt Audit-Log.
 *
 * Returnt entweder:
 *   - { response: Response } -> Handler muss DIESEN Response returnen (Auth-Fail)
 *   - { adminEmail, sb, claims } -> Handler kann fortfahren
 *
 * CORS-Preflight wird hier bereits behandelt.
 */
export async function requireAdmin(
    req: Request,
    opts: AdminGuardOptions
): Promise<AdminGuardResult> {
    // CORS-Preflight
    if (req.method === 'OPTIONS') {
        return { response: handleCors() };
    }

    const fnName = opts.functionName;
    const require2FA = opts.require2FA !== false; // default: true

    // Service-Client (fuer Audit-Log + Admin-DB-Reads)
    const sb = getServiceClient();

    // 1. JWT extrahieren
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
        await adminAuditLog(sb, '[unknown]', fnName, 'unauthorized', { reason: 'no-token' }, req);
        return { response: errorResponse('Authentifizierung erforderlich', 401, { code: 'UNAUTHORIZED' }) };
    }
    const accessToken = authHeader.slice('Bearer '.length);

    // 2. JWT validieren via Supabase Auth (User-Lookup)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);

    if (userError || !userData?.user?.email) {
        await adminAuditLog(sb, '[invalid]', fnName, 'unauthorized', {
            reason: 'jwt-invalid',
            error: userError?.message ?? 'no-user'
        }, req);
        return { response: errorResponse('JWT ungueltig', 401, { code: 'UNAUTHORIZED' }) };
    }

    const email = userData.user.email;

    // 3. Email-Whitelist
    if (!isAdmin(email)) {
        await adminAuditLog(sb, email, fnName, 'forbidden', { reason: 'not-in-admin-whitelist' }, req);
        return { response: errorResponse('Admin-Zugriff erforderlich', 403, { code: 'NOT_ADMIN' }) };
    }

    // 4. 2FA-Check via JWT-Claims (Supabase: aal: 'aal2' wenn 2FA-verifiziert)
    const claims = decodeJwtClaims(accessToken) ?? {};

    if (require2FA && REQUIRE_2FA_GLOBAL) {
        const aal = claims.aal as string | undefined;
        if (aal !== 'aal2') {
            await adminAuditLog(sb, email, fnName, 'no_2fa', { aal: aal ?? 'unset' }, req);
            return {
                response: errorResponse(
                    '2FA-Pflicht fuer Admin-Zugriff. Bitte aktiviere 2FA und logge dich neu ein.',
                    403,
                    {
                        code: 'AAL2_REQUIRED',
                        hint: 'Supabase Account-Settings -> Multi-Factor Authentication -> TOTP-App registrieren'
                    }
                )
            };
        }
    }

    // 5. Audit-Trail bei Erfolg
    await adminAuditLog(sb, email, fnName, 'invoked', { method: req.method }, req);

    return {
        adminEmail: email,
        sb,
        claims
    };
}

/**
 * Standard-Handler-Wrapper fuer Admin-Endpoints. Vereinfacht den Boilerplate-Code.
 *
 * Handler bekommt (req, ctx) wo ctx = { adminEmail, sb, claims }.
 * Errors werden zu jsonResponse 500 mit detail.
 */
export function adminHandler(
    opts: AdminGuardOptions,
    handler: (req: Request, ctx: { adminEmail: string; sb: SupabaseClient; claims: Record<string, unknown> }) => Promise<Response>
): (req: Request) => Promise<Response> {
    return async (req: Request): Promise<Response> => {
        const guard = await requireAdmin(req, opts);
        if (guard.response) return guard.response;
        try {
            return await handler(req, {
                adminEmail: guard.adminEmail!,
                sb: guard.sb!,
                claims: guard.claims ?? {}
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[${opts.functionName}] uncaught:`, msg);
            return jsonResponse({ error: 'Internal error', detail: msg }, 500);
        }
    };
}

export { ADMIN_EMAILS, isAdmin };
