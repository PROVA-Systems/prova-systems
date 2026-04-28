/* ============================================================
   PROVA Edge Functions — Supabase-Client-Helpers
   Sprint K-1.2.B1
   ============================================================ */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL) {
    console.warn('[_shared/supabase] SUPABASE_URL not set');
}

/**
 * User-Client: nutzt JWT aus Authorization-Header. RLS aktiv.
 * Für alle User-Aktionen, die im Workspace-Context laufen.
 */
export function createSupabaseClient(req: Request): SupabaseClient {
    const auth = req.headers.get('Authorization') ?? '';
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

/**
 * Service-Client: bypasst RLS. NUR für System-Operations
 * (audit-Inserts, Webhooks, pg_cron-Jobs).
 *
 * ⚠️ NIEMALS im Frontend-Code. Service-Role-Key gehört nur
 *    in Edge Functions oder Backend-Skripte.
 */
export function createServiceClient(): SupabaseClient {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not set in Edge Function secrets');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}
