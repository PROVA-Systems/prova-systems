/* ki-konsistenz-check — MEGA⁴³ Welle 2 — KI-Pipeline */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const STATIC_PATTERNS = [
    { p4: /\btrocken\w*/i, p6: /\bfeucht\w*/i, label: 'Trockenheit vs Feuchtigkeit', severity: 'high' },
    { p4: /\bunversehrt\w*|\bohne Beschäd/i, p6: /\bbeschädig\w*|\bSchaden\b/i, label: 'Unversehrt vs Beschädigt', severity: 'high' },
    { p4: /\bohne Risse\b|\brissfrei\b/i, p6: /\bRisse?\s+(?:vorhanden|sichtbar|erkennbar)/i, label: 'Ohne Risse vs Risse vorhanden', severity: 'high' },
    { p4: /\bordnungsgemäß\w*|\beinwandfrei\w*/i, p6: /\bmangelhaft\w*|\bMangel\b/i, label: 'Ordnungsgemäß vs Mangelhaft', severity: 'medium' },
    { p4: /\bwarm\w*/i, p6: /\bkalt\w*/i, label: 'Warm vs Kalt', severity: 'low' }
];

function detectStaticConflicts(p4_text: string, p6_text: string) {
    const widersprueche: Array<{ label: string; severity: string; p4_excerpt: string; p6_excerpt: string }> = [];
    if (!p4_text || !p6_text) return widersprueche;
    for (const p of STATIC_PATTERNS) {
        const m4 = p4_text.match(p.p4);
        const m6 = p6_text.match(p.p6);
        if (m4 && m6) widersprueche.push({ label: p.label, severity: p.severity, p4_excerpt: m4[0], p6_excerpt: m6[0] });
    }
    return widersprueche;
}

async function detectAiConflicts(p4_text: string, p6_text: string, apiKey: string) {
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'gpt-5.5',
                max_tokens: 500,
                temperature: 0.2,
                messages: [
                    { role: 'system', content: 'Du bist ein OLG-Sachverständiger. Vergleiche §4 (Sachverhalt) mit §6 (Fachurteil) eines Bau-Gutachtens auf logische Widersprüche. Antwort NUR JSON: {"widersprueche":[{"label":"...","severity":"high|medium|low","p4_excerpt":"...","p6_excerpt":"..."}]}.' },
                    { role: 'user', content: '§4:\n' + p4_text.slice(0, 3000) + '\n\n§6:\n' + p6_text.slice(0, 3000) }
                ]
            })
        });
        if (!res.ok) return [];
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content ?? '';
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) return [];
        const parsed = JSON.parse(m[0]);
        return Array.isArray(parsed.widersprueche) ? parsed.widersprueche : [];
    } catch {
        return [];
    }
}

function calculateConfidence(widersprueche: Array<{ severity: string }>): number {
    if (!widersprueche || widersprueche.length === 0) return 0.95;
    let weight = 0;
    for (const w of widersprueche) {
        if (w.severity === 'high') weight += 0.25;
        else if (w.severity === 'medium') weight += 0.10;
        else weight += 0.03;
    }
    return Math.max(0, Math.min(1, 1 - weight));
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(auth.slice(7));
    if (userError || !userData?.user?.email) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

    let body: { p4_text?: string; p6_text?: string; use_ai?: boolean };
    try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

    const p4_text = String(body.p4_text ?? '').slice(0, 5000);
    const p6_text = String(body.p6_text ?? '').slice(0, 5000);
    if (!p4_text || !p6_text) return jsonResponse({ error: 'Both p4_text and p6_text required' }, 400);

    const staticConflicts = detectStaticConflicts(p4_text, p6_text);
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const aiConflicts = body.use_ai && apiKey ? await detectAiConflicts(p4_text, p6_text, apiKey) : [];
    const widersprueche = [...staticConflicts, ...aiConflicts];
    const confidence = calculateConfidence(widersprueche);

    return jsonResponse({
        ok: true,
        widersprueche,
        confidence,
        static_count: staticConflicts.length,
        ai_count: aiConflicts.length,
        used_ai: body.use_ai === true
    });
});
