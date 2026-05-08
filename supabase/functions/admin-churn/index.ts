/* admin-churn — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const REASON_CATEGORIES: Record<string, string> = {
    too_expensive:    'Zu teuer',
    missing_feature:  'Feature fehlt',
    low_quality:      'Qualitaet',
    switched_service: 'Wechsel zu Konkurrenz',
    unused:           'Nicht genutzt',
    too_complex:      'Zu komplex',
    customer_service: 'Kundenservice',
    other:            'Sonstiges',
    unknown:          'Unbekannt'
};

function categorizeReason(text: string | null | undefined): string {
    if (!text) return 'unknown';
    const s = String(text).toLowerCase();
    if (/teuer|preis|kosten|expensive|cost/.test(s)) return 'too_expensive';
    if (/feature|funktion|missing|fehlt/.test(s)) return 'missing_feature';
    if (/qualit(ä|ae)t|fehler|bug/.test(s)) return 'low_quality';
    if (/konkurrenz|switch|wechsel|alternative/.test(s)) return 'switched_service';
    if (/ungenutzt|unused|nicht genutzt|not using/.test(s)) return 'unused';
    if (/komplex|complex|kompliziert|zu schwer/.test(s)) return 'too_complex';
    if (/support|service|kontakt|hilfe/.test(s)) return 'customer_service';
    return 'other';
}

Deno.serve(adminHandler(
    { functionName: 'admin-churn' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const since = new Date(Date.now() - 90 * 86400000).toISOString();

        const { data: cancelEvents } = await sb.from('audit_trail')
            .select('sv_email, workspace_id, details, created_at')
            .eq('typ', 'stripe.subscription.cancelled')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(500);

        const buckets: Record<string, { count: number; examples: Array<{ text: string; email: string | null }> }> = {};
        Object.keys(REASON_CATEGORIES).forEach((k) => { buckets[k] = { count: 0, examples: [] }; });

        for (const e of (cancelEvents ?? [])) {
            let det: Record<string, unknown> = {};
            try {
                det = typeof e.details === 'string' ? JSON.parse(e.details) : (e.details ?? {});
            } catch { det = {}; }
            const reasonText = (det.cancellation_reason ?? det.reason ?? det.feedback) as string | null | undefined;
            const cat = categorizeReason(reasonText);
            buckets[cat].count++;
            if (reasonText && buckets[cat].examples.length < 3) {
                buckets[cat].examples.push({ text: String(reasonText).slice(0, 200), email: e.sv_email });
            }
        }

        const total = (cancelEvents ?? []).length;
        const summary = Object.entries(buckets)
            .map(([key, b]) => ({
                category: key,
                label: REASON_CATEGORIES[key],
                count: b.count,
                pct: total > 0 ? Math.round((b.count / total) * 100) : 0,
                examples: b.examples
            }))
            .filter((b) => b.count > 0)
            .sort((a, b) => b.count - a.count);

        return jsonResponse({
            ok: true, configured: true,
            fetched_at: new Date().toISOString(),
            since,
            total_cancellations: total,
            by_category: summary,
            hint: total === 0 ? 'Keine Cancellations in letzten 90 Tagen — gute Retention oder zu fruehe Cohort.' : null
        });
    }
));
