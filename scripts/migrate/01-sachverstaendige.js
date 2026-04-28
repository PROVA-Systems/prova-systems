#!/usr/bin/env node
/* ============================================================
   PROVA Migration 01 — SACHVERSTAENDIGE → workspaces + workspace_memberships
   Sprint K-1.1.A5

   Quelle: Airtable Base appJ7bLlAHZoxENWE, Tabelle SACHVERSTAENDIGE (tbladqEQT3tmx4DIB)
   Ziel:   Supabase
             - workspaces (typ, name, briefkopf, abo_*)
             - workspace_memberships (rolle='owner', user_id, workspace_id)

   Pflicht-Pre-Step: SV-User muss in public.users existieren (= auth.users sync).
   Falls fehlt: skip mit WARN, Marcel muss SV erst in Supabase Auth anlegen.

   Idempotenz: deterministische UUIDv5 aus Airtable-Record-ID.

   CLI:
     node 01-sachverstaendige.js              # dry-run (default)
     node 01-sachverstaendige.js --live
     node 01-sachverstaendige.js --limit=5
   ============================================================ */

import './lib/env.js';
import { readAllRecords } from './lib/airtable-reader.js';
import {
    batchUpsert,
    getUserIdByEmail,
    countRows
} from './lib/supabase-writer.js';
import {
    generateUuidFromAirtableId,
    transformDate,
    transformEnum,
    validateRecord
} from './lib/transform.js';
import { runMigration } from './lib/runner.js';

const BASE_ID = 'appJ7bLlAHZoxENWE';
const TABLE_ID = 'tbladqEQT3tmx4DIB';  // SACHVERSTAENDIGE
const TABLE_HINT_WORKSPACE = 'workspaces';
const TABLE_HINT_MEMBERSHIP = 'workspace_memberships';

/**
 * Field-Map mit Best-Effort gegen verschiedene Airtable-Field-Namen.
 * Einige Skripte könnten Airtable-Field-Namen leicht abweichend nutzen
 * (Marcel hat keine zentrale Schema-Doku) — wir versuchen mehrere
 * Aliasse und nehmen den ersten Treffer.
 */
