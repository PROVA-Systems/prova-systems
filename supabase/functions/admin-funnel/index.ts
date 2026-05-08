/* admin-funnel — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const FUNNEL_STAGES = [
    { key: 'signup',     label: 'Sign-Up',                  typ_match: ['auth.signup', 'user.created'] },
    { key: 'onboarding', label: 'Onboarding abgeschlossen', typ_match: ['onboarding.completed'] },
    { key: 'first_akte', label: 'Erste Akte angelegt',      typ_match: ['auftrag.created'] },
    { key: 'first_pdf',  label: 'Erstes PDF generiert',     typ_match: ['pdf.generated'] },
    { key: 'paid',       label: 'Stripe-Aktivierung',       typ_match: ['stripe.subscription.activated', 'stripe.pilot.founding_paid'] }
];

Deno.serve(adminHandler(
    { functionName: 'admin-funnel' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const since = new Date(Date.now() - 60 * 86400000).toISOString();
        const allTypes = FUNNEL_STAGES.flatMap((s) => s.typ_match);

        const { data: events } = await sb.from('audit_trail')
            .select('typ, sv_email, created_at')
            .in('typ', allTypes)
            .gte('created_at', since)
            .order('created_at', { ascending: true })
            .limit(5000);

        const userStages: Record<string, Record<string, string>> = {};
        for (const e of (events ?? [])) {
            if (!e.sv_email) continue;
            userStages[e.sv_email] = userStages[e.sv_email] ?? {};
            for (const stage of FUNNEL_STAGES) {
                if (stage.typ_match.includes(e.typ) && !userStages[e.sv_email][stage.key]) {
                    userStages[e.sv_email][stage.key] = e.created_at;
                }
            }
        }

        const stageCounts: Record<string, number> = {};
        for (const stage of FUNNEL_STAGES) stageCounts[stage.key] = 0;
        for (const u of Object.values(userStages)) {
            for (const stage of FUNNEL_STAGES) {
                if (u[stage.key]) stageCounts[stage.key]++;
            }
        }

        const funnel: Array<{ stage: string; label: string; count: number; dropoff_pct: number; cumulative_pct: number }> = [];
        let prevCount: number | null = null;
        for (const stage of FUNNEL_STAGES) {
            const count = stageCounts[stage.key];
            const dropoffPct = prevCount ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
            const cumulativePct = funnel.length > 0 && funnel[0].count > 0
                ? Math.round((count / funnel[0].count) * 100) : 100;
            funnel.push({ stage: stage.key, label: stage.label, count, dropoff_pct: dropoffPct, cumulative_pct: cumulativePct });
            prevCount = count;
        }

        return jsonResponse({
            ok: true, configured: true,
            fetched_at: new Date().toISOString(),
            since,
            total_users_in_cohort: Object.keys(userStages).length,
            funnel
        });
    }
));
