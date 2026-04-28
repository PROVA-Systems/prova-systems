/* ============================================================
   PROVA Edge Function — stripe-webhook
   Sprint K-1.2.B6

   Ersetzt Netlify Function netlify/functions/stripe-webhook.js und Make F1.

   Flow:
     1. KEINE JWT (Stripe-Endpoint, public)
     2. Raw-Body lesen + stripe-signature verifizieren
     3. stripe_events INSERT (UNIQUE-Constraint auf stripe_event_id =
        Idempotenz; bei Konflikt: 200 zurück)
     4. Event-Switch:
        - checkout.session.completed → workspace.abo_status='aktiv'
        - customer.subscription.updated → tier syncen
        - customer.subscription.deleted → abo_status='gekuendigt'
        - invoice.payment_succeeded → letzte_zahlung_am setzen
        - invoice.payment_failed → abo_status='ueberfaellig'
     5. stripe_events UPDATE status=verarbeitet
     6. 200 zurück

   ⚠️ Auth: Stripe-Endpoint braucht KEINE JWT. RLS umgeht der Service-Client.

   Secrets:
     STRIPE_SECRET_KEY        — für API-Calls (z.B. Subscription-Lookup)
     STRIPE_WEBHOOK_SECRET    — für Signature-Verification
   ============================================================ */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { logAuditEvent } from '../_shared/audit.ts';
import { withErrorHandling } from '../_shared/auth.ts';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

/**
 * Stripe Signature-Verification (HMAC-SHA256).
 * Header: stripe-signature: t=TIMESTAMP,v1=SIG
 */
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
    if (!header || !secret) return false;
    const parts = Object.fromEntries(header.split(',').map(p => p.trim().split('=')));
    const ts = parts.t;
    const v1 = parts.v1;
    if (!ts || !v1) return false;

    const signedPayload = `${ts}.${payload}`;
    const enc = new TextEncoder();
    const keyBuf = await crypto.subtle.importKey(
        'raw', enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', keyBuf, enc.encode(signedPayload));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time compare
    if (hex.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);

    // Tolerance check: 5 min
    const age = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
    if (Math.abs(age) > 300) return false;

    return diff === 0;
}

interface StripeEvent {
    id: string;
    type: string;
    livemode: boolean;
    api_version: string;
    created: number;
    data: { object: any };  // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function findWorkspaceByCustomer(sb: ReturnType<typeof createServiceClient>, customerId: string): Promise<string | null> {
    const { data } = await sb
        .from('workspaces')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1)
        .maybeSingle();
    return data?.id ?? null;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return handleCors();
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const sigHeader = req.headers.get('stripe-signature') ?? '';
    const payload = await req.text();

    if (!STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET not set');
        return errorResponse('Webhook secret not configured', 500);
    }

    const valid = await verifyStripeSignature(payload, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!valid) {
        return errorResponse('Invalid signature', 401);
    }

    let event: StripeEvent;
    try {
        event = JSON.parse(payload) as StripeEvent;
    } catch {
        return errorResponse('Invalid JSON', 400);
    }

    const sb = createServiceClient();
    const t0 = Date.now();

    // 1. Idempotenz: stripe_events INSERT mit UNIQUE-Constraint
    const obj = event.data.object;
    const stripeCustomerId = obj.customer ?? null;
    const stripeSubscriptionId = obj.subscription ?? obj.id ?? null;
    const workspaceId = stripeCustomerId
        ? await findWorkspaceByCustomer(sb, stripeCustomerId)
        : null;

    const { error: insErr } = await sb.from('stripe_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        livemode: event.livemode,
        api_version: event.api_version,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_invoice_id: obj.invoice ?? (event.type.startsWith('invoice.') ? obj.id : null),
        stripe_payment_intent_id: obj.payment_intent ?? null,
        workspace_id: workspaceId,
        raw_payload: event,
        status: 'empfangen'
    });

    if (insErr) {
        // UNIQUE-Violation = Duplicate-Event von Stripe-Retry → 200 OK, nichts tun
        if (insErr.message.includes('duplicate') || insErr.code === '23505') {
            console.log(`[stripe-webhook] duplicate event ${event.id}, returning 200`);
            return jsonResponse({ ok: true, duplicate: true });
        }
        return errorResponse(`stripe_events insert: ${insErr.message}`, 500);
    }

    // 2. Event-Switch
    let workspaceUpdate: Record<string, unknown> | null = null;
    let auswirkung: string | null = null;

    switch (event.type) {
        case 'checkout.session.completed': {
            workspaceUpdate = {
                abo_status: 'aktiv',
                abo_aktiv_seit: new Date().toISOString(),
                stripe_customer_id: obj.customer,
                stripe_subscription_id: obj.subscription
            };
            auswirkung = 'checkout completed';
            break;
        }
        case 'customer.subscription.updated': {
            const tier = obj.items?.data?.[0]?.price?.lookup_key?.includes('team') ? 'team' : 'solo';
            workspaceUpdate = {
                abo_tier: tier,
                stripe_subscription_id: obj.id
            };
            auswirkung = `subscription updated → ${tier}`;
            break;
        }
        case 'customer.subscription.deleted': {
            workspaceUpdate = {
                abo_status: 'gekuendigt',
                abo_gekuendigt_am: new Date().toISOString()
            };
            auswirkung = 'subscription canceled';
            break;
        }
        case 'invoice.payment_succeeded': {
            // Falls in trial: aktivieren
            workspaceUpdate = { abo_status: 'aktiv' };
            auswirkung = `payment ok ${(obj.amount_paid / 100).toFixed(2)} ${obj.currency}`;
            break;
        }
        case 'invoice.payment_failed': {
            workspaceUpdate = { abo_status: 'ueberfaellig' };
            auswirkung = 'payment failed';
            break;
        }
        default:
            auswirkung = 'no action (unhandled type)';
    }

    if (workspaceUpdate && workspaceId) {
        const { error: upErr } = await sb.from('workspaces').update(workspaceUpdate).eq('id', workspaceId);
        if (upErr) {
            await sb.from('stripe_events').update({
                status: 'verarbeitung_fehler',
                verarbeitung_fehler: upErr.message
            }).eq('stripe_event_id', event.id);
            return errorResponse(`workspace update: ${upErr.message}`, 500);
        }
    }

    // 3. stripe_events update
    await sb.from('stripe_events').update({
        status: workspaceUpdate ? 'verarbeitet' : 'ignoriert',
        verarbeitet_at: new Date().toISOString(),
        verarbeitung_dauer_ms: Date.now() - t0,
        relevante_daten: { auswirkung, workspaceUpdate }
    }).eq('stripe_event_id', event.id);

    // 4. Audit
    if (workspaceId) {
        await logAuditEvent(sb, {
            action: 'update',
            entityTyp: 'workspace',
            entityId: workspaceId,
            payload: { stripe_event_type: event.type, auswirkung },
            workspaceId,
            userId: null
        }, req);
    }

    return jsonResponse({ ok: true, processed: !!workspaceUpdate });
};

Deno.serve(withErrorHandling(handler));
