/* ============================================================
   PROVA Migrations-Pipeline — Transform-Helpers (ESM)
   Sprint K-1.1.A4

   Generic Field-Mapping + deterministische UUIDv5-Generation für
   Idempotenz (mehrfaches Migrieren erzeugt dieselben Supabase-IDs).

   Helpers:
     mapAirtableRecord(record, fieldMap, options)   — schema-konformes Mapping
     transformDate(value)                            — ISO-String → ISO-String oder null
     transformEnum(value, enumMap)                  — Single-Select → Postgres-ENUM
     transformLink(linkedRecord)                    — Linked-Record-Array → erste ID
     generateUuidFromAirtableId(airtableId)         — deterministisches UUIDv5
     validateRecord(record, schema)                 — Pflichtfelder + Typen
     parseJsonString(value)                         — JSON-String → Object oder null
     parseAddress(value)                            — "Strasse 1, 12345 Ort" → {strasse, plz, ort}
     stripHtml(value)                               — Rich-Text → Plain-Text
   ============================================================ */

import crypto from 'node:crypto';

// ─── UUIDv5 (RFC 4122) ────────────────────────────────────────

/**
 * Fixed Namespace-UUID für PROVA-Migrate.
 * Niemals ändern — sonst erzeugt Re-Run andere UUIDs (kein Idempotenz mehr).
 */
export const PROVA_NAMESPACE = '4f7e9b3a-6b7e-4f1c-8a0d-1e2f3a4b5c6d';

function uuidStringToBytes(uuid) {
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
    const bytes = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

function bytesToUuidString(bytes) {
    const hex = Buffer.from(bytes).toString('hex');
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
    ].join('-');
}

/**
 * UUIDv5 (SHA-1-basiert, deterministisch).
 *
 * @param {string} namespace — UUID-String
 * @param {string} name      — beliebiger String (z.B. 'rec1ABCdef...')
 * @returns {string} UUIDv5 String
 */
export function uuidv5(namespace, name) {
    const nsBytes = uuidStringToBytes(namespace);
    const nameBytes = Buffer.from(String(name), 'utf8');
    const buf = Buffer.concat([nsBytes, nameBytes]);

    const hash = crypto.createHash('sha1').update(buf).digest();
    const out = Buffer.from(hash.subarray(0, 16));

    // Version 5 (top 4 bits of byte 6)
    out[6] = (out[6] & 0x0f) | 0x50;
    // Variant RFC 4122 (top 2 bits of byte 8)
    out[8] = (out[8] & 0x3f) | 0x80;

    return bytesToUuidString(out);
}

/**
 * Convenience: UUIDv5 aus Airtable-Record-ID (rec…) im PROVA-Namespace.
 *
 * @param {string} airtableId  — z.B. 'rec1ABCdef...'
 * @param {string} [tableHint] — optionaler Präfix für Disambiguierung
 *                                falls dieselbe rec-ID in mehreren Tabellen existiert
 *                                (sollte bei Airtable nie passieren, aber safety)
 */
export function generateUuidFromAirtableId(airtableId, tableHint = '') {
    if (!airtableId) throw new Error('generateUuidFromAirtableId: leere airtableId');
    const name = tableHint ? `${tableHint}:${airtableId}` : airtableId;
    return uuidv5(PROVA_NAMESPACE, name);
}

// ─── Field-Mapping ───────────────────────────────────────────

/**
 * Mapped Airtable-Record auf Supabase-Schema-Objekt.
 *
 * @param {Object} record           — { id, fields, createdTime } aus Airtable
 * @param {Object} fieldMap         — { supabaseCol: 'AirtableField' | function(record) }
 * @param {Object} [options]
 * @param {string} [options.idTableHint] — für deterministische UUID
 * @param {boolean} [options.includeId=true] — id automatisch aus airtableId ableiten
 */
export function mapAirtableRecord(record, fieldMap, options = {}) {
    const out = {};

    if (options.includeId !== false) {
        out.id = generateUuidFromAirtableId(record.id, options.idTableHint || '');
    }

    for (const [supaCol, source] of Object.entries(fieldMap)) {
        if (typeof source === 'function') {
            out[supaCol] = source(record);
        } else if (typeof source === 'string') {
            const v = record.fields?.[source];
            if (v !== undefined) out[supaCol] = v;
        }
    }

    return out;
}

// ─── Type-Coercion ────────────────────────────────────────────

/**
 * Airtable-Date (ISO-String oder Date-Object) → Postgres timestamptz oder null.
 */
export function transformDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
}

