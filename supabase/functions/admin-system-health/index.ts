/* ============================================================
   PROVA Edge Function — admin-system-health
   MEGA⁴³ Welle 1 — Cockpit-Migration

   Port von netlify/functions/admin-system-health.js fuer Supabase Edge.
   Liefert ENV-Status + External-Service-Health + DB-Connection-Check.
   ============================================================ */

import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

interface ServiceCheck {
    ok: boolean;
    status?: number;
    ms: number;
    error?: string;
}

async function checkUrl(url: string, timeoutMs = 5000): Promise<ServiceCheck> {
    const start = Date.now();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(t);
        return { ok: r.ok, status: r.status, ms: Date.now() - start };
    } catch (e) {
        clearTimeout(t);
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg.includes('aborted') ? 'timeout' : msg, ms: Date.now() - start };
    }
}

Deno.serve(adminHandler(
    { functionName: 'admin-system-health' },
    async (req, { sb }) => {
        if (req.method !== 'GET') {
            return jsonResponse({ error: 'Method Not Allowed' }, 405);
        }

        const start = Date.now();
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

        // ENV-Status (kritische Variablen)
        const env = {
            SUPABASE_URL: !!supabaseUrl,
            SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
            STRIPE_SECRET_KEY: !!Deno.env.get('STRIPE_SECRET_KEY'),
            STRIPE_WEBHOOK_SECRET: !!Deno.env.get('STRIPE_WEBHOOK_SECRET'),
            OPENAI_API_KEY: !!Deno.env.get('OPENAI_API_KEY'),
            ANTHROPIC_API_KEY: !!Deno.env.get('ANTHROPIC_API_KEY'),
            PDFMONKEY_API_KEY: !!Deno.env.get('PDFMONKEY_API_KEY'),
            SENTRY_DSN_FUNCTIONS: !!Deno.env.get('SENTRY_DSN_FUNCTIONS'),
            RESEND_API_KEY: !!Deno.env.get('RESEND_API_KEY')
        };

        // External-Service-Health (parallel)
        const [stripeChk, supabaseChk, openaiChk, sentryChk] = await Promise.all([
            checkUrl('https://api.stripe.com/healthcheck', 4000),
            checkUrl(supabaseUrl + '/rest/v1/', 4000),
            checkUrl('https://api.openai.com/v1/models', 4000),
            checkUrl('https://de.sentry.io/', 4000)
        ]);

        // DB-Connection-Check (Supabase-Query gegen audit_trail)
        const dbStart = Date.now();
        let dbCheck: { ok: boolean; ms: number; error: string | null };
        try {
            const { error } = await sb
                .from('audit_trail')
                .select('id', { count: 'exact', head: true })
                .limit(1);
            dbCheck = {
                ok: !error,
                ms: Date.now() - dbStart,
                error: error ? error.message : null
            };
        } catch (e) {
            dbCheck = {
                ok: false,
                ms: Date.now() - dbStart,
                error: e instanceof Error ? e.message : String(e)
            };
        }

        return jsonResponse({
            ok: true,
            fetched_at: new Date().toISOString(),
            response_ms: Date.now() - start,
            env,
            env_complete: Object.values(env).every((v) => v),
            services: {
                stripe: stripeChk,
                supabase: supabaseChk,
                openai: openaiChk,
                sentry: sentryChk
            },
            database: dbCheck,
            runtime: {
                platform: 'supabase-edge',
                deno_version: Deno.version.deno,
                region: Deno.env.get('SB_REGION') ?? Deno.env.get('SUPABASE_REGION') ?? 'unknown'
            }
        });
    }
));
