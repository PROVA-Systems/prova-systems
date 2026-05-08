/* admin-mrr-live — MEGA⁴³ Welle 1 */
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

function getStripeKey(): string | null {
    return Deno.env.get('PROVA_STRIPE_SECRET_KEY') ?? Deno.env.get('STRIPE_SECRET_KEY') ?? null;
}

async function stripeFetch(path: string): Promise<Record<string, unknown>> {
    const key = getStripeKey();
    if (!key) throw new Error('STRIPE_SECRET_KEY nicht gesetzt');
    const res = await fetch('https://api.stripe.com/v1' + path, {
        headers: { 'Authorization': 'Bearer ' + key }
    });
    if (!res.ok) throw new Error('Stripe HTTP ' + res.status);
    return await res.json();
}

interface StripeSubscription {
    items?: { data?: Array<{ price?: { unit_amount?: number; recurring?: { interval?: string } }; quantity?: number }> };
    discount?: { coupon?: { id?: string } };
}

Deno.serve(adminHandler(
    { functionName: 'admin-mrr-live' },
    async (req) => {
        if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);

        if (!getStripeKey()) {
            return jsonResponse({ error: 'Stripe-Key nicht konfiguriert' }, 503);
        }

        try {
            const subs = await stripeFetch('/subscriptions?status=active&limit=100&expand[]=data.discount.coupon');

            let mrrCent = 0;
            let foundingCount = 0;
            let regularCount = 0;
            const breakdown = { solo: 0, team: 0, founding: 0 };

            for (const s of ((subs.data as StripeSubscription[]) ?? [])) {
                const item = s.items?.data?.[0];
                const unit = item?.price?.unit_amount ?? 0;
                const qty = item?.quantity ?? 1;
                const interval = item?.price?.recurring?.interval ?? 'month';
                const monthly = interval === 'year' ? Math.round(unit * qty / 12) : unit * qty;

                const couponId = s.discount?.coupon?.id ?? '';
                const isFounding = couponId === 'FOUNDING-99' || /founding/i.test(couponId);
                if (isFounding) {
                    foundingCount++;
                    breakdown.founding++;
                    mrrCent += 9900;
                } else {
                    regularCount++;
                    if (monthly >= 30000) breakdown.team++;
                    else breakdown.solo++;
                    mrrCent += monthly;
                }
            }

            return jsonResponse({
                mrr_eur: Math.round(mrrCent / 100),
                mrr_cent: mrrCent,
                total_active: ((subs.data as unknown[]) ?? []).length,
                founding_count: foundingCount,
                regular_count: regularCount,
                breakdown,
                generated_at: new Date().toISOString()
            });
        } catch (e) {
            return jsonResponse({ error: 'unexpected', detail: e instanceof Error ? e.message : String(e) }, 500);
        }
    }
));
