#!/usr/bin/env node
/* ============================================================
   PROVA Migration 04 — EINTRAEGE → eintraege
   Sprint K-1.1.A8

   Schema-Realitaet:
     eintraege.typ          eintrag_typ ENUM (diktat|text|foto|mix)
     eintraege.auftrag_id   FK NOT NULL — Eintrag braucht Auftrag
     eintraege.content      TEXT (Volltext)
     eintraege.audio_dateien_ids  UUID[] — wird hier leer gelassen, audio_dateien
                                            kommt in eigener Migration (oder K-1.5)
     eintraege.foto_ids     UUID[] — analog
     eintraege.pseudonymisiert  BOOLEAN — beim Migration-Time false
                                          (Re-Pseudonymisierung in K-1.2)

   Mega-Prompt #1 sagte 'EINTRAEGE → diktate' — Schema hat KEINE
   diktate-Tabelle. Migration-Ziel ist eintraege (1:1 Mapping).
   Audio-Files kommen separat in audio_dateien (nicht Teil dieser Migration —
   Storage-Migration aus Cloudinary erst in K-1.5 Cleanup).
   ============================================================ */

import './lib/env.js';
import { readAllRecords } from './lib/airtable-reader.js';
import { batchUpsert, getOwnerWorkspaceIdForEmail } from './lib/supabase-writer.js';
import {
    generateUuidFromAirtableId,
    transformDate,
    transformEnum,
    transformLink,
    validateRecord,
    WorkspaceCache
} from './lib/transform.js';
import { runMigration } from './lib/runner.js';

const BASE_ID = 'appJ7bLlAHZoxENWE';
const TABLE = 'EINTRAEGE';
const HINT = 'eintraege';
const HINT_AUFTRAG = 'auftraege';

const EINTRAG_TYP = {
    'diktat': 'diktat', 'Diktat': 'diktat', 'audio': 'diktat', 'Audio': 'diktat',
    'text': 'text', 'Text': 'text', 'manuell': 'text',
    'foto': 'foto', 'Foto': 'foto', 'bild': 'foto',
    'mix': 'mix', 'Mix': 'mix', 'gemischt': 'mix'
};

function pick(rec, ...keys) {
    for (const k of keys) {
        const v = rec.fields?.[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

function mapEintrag(rec, workspaceId) {
    return {
        id: generateUuidFromAirtableId(rec.id, HINT),
        workspace_id: workspaceId,
        auftrag_id: transformLink(
            pick(rec, 'auftrag_id', 'auftrag', 'schadensfall_id', 'schadensfall'),
            HINT_AUFTRAG
        ),
        typ: transformEnum(pick(rec, 'typ', 'Typ'), EINTRAG_TYP, 'text'),
        nr: pick(rec, 'nr', 'Nr', 'reihenfolge') || 0,
        datum: transformDate(pick(rec, 'datum', 'Datum')) || new Date().toISOString().slice(0, 10),
        titel: pick(rec, 'titel', 'Titel'),
        content: pick(rec, 'content', 'Content', 'text', 'Text', 'inhalt'),
        // audio_dateien_ids und foto_ids bleiben leer, Storage-Migration kommt separat
        pseudonymisiert: false,
        konjunktiv_check_passed: pick(rec, 'konjunktiv_check_passed') ?? null
    };
}

await runMigration({
    name: '04-eintraege',
    async run(ctx) {
        const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!haveCreds && !ctx.dryRun) {
            throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY fehlt');
        }

        ctx.log.info(`fetching ${TABLE}`);
        const records = await readAllRecords(BASE_ID, TABLE, { maxRecords: ctx.limit });
        ctx.log.info(`fetched ${records.length} record(s)`);

        const wsCache = new WorkspaceCache();
        const out = [];

        for (const rec of records) {
            const sv_email = pick(rec, 'sv_email');
            if (!sv_email) {
                ctx.counts.skip += 1;
                ctx.errors.push({ rec_id: rec.id, reason: 'no_sv_email' });
                continue;
            }
            let wsId = wsCache.get(sv_email);
            if (wsId === undefined) {
                wsId = haveCreds ? await getOwnerWorkspaceIdForEmail(sv_email) : null;
                wsCache.set(sv_email, wsId);
            }
            if (!wsId) {
                ctx.counts.skip += 1;
                ctx.errors.push({ rec_id: rec.id, sv_email, reason: 'workspace_not_found' });
                continue;
            }

            const e = mapEintrag(rec, wsId);
            if (!e.auftrag_id) {
                ctx.counts.skip += 1;
                ctx.errors.push({ rec_id: rec.id, reason: 'no_auftrag_link' });
                continue;
            }

            const v = validateRecord(e, {
                required: ['id', 'workspace_id', 'auftrag_id', 'typ'],
                types: { id: 'uuid', workspace_id: 'uuid', auftrag_id: 'uuid' }
            });
            if (!v.valid) {
                ctx.counts.error += 1;
                ctx.errors.push({ rec_id: rec.id, errors: v.errors });
                continue;
            }

            out.push(e);
            ctx.samples.push(e);
            ctx.counts.ok += 1;
        }

        ctx.log.info(`mapped ${out.length} eintraege`);

        if (out.length) {
            const { ok, errors } = await batchUpsert('eintraege', out, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`eintraege: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
    }
});
