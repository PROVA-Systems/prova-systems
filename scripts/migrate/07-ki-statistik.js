#!/usr/bin/env node
/* ============================================================
   PROVA Migration 07 — KI_STATISTIK → ki_protokoll
   Sprint K-1.1.A11

   Schema-Realitaet:
     ki_protokoll (NICHT 'ki_audit' wie Mega-Prompt #1 sagte!)
     purpose       prompt_purpose ENUM (diktat_strukturierung|
                   plausibilitaets_check|norm_vorschlag|
                   konjunktiv_korrektur|befund_generierung|...)
     modell        ki_modell_typ ENUM (gpt_4o|gpt_4o_mini|whisper_1|...)
     status        ki_call_status ENUM (erfolg|fehler|timeout|rate_limit|
                   inhaltspolicy_blockiert)
     token_total   GENERATED ALWAYS — wir setzen NUR token_input/output
     kosten_eur    NUMERIC(10,6) — 6 Nachkommastellen
   ============================================================ */

import './lib/env.js';
import { readAllRecords } from './lib/airtable-reader.js';
import { batchUpsert, getOwnerWorkspaceIdForEmail, getUserIdByEmail } from './lib/supabase-writer.js';
import {
    generateUuidFromAirtableId,
    transformDate,
    transformEnum,
    transformLink,
    parseJsonString,
    WorkspaceCache
} from './lib/transform.js';
import { runMigration } from './lib/runner.js';

const BASE_ID = 'appJ7bLlAHZoxENWE';
const TABLE = 'KI_STATISTIK';  // tblv9F8LEnUC3mKru
const HINT = 'ki_protokoll';
const HINT_AUFTRAG = 'auftraege';

const PURPOSE = {
    'diktat_strukturierung': 'diktat_strukturierung',
    'Diktat-Strukturierung': 'diktat_strukturierung',
    'strukturierung': 'diktat_strukturierung',
    'plausibilitaets_check': 'plausibilitaets_check',
    'Plausibilitätscheck': 'plausibilitaets_check',
    'norm_vorschlag': 'norm_vorschlag',
    'konjunktiv_korrektur': 'konjunktiv_korrektur',
    'konjunktiv_check': 'konjunktiv_korrektur',
    'befund_generierung': 'befund_generierung',
    // weitere ENUM-Werte (sonstiges-Fallback bei Unbekannt)
    'sonstiges': 'sonstiges',
    'other': 'sonstiges'
};

const MODELL = {
    'gpt-4o': 'gpt_4o', 'gpt_4o': 'gpt_4o', 'GPT-4o': 'gpt_4o',
    'gpt-4o-mini': 'gpt_4o_mini', 'gpt_4o_mini': 'gpt_4o_mini',
    'gpt-4-turbo': 'gpt_4_turbo', 'gpt_4_turbo': 'gpt_4_turbo',
    'whisper-1': 'whisper_1', 'whisper_1': 'whisper_1', 'Whisper': 'whisper_1',
    'claude-4-opus': 'claude_4_opus', 'claude_4_opus': 'claude_4_opus',
    'claude-sonnet': 'claude_sonnet',
    'mistral-large': 'mistral_large',
    'mistral-medium': 'mistral_medium',
    'embedding-3-small': 'embedding_3_small',
    'embedding-3-large': 'embedding_3_large'
};

const STATUS = {
    'erfolg': 'erfolg', 'Erfolg': 'erfolg', 'success': 'erfolg', 'ok': 'erfolg',
    'fehler': 'fehler', 'Fehler': 'fehler', 'error': 'fehler', 'failed': 'fehler',
    'timeout': 'timeout', 'Timeout': 'timeout',
    'rate_limit': 'rate_limit', 'Rate-Limit': 'rate_limit',
    'inhaltspolicy_blockiert': 'inhaltspolicy_blockiert', 'policy_blocked': 'inhaltspolicy_blockiert'
};

function pick(rec, ...keys) {
    for (const k of keys) {
        const v = rec.fields?.[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

function mapKiCall(rec, { workspaceId, userId }) {
    return {
        id: generateUuidFromAirtableId(rec.id, HINT),
        workspace_id: workspaceId,
        user_id: userId,
        auftrag_id: transformLink(pick(rec, 'auftrag_id', 'auftrag', 'schadensfall_id'), HINT_AUFTRAG),
        purpose: transformEnum(pick(rec, 'purpose', 'zweck', 'funktion'), PURPOSE, 'sonstiges'),
        feature_kontext: pick(rec, 'feature_kontext', 'feature', 'context'),
        page_url: pick(rec, 'page_url', 'page', 'url'),
        modell: transformEnum(pick(rec, 'modell', 'model', 'Modell'), MODELL, 'gpt_4o'),
        modell_version: pick(rec, 'modell_version', 'model_version'),
        provider: pick(rec, 'provider', 'Provider') || 'openai',
        token_input: pick(rec, 'token_input', 'tokens_in', 'prompt_tokens'),
        token_output: pick(rec, 'token_output', 'tokens_out', 'completion_tokens'),
        // token_total wird per GENERATED ALWAYS berechnet — NICHT setzen
        kosten_eur: pick(rec, 'kosten_eur', 'cost_eur', 'cost'),
        dauer_ms: pick(rec, 'dauer_ms', 'duration_ms', 'latency_ms'),
        status: transformEnum(pick(rec, 'status', 'Status'), STATUS, 'erfolg'),
        fehler_message: pick(rec, 'fehler_message', 'error_message', 'error'),
        created_at: transformDate(pick(rec, 'created_at', 'timestamp', 'datum')) || new Date().toISOString()
    };
}

await runMigration({
    name: '07-ki-statistik',
    async run(ctx) {
        const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!haveCreds && !ctx.dryRun) {
            throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY fehlt');
        }

        ctx.log.info(`fetching ${TABLE}`);
        const records = await readAllRecords(BASE_ID, TABLE, { maxRecords: ctx.limit });
        ctx.log.info(`fetched ${records.length} record(s)`);

        const wsCache = new WorkspaceCache();
        const userCache = new Map();
        const out = [];

        for (const rec of records) {
            const sv_email = pick(rec, 'sv_email', 'user_email');
            if (!sv_email) {
                ctx.counts.skip += 1;
                continue;
            }

            let wsId = wsCache.get(sv_email);
            if (wsId === undefined) {
                wsId = haveCreds ? await getOwnerWorkspaceIdForEmail(sv_email) : null;
                wsCache.set(sv_email, wsId);
            }
            if (!wsId) {
                ctx.counts.skip += 1;
                continue;
            }

            let userId = userCache.get(sv_email);
            if (userId === undefined) {
                userId = haveCreds ? await getUserIdByEmail(sv_email) : null;
                userCache.set(sv_email, userId);
            }

            const k = mapKiCall(rec, { workspaceId: wsId, userId });
            out.push(k);
            if (ctx.samples.length < 3) ctx.samples.push(k);
            ctx.counts.ok += 1;
        }

        ctx.log.info(`mapped ${out.length} ki-calls`);

        if (out.length) {
            const { ok, errors } = await batchUpsert('ki_protokoll', out, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`ki_protokoll: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
    }
});
