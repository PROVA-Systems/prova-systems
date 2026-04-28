#!/usr/bin/env node
/* ============================================================
   PROVA Migrations-Pipeline — Validate (Counts-Vergleich)
   Sprint K-1.1.A13

   Vergleicht Airtable-Counts mit Supabase-Counts pro Tabelle.

   CLI:
     node validate.js                 # Standard-Counts-Tabelle
     node validate.js --diff-detail   # zeigt fehlende Records mit airtable-id

   Mapping:
     SACHVERSTAENDIGE -> workspaces (1:1)
     KONTAKTE         -> kontakte
     SCHADENSFAELLE   -> auftraege
     EINTRAEGE        -> eintraege
     RECHNUNGEN       -> dokumente WHERE typ matches rechnung*|mahnung_*|gutschrift_*
     AUDIT_TRAIL      -> audit_trail
     KI_STATISTIK     -> ki_protokoll
   ============================================================ */

import './lib/env.js';
import { readAllRecords } from './lib/airtable-reader.js';
import { getClient, countRows } from './lib/supabase-writer.js';
import { generateUuidFromAirtableId } from './lib/transform.js';

const BASE_ID = 'appJ7bLlAHZoxENWE';

const MAPPING = [
    { airtable: 'SACHVERSTAENDIGE',  supabase: 'workspaces',     hint: 'workspaces',     filter: null },
    { airtable: 'KONTAKTE',          supabase: 'kontakte',       hint: 'kontakte',       filter: { 'deleted_at': null } },
    { airtable: 'SCHADENSFAELLE',    supabase: 'auftraege',      hint: 'auftraege',      filter: { 'deleted_at': null } },
    { airtable: 'EINTRAEGE',         supabase: 'eintraege',      hint: 'eintraege',      filter: null },
    { airtable: 'RECHNUNGEN',        supabase: 'dokumente',      hint: 'dokumente',
      filter: null, supabaseFilterFn: filterRechnungenInDokumente },
    { airtable: 'AUDIT_TRAIL',       supabase: 'audit_trail',    hint: 'audit_trail',    filter: null },
    { airtable: 'KI_STATISTIK',      supabase: 'ki_protokoll',   hint: 'ki_protokoll',   filter: null }
];

const RECHNUNGS_TYPEN = [
    'rechnung', 'rechnung_jveg', 'rechnung_stunden',
    'gutschrift_storno', 'mahnung_1', 'mahnung_2'
];

async function filterRechnungenInDokumente() {
    const client = getClient();
    const { count, error } = await client
        .from('dokumente')
        .select('*', { count: 'exact', head: true })
        .in('typ', RECHNUNGS_TYPEN)
        .is('deleted_at', null);
    if (error) throw error;
    return count;
}

function pad(s, n) { return String(s).padEnd(n); }
function rpad(s, n) { return String(s).padStart(n); }

async function main() {
    const args = process.argv.slice(2);
    const detail = args.includes('--diff-detail');
    const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
    const haveAirtable = !!process.env.AIRTABLE_PAT;

    if (!haveAirtable) {
        console.error('AIRTABLE_PAT fehlt in .env.local');
        process.exit(1);
    }
    if (!haveCreds) {
        console.error('SUPABASE_URL/SERVICE_ROLE_KEY fehlt in .env.local');
        process.exit(1);
    }

    console.log('PROVA Migration-Validation\n');
    console.log(pad('Tabelle', 22) + rpad('Airtable', 10) + rpad('Supabase', 10) + rpad('Diff', 10) + '  Status');
    console.log('─'.repeat(60));

    const results = [];

    for (const m of MAPPING) {
        let airtableCount = 0;
        let supabaseCount = 0;
        let error = null;
        const missing = [];

        try {
            const records = await readAllRecords(BASE_ID, m.airtable);
            airtableCount = records.length;

            if (m.supabaseFilterFn) {
                supabaseCount = await m.supabaseFilterFn();
            } else if (m.filter) {
                supabaseCount = await countRows(m.supabase, m.filter);
            } else {
                supabaseCount = await countRows(m.supabase);
            }

            // Diff-Detail: prüfe pro Airtable-Record ob Supabase-Pendant existiert
            if (detail && airtableCount !== supabaseCount) {
                const client = getClient();
                for (const rec of records) {
                    const expectedId = generateUuidFromAirtableId(rec.id, m.hint);
                    const { data, error: e } = await client
                        .from(m.supabase)
                        .select('id')
                        .eq('id', expectedId)
                        .maybeSingle();
                    if (!e && !data) {
                        missing.push(rec.id);
                    }
                    if (missing.length >= 20) break;  // Cap output
                }
            }
        } catch (e) {
            error = e.message;
        }

        const diff = supabaseCount - airtableCount;
        const status = error ? '❌ ' + error.slice(0, 30) :
                       diff === 0 ? '✅' :
                       diff > 0 ? '⚠️ +' + diff :
                       '⚠️ ' + diff;

        console.log(
            pad(m.airtable, 22) +
            rpad(airtableCount, 10) +
            rpad(supabaseCount, 10) +
            rpad(diff, 10) + '  ' + status
        );

        if (missing.length) {
            console.log('  fehlend (max 20): ' + missing.slice(0, 20).join(', '));
        }

        results.push({ ...m, airtableCount, supabaseCount, diff, error, missing });
    }

    console.log('─'.repeat(60));
    const greens = results.filter(r => !r.error && r.diff === 0).length;
    const warns  = results.filter(r => !r.error && r.diff !== 0).length;
    const errs   = results.filter(r => r.error).length;
    console.log(`Gesamt: ${greens}/${results.length} grün, ${warns} Warnung(en), ${errs} Fehler`);

    if (warns || errs) {
        console.log('\nNächste Schritte:');
        if (warns) console.log('  - Diff-Detail anzeigen: node validate.js --diff-detail');
        if (warns) console.log('  - Live-Re-Run einzelner Skripte: node run-all.js --live --only=NN');
        if (errs) console.log('  - .env.local prüfen, Connection-Test');
    }

    process.exit(errs ? 1 : 0);
}

main();
