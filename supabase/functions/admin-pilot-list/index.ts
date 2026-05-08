/* ============================================================
   PROVA Edge Function — admin-pilot-list
   MEGA⁴³ Welle 1 — Cockpit-Migration

   Liefert Pilot-Liste (Workspaces) mit Stripe-Status, Akten-Count,
   Member-Activity. Filter via ?status=trial|active|cancelled|overdue|all.
   ============================================================ */

import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

interface MemberInfo {
    email: string | null;
    last_login_at: string | null;
    last_active_at: string | null;
}

interface PilotRow {
    id: string;
    name: string | null;
    email: string | null;
    abo_tier: string | null;
    abo_status: string | null;
    abo_aktiv_seit: string | null;
    abo_trial_endet_am: string | null;
    trial_day: number | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    gesamtzahlungen_lifetime_eur: number;
    letzte_zahlung_am: string | null;
    created_at: string | null;
    anzahl_akten: number;
    members: MemberInfo[];
}

Deno.serve(adminHandler(
    { functionName: 'admin-pilot-list' },
    async (req, { sb }) => {
        if (req.method !== 'GET') {
            return jsonResponse({ error: 'Method Not Allowed' }, 405);
        }

        const url = new URL(req.url);
        const filter = url.searchParams.get('status') ?? 'all';

        let query = sb
            .from('workspaces')
            .select('id, name, billing_email, abo_tier, abo_status, abo_aktiv_seit, abo_trial_endet_am, stripe_customer_id, stripe_subscription_id, gesamtzahlungen_lifetime_eur, letzte_zahlung_am, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(200);

        if (filter === 'trial')     query = query.eq('abo_status', 'trial');
        if (filter === 'active')    query = query.eq('abo_status', 'aktiv');
        if (filter === 'cancelled') query = query.eq('abo_status', 'gekuendigt');
        if (filter === 'overdue')   query = query.eq('abo_status', 'ueberfaellig');

        const { data: workspaces, error } = await query;
        if (error) {
            return jsonResponse({ error: 'DB-Query fehlgeschlagen: ' + error.message }, 500);
        }

        // Pro Workspace: Akten-Count + Members parallel
        const enrichedRaw = await Promise.all((workspaces ?? []).map(async (ws) => {
            const [aktenRes, mshipRes] = await Promise.all([
                sb.from('auftraege')
                    .select('id', { count: 'exact', head: true })
                    .eq('workspace_id', ws.id),
                sb.from('workspace_memberships')
                    .select('user_id, users(email, last_login_at, last_active_at)')
                    .eq('workspace_id', ws.id)
                    .eq('is_active', true)
                    .limit(5)
            ]);

            const members: MemberInfo[] = (mshipRes.data ?? []).map((m: { users: { email?: string; last_login_at?: string; last_active_at?: string } | null }) => ({
                email: m.users?.email ?? null,
                last_login_at: m.users?.last_login_at ?? null,
                last_active_at: m.users?.last_active_at ?? null
            }));

            const trialDay = ws.abo_aktiv_seit
                ? Math.floor((Date.now() - new Date(ws.abo_aktiv_seit).getTime()) / 86400000)
                : null;

            const row: PilotRow = {
                id: ws.id,
                name: ws.name,
                email: ws.billing_email,
                abo_tier: ws.abo_tier,
                abo_status: ws.abo_status,
                abo_aktiv_seit: ws.abo_aktiv_seit,
                abo_trial_endet_am: ws.abo_trial_endet_am,
                trial_day: trialDay,
                stripe_customer_id: ws.stripe_customer_id,
                stripe_subscription_id: ws.stripe_subscription_id,
                gesamtzahlungen_lifetime_eur: Number(ws.gesamtzahlungen_lifetime_eur ?? 0),
                letzte_zahlung_am: ws.letzte_zahlung_am,
                created_at: ws.created_at,
                anzahl_akten: aktenRes.count ?? 0,
                members
            };
            return row;
        }));

        return jsonResponse({
            ok: true,
            filter,
            total: enrichedRaw.length,
            pilots: enrichedRaw,
            fetched_at: new Date().toISOString()
        });
    }
));
