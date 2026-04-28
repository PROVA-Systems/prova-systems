#!/usr/bin/env node
/* ============================================================
   PROVA Migration 03 — SCHADENSFAELLE → auftraege (+ auftrag_kontakte)
   Sprint K-1.1.A7

   Schema-Realitaet:
     auftraege.az              (NICHT 'aktenzeichen'!) — UNIQUE pro workspace
     auftraege.typ             auftrag_typ ENUM, 1:1 ohne Suffix
                               (schaden|beweis|ergaenzung|gegen|
                                kurzstellungnahme|wertgutachten|beratung|
                                baubegleitung|schied|gericht)
     auftraege.status          auftrag_status ENUM
                               (entwurf|aktiv|abgeschlossen|archiv|storniert)
     auftraege.zweck           auftrag_zweck ENUM
                               (privat|gericht|versicherung|kauf|sanierung|sonstiges)
     auftrag_kontakte          M:N — Auftraggeber-Link wird HIER mitgeschrieben
                               (Mega-Prompt sagt 'auftraege.kontakt_id', aber
                                Schema hat keine direkte FK)
   ============================================================ */

import './lib/env.js';
import { readAllRecords } from './lib/airtable-reader.js';
import { batchUpsert, getOwnerWorkspaceIdForEmail } from './lib/supabase-writer.js';
import {
    generateUuidFromAirtableId,
    transformDate,
    transformEnum,
    transformLink,
    parseJsonString,
    validateRecord,
    WorkspaceCache
} from './lib/transform.js';
import { runMigration } from './lib/runner.js';

const BASE_ID = 'appJ7bLlAHZoxENWE';
const TABLE = 'SCHADENSFAELLE';  // tblSxV8bsXwd1pwa0
const HINT_AUFTRAG = 'auftraege';
const HINT_KONTAKT = 'kontakte';
const HINT_LINK = 'auftrag_kontakte';

const AUFTRAG_TYP = {
    'schaden': 'schaden',
    'Schaden': 'schaden',
    'Schadensgutachten': 'schaden',
    'beweis': 'beweis',
    'Beweis': 'beweis',
    'Beweissicherung': 'beweis',
    'ergaenzung': 'ergaenzung',
    'Ergänzung': 'ergaenzung',
    'Ergänzungsgutachten': 'ergaenzung',
    'gegen': 'gegen',
    'Gegen': 'gegen',
    'Gegengutachten': 'gegen',
    'kurzstellungnahme': 'kurzstellungnahme',
    'Kurzstellungnahme': 'kurzstellungnahme',
    'wertgutachten': 'wertgutachten',
    'Wertgutachten': 'wertgutachten',
    'beratung': 'beratung',
    'Beratung': 'beratung',
    'baubegleitung': 'baubegleitung',
    'Baubegleitung': 'baubegleitung',
    'schied': 'schied',
    'Schiedsgutachten': 'schied',
    'gericht': 'gericht',
    'Gericht': 'gericht',
    'Gerichtsgutachten': 'gericht'
};

const AUFTRAG_STATUS = {
    'entwurf': 'entwurf', 'Entwurf': 'entwurf',
    'aktiv': 'aktiv', 'Aktiv': 'aktiv', 'in_bearbeitung': 'aktiv', 'in Bearbeitung': 'aktiv',
    'abgeschlossen': 'abgeschlossen', 'Abgeschlossen': 'abgeschlossen', 'fertig': 'abgeschlossen',
    'archiv': 'archiv', 'Archiv': 'archiv', 'archiviert': 'archiv',
    'storniert': 'storniert', 'Storniert': 'storniert'
};

const AUFTRAG_ZWECK = {
    'privat': 'privat', 'Privat': 'privat',
    'gericht': 'gericht', 'Gericht': 'gericht',
    'versicherung': 'versicherung', 'Versicherung': 'versicherung',
    'kauf': 'kauf', 'Kauf': 'kauf',
    'sanierung': 'sanierung', 'Sanierung': 'sanierung',
    'sonstiges': 'sonstiges', 'Sonstiges': 'sonstiges'
};