function pick(record, ...keys) {
    for (const k of keys) {
        const v = record.fields?.[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

const TIER_ENUM = {
    'Solo': 'solo',
    'solo': 'solo',
    'Team': 'team',
    'team': 'team',
    'Founding-Member': 'solo'  // Founding ist ein Coupon, nicht ein Tier
};

const STATUS_ENUM = {
    'aktiv': 'aktiv',
    'Aktiv': 'aktiv',
    'trial': 'trial',
    'Trial': 'trial',
    'pausiert': 'pausiert',
    'gekuendigt': 'gekuendigt',
    'Gekündigt': 'gekuendigt',
    'überfällig': 'ueberfaellig',
    'ueberfaellig': 'ueberfaellig'
};

function buildBriefkopf(record) {
    return {
        kanzlei_name:  pick(record, 'kanzlei_name', 'firma', 'Firma', 'Kanzlei'),
        anschrift:     pick(record, 'anschrift', 'Anschrift', 'strasse', 'Strasse'),
        plz:           pick(record, 'plz', 'PLZ'),
        ort:           pick(record, 'ort', 'Ort'),
        telefon:       pick(record, 'telefon', 'Telefon'),
        fax:           pick(record, 'fax', 'Fax'),
        email:         pick(record, 'sv_email', 'email', 'Email', 'E-Mail'),
        website:       pick(record, 'website', 'Website'),
        ust_id:        pick(record, 'ust_id', 'USt-ID', 'umsatzsteuer_id'),
        steuernr:      pick(record, 'steuernr', 'steuernummer', 'Steuernummer'),
        ihk_kammer:    pick(record, 'ihk_kammer', 'bestellungsstelle', 'IHK'),
        sachgebiet:    pick(record, 'sachgebiet', 'Sachgebiet')
    };
}

function mapWorkspace(record, log) {
    const sv_email = pick(record, 'sv_email', 'email', 'Email', 'E-Mail');
    if (!sv_email) {
        log.warn(`record ${record.id}: keine Email — skip`);
        return null;
    }

    const tierRaw = pick(record, 'tier', 'Tier', 'abo_tier', 'paket', 'Paket');
    const statusRaw = pick(record, 'abo_status', 'status', 'Status');
    const trialEndet = pick(record, 'trial_endet_am', 'abo_trial_endet_am', 'trial_endet');
    const aktivSeit = pick(record, 'abo_aktiv_seit', 'aktiv_seit', 'bestellungsdatum');
    const stripeCustomer = pick(record, 'stripe_customer_id', 'stripe_id');
    const name =
        pick(record, 'workspace_name', 'kanzlei_name', 'firma', 'Firma') ||
        pick(record, 'name', 'Name') ||
        sv_email;

    return {
        id: generateUuidFromAirtableId(record.id, TABLE_HINT_WORKSPACE),
        typ: transformEnum(tierRaw, TIER_ENUM, 'solo'),
        name,
        briefkopf: buildBriefkopf(record),
        abo_tier: transformEnum(tierRaw, TIER_ENUM, 'solo'),
        abo_status: transformEnum(statusRaw, STATUS_ENUM, 'aktiv'),
        abo_trial_endet_am: transformDate(trialEndet),
        abo_aktiv_seit: transformDate(aktivSeit) || transformDate(record.createdTime),
        stripe_customer_id: stripeCustomer || null,
        // Audit-Marker für Rollback
        _migration_source: 'airtable',
        _migration_external_id: record.id
        // _migration_* Felder gibt's nicht im Schema — werden via Trigger ggf. ignoriert
        // (kein Schreib-Risiko: PostgREST throws nur bei NOT NULL Violation).
        // Diese Felder werden NICHT geschrieben falls Schema sie nicht kennt.
    };
}

function stripUnknownColumns(workspace) {
    // Schema-Realität: nur diese Spalten dürfen rein
    const allowed = [
        'id', 'typ', 'name', 'slug', 'briefkopf', 'abo_tier', 'abo_status',
        'abo_trial_endet_am', 'abo_aktiv_seit', 'abo_gekuendigt_am',
        'stripe_customer_id', 'stripe_subscription_id', 'datev_settings',
        'preferred_ki_provider', 'ki_pseudonymisierung_aktiv',
        'created_at', 'updated_at', 'deleted_at'
    ];
    const out = {};
    for (const k of allowed) {
        if (workspace[k] !== undefined) out[k] = workspace[k];
    }
    return out;
}

function buildMembership({ workspaceId, userId, sv_email }) {
    return {
        id: generateUuidFromAirtableId(`membership:${userId}:${workspaceId}`, TABLE_HINT_MEMBERSHIP),
        workspace_id: workspaceId,
        user_id: userId,
        rolle: 'owner',
        can_invite_members: true,
        can_manage_billing: true,
        can_export_data: true,
        can_delete_records: true,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        is_active: true
    };
}

await runMigration({
    name: '01-sachverstaendige',
    async run(ctx) {
        ctx.log.info(`fetching SACHVERSTAENDIGE from base ${BASE_ID} table ${TABLE_ID}`);

        const records = await readAllRecords(BASE_ID, TABLE_ID, {
            maxRecords: ctx.limit
        });
        ctx.log.info(`fetched ${records.length} record(s)`);

        const workspaces = [];
        const memberships = [];

        for (const rec of records) {
            const wsRaw = mapWorkspace(rec, ctx.log);
            if (!wsRaw) {
                ctx.counts.skip += 1;
                ctx.errors.push({ rec_id: rec.id, reason: 'no_email' });
                continue;
            }

            const sv_email = wsRaw.briefkopf?.email;
            const workspace = stripUnknownColumns(wsRaw);

            // Validate
            const v = validateRecord(workspace, {
                required: ['id', 'name', 'typ', 'abo_tier', 'abo_status'],
                types: { id: 'uuid', name: 'string' }
            });
            if (!v.valid) {
                ctx.counts.error += 1;
                ctx.errors.push({ rec_id: rec.id, reason: 'validation', errors: v.errors });
                ctx.log.error(`record ${rec.id}: ${v.errors.join('; ')}`);
                continue;
            }

            // User-Lookup (NUR im Live-Mode oder wenn ENV vorhanden)
            let userId = null;
            const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (haveCreds) {
                try {
                    userId = await getUserIdByEmail(sv_email);
                } catch (e) {
                    ctx.log.warn(`user-lookup ${sv_email} fail: ${e.message}`);
                }
            } else {
                ctx.log.warn(`SUPABASE_SERVICE_ROLE_KEY fehlt — User-Lookup uebersprungen`);
            }

            if (haveCreds && !userId) {
                ctx.counts.skip += 1;
                ctx.errors.push({
                    rec_id: rec.id,
                    sv_email,
                    reason: 'user_not_in_supabase_auth',
                    hint: 'Marcel muss SV erst in Supabase Auth anlegen, dann re-run'
                });
                ctx.log.warn(`SV "${sv_email}" nicht in public.users — skip`);
                continue;
            }

            workspaces.push(workspace);

            if (userId) {
                memberships.push(buildMembership({
                    workspaceId: workspace.id,
                    userId,
                    sv_email
                }));
            }

            ctx.samples.push({ workspace, sv_email, userId });
            ctx.counts.ok += 1;
        }

        ctx.log.info(`mapped: workspaces=${workspaces.length} memberships=${memberships.length}`);

        // Schreiben (oder Dry-Run)
        if (workspaces.length) {
            ctx.log.info(`upsert workspaces…`);
            const { ok, errors } = await batchUpsert('workspaces', workspaces, 'id', {
                dryRun: ctx.dryRun,
                onBatch: ({ batchNumber, count, total, dryRun }) =>
                    ctx.log.debug(`  batch ${batchNumber}: ${count}/${total} ${dryRun ? '(dry)' : ''}`)
            });
            ctx.log.info(`workspaces: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }

        if (memberships.length) {
            ctx.log.info(`upsert workspace_memberships…`);
            const { ok, errors } = await batchUpsert('workspace_memberships', memberships, 'id', {
                dryRun: ctx.dryRun
            });
            ctx.log.info(`memberships: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }

        // Validation: Counts in Supabase nach Live-Run
        if (!ctx.dryRun && !ctx.skipValidation) {
            try {
                const ws_count = await countRows('workspaces');
                ctx.log.info(`Supabase workspaces total: ${ws_count}`);
            } catch (e) {
                ctx.log.warn(`count-validation fail: ${e.message}`);
            }
        }
    }
});
