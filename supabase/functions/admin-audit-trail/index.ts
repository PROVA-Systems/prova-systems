/* admin-audit-trail — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

function parseSince(s: string): string {
    const m = String(s || '24h').match(/^(\d+)([hd])$/);
    if (!m) return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const n = parseInt(m[1]);
    const ms = n * (m[2] === 'h' ? 3600 * 1000 : 86400 * 1000);
    return new Date(Date.now() - ms).toISOString();
}

Deno.serve(adminHandler(
    { functionName: 'admin-audit-trail' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const url = new URL(req.url);
        const typPrefix = url.searchParams.get('typ_prefix') ?? '';
        const since = parseSince(url.searchParams.get('since') ?? '24h');
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500);
        const email = url.searchParams.get('email')?.toLowerCase() ?? null;

        let qb = sb.from('audit_trail')
            .select('id, typ, sv_email, workspace_id, user_id, details, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (typPrefix) qb = qb.like('typ', typPrefix + '%');
        if (email) qb = qb.eq('sv_email', email);

        const { data, error } = await qb;
        if (error) return jsonResponse({ error: 'DB-Query fehlgeschlagen: ' + error.message }, 500);

        const counts: Record<string, number> = {};
        for (const r of (data ?? [])) {
            counts[r.typ] = (counts[r.typ] ?? 0) + 1;
        }
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

        return jsonResponse({
            ok: true,
            fetched_at: new Date().toISOString(),
            filter: { typ_prefix: typPrefix, since, limit, email },
            total: (data ?? []).length,
            top_events: top.map(([typ, count]) => ({ typ, count })),
            events: data ?? []
        });
    }
));