function pick(rec, ...keys) {
    for (const k of keys) {
        const v = rec.fields?.[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

function buildObjekt(rec) {
    return {
        adresse:         pick(rec, 'objekt_adresse', 'objekt_strasse', 'schadensort_adresse'),
        plz:             pick(rec, 'objekt_plz', 'schadensort_plz'),
        ort:             pick(rec, 'objekt_ort', 'schadensort_ort'),
        land:            pick(rec, 'objekt_land') || 'DE',
        objektart:       pick(rec, 'objektart', 'Objektart'),
        objektart_label: pick(rec, 'objektart_label'),
        baujahr:         pick(rec, 'baujahr', 'Baujahr'),
        wohnflaeche:     pick(rec, 'wohnflaeche', 'Wohnfläche'),
        bauweise:        pick(rec, 'bauweise', 'Bauweise'),
        schadensort:     pick(rec, 'schadensort', 'Schadensort'),
        beschreibung:    pick(rec, 'objekt_beschreibung'),
        geo_lat:         pick(rec, 'geo_lat'),
        geo_lng:         pick(rec, 'geo_lng')
    };
}

function buildDetails(rec, typ) {
    // Typ-spezifische Details aus Airtable in JSONB
    const out = {};
    if (typ === 'schaden') {
        out.schadensbild = pick(rec, 'schadensbild', 'Schadensbild');
        out.schadensumfang = pick(rec, 'schadensumfang');
        out.vorgeschichte = pick(rec, 'vorgeschichte');
    } else if (typ === 'wertgutachten') {
        out.verfahren = pick(rec, 'verfahren', 'wert_verfahren');
        out.bewertungsstichtag = transformDate(pick(rec, 'bewertungsstichtag'));
        out.verkehrswert = pick(rec, 'verkehrswert');
    } else if (typ === 'beratung') {
        out.beratungstyp = pick(rec, 'beratungstyp');
        out.dauer_minuten = pick(rec, 'dauer_minuten');
    } else if (typ === 'gericht') {
        out.gericht_name = pick(rec, 'gericht_name');
        out.gericht_az = pick(rec, 'gericht_az', 'gericht_aktenzeichen');
        out.beweisbeschluss_datum = transformDate(pick(rec, 'beweisbeschluss_datum'));
        out.beweisbeschluss_text = pick(rec, 'beweisbeschluss_text');
    }
    // null-Werte rausfiltern
    return Object.fromEntries(Object.entries(out).filter(([_, v]) => v !== null && v !== undefined));
}

function mapAuftrag(rec, workspaceId) {
    const typ = transformEnum(pick(rec, 'typ', 'Typ', 'auftrag_typ'), AUFTRAG_TYP, 'schaden');
    const az = pick(rec, 'az', 'AZ', 'aktenzeichen', 'Aktenzeichen');

    return {
        id: generateUuidFromAirtableId(rec.id, HINT_AUFTRAG),
        workspace_id: workspaceId,
        typ,
        az: az || `MIGR-${rec.id.slice(-8)}`,  // Fallback bei fehlender AZ (Trigger könnte regenerieren)
        status: transformEnum(pick(rec, 'status', 'Status'), AUFTRAG_STATUS, 'aktiv'),
        zweck: transformEnum(pick(rec, 'zweck', 'Zweck'), AUFTRAG_ZWECK, 'privat'),
        phase_aktuell: pick(rec, 'phase_aktuell', 'phase') || 1,
        phase_max: pick(rec, 'phase_max') || (typ === 'schaden' ? 9 : 3),

        titel: pick(rec, 'titel', 'Titel', 'kurzbezeichnung'),
        schadensart_label: pick(rec, 'schadensart_label', 'schadensart'),
        schadensart_kategorie: pick(rec, 'schadensart_kategorie'),
        fragestellung: pick(rec, 'fragestellung', 'Fragestellung'),

        schadensstichtag: transformDate(pick(rec, 'schadensstichtag', 'Schadensdatum')),
        auftragsdatum: transformDate(pick(rec, 'auftragsdatum', 'Auftragsdatum')),
        gutachtendatum: transformDate(pick(rec, 'gutachtendatum')),
        abgeschlossen_am: transformDate(pick(rec, 'abgeschlossen_am')),

        objekt: buildObjekt(rec),
        details: buildDetails(rec, typ),

        kosten_geschaetzt_netto: pick(rec, 'kosten_geschaetzt_netto'),
        kosten_geschaetzt_brutto: pick(rec, 'kosten_geschaetzt_brutto'),

        parent_auftrag_id: transformLink(pick(rec, 'parent_auftrag_id', 'parent'), HINT_AUFTRAG),

        umfang_seiten: pick(rec, 'umfang_seiten'),
        umfang_anlagen: pick(rec, 'umfang_anlagen') || 0,
        umfang_fotos: pick(rec, 'umfang_fotos') || 0,

        tags: Array.isArray(rec.fields?.tags) ? rec.fields.tags : []
    };
}

function buildAuftragKontakt({ auftragId, kontaktId, rolle, primaer = true }) {
    return {
        id: generateUuidFromAirtableId(`link:${auftragId}:${kontaktId}:${rolle}`, HINT_LINK),
        auftrag_id: auftragId,
        kontakt_id: kontaktId,
        rolle,
        ist_primaer: primaer,
        reihenfolge: 0
    };
}

await runMigration({
    name: '03-schadensfaelle',
    async run(ctx) {
        const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!haveCreds && !ctx.dryRun) {
            throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY fehlt');
        }

        ctx.log.info(`fetching ${TABLE}`);
        const records = await readAllRecords(BASE_ID, TABLE, { maxRecords: ctx.limit });
        ctx.log.info(`fetched ${records.length} record(s)`);

        const wsCache = new WorkspaceCache();
        const auftraege = [];
        const links = [];

        for (const rec of records) {
            const sv_email = pick(rec, 'sv_email', 'sachverstaendiger_email');
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

            const a = mapAuftrag(rec, wsId);
            const v = validateRecord(a, {
                required: ['id', 'workspace_id', 'typ', 'az', 'status', 'zweck'],
                types: { id: 'uuid', workspace_id: 'uuid', az: 'string' }
            });
            if (!v.valid) {
                ctx.counts.error += 1;
                ctx.errors.push({ rec_id: rec.id, reason: 'validation', errors: v.errors });
                continue;
            }
            auftraege.push(a);

            // Auftraggeber-Link in auftrag_kontakte schreiben
            const auftraggeberId = transformLink(
                pick(rec, 'auftraggeber_id', 'auftraggeber', 'kontakt_id', 'mandant'),
                HINT_KONTAKT
            );
            if (auftraggeberId) {
                links.push(buildAuftragKontakt({
                    auftragId: a.id,
                    kontaktId: auftraggeberId,
                    rolle: 'auftraggeber',
                    primaer: true
                }));
            }

            ctx.samples.push(a);
            ctx.counts.ok += 1;
        }

        ctx.log.info(`mapped: auftraege=${auftraege.length} links=${links.length}`);

        if (auftraege.length) {
            const { ok, errors } = await batchUpsert('auftraege', auftraege, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`auftraege: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
        if (links.length) {
            const { ok, errors } = await batchUpsert('auftrag_kontakte', links, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`auftrag_kontakte: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
    }
});
