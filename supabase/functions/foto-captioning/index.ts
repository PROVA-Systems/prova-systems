/* foto-captioning — MEGA⁴³ Welle 2 — KI-Pipeline */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

const SYSTEM_PROMPT = `Du bist ein Experte fuer Baugutachten und analysierst Schadensfotos.
Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklaerungen.

JSON-Format:
{
  "beschriftung": "Kurze, praezise Bildbeschreibung auf Deutsch (1-2 Saetze, fachlich)",
  "schadensart": "Schimmel|Wasserschaden|Riss|Feuchte|Brandschaden|Baumangel|Sonstige",
  "bauteil": "z.B. Wand, Decke, Boden, Fenster, Dach, Fassade, Estrich, Putz",
  "raum": "z.B. Badezimmer, Wohnzimmer, Keller, Dachgeschoss, Aussenbereich",
  "schweregrad": "gering|mittel|schwer|kritisch",
  "sichtbare_merkmale": ["Merkmal1", "Merkmal2"],
  "empfohlene_norm": "z.B. DIN 4108-3 oder leer wenn nicht eindeutig"
}`;

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

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'API key not configured' }, 500);

    let body: { imageBase64?: string; mediaType?: string; aktenzeichen?: string; schadensart?: string };
    try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

    const { imageBase64, mediaType, aktenzeichen, schadensart } = body;
    if (!imageBase64) return jsonResponse({ error: 'imageBase64 fehlt' }, 400);

    const userPrompt = `Analysiere dieses Schadensfoto.
${aktenzeichen ? 'Aktenzeichen: ' + aktenzeichen : ''}
${schadensart ? 'Erwartete Schadensart: ' + schadensart : ''}
Gib das JSON-Objekt zurueck.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'gpt-5.4-mini',
                max_tokens: 400,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: [
                        { type: 'image_url', image_url: { url: 'data:' + (mediaType || 'image/jpeg') + ';base64,' + imageBase64, detail: 'low' } },
                        { type: 'text', text: userPrompt }
                    ] }
                ]
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[foto-captioning] OpenAI-Fehler:', data?.error?.message ?? 'Unbekannt');
            return jsonResponse({ error: 'Bild-Analyse fehlgeschlagen' }, 502);
        }
        const rawText = data?.choices?.[0]?.message?.content ?? '';
        let metadata: Record<string, unknown> = {};
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) metadata = JSON.parse(jsonMatch[0]);
        } catch {
            metadata = { beschriftung: rawText.slice(0, 200), schadensart: '', bauteil: '', raum: '', schweregrad: 'mittel', sichtbare_merkmale: [] };
        }
        return jsonResponse({ success: true, metadata, tokens_used: data?.usage?.total_tokens ?? 0 });
    } catch (e) {
        console.error('[foto-captioning] Upstream:', e instanceof Error ? e.message : String(e));
        return jsonResponse({ error: 'Upstream error' }, 502);
    }
});
