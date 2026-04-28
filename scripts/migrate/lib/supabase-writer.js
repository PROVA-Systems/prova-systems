/* ============================================================
   PROVA Migrations-Pipeline — Supabase-Writer (ESM)
   Sprint K-1.1.A3

   Supabase-Connector mit Service-Role-Key (RLS bypass für Migration).

   ⚠️  SECURITY: Dieses Modul ist NUR für Server-Side Skripte!
       Service-Role-Key niemals ins Frontend.

   API:
     getClient()                                    — Singleton mit Service-Role
     batchInsert(table, records, opts)              — 100er-Batches
     batchUpsert(table, records, conflictCol, opts) — Idempotenz via UNIQUE-Constraint
     countRows(table, filter)                       — Validation
     existsByExternalId(table, externalIdCol, id)   — Pre-Insert-Check
     dryRunCheck(table, sampleRecord)               — Schema-Probe ohne Insert
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 100;

let _client = null;

function getServiceClient() {
    if (_client) return _client;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error('SUPABASE_URL fehlt in .env.local');
    }
    if (!key) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local. '
            + 'Holen: Supabase-Dashboard → Project Settings → API → service_role (Reveal). '
            + 'NIE ins Frontend committen!'
        );
    }

    _client = createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        },
        db: { schema: 'public' },
        global: {
            headers: { 'X-Client-Info': 'prova-migrate/1.0' }
        }
    });
    return _client;
}

export const getClient = getServiceClient;

/**
 * Insert in 100er-Batches. Stops bei erstem Fehler.
 *
 * @param {string} table
 * @param {Array<Object>} records
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false] — nur loggen, nichts schreiben
 * @param {Function} [opts.onBatch] — callback({batchNumber, count, total})
 * @returns {Promise<{ok: number, errors: Array}>}
 */
export async function batchInsert(table, records, opts = {}) {
    if (!Array.isArray(records) || records.length === 0) {
        return { ok: 0, errors: [] };
    }

    const client = getServiceClient();
    let ok = 0;
    const errors = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        if (opts.dryRun) {
            ok += batch.length;
            if (typeof opts.onBatch === 'function') {
                opts.onBatch({ batchNumber, count: batch.length, total: records.length, dryRun: true });
            }
            continue;
        }

        const { error, data } = await client.from(table).insert(batch).select('id');

        if (error) {
            errors.push({ batchNumber, error: error.message, sample: batch[0] });
            console.error(`[supabase-writer] batchInsert ${table} batch ${batchNumber} FAIL:`, error.message);
            // Bei Migration: stoppen statt nächsten Batch versuchen
            break;
        } else {
            ok += data?.length || batch.length;
            if (typeof opts.onBatch === 'function') {
                opts.onBatch({ batchNumber, count: data?.length || batch.length, total: records.length });
            }
        }
    }

    return { ok, errors };
}

/**
 * Upsert mit ON CONFLICT für Idempotenz. Default-Conflict-Spalte: 'id'.
 *
 * @param {string} table
 * @param {Array<Object>} records
 * @param {string} conflictColumn  — z.B. 'id' (deterministische UUIDv5)
 * @param {Object} [opts]
 */
export async function batchUpsert(table, records, conflictColumn = 'id', opts = {}) {
    if (!Array.isArray(records) || records.length === 0) {
        return { ok: 0, errors: [] };
    }

    const client = getServiceClient();
    let ok = 0;
    const errors = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        if (opts.dryRun) {
            ok += batch.length;
            if (typeof opts.onBatch === 'function') {
                opts.onBatch({ batchNumber, count: batch.length, total: records.length, dryRun: true });
            }
            continue;
        }

        const { error, data } = await client
            .from(table)
            .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false })
            .select('id');

        if (error) {
            errors.push({ batchNumber, error: error.message, sample: batch[0] });
            console.error(`[supabase-writer] batchUpsert ${table} batch ${batchNumber} FAIL:`, error.message);
            break;
        } else {
            ok += data?.length || batch.length;
            if (typeof opts.onBatch === 'function') {
                opts.onBatch({ batchNumber, count: data?.length || batch.length, total: records.length });
            }
        }
    }

    return { ok, errors };
}

/**
 * Count-Helper für validate.js.
 *
 * @param {string} table
 * @param {Object} [filter] — { col: value } Equals-Filter
 */
export async function countRows(table, filter = {}) {
    const client = getServiceClient();
    let q = client.from(table).select('*', { count: 'exact', head: true });
    for (const [col, val] of Object.entries(filter)) {
        if (val === null) {
            q = q.is(col, null);
        } else {
            q = q.eq(col, val);
        }
    }
    const { count, error } = await q;
    if (error) throw error;
    return count;
}

/**
 * Prüft ob ein Record mit gegebenem externen ID-Feld bereits existiert.
 * Nützlich für Pre-Insert-Idempotenz wenn keine UNIQUE-Constraint vorhanden.
 */
export async function existsByExternalId(table, externalIdCol, externalId) {
    const client = getServiceClient();
    const { data, error } = await client
        .from(table)
        .select('id')
        .eq(externalIdCol, externalId)
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data !== null;
}

/**
 * Liefert Workspace-ID für einen SV (per owner_email lookup).
 * Wird von Folge-Skripten genutzt (kontakte, schadensfaelle etc.).
 */
export async function getWorkspaceIdByEmail(email) {
    const client = getServiceClient();
    const { data, error } = await client
        .from('workspaces')
        .select('id')
        .eq('owner_email', email)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data?.id || null;
}

/**
 * Dry-Run-Probe: schickt einen einzelnen Record mit `dryRun: true` durch
 * und parsed die Postgres-Error-Message für Schema-Mismatches.
 */
export async function dryRunCheck(table, sampleRecord) {
    const client = getServiceClient();
    // Wir versuchen ein Insert mit ROLLBACK via Transaction-Hint —
    // Supabase hat kein direktes Trial-Insert, also nutzen wir einen
    // bewusst falschen WHERE-Filter um ON CONFLICT zu triggern.
    // Pragmatisch: wir validieren nur die Spalten-Existenz.
    const cols = Object.keys(sampleRecord);
    const { data, error } = await client.from(table).select(cols.join(',')).limit(0);
    if (error) {
        return { ok: false, error: error.message };
    }
    return { ok: true, columns: cols };
}

/**
 * Health-Check.
 */
export async function ping() {
    const client = getServiceClient();
    const { error } = await client.from('workspaces').select('id', { head: true, count: 'exact' });
    return { ok: !error, error: error?.message };
}
