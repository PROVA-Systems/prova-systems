/* ============================================================
   PROVA — Embedding-Helper
   MEGA⁶³ Item 1.5 — text-embedding-3-small via OpenAI EU.
   Cache via Hash-Lookup in befund_fragmente (gleicher Text = gleiches Vector).
   ============================================================ */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import { sha256Hex } from './pseudonymize.ts';
import {
    insertKiProtokoll,
    calcCostEur,
    type KiProtokollEntry
} from './ki-protokoll.ts';

const OPENAI_EMBEDDING_API = 'https://api.openai.com/v1/embeddings';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;
const MAX_INPUT_CHARS = 8000;

export interface EmbeddingContext {
    workspace_id: string;
    user_id: string;
    auftrag_id?: string | null;
    feature_kontext: string;
}

export interface EmbeddingResult {
    embedding: number[];
    cached: boolean;
    tokens_used: number;
    kosten_eur: number;
    dauer_ms: number;
    ki_protokoll_id: string | null;
}

/**
 * Erzeugt Embedding-Vector (1536 dim) fuer Text.
 *
 * @param sb Supabase-Client (mit User-Auth — RLS gilt fuer Cache-Lookup)
 * @param text Pseudonymisierter Text (DSGVO: NIE personenbezogene Klartext)
 * @param ctx ki_protokoll-Kontext
 * @param skipCache wenn true, direkt OpenAI-Call ohne DB-Lookup
 */
export async function generateEmbedding(
    sb: SupabaseClient,
    text: string,
    ctx: EmbeddingContext,
    skipCache = false
): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
        throw new Error('EMBEDDING_EMPTY_INPUT');
    }
    if (!OPENAI_KEY) {
        throw new Error('OPENAI_API_KEY_MISSING');
    }

    // Truncate falls zu lang
    const truncated = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
    const input_hash = await sha256Hex(truncated);

    // Cache-Lookup: gibt es bereits ein Embedding fuer DIESEN Text in DIESEM Workspace?
    if (!skipCache) {
        const { data: cached } = await sb
            .from('ki_protokoll')
            .select('id, output_hash')
            .eq('workspace_id', ctx.workspace_id)
            .eq('purpose', 'embedding')
            .eq('input_hash', input_hash)
            .eq('status', 'erfolg')
            .limit(1)
            .maybeSingle();
        // NOTE: Vector selbst ist nicht in ki_protokoll gespeichert.
        // Cache-Hit gibt zwar Hinweis, aber Vector muss neu kommen ODER
        // aus befund_fragmente geladen werden. Hier: nur Metriken-Reuse.
        // Echter Cache erfordert separate Tabelle (defer MEGA64).
        if (cached?.id) {
            // Soft-Cache: bekannter Hash, aber wir muessen Vector neu holen.
            // Status-Log: counter incrementiert, kein Kosten-Spar.
        }
    }

    const t0 = Date.now();
    let status: 'erfolg' | 'fehler' | 'timeout' | 'rate_limit' = 'erfolg';
    let errorMsg: string | null = null;
    let embedding: number[] = [];
    let tokensUsed = 0;

    try {
        const resp = await fetch(OPENAI_EMBEDDING_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                input: truncated,
                encoding_format: 'float'
            })
        });

        if (!resp.ok) {
            const err = await resp.text();
            if (resp.status === 429) status = 'rate_limit';
            else status = 'fehler';
            errorMsg = `OpenAI ${resp.status}: ${err.slice(0, 300)}`;
        } else {
            const data = await resp.json();
            embedding = data.data?.[0]?.embedding ?? [];
            tokensUsed = data.usage?.prompt_tokens ?? 0;
            if (embedding.length !== EMBEDDING_DIM) {
                status = 'fehler';
                errorMsg = `Unexpected embedding dim: ${embedding.length}`;
            }
        }
    } catch (e) {
        status = 'fehler';
        errorMsg = e instanceof Error ? e.message : String(e);
    }

    const dauerMs = Date.now() - t0;
    const kostenEur = calcCostEur(EMBEDDING_MODEL, tokensUsed, 0);

    const entry: KiProtokollEntry = {
        workspace_id: ctx.workspace_id,
        user_id: ctx.user_id,
        auftrag_id: ctx.auftrag_id ?? null,
        purpose: 'embedding',
        feature_kontext: ctx.feature_kontext,
        modell: 'embedding_3_small',
        modell_version: EMBEDDING_MODEL,
        provider: 'openai',
        token_input: tokensUsed,
        token_output: 0,
        kosten_eur: kostenEur,
        dauer_ms: dauerMs,
        status,
        fehler_message: errorMsg,
        input_pseudonymisiert: true,
        input_hash,
        output_laenge_chars: embedding.length,
        started_at: new Date(Date.now() - dauerMs).toISOString(),
        completed_at: new Date().toISOString()
    };

    const ki_protokoll_id = await insertKiProtokoll(sb, entry);

    if (status !== 'erfolg') {
        throw new Error(`EMBEDDING_FAILED: ${errorMsg}`);
    }

    return {
        embedding,
        cached: false,
        tokens_used: tokensUsed,
        kosten_eur: kostenEur,
        dauer_ms: dauerMs,
        ki_protokoll_id
    };
}

/**
 * Embedded mehrere Texte parallel (Promise.all). Rate-Limit-Schutz
 * via Batch-Sleep (default: 10 parallel).
 */
export async function generateEmbeddingsBatch(
    sb: SupabaseClient,
    texts: string[],
    ctx: EmbeddingContext,
    concurrency = 10
): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += concurrency) {
        const batch = texts.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(t => generateEmbedding(sb, t, ctx))
        );
        results.push(...batchResults);
        // Optional: kleine Pause zwischen Batches gegen Rate-Limit
        if (i + concurrency < texts.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }
    return results;
}
