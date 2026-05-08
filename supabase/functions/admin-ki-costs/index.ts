/* admin-ki-costs — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

function parseSince(s: string): string {
    const m = String(s ?? '7d').match(/^(\d+)([hd])$/);
    if (!m) return new Date(Date.now() - 7 * 86400000).toISOString();
    const n = parseInt(m[1]);
    const ms = n * (m[2] === 'h' ? 3600000 : 86400000);
    return new Date(Date.now() - ms).toISOString();
}

interface ProtokollRow {
    workspace_id: string | null;
    funktion: string | null;
    modell: string | null;
    tokens_in: number | null;
    tokens_out: number | null;
    kosten_eur: number | null;
    created_at: string;
}

Deno.serve(adminHandler(
    { functionName: 'admin-ki-costs' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const url = new URL(req.url);
        const since = parseSince(url.searchParams.get('since') ?? '7d');

        const { data: rows, error } = await sb.from('ki_protokoll')
            .select('workspace_id, funktion, modell, tokens_in, tokens_out, kosten_eur, created_at')
            .gte('created_at', since)
            .limit(10000);

        if (error) {
            return jsonResponse({
                ok: true,
                configured: false,
                hint: 'ki_protokoll Tabelle nicht vorhanden — pending Schema-Migration',
                error: error.message
            });
        }

        const perWorkspace: Record<string, { workspace_id: string; calls: number; cost_eur: number; tokens_in: number; tokens_out: number }> = {};
        const perFunktion: Record<string, { funktion: string; calls: number; cost_eur: number }> = {};
        const perModell: Record<string, { modell: string; calls: number; cost_eur: number; tokens_in: number; tokens_out: number }> = {};
        let totalCost = 0;
        let totalTokensIn = 0;
        let totalTokensOut = 0;

        for (const r of ((rows as ProtokollRow[]) ?? [])) {
            const cost = Number(r.kosten_eur ?? 0);
            const tin = Number(r.tokens_in ?? 0);
            const tout = Number(r.tokens_out ?? 0);
            totalCost += cost;
            totalTokensIn += tin;
            totalTokensOut += tout;

            const ws = r.workspace_id ?? 'system';
            perWorkspace[ws] = perWorkspace[ws] ?? { workspace_id: ws, calls: 0, cost_eur: 0, tokens_in: 0, tokens_out: 0 };
            perWorkspace[ws].calls++;
            perWorkspace[ws].cost_eur += cost;
            perWorkspace[ws].tokens_in += tin;
            perWorkspace[ws].tokens_out += tout;

            const fn = r.funktion ?? 'unknown';
            perFunktion[fn] = perFunktion[fn] ?? { funktion: fn, calls: 0, cost_eur: 0 };
            perFunktion[fn].calls++;
            perFunktion[fn].cost_eur += cost;

            const m = r.modell ?? 'unknown';
            perModell[m] = perModell[m] ?? { modell: m, calls: 0, cost_eur: 0, tokens_in: 0, tokens_out: 0 };
            perModell[m].calls++;
            perModell[m].cost_eur += cost;
            perModell[m].tokens_in += tin;
            perModell[m].tokens_out += tout;
        }

        const round2 = (x: number) => Math.round(x * 100) / 100;
        const topWorkspaces = Object.values(perWorkspace).sort((a, b) => b.cost_eur - a.cost_eur).slice(0, 20);
        const topFunktionen = Object.values(perFunktion).sort((a, b) => b.cost_eur - a.cost_eur);
        const modelle = Object.values(perModell).sort((a, b) => b.cost_eur - a.cost_eur);

        return jsonResponse({
            ok: true,
            configured: true,
            fetched_at: new Date().toISOString(),
            since,
            summary: {
                calls_total: ((rows as unknown[]) ?? []).length,
                cost_total_eur: round2(totalCost),
                tokens_in_total: totalTokensIn,
                tokens_out_total: totalTokensOut
            },
            top_workspaces: topWorkspaces.map((w) => ({ ...w, cost_eur: round2(w.cost_eur) })),
            top_funktionen: topFunktionen.map((f) => ({ ...f, cost_eur: round2(f.cost_eur) })),
            modelle: modelle.map((m) => ({ ...m, cost_eur: round2(m.cost_eur) }))
        });
    }
));
