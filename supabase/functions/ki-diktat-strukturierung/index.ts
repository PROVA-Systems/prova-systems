/* ki-diktat-strukturierung — MEGA⁴³ Welle 2 — KI-Pipeline */
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

const SYSTEM_PROMPT = `Du bist ein Strukturierungs-Assistent für Bausachverständigen-Gutachten.
Du erhältst ein PSEUDONYMISIERTES Diktat-Transkript und strukturierst es in 5 Paragraphen
nach IHK-Sachverständigen-Norm:

§1 Anlass — Was war der Auftrag?
§2 Sachverhalt — Was wurde vor Ort vorgefunden? (rein faktisch)
§3 Anknüpfungstatsachen — Welche Daten/Messwerte/Unterlagen liegen vor?
§4 Befunde — Welche Beobachtungen wurden gemacht? (rein faktisch)
§5 Beweisfragen — Welche Fragen stellten sich für die Begutachtung?

WICHTIG:
- KEINE Kausalaussagen oder Wertungen (das ist §6 Fachurteil-Sache des SV)
- KEINE PII rekonstruieren (Pseudonymisierungs-Platzhalter beibehalten)
- Output als striktes JSON: { "paragraf_1": "...", ... }`;

function pseudonymisierungOk(text: string): boolean {
    if (!text) return false;
    const piiPatterns = [
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        /\b[A-Z]{2}\d{2}[A-Z0-9]{15,30}\b/,
        /\b\+?\d[\d\s\-\/\(\)]{6,}\d\b/
    ];
    return !piiPatterns.some((p) => p.test(text));
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

    let body: { transkript?: string; text?: string; modell?: string };
    try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

    const transkript = body.transkript || body.text;
    if (!transkript || transkript.length < 30) return jsonResponse({ error: 'transkript pflicht (min 30 Zeichen)' }, 400);
    if (!pseudonymisierungOk(transkript)) return jsonResponse({ error: 'Pseudonymisierungs-Verstoß: PII im Input erkannt.' }, 400);

    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('PROVA_OPENAI_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'OPENAI_API_KEY nicht konfiguriert' }, 503);

    const modell = body.modell || 'gpt-5.4-mini';

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modell,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: transkript }
                ],
                temperature: 0.2,
                response_format: { type: 'json_object' }
            })
        });
        if (!res.ok) {
            const err = await res.text();
            return jsonResponse({ error: 'KI-Call fehlgeschlagen', detail: err.slice(0, 200) }, res.status);
        }
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content ?? '{}';
        let parsed: Record<string, unknown>;
        try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }
        return jsonResponse({
            paragraf_1: parsed.paragraf_1 ?? '',
            paragraf_2: parsed.paragraf_2 ?? '',
            paragraf_3: parsed.paragraf_3 ?? '',
            paragraf_4: parsed.paragraf_4 ?? '',
            paragraf_5: parsed.paragraf_5 ?? '',
            modell,
            tokens: data.usage ?? {}
        });
    } catch (e) {
        return jsonResponse({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
    }
});
