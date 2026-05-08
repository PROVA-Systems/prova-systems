/* admin-live-sessions — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

interface SessionInfo {
    email: string | null;
    workspace_id: string | null;
    last_login: string;
    typ: string;
}

Deno.serve(adminHandler(
    { functionName: 'admin-live-sessions' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: events } = await sb.from('audit_trail')
            .select('sv_email, workspace_id, typ, created_at, details')
            .like('typ', 'auth.login%')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(200);

        const sessionMap: Record<string, SessionInfo> = {};
        for (const e of (events ?? [])) {
            const k = e.sv_email ?? '[anon]';
            if (!sessionMap[k]) {
                sessionMap[k] = {
                    email: e.sv_email,
                    workspace_id: e.workspace_id,
                    last_login: e.created_at,
                    typ: e.typ
                };
            }
        }
        const sessions = Object.values(sessionMap);

        return jsonResponse({
            ok: true,
            fetched_at: new Date().toISOString(),
            active_count: sessions.length,
            sessions
        });
    }
));
