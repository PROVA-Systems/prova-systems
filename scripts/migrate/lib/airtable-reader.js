/* ============================================================
   PROVA Migrations-Pipeline — Airtable-Reader (ESM)
   Sprint K-1.1.A2

   Generischer Connector mit:
   - Pagination (Airtable: 100 Records / Page via offset)
   - Filter-Support (filterByFormula, fields[], sort)
   - Rate-Limit-Throttling (Airtable: 5 req/sec/base)
   - Retry-Logic bei 429 (exponential backoff)
   - Schema-Discovery (Meta-API)
   ============================================================ */

const AIRTABLE_API = 'https://api.airtable.com/v0';
const AIRTABLE_META_API = 'https://api.airtable.com/v0/meta';
const PAGE_SIZE = 100;
const RATE_LIMIT_INTERVAL_MS = 220;  // ~4.5 req/sec, mit Buffer
const MAX_RETRIES = 3;

let _lastRequestAt = 0;

function getToken() {
    const tok = process.env.AIRTABLE_PAT;
    if (!tok) {
        throw new Error(
            'AIRTABLE_PAT fehlt. Bitte in .env.local setzen oder vor Aufruf exportieren. '
            + 'Token holen: airtable.com → Builder Hub → Personal Access Tokens → Scope data.records:read.'
        );
    }
    return tok;
}

async function _throttle() {
    const elapsed = Date.now() - _lastRequestAt;
    const wait = Math.max(0, RATE_LIMIT_INTERVAL_MS - elapsed);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _lastRequestAt = Date.now();
}

async function _fetchWithRetry(url, options = {}, attempt = 1) {
    await _throttle();

    const resp = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    if (resp.status === 429 && attempt <= MAX_RETRIES) {
        const wait = 2 ** attempt * 1000;  // 2s, 4s, 8s
        console.warn(`[airtable-reader] 429 rate-limit, retry ${attempt}/${MAX_RETRIES} in ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
        return _fetchWithRetry(url, options, attempt + 1);
    }

    if (resp.status === 401 || resp.status === 403) {
        throw new Error(`Airtable Auth-Fehler ${resp.status}: ${await resp.text()}`);
    }

    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Airtable HTTP ${resp.status}: ${body.slice(0, 500)}`);
    }

    return await resp.json();
}

/**
 * Liest alle Records einer Tabelle (mit Auto-Pagination).
 *
 * @param {string} baseId — z.B. 'appJ7bLlAHZoxENWE'
 * @param {string} tableIdOrName — tableId (tbl...) ODER Tabellen-Name
 * @param {Object} [options]
 * @param {string} [options.filterByFormula] — Airtable Formula
 * @param {string[]} [options.fields] — nur diese Felder zurückgeben
 * @param {Array<{field, direction}>} [options.sort]
 * @param {string} [options.view] — Airtable-View
 * @param {number} [options.maxRecords] — Cap insgesamt (kein Pagination-Ende)
 * @param {Function} [options.onPage] — callback({pageNumber, records, total})
 * @returns {Promise<Array>} Records-Array (mit .id, .fields, .createdTime)
 */
export async function readAllRecords(baseId, tableIdOrName, options = {}) {
    const records = [];
    let offset = null;
    let pageNumber = 0;
    const cap = options.maxRecords || Infinity;

    do {
        const params = new URLSearchParams();
        params.set('pageSize', String(PAGE_SIZE));
        if (offset) params.set('offset', offset);
        if (options.filterByFormula) params.set('filterByFormula', options.filterByFormula);
        if (options.view) params.set('view', options.view);
        if (Array.isArray(options.fields)) {
            for (const f of options.fields) params.append('fields[]', f);
        }
        if (Array.isArray(options.sort)) {
            options.sort.forEach((s, i) => {
                params.set(`sort[${i}][field]`, s.field);
                params.set(`sort[${i}][direction]`, s.direction || 'asc');
            });
        }

        const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableIdOrName)}?${params}`;
        const json = await _fetchWithRetry(url);

        records.push(...json.records);
        pageNumber += 1;

        if (typeof options.onPage === 'function') {
            options.onPage({ pageNumber, records: json.records, total: records.length });
        }

        offset = json.offset || null;

        if (records.length >= cap) {
            return records.slice(0, cap);
        }
    } while (offset);

    return records;
}

/**
 * Holt einen Record per ID.
 */
export async function readRecordById(baseId, tableIdOrName, recordId) {
    const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`;
    return await _fetchWithRetry(url);
}

/**
 * Schema-Discovery via Meta-API.
 *
 * @returns {Promise<{tables: Array<{id, name, primaryFieldId, fields, views}>}>}
 */
export async function getTableSchema(baseId) {
    const url = `${AIRTABLE_META_API}/bases/${baseId}/tables`;
    return await _fetchWithRetry(url);
}

/**
 * Liefert die Feld-Definitionen einer einzelnen Tabelle.
 */
export async function getFieldsForTable(baseId, tableIdOrName) {
    const schema = await getTableSchema(baseId);
    const table = schema.tables.find(
        t => t.id === tableIdOrName || t.name === tableIdOrName
    );
    if (!table) {
        throw new Error(`Tabelle "${tableIdOrName}" in Base ${baseId} nicht gefunden`);
    }
    return table.fields;
}

/**
 * Health-Check: pingt die Base, returnt Tabellen-Liste.
 */
export async function ping(baseId) {
    const schema = await getTableSchema(baseId);
    return {
        ok: true,
        tableCount: schema.tables.length,
        tables: schema.tables.map(t => ({ id: t.id, name: t.name, fieldCount: t.fields.length }))
    };
}
