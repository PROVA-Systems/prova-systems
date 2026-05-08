/* admin-feature-heatmap — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

Deno.serve(adminHandler(
    { functionName: 'admin-feature-heatmap' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const since = new Date(Date.now() - 7 * 86400000).toISOString();

        const { data: at } = await sb.from('audit_trail')
            .select('typ, workspace_id, sv_email, created_at')
            .or('typ.like.feature.%,typ.like.ki.%,typ.like.auftrag.%,typ.like.pdf.%')
            .gte('created_at', since)
            .limit(5000);

        const heatmap: Record<string, number> = {};
        const featureTotals: Record<string, number> = {};
        const userTotals: Record<string, number> = {};
        for (const e of (at ?? [])) {
            const fn = e.typ;
            const user = e.sv_email ?? '[anon]';
            heatmap[fn + '|' + user] = (heatmap[fn + '|' + user] ?? 0) + 1;
            featureTotals[fn] = (featureTotals[fn] ?? 0) + 1;
            userTotals[user] = (userTotals[user] ?? 0) + 1;
        }

        const features = Object.entries(featureTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([feature, count]) => ({ feature, count }));

        const users = Object.entries(userTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([user, count]) => ({ user, count }));

        const matrix = features.map((f) => {
            const cells: Record<string, number> = {};
            for (const u of users) {
                cells[u.user] = heatmap[f.feature + '|' + u.user] ?? 0;
            }
            return { feature: f.feature, total: f.count, cells };
        });

        return jsonResponse({
            ok: true, configured: true,
            fetched_at: new Date().toISOString(),
            since,
            total_events: (at ?? []).length,
            top_features: features,
            top_users: users,
            matrix
        });
    }
));
