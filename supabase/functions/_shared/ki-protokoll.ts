/* ============================================================
   PROVA — ki_protokoll Insert Helper (DRY)
   MEGA⁶³ Item 1.8 — §407a-Beweiskette in JEDEM KI-Call.
   Regel 16: Pflicht-Logging in ki_protokoll.
   ============================================================ */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';
import { sha256Hex } from './pseudonymize.ts';

// ki_modell_typ-Enum Werte (DB-Schema, Stand 2026-05-12)
export type KiModellTyp =
    | 'gpt_4o' | 'gpt_4o_mini' | 'gpt_4_turbo'
    | 'whisper_1'
    | 'claude_4_opus' | 'claude_sonnet'
    | 'mistral_large' | 'mistral_medium'
    | 'embedding_3_small' | 'embedding_3_large'
    | 'sonstiges';

// ki_provider-Enum
export type KiProvider = 'openai' | 'mistral' | 'anthropic';

// ki_call_status-Enum
export type KiCallStatus = 'erfolg' | 'fehler' | 'timeout' | 'rate_limit' | 'inhaltspolicy_blockiert';

// prompt_purpose-Enum (MEGA⁶³ erweitert um 8 Werte)
export type PromptPurpose =
    // Legacy
    | 'diktat_strukturierung' | 'plausibilitaets_check' | 'norm_vorschlag'
    | 'konjunktiv_korrektur' | 'befund_generierung' | 'ursachen_hypothesen'
    | 'kurzbeantwortung' | 'kurzstellungnahme' | 'sanierungsvorschlag'
    | 'foto_beschreibung' | 'pseudonymisierung' | 'sonstiges'
    // MEGA63 NEU
    | 'asset_zu_fragment_audio' | 'asset_zu_fragment_foto'
    | 'asset_zu_fragment_skizze' | 'asset_zu_fragment_notiz'
    | 'fragmente_zu_befund' | 'embedding'
    | 'auto_tagging' | 'raumbezug_extract';

// Token-Preise pro 1M Tokens (Stand 2026-05, EUR)
const PRICE_PER_M_TOKENS: Record<string, { in: number; out: number }> = {
    // OpenAI
    'gpt-5.5':                 { in: 2.50,  out: 10.00 },
    'gpt-5.5-instant':         { in: 0.15,  out: 0.60 },
    'gpt-4o':                  { in: 2.50,  out: 10.00 },
    'gpt-4o-mini':             { in: 0.15,  out: 0.60 },
    'gpt-4-turbo':             { in: 10.00, out: 30.00 },
    'text-embedding-3-small':  { in: 0.02,  out: 0 },
    'text-embedding-3-large':  { in: 0.13,  out: 0 },
    'whisper-1':               { in: 0,     out: 0 }, // per minute, separate calc
    // Anthropic
    'claude-sonnet-4-6':       { in: 3.00,  out: 15.00 },
    'claude-opus-4-7':         { in: 15.00, out: 75.00 },
    'claude-haiku-4-5-20251001': { in: 0.80, out: 4.00 },
    // Mistral
    'mistral-large-latest':    { in: 2.00,  out: 6.00 },
    'pixtral-large-latest':    { in: 2.00,  out: 6.00 }
};

export function calcCostEur(apiName: string, tokensIn: number, tokensOut: number): number {
    const p = PRICE_PER_M_TOKENS[apiName];
    if (!p) return 0;
    return (tokensIn * p.in + tokensOut * p.out) / 1_000_000;
}

export interface KiProtokollEntry {
    workspace_id: string;
    user_id: string;
    auftrag_id?: string | null;
    eintrag_id?: string | null;
    audio_id?: string | null;
    purpose: PromptPurpose;
    feature_kontext: string;
    page_url?: string | null;
    modell: KiModellTyp;
    modell_version: string;        // API-Name z.B. "gpt-5.5-instant"
    provider: KiProvider;
    token_input: number;
    token_output: number;
    kosten_eur: number;
    dauer_ms: number;
    status: KiCallStatus;
    fehler_message?: string | null;
    input_pseudonymisiert: boolean;
    pseudonymisierung_token_count?: number;
    output_repseudonymisiert?: boolean;
    konjunktiv_check_passed?: boolean | null;
    halluzinations_check_passed?: boolean | null;
    input_hash?: string;
    output_hash?: string;
    output_laenge_chars?: number;
    output_preview?: string;       // max 500 chars
    started_at?: string;
    completed_at?: string;
}

/**
 * Insertet ki_protokoll-Eintrag und gibt die ID zurueck.
 * Berechnet hashes + preview automatisch falls nicht gesetzt.
 */
export async function insertKiProtokoll(
    sb: SupabaseClient,
    entry: KiProtokollEntry,
    rawInput?: string,
    rawOutput?: string
): Promise<string | null> {
    const row = { ...entry };

    if (rawInput && !row.input_hash) {
        row.input_hash = await sha256Hex(rawInput);
    }
    if (rawOutput) {
        if (!row.output_hash) row.output_hash = await sha256Hex(rawOutput);
        if (row.output_laenge_chars === undefined) row.output_laenge_chars = rawOutput.length;
        if (!row.output_preview) row.output_preview = rawOutput.slice(0, 500);
    }

    const { data, error } = await sb.from('ki_protokoll').insert(row).select('id').single();
    if (error) {
        console.error('[ki-protokoll] insert failed:', error.message);
        return null;
    }
    return data?.id ?? null;
}

/**
 * Timing-Helper: misst Dauer einer Async-Operation.
 */
export async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; dauerMs: number }> {
    const t0 = Date.now();
    const result = await fn();
    return { result, dauerMs: Date.now() - t0 };
}
