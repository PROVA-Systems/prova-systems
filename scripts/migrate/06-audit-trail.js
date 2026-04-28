#!/usr/bin/env node
/* ============================================================
   PROVA Migration 06 — AUDIT_TRAIL → audit_trail
   Sprint K-1.1.A10

   Schema-Realitaet:
     audit_trail (NICHT 'audit_log' wie Mega-Prompt #1 sagte!)
     INSERT-only via RLS — Updates/Deletes verboten.
     audit_action ENUM: create|read|update|delete|login|logout|login_failed|
                        export|import|pdf_generate|pdf_view|pdf_send|
                        ki_request|ki_response|workspace_invite|
                        workspace_remove_member|data_export_dsgvo|data_delete_dsgvo

     entity_typ ist TEXT (frei): 'auftrag'|'rechnung'|'kontakt'|...
     entity_id ist UUID (kann NULL sein)
     payload ist JSONB (Vorher/Nachher bei Update)

   Volume kann gross sein -> Batches von 500.
   Idempotenz via deterministischer UUID aus Airtable-Record-ID.
   ============================================================ */

import './lib/env.js';
import { readAllRecords } from './lib/airtable-reader.js';
import { batchUpsert, getOwnerWorkspaceIdForEmail, getUserIdByEmail } from './lib/supabase-writer.js';
import {
    generateUuidFromAirtableId,
    transformDate,
    transformEnum,
    parseJsonString,
    WorkspaceCache
} from './lib/transform.js';
import { runMigration } from './lib/runner.js';

const BASE_ID = 'appJ7bLlAHZoxENWE';
const TABLE = 'AUDIT_TRAIL';
const HINT = 'audit_trail';

const ACTION = {
    'create': 'create', 'Create': 'create', 'erstellen': 'create',
    'read': 'read', 'Read': 'read', 'lesen': 'read', 'view': 'read',
    'update': 'update', 'Update': 'update', 'aendern': 'update', 'edit': 'update',
    'delete': 'delete', 'Delete': 'delete', 'loeschen': 'delete',
    'login': 'login', 'Login': 'login', 'anmelden': 'login',
    'logout': 'logout', 'Logout': 'logout', 'abmelden': 'logout',
    'login_failed': 'login_failed', 'failed_login': 'login_failed',
    'export': 'export', 'Export': 'export',
    'import': 'import', 'Import': 'import',
    'pdf_generate': 'pdf_generate', 'PDF erstellt': 'pdf_generate',
    'pdf_view': 'pdf_view',
    'pdf_send': 'pdf_send', 'pdf_versendet': 'pdf_send',
    'ki_request': 'ki_request', 'ki_call': 'ki_request',
    'ki_response': 'ki_response',
    'workspace_invite': 'workspace_invite',
    'workspace_remove_member': 'workspace_remove_member',
    'data_export_dsgvo': 'data_export_dsgvo',
    'data_delete_dsgvo': 'data_delete_dsgvo'
};

function pick(rec, ...keys) {
    for (const k of keys) {
        const v = rec.fields?.[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

function mapAudit(rec, { workspaceId, userId }) {
    const action = transformEnum(
        pick(rec, 'action', 'Action', 'aktion', 'event_type', 'typ'),
        ACTION,
        'read'  // safest default
    );
    return {
        id: generateUuidFromAirtableId(rec.id, HINT),
        workspace_id: workspaceId,
        user_id: userId,
        action,
        entity_typ: pick(rec, 'entity_typ', 'entity_type', 'tabelle', 'object_type'),
        entity_id: pick(rec, 'entity_id', 'object_id', 'record_id'),  // kann TEXT sein, Schema akzeptiert UUID — bei Mismatch wird DB rejected
        payload: parseJsonString(pick(rec, 'payload', 'data', 'changes')) || {},
        ip_address: pick(rec, 'ip_address', 'ip', 'IP'),
        user_agent: pick(rec, 'user_agent', 'ua'),
        request_id: pick(rec, 'request_id', 'trace_id'),
        created_at: transformDate(pick(rec, 'created_at', 'timestamp', 'datum')) || new Date().toISOString()
    };
}

await runMigration({
    name: '06-audit-trail',
    async run(ctx) {
        const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!haveCreds && !ctx.dryRun) {
            throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY fehlt');
        }

        ctx.log.info(`fetching ${TABLE} (volume kann gross sein)`);
        const records = await readAllRecords(BASE_ID, TABLE, {
            maxRecords: ctx.limit,
            onPage: ({ pageNumber, total }) => {
                if (pageNumber % 10 === 0) ctx.log.info(`  page ${pageNumber}, total=${total}`);
            }
        });
        ctx.log.info(`fetched ${records.length} record(s)`);

        const wsCache = new WorkspaceCache();
        const userCache = new Map();
        const out = [];

        for (const rec of records) {
            const sv_email = pick(rec, 'sv_email', 'user_email', 'email');
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

            const a = mapAudit(rec, { workspaceId: wsId, userId });

            // entity_id muss UUID sein oder NULL — Airtable-rec-IDs sind nicht UUID
            // -> wenn entity_id startet mit 'rec' (Airtable) -> in payload schieben
            if (a.entity_id && typeof a.entity_id === 'string' && a.entity_id.startsWith('rec')) {
                a.payload = { ...a.payload, _airtable_entity_rec: a.entity_id };
                a.entity_id = null;
            }

            out.push(a);
            if (ctx.samples.length < 3) ctx.samples.push(a);
            ctx.counts.ok += 1;
        }

        ctx.log.info(`mapped ${out.length} audit-events`);

        if (out.length) {
            // 500er Batches via batchUpsert (BATCH_SIZE im Writer ist 100,
            // aber wir nutzen upsert mit 'id' fuer Idempotenz).
            const { ok, errors } = await batchUpsert('audit_trail', out, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`audit_trail: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
    }
});
