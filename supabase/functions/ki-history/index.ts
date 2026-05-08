/* ki-history — MEGA⁴³ Welle 2 — KI-Pipeline */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

function parseSince(s: string): string {
    const m = String(s || '7d').match(/^(\d+)([hd])$/);
    if (!m) return new Date(Date.now() - 7 * 86400000).toISOString();
    const n = parseInt(m[1]);
    return new Date(Date.now() - n * (m[2] === 'h' ? 3600000 : 86400000)).toISOString();
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(auth.slice(7));
    if (userError || !userData?.user?.email) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    const userEmail = userData.user.email;

    const url = new URL(req.url);
    const auftragId = url.searchParams.get('auftrag_id');
    const since = parseSince(url.searchParams.get('since') ?? '7d');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    let query = sb.from('ki_protokoll')
        .select('id, funktion, modell, tokens_in, tokens_out, kosten_eur, auftrag_id, created_at, metadata')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (auftragId && /^[0-9a-f-]{36}$/i.test(auftragId)) {
        query = query.eq('auftrag_id', auftragId);
    }

    const { data, error } = await query;
    if (error) {
        return jsonResponse({ ok: true, configured: false, hint: 'Query failed', error: error.message, records: [] });
    }

    const total = (data ?? []).length;
    const totalCostEur = (data ?? []).reduce((a, r) => a + Number(r.kosten_eur ?? 0), 0);
    const totalTokensIn = (data ?? []).reduce((a, r) => a + Number(r.tokens_in ?? 0), 0);
    const totalTokensOut = (data ?? []).reduce((a, r) => a + Number(r.tokens_out ?? 0), 0);

    const perFunktion: Record<string, { funktion: string; calls: number; cost_eur: number }> = {};
    for (const r of (data ?? [])) {
        const fn = r.funktion ?? 'unknown';
        perFunktion[fn] = perFunktion[fn] ?? { funktion: fn, calls: 0, cost_eur: 0 };
        perFunktion[fn].calls++;
        perFunktion[fn].cost_eur += Number(r.kosten_eur ?? 0);
    }

    return jsonResponse({
        ok: true,
        configured: true,
        fetched_at: new Date().toISOString(),
        filter: { auftrag_id: auftragId, since, limit, user: userEmail.replace(/@.*/, '@***') },
        summary: {
            calls_total: total,
            cost_total_eur: Math.round(totalCostEur * 100) / 100,
            tokens_in_total: totalTokensIn,
            tokens_out_total: totalTokensOut
        },
        per_funktion: Object.values(perFunktion)
            .map((f) => ({ ...f, cost_eur: Math.round(f.cost_eur * 100) / 100 }))
            .sort((a, b) => b.calls - a.calls),
        records: data ?? []
    });
});
