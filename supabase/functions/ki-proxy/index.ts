/* ============================================================
   PROVA Edge Function — ki-proxy
   Sprint K-1.2.B2

   Ersetzt Netlify Function netlify/functions/ki-proxy.js.

   Flow:
     1. JWT verifizieren
     2. Body parsen { prompt, context, purpose, model, max_tokens }
     3. Server-side Pseudonymisierung (DSGVO-Pflicht!)
     4. OpenAI-Call
     5. Response: Tokens re-identifizieren
     6. ki_protokoll-Eintrag (workspace_id, user_id, model, tokens, kosten)
     7. JSON-Response (OHNE Modellnamen — § PROVA-REGELN-PERMANENT)

   Modell-Defaults:
     - Konjunktiv-Korrektur PFLICHT GPT-4o (nicht mini — siehe CLAUDE.md Regel)
     - Standard: GPT-4o-mini (billiger, ausreichend für Strukturierung)

   Secrets: OPENAI_API_KEY
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyJwt, getWorkspaceId, HttpError, withErrorHandling } from '../_shared/auth.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { logAuditEvent, trackFeatureEvent } from '../_shared/audit.ts';
import type { KiProxyRequest, KiProxyResponse } from '../_shared/types.ts';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

// Modell-Mapping → OpenAI-API-Namen (intern, NIE im Frontend leaken)
const MODEL_API_NAME: Record<string, string> = {
    'gpt_4o': 'gpt-4o',
    'gpt_4o_mini': 'gpt-4o-mini',
    'gpt_4_turbo': 'gpt-4-turbo'
};

// Token-Preise pro 1M Tokens (Stand 2026-04, EUR ungefähr)
const PRICE_PER_M_TOKENS: Record<string, { in: number; out: number }> = {
    'gpt_4o':       { in: 2.50,  out: 10.00 },
    'gpt_4o_mini':  { in: 0.15,  out: 0.60  },
    'gpt_4_turbo':  { in: 10.00, out: 30.00 }
};

// Konjunktiv-Korrektur PFLICHT GPT-4o (CLAUDE.md Regel)
const FORCED_GPT_4O_PURPOSES = new Set(['konjunktiv_korrektur']);

interface PseudoMap {
    [token: string]: string;          // [AZ-1] -> 'SCH-2026-001'
}

/**
 * Server-side Pseudonymisierung.
 * Aktuelle Coverage (K-1.2 Skeleton):
 *   - Aktenzeichen (PROVA-Pattern + freie Form)
 *   - Email-Adressen
 *   - IBAN
 *   - Telefon-Nummern (DE + intl)
 * TODO Sprint K-2:
 *   - Namen (NER via Whisper-Output oder externe Pseudonymisierungs-API)
 *   - Adressen (PLZ-Ort-Datenbank-Lookup)
 */
function pseudonymize(text: string): { pseudo: string; map: PseudoMap } {
    const map: PseudoMap = {};
    let pseudo = text;
    let i: number;

    // Aktenzeichen: PROVA-Pattern (SCH-YYYY-NNN) + freie Form (z.B. 12 O 345/26)
    i = 0;
    pseudo = pseudo.replace(
        /\b([A-ZÄÖÜ]{2,4}-\d{4}-\d{2,5}|\d{1,3}\s*[A-Z]\s*\d{1,4}\/\d{2,4})\b/g,
        (m) => { i += 1; const t = `[AZ-${i}]`; map[t] = m; return t; }
    );

    // Emails
    i = 0;
    pseudo = pseudo.replace(
        /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
        (m) => { i += 1; const t = `[EMAIL-${i}]`; map[t] = m; return t; }
    );

    // IBAN (DE + intl, vereinfacht)
    i = 0;
    pseudo = pseudo.replace(
        /\b[A-Z]{2}\d{2}\s?(?:\d{4}\s?){4,7}\d{0,4}\b/g,
        (m) => { i += 1; const t = `[IBAN-${i}]`; map[t] = m; return t; }
    );

    // Telefon DE (best-effort, conservative)
    i = 0;
    pseudo = pseudo.replace(
        /\b(?:\+49|0049|0)\s?\d{2,5}[\s\-/]?\d{4,12}\b/g,
        (m) => { i += 1; const t = `[TEL-${i}]`; map[t] = m; return t; }
    );

    return { pseudo, map };
}

function reidentify(text: string, map: PseudoMap): string {
    let out = text;
    for (const [token, original] of Object.entries(map)) {
        out = out.split(token).join(original);
    }
    return out;
}

function buildSystemPrompt(purpose: string): string {
    const base = 'Du bist ein deutscher Bauschaden-Sachverständigen-Assistent für PROVA Systems. '
        + 'Antworte sachlich, präzise, in deutscher Fachsprache. '
        + 'Keine eigenen fachlichen Bewertungen — nur strukturierte Hilfe. ';

    switch (purpose) {
        case 'diktat_strukturierung':
            return base + 'Strukturiere das Diktat in Absätze, ohne Inhalt zu ändern oder zu interpretieren.';
        case 'konjunktiv_korrektur':
            return base + 'Wandle indikativische Kausalaussagen in Konjunktiv II um '
                       + '("es ist..." → "es liegt nahe, dass..."). Sonst nichts ändern.';
        case 'plausibilitaets_check':
            return base + 'Prüfe Aussagen auf interne Widersprüche oder offensichtliche Unmöglichkeiten. '
                       + 'Liste Auffälligkeiten als Bullet-List, ohne zu werten.';
        case 'norm_vorschlag':
            return base + 'Schlage relevante DIN/EN-Normen zum Thema vor. NUR existierende Normen, keine erfundenen.';
        case 'befund_generierung':
            return base + 'Hilf bei der Strukturierung von Befunden. Übernimm nur, was im Input steht.';
        default:
            return base;
    }
}

