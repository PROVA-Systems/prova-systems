/* admin-ki-aggregations — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const ALLOWED_RANGES: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
const ALLOWED_GROUPS = ['user', 'model', 'day'];

interface ProtokollRow {
    user_id: string | null;
    modell?: string | null;
    modell_version?: string | null;
    token_input?: number | null;
    token_output?: number | null;
    kosten_eur?: number | null;
    created_at: string;
}

interface AggregateRow {
    key: string;
    count: number;
    token_input: number;
    token_output: number;
    kosten_eur: number;
}

function aggregateRows(rawRows: ProtokollRow[], groupBy: string): AggregateRow[] {
    const buckets = new Map<string, AggregateRow>();
    for (const r of (rawRows ?? [])) {
        let key: string;
        if (groupBy === 'user') key = r.user_id ?? 'unknown';
        else if (groupBy === 'model') key = r.modell_version ?? r.modell ?? 'unknown';
        else key = (r.created_at ?? '').slice(0, 10);
        const b = buckets.get(key) ?? { key, count: 0, token_input: 0, token_output: 0, kosten_eur: 0 };
        b.count += 1;
        b.token_input += r.token_input ?? 0;
        b.token_output += r.token_output ?? 0;
        b.kosten_eur += r.kosten_eur ?? 0;
        buckets.set(key, b);
    }
    return Array.from(buckets.values()).sort((a, b) => b.kosten_eur - a.kosten_eur);
}

Deno.serve(adminHandler(
    { functionName: 'admin-ki-aggregations' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const url = new URL(req.url);
        const rangeRaw = url.searchParams.get('range') ?? '30d';
        const range = ALLOWED_RANGES[rangeRaw] ? rangeRaw : '30d';
        const groupByRaw = url.searchParams.get('group_by') ?? 'user';
        const groupBy = ALLOWED_GROUPS.includes(groupByRaw) ? groupByRaw : 'user';
        const days = ALLOWED_RANGES[range];
        const since = new Date(Date.now() - days * 86400000).toISOString();

        const { data, error } = await sb.from('ki_protokoll')
            .select('user_id, modell, modell_version, token_input, token_output, kosten_eur, created_at')
            .gte('created_at', since)
            .limit(10000);
        if (error) return jsonResponse({ error: error.message }, 500);

        const rows = aggregateRows((data as ProtokollRow[]) ?? [], groupBy);
        const totals = rows.reduce((acc, r) => ({
            count: acc.count + r.count,
            token_input: acc.token_input + r.token_input,
            token_output: acc.token_output + r.token_output,
            kosten_eur: Math.round((acc.kosten_eur + r.kosten_eur) * 1_000_000) / 1_000_000
        }), { count: 0, token_input: 0, token_output: 0, kosten_eur: 0 });

        return jsonResponse({ rows, totals, range, group_by: groupBy });
    }
));