/**
 * Airtable-Single-Select → Postgres ENUM-Wert.
 *
 * @param {string} value
 * @param {Object<string,string>} enumMap — { 'Airtable-Wert': 'postgres_wert' }
 * @param {string} [fallback=null] — bei Mismatch (oder null falls strict)
 */
export function transformEnum(value, enumMap, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    const v = String(value).trim();
    if (Object.prototype.hasOwnProperty.call(enumMap, v)) {
        return enumMap[v];
    }
    // Lower-case-Match als Fallback
    const lc = v.toLowerCase();
    for (const [k, mapped] of Object.entries(enumMap)) {
        if (k.toLowerCase() === lc) return mapped;
    }
    return fallback;
}

/**
 * Airtable-Linked-Record (Array von rec-IDs) → erste UUID oder null.
 */
export function transformLink(linkedField, tableHint = '') {
    if (!linkedField) return null;
    const arr = Array.isArray(linkedField) ? linkedField : [linkedField];
    if (arr.length === 0) return null;
    const recId = arr[0];
    if (typeof recId !== 'string' || !recId.startsWith('rec')) return null;
    return generateUuidFromAirtableId(recId, tableHint);
}

/**
 * Airtable-Linked-Record als komplette UUID-Liste.
 */
export function transformLinkArray(linkedField, tableHint = '') {
    if (!linkedField) return [];
    const arr = Array.isArray(linkedField) ? linkedField : [linkedField];
    return arr
        .filter(r => typeof r === 'string' && r.startsWith('rec'))
        .map(r => generateUuidFromAirtableId(r, tableHint));
}

/**
 * JSON-String aus Airtable → Object/Array oder null bei Parse-Fehler.
 */
export function parseJsonString(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;  // bereits geparst
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

/**
 * Parse "Strasse 1, 12345 Ort" → { strasse, plz, ort }.
 * Best-effort: bei Mismatch raw zurück in `strasse`.
 */
export function parseAddress(value) {
    if (!value || typeof value !== 'string') {
        return { strasse: null, plz: null, ort: null };
    }
    const v = value.trim();
    // Format: "<Strasse Nr>, <PLZ> <Ort>"
    const m = v.match(/^(.+?),\s*(\d{4,5})\s+(.+)$/);
    if (m) {
        return { strasse: m[1].trim(), plz: m[2], ort: m[3].trim() };
    }
    // Fallback: alles in strasse
    return { strasse: v, plz: null, ort: null };
}

/**
 * Rich-Text / HTML → Plain-Text. Behält Zeilen-Umbrüche.
 */
export function stripHtml(value) {
    if (!value) return null;
    return String(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

// ─── Validation ──────────────────────────────────────────────

/**
 * Prüft Record gegen Schema.
 *
 * @param {Object} record
 * @param {Object} schema
 * @param {string[]} schema.required — Pflichtfeld-Namen
 * @param {Object<string,string>} [schema.types] — { col: 'string'|'number'|'boolean'|'object'|'uuid' }
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateRecord(record, schema) {
    const errors = [];

    for (const col of schema.required || []) {
        if (record[col] === null || record[col] === undefined || record[col] === '') {
            errors.push(`Pflichtfeld "${col}" leer/null`);
        }
    }

    if (schema.types) {
        for (const [col, expected] of Object.entries(schema.types)) {
            const v = record[col];
            if (v === null || v === undefined) continue;  // optional, separat geprüft
            const actual = typeof v;
            switch (expected) {
                case 'string':
                    if (actual !== 'string') errors.push(`"${col}" sollte string sein, ist ${actual}`);
                    break;
                case 'number':
                    if (actual !== 'number') errors.push(`"${col}" sollte number sein, ist ${actual}`);
                    break;
                case 'boolean':
                    if (actual !== 'boolean') errors.push(`"${col}" sollte boolean sein, ist ${actual}`);
                    break;
                case 'object':
                    if (actual !== 'object') errors.push(`"${col}" sollte object sein, ist ${actual}`);
                    break;
                case 'uuid':
                    if (actual !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
                        errors.push(`"${col}" sollte UUID sein, ist "${v}"`);
                    }
                    break;
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

// ─── Convenience ─────────────────────────────────────────────

/**
 * Workspace-ID-Cache: vermeidet wiederholtes Lookup für selben SV.
 */
export class WorkspaceCache {
    constructor() { this._cache = new Map(); }
    get(email) { return this._cache.get(email); }
    set(email, id) { this._cache.set(email, id); }
    has(email) { return this._cache.has(email); }
}
