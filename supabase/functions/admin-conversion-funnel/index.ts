/* admin-conversion-funnel — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

Deno.serve(adminHandler(
    { functionName: 'admin-conversion-funnel' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const { count: signups } = await sb.from('workspaces')
            .select('id', { count: 'exact', head: true });

        const { data: demoWs } = await sb.from('auftraege')
            .select('workspace_id').eq('is_demo', true);
        const demoSet = new Set((demoWs ?? []).map((d: { workspace_id: string }) => d.workspace_id));

        const { data: realWs } = await sb.from('auftraege')
            .select('workspace_id').eq('is_demo', false);
        const realSet = new Set((realWs ?? []).map((d: { workspace_id: string }) => d.workspace_id));

        const { count: paidCount } = await sb.from('workspaces')
            .select('id', { count: 'exact', head: true })
            .eq('abo_status', 'aktiv');

        const stages: Array<{ name: string; count: number; dropoff_rate?: number }> = [
            { name: 'Signup', count: signups ?? 0 },
            { name: 'Demo-Fall erstellt', count: demoSet.size },
            { name: 'Echter Auftrag', count: realSet.size },
            { name: 'Trial → Paid', count: paidCount ?? 0 }
        ];

        for (let i = 1; i < stages.length; i++) {
            const prev = stages[i - 1].count;
            stages[i].dropoff_rate = prev > 0 ? Math.round((1 - stages[i].count / prev) * 100) : 0;
        }

        return jsonResponse({ stages, generated_at: new Date().toISOString() });
    }
));
