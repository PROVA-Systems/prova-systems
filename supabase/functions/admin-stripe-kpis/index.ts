/* admin-stripe-kpis — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@14?target=denonext';

const STRIPE_API_VERSION = '2024-12-18.acacia';
const FOUNDING_COUPON_ID = Deno.env.get('STRIPE_FOUNDING_COUPON_ID') ?? '';

Deno.serve(adminHandler(
    { functionName: 'admin-stripe-kpis' },
    async (req, { sb }) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeKey) return jsonResponse({ error: 'STRIPE_SECRET_KEY fehlt' }, 500);

        // deno-lint-ignore no-explicit-any
        const stripe = new (Stripe as any)(stripeKey, { apiVersion: STRIPE_API_VERSION });

        // 1. Workspace-Counts + MRR
        const { data: wsAll } = await sb
            .from('workspaces')
            .select('id, abo_tier, abo_status, gesamtzahlungen_lifetime_eur, abo_aktiv_seit, abo_gekuendigt_am, stripe_subscription_id');

        const counts: Record<string, number> = { trial: 0, aktiv: 0, ueberfaellig: 0, gekuendigt: 0, pausiert: 0, total: 0 };
        let mrrEur = 0;
        let lifetimeEur = 0;
        const planPreis: Record<string, number> = { solo: 99, team: 279 };

        for (const w of (wsAll ?? [])) {
            counts.total++;
            counts[w.abo_status] = (counts[w.abo_status] ?? 0) + 1;
            lifetimeEur += Number(w.gesamtzahlungen_lifetime_eur ?? 0);
            if (w.abo_status === 'aktiv' && w.abo_tier && planPreis[w.abo_tier]) {
                mrrEur += planPreis[w.abo_tier];
            }
        }

        // 2. Founding-Coupon-Status
        let foundingCoupon: Record<string, unknown> | null = null;
        try {
            if (FOUNDING_COUPON_ID) {
                const c = await stripe.coupons.retrieve(FOUNDING_COUPON_ID);
                foundingCoupon = {
                    id: c.id,
                    valid: c.valid,
                    amount_off: c.amount_off,
                    currency: c.currency,
                    duration: c.duration,
                    max_redemptions: c.max_redemptions,
                    times_redeemed: c.times_redeemed,
                    remaining: c.max_redemptions != null ? (c.max_redemptions - (c.times_redeemed ?? 0)) : null
                };
            }
        } catch (e) {
            foundingCoupon = { error: e instanceof Error ? e.message : String(e) };
        }

        // 3. Conversion + Churn last 30d
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: recentChanges } = await sb
            .from('audit_trail')
            .select('typ, created_at')
            .like('typ', 'stripe.%')
            .gte('created_at', since);

        let conversions30d = 0;
        let churn30d = 0;
        let trialStarted30d = 0;
        for (const r of (recentChanges ?? [])) {
            if (r.typ === 'stripe.pilot.founding_paid' || r.typ === 'stripe.subscription.activated') conversions30d++;
            if (r.typ === 'stripe.subscription.cancelled') churn30d++;
            if (r.typ === 'stripe.pilot.trial_started' || r.typ === 'stripe.subscription.trial_started') trialStarted30d++;
        }

        return jsonResponse({
            ok: true,
            fetched_at: new Date().toISOString(),
            workspaces: counts,
            mrr_eur: mrrEur,
            gesamtzahlungen_lifetime_eur: lifetimeEur,
            last_30_days: {
                trial_started: trialStarted30d,
                conversions: conversions30d,
                churn: churn30d,
                conversion_rate: trialStarted30d > 0 ? Math.round((conversions30d / trialStarted30d) * 100) : 0,
                churn_rate: counts.aktiv > 0 ? Math.round((churn30d / (counts.aktiv + churn30d)) * 100) : 0
            },
            founding_coupon: foundingCoupon
        });
    }
));
