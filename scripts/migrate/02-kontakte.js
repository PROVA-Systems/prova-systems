#!/usr/bin/env node
/* ============================================================
   PROVA Migration 02 — KONTAKTE → kontakte
   Sprint K-1.1.A6

   Schema-Realitaet (02_schema_kerngeschaeft.sql):
     kontakte.typ              kontakt_typ ENUM (privat|firma|anwalt|...)
     kontakte.adresse_strasse  TEXT (nicht "strasse"!)
     kontakte.adresse_nr       TEXT
     kontakte.adresse_zusatz   TEXT
     kontakte.plz              TEXT
     kontakte.ort              TEXT
     kontakte.land             TEXT default 'DE'
     kontakte.name             via DB-Trigger berechnet aus anrede+titel+
                               vorname+nachname ODER firma — WIR setzen
                               einen Fallback, Trigger ueberschreibt.
   ============================================================ */

import './lib/env.js';
import { readAllRecords } from './lib/airtable-reader.js';
import { batchUpsert, getOwnerWorkspaceIdForEmail } from './lib/supabase-writer.js';
import {
    generateUuidFromAirtableId,
    transformDate,
    transformEnum,
    parseAddress,
    validateRecord,
    WorkspaceCache
} from './lib/transform.js';
import { runMigration } from './lib/runner.js';

const BASE_ID = 'appJ7bLlAHZoxENWE';
const TABLE = 'KONTAKTE';
const HINT = 'kontakte';

const KONTAKT_TYP = {
    'privat': 'privat',
    'Privat': 'privat',
    'Privatperson': 'privat',
    'firma': 'firma',
    'Firma': 'firma',
    'Unternehmen': 'firma',
    'anwalt': 'anwalt',
    'Anwalt': 'anwalt',
    'Anwaltskanzlei': 'anwalt',
    'Rechtsanwalt': 'anwalt',
    'versicherung': 'versicherung',
    'Versicherung': 'versicherung',
    'gericht': 'gericht',
    'Gericht': 'gericht',
    'behoerde': 'behoerde',
    'Behörde': 'behoerde',
    'sv_kollege': 'sv_kollege',
    'SV-Kollege': 'sv_kollege',
    'handwerker': 'handwerker',
    'Handwerker': 'handwerker'
};

function pick(record, ...keys) {
    for (const k of keys) {
        const v = record.fields?.[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

function buildName(rec) {
    const firma = pick(rec, 'firma', 'Firma');
    const vorname = pick(rec, 'vorname', 'Vorname');
    const nachname = pick(rec, 'nachname', 'Nachname');
    const namePure = pick(rec, 'name', 'Name');

    if (namePure) return namePure;
    if (firma) return firma;
    if (vorname || nachname) return [vorname, nachname].filter(Boolean).join(' ').trim();
    return '(unbenannt)';
}

function mapKontakt(rec, workspaceId) {
    const adresse = pick(rec, 'adresse', 'Adresse', 'address');
    const parsedAddr = adresse ? parseAddress(adresse) : { strasse: null, plz: null, ort: null };

    return {
        id: generateUuidFromAirtableId(rec.id, HINT),
        workspace_id: workspaceId,
        typ: transformEnum(pick(rec, 'typ', 'Typ', 'kontakt_typ'), KONTAKT_TYP, 'privat'),
        anrede:    pick(rec, 'anrede', 'Anrede'),
        titel:     pick(rec, 'titel', 'Titel'),
        vorname:   pick(rec, 'vorname', 'Vorname'),
        nachname:  pick(rec, 'nachname', 'Nachname'),
        firma:     pick(rec, 'firma', 'Firma'),
        abteilung: pick(rec, 'abteilung', 'Abteilung'),
        name:      buildName(rec),

        adresse_strasse: pick(rec, 'strasse', 'Strasse', 'adresse_strasse')
                         || parsedAddr.strasse,
        adresse_nr:      pick(rec, 'hausnummer', 'Hausnummer', 'adresse_nr'),
        adresse_zusatz:  pick(rec, 'adresse_zusatz', 'zusatz'),
        plz:             pick(rec, 'plz', 'PLZ') || parsedAddr.plz,
        ort:             pick(rec, 'ort', 'Ort')  || parsedAddr.ort,
        land:            pick(rec, 'land', 'Land') || 'DE',

        email:    pick(rec, 'email', 'Email', 'E-Mail'),
        email_2:  pick(rec, 'email_2', 'Email 2'),
        telefon:  pick(rec, 'telefon', 'Telefon'),
        mobil:    pick(rec, 'mobil', 'Mobil', 'Handy'),
        fax:      pick(rec, 'fax', 'Fax'),
        website:  pick(rec, 'website', 'Website'),

        ust_id:        pick(rec, 'ust_id', 'USt-ID'),
        steuernummer:  pick(rec, 'steuernummer', 'Steuernummer'),
        iban:          pick(rec, 'iban', 'IBAN'),
        bic:           pick(rec, 'bic', 'BIC'),

        kanzlei:           pick(rec, 'kanzlei', 'Kanzlei'),
        versicherungs_nr:  pick(rec, 'versicherungs_nr', 'Versicherungsnummer'),
        schaden_nr:        pick(rec, 'schaden_nr', 'Schadennummer'),
        behoerden_az:      pick(rec, 'behoerden_az', 'Aktenzeichen Behörde'),

        notizen: pick(rec, 'notizen', 'Notizen'),
        tags:    Array.isArray(rec.fields?.tags) ? rec.fields.tags : []
    };
}

await runMigration({
    name: '02-kontakte',
    async run(ctx) {
        const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!haveCreds && !ctx.dryRun) {
            throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY fehlt — kein Live-Run möglich');
        }

        ctx.log.info(`fetching ${TABLE} from base ${BASE_ID}`);
        const records = await readAllRecords(BASE_ID, TABLE, { maxRecords: ctx.limit });
        ctx.log.info(`fetched ${records.length} record(s)`);

        const wsCache = new WorkspaceCache();
        const out = [];

        for (const rec of records) {
            const sv_email = pick(rec, 'sv_email', 'sv', 'sachverstaendiger_email');
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

            const k = mapKontakt(rec, wsId);
            const v = validateRecord(k, {
                required: ['id', 'workspace_id', 'typ', 'name'],
                types: { id: 'uuid', workspace_id: 'uuid', name: 'string' }
            });
            if (!v.valid) {
                ctx.counts.error += 1;
                ctx.errors.push({ rec_id: rec.id, reason: 'validation', errors: v.errors });
                continue;
            }

            out.push(k);
            ctx.samples.push(k);
            ctx.counts.ok += 1;
        }

        ctx.log.info(`mapped ${out.length} kontakt(e)`);

        if (out.length) {
            const { ok, errors } = await batchUpsert('kontakte', out, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`upserted ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
    }
});