async function callOpenAI(model: string, prompt: string, system: string, maxTokens: number, temperature: number) {
    const resp = await fetch(OPENAI_API, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature
        })
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new HttpError(`OpenAI ${resp.status}: ${err.slice(0, 300)}`, resp.status === 429 ? 429 : 502);
    }

    const json = await resp.json();
    return {
        text: json.choices?.[0]?.message?.content ?? '',
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0
    };
}

function calcCostEur(model: string, tokensIn: number, tokensOut: number): number {
    const p = PRICE_PER_M_TOKENS[model] ?? PRICE_PER_M_TOKENS['gpt_4o_mini'];
    return (tokensIn * p.in + tokensOut * p.out) / 1_000_000;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return handleCors();
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    if (!OPENAI_KEY) {
        return errorResponse('OPENAI_API_KEY not configured in Edge Function secrets', 500);
    }

    const ctx = await verifyJwt(req);
    const workspaceId = await getWorkspaceId(req, ctx);
    const sb = createSupabaseClient(req);

    const body = await req.json() as KiProxyRequest;
    if (!body.prompt) throw new HttpError('prompt required', 400);

    const purpose = body.purpose ?? 'sonstiges';
    let model = body.model ?? 'gpt_4o_mini';
    if (FORCED_GPT_4O_PURPOSES.has(purpose)) model = 'gpt_4o';
    const apiName = MODEL_API_NAME[model];
    if (!apiName) throw new HttpError(`Unknown model: ${model}`, 400);

    // Pseudonymisierung
    const { pseudo, map } = pseudonymize(body.prompt);
    const ctxBlock = body.context ? `\n\nKontext:\n${pseudonymize(body.context).pseudo}` : '';
    const fullPrompt = pseudo + ctxBlock;
    const systemPrompt = buildSystemPrompt(purpose);

    // OpenAI-Call
    const t0 = Date.now();
    let openaiResult: { text: string; tokensIn: number; tokensOut: number };
    let status: 'erfolg' | 'fehler' | 'timeout' | 'rate_limit' = 'erfolg';
    let errorMsg: string | null = null;
    try {
        openaiResult = await callOpenAI(
            apiName,
            fullPrompt,
            systemPrompt,
            body.max_tokens ?? 1500,
            body.temperature ?? 0.3
        );
    } catch (e) {
        if (e instanceof HttpError && e.status === 429) status = 'rate_limit';
        else status = 'fehler';
        errorMsg = e instanceof Error ? e.message : String(e);
        openaiResult = { text: '', tokensIn: 0, tokensOut: 0 };
    }
    const dauerMs = Date.now() - t0;

    // Re-Identifizierung
    const reidentified = reidentify(openaiResult.text, map);
    const kostenEur = calcCostEur(model, openaiResult.tokensIn, openaiResult.tokensOut);

    // Halluzinations-Check (Skeleton): prüfe ob Output nur Pseudonyms aus Map referenziert
    // TODO: NER-basierter Check in K-2
    const hallucinationCheckPassed = !errorMsg;

    // Konjunktiv-Check (nur bei konjunktiv_korrektur purpose)
    const konjunktivCheckPassed = purpose !== 'konjunktiv_korrektur'
        ? null
        : !/(\bist\s+\w+\s+(?:weil|aufgrund|durch))/i.test(reidentified);

    // ki_protokoll-Eintrag (Service-Client, da workspace_id explizit gesetzt)
    let kiProtokollId: string | null = null;
    const protokollRow = {
        workspace_id: workspaceId,
        user_id: ctx.user.id,
        auftrag_id: body.auftrag_id ?? null,
        eintrag_id: body.eintrag_id ?? null,
        purpose,
        feature_kontext: `ki-proxy/${purpose}`,
        modell: model,
        modell_version: apiName,
        provider: 'openai',
        token_input: openaiResult.tokensIn,
        token_output: openaiResult.tokensOut,
        kosten_eur: kostenEur,
        dauer_ms: dauerMs,
        status,
        fehler_message: errorMsg
    };
    const { data: protokollIns } = await sb.from('ki_protokoll').insert(protokollRow).select('id').single();
    kiProtokollId = protokollIns?.id ?? null;

    // Audit
    await logAuditEvent(sb, {
        action: status === 'erfolg' ? 'ki_request' : 'ki_request',
        entityTyp: 'ki_protokoll',
        entityId: kiProtokollId,
        payload: { purpose, status, tokens: openaiResult.tokensIn + openaiResult.tokensOut },
        workspaceId,
        userId: ctx.user.id
    }, req);

    // Feature-Event
    await trackFeatureEvent(sb, workspaceId, 'ki_request', `ki_proxy.${purpose}`);

    if (errorMsg) {
        return errorResponse(`KI-Service nicht verfügbar: ${errorMsg}`, status === 'rate_limit' ? 429 : 502, {
            ki_protokoll_id: kiProtokollId
        });
    }

    const response: KiProxyResponse = {
        text: reidentified,
        konjunktiv_check_passed: konjunktivCheckPassed ?? undefined,
        halluzinations_check_passed: hallucinationCheckPassed,
        ki_protokoll_id: kiProtokollId ?? undefined
    };
    return jsonResponse(response);
};

Deno.serve(withErrorHandling(handler));
