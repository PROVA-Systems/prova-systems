#!/usr/bin/env node
/* ============================================================
   PROVA Migration 05 — RECHNUNGEN → dokumente + dokument_positionen
   Sprint K-1.1.A9

   Schema-Realitaet:
     dokumente            universal: Gutachten, Rechnungen, Briefe, Mahnungen
     dokumente.typ        dokument_typ ENUM mit Werten:
                          rechnung|rechnung_jveg|rechnung_stunden|gutschrift_storno|
                          mahnung_1|mahnung_2|brief|...
     dokumente.status     dokument_status ENUM (entwurf|in_generation|generiert|
                          versendet|gelesen|bezahlt|ueberfaellig|storniert|archiviert)
     dokument_positionen  N:1 zu dokumente — JSON-Positionen werden gesplittet

   Mega-Prompt #1 sagte 'rechnungen + rechnungs_positionen' — Schema hat
   beides nicht. Universale dokumente-Tabelle ist die Realitaet.
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
const TABLE = 'RECHNUNGEN';
const HINT = 'dokumente';
const HINT_POS = 'dokument_positionen';
const HINT_AUFTRAG = 'auftraege';
const HINT_KONTAKT = 'kontakte';

const RECHNUNG_TYP = {
    'rechnung': 'rechnung', 'Rechnung': 'rechnung', 'pauschal': 'rechnung',
    'rechnung_jveg': 'rechnung_jveg', 'JVEG': 'rechnung_jveg', 'jveg': 'rechnung_jveg',
    'rechnung_stunden': 'rechnung_stunden', 'Stunden': 'rechnung_stunden',
    'gutschrift_storno': 'gutschrift_storno', 'gutschrift': 'gutschrift_storno', 'storno': 'gutschrift_storno',
    'mahnung_1': 'mahnung_1', 'Mahnung 1': 'mahnung_1', 'mahnung1': 'mahnung_1',
    'mahnung_2': 'mahnung_2', 'Mahnung 2': 'mahnung_2'
};

const STATUS = {
    'entwurf': 'entwurf', 'Entwurf': 'entwurf',
    'generiert': 'generiert', 'Generiert': 'generiert',
    'versendet': 'versendet', 'Versendet': 'versendet', 'gesendet': 'versendet',
    'bezahlt': 'bezahlt', 'Bezahlt': 'bezahlt', 'paid': 'bezahlt',
    'ueberfaellig': 'ueberfaellig', 'überfällig': 'ueberfaellig',
    'storniert': 'storniert', 'Storniert': 'storniert',
    'archiviert': 'archiviert', 'Archiviert': 'archiviert'
};

function pick(rec, ...keys) {
    for (const k of keys) {
        const v = rec.fields?.[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

function mapDokument(rec, workspaceId) {
    const typ = transformEnum(pick(rec, 'typ', 'Typ', 'rechnungstyp'), RECHNUNG_TYP, 'rechnung');
    const positionenRaw = pick(rec, 'positionen', 'Positionen');

    return {
        id: generateUuidFromAirtableId(rec.id, HINT),
        workspace_id: workspaceId,
        typ,
        doc_nummer: pick(rec, 'rechnungsnummer', 'Rechnungsnummer', 'doc_nummer', 'nummer'),
        auftrag_id: transformLink(pick(rec, 'auftrag_id', 'auftrag', 'schadensfall_id'), HINT_AUFTRAG),
        kontakt_id: transformLink(pick(rec, 'empfaenger_id', 'kontakt_id', 'rechnungsempfaenger'), HINT_KONTAKT),
        parent_dokument_id: transformLink(pick(rec, 'parent_dokument_id', 'rechnung_parent'), HINT),

        betreff: pick(rec, 'betreff', 'Betreff'),
        inhalt_text: pick(rec, 'inhalt_text', 'inhalt', 'Beschreibung'),
        inhalt_strukturiert: parseJsonString(pick(rec, 'inhalt_strukturiert')) || {},

        status: transformEnum(pick(rec, 'status', 'Status'), STATUS, 'generiert'),
        generated_at: transformDate(pick(rec, 'generated_at', 'erstellt_am')),
        sent_at: transformDate(pick(rec, 'sent_at', 'gesendet_am')),
        sent_to_email: pick(rec, 'sent_to_email', 'empfaenger_email'),

        betrag_netto: pick(rec, 'betrag_netto', 'netto'),
        betrag_brutto: pick(rec, 'betrag_brutto', 'brutto', 'gesamt'),
        mwst_satz: pick(rec, 'mwst_satz', 'mwst') || 19.00,
        waehrung: pick(rec, 'waehrung') || 'EUR',
        rechnungsdatum: transformDate(pick(rec, 'rechnungsdatum', 'datum')),
        leistungszeitraum_von: transformDate(pick(rec, 'leistungszeitraum_von')),
        leistungszeitraum_bis: transformDate(pick(rec, 'leistungszeitraum_bis')),
        faelligkeit: transformDate(pick(rec, 'faelligkeit', 'faelligkeitsdatum')),
        zahlungsfrist_tage: pick(rec, 'zahlungsfrist_tage') || 14,
        bezahlt_at: transformDate(pick(rec, 'bezahlt_at', 'bezahlt_am')),
        bezahlt_betrag: pick(rec, 'bezahlt_betrag'),

        // Mahnungs-Felder (nur wenn typ mahnung_*)
        mahn_stufe: typ.startsWith('mahnung_') ? parseInt(typ.split('_')[1], 10) : null,
        mahn_gebuehr: pick(rec, 'mahn_gebuehr'),

        tags: Array.isArray(rec.fields?.tags) ? rec.fields.tags : [],

        // Positionen werden separat in dokument_positionen geschrieben
        _positionen_raw: positionenRaw  // _-prefix wird in stripUnknown entfernt
    };
}

function mapPositionen(rec, dokumentId) {
    const raw = rec.fields?.positionen || rec.fields?.Positionen;
    let positionen = parseJsonString(raw);
    if (!Array.isArray(positionen)) {
        // Versuche split bei String-CSV
        if (typeof raw === 'string' && raw.length > 0) {
            return [];  // unklare Struktur, skip
        }
        return [];
    }

    return positionen.map((p, i) => ({
        id: generateUuidFromAirtableId(`pos:${rec.id}:${i}`, HINT_POS),
        dokument_id: dokumentId,
        pos_nr: p.pos_nr || i + 1,
        bezeichnung: p.bezeichnung || p.title || `Position ${i + 1}`,
        beschreibung: p.beschreibung || p.description || null,
        menge: p.menge || p.quantity || 1,
        einheit: p.einheit || p.unit || 'Stk',
        ep_netto: p.ep_netto || p.unit_price || 0,
        summe_netto: p.summe_netto || (p.menge * p.ep_netto) || 0,
        mwst_satz: p.mwst_satz ?? 19.00,
        summe_brutto: p.summe_brutto || (p.summe_netto * (1 + (p.mwst_satz || 19) / 100)) || 0,
        jveg_paragraph: p.jveg_paragraph || null,
        jveg_kategorie: p.jveg_kategorie || null
    }));
}

function stripUnknownDoc(d) {
    const allowed = [
        'id', 'workspace_id', 'typ', 'doc_nummer', 'auftrag_id', 'kontakt_id',
        'termin_id', 'parent_dokument_id', 'betreff', 'inhalt_text',
        'inhalt_strukturiert', 'pdfmonkey_template_id', 'pdfmonkey_document_id',
        'pdf_payload', 'storage_bucket', 'storage_path', 'pdf_url',
        'pdf_url_expires_at', 'bytes', 'status', 'generated_at', 'sent_at',
        'sent_via', 'sent_to_email', 'gelesen_at', 'betrag_netto', 'betrag_brutto',
        'mwst_satz', 'waehrung', 'rechnungsdatum', 'leistungszeitraum_von',
        'leistungszeitraum_bis', 'faelligkeit', 'zahlungsfrist_tage', 'bezahlt_at',
        'bezahlt_betrag', 'skonto_satz', 'skonto_frist_tage', 'mahn_stufe',
        'mahn_gebuehr', 'verzug_zinsen', 'datev_konto_soll', 'datev_konto_haben',
        'datev_steuerschluessel', 'datev_kostenstelle', 'datev_belegfeld_1',
        'datev_belegfeld_2', 'datev_buchungstext', 'datev_exported_at',
        'datev_export_id', 'xrechnung_xml_path', 'leitweg_id', 'tags'
    ];
    const out = {};
    for (const k of allowed) if (d[k] !== undefined) out[k] = d[k];
    return out;
}

await runMigration({
    name: '05-rechnungen',
    async run(ctx) {
        const haveCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!haveCreds && !ctx.dryRun) {
            throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY fehlt');
        }

        ctx.log.info(`fetching ${TABLE}`);
        const records = await readAllRecords(BASE_ID, TABLE, { maxRecords: ctx.limit });
        ctx.log.info(`fetched ${records.length} record(s)`);

        const wsCache = new WorkspaceCache();
        const dokumente = [];
        const positionen = [];

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

            const d = mapDokument(rec, wsId);
            const dClean = stripUnknownDoc(d);
            const v = validateRecord(dClean, {
                required: ['id', 'workspace_id', 'typ'],
                types: { id: 'uuid', workspace_id: 'uuid' }
            });
            if (!v.valid) {
                ctx.counts.error += 1;
                ctx.errors.push({ rec_id: rec.id, errors: v.errors });
                continue;
            }
            dokumente.push(dClean);

            const pos = mapPositionen(rec, dClean.id);
            positionen.push(...pos);

            ctx.samples.push({ doc: dClean, positionenCount: pos.length });
            ctx.counts.ok += 1;
        }

        ctx.log.info(`mapped: dokumente=${dokumente.length} positionen=${positionen.length}`);

        if (dokumente.length) {
            const { ok, errors } = await batchUpsert('dokumente', dokumente, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`dokumente: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
        if (positionen.length) {
            const { ok, errors } = await batchUpsert('dokument_positionen', positionen, 'id', { dryRun: ctx.dryRun });
            ctx.log.info(`dokument_positionen: ${ok} OK, ${errors.length} err`);
            if (errors.length) ctx.errors.push(...errors);
        }
    }
});
