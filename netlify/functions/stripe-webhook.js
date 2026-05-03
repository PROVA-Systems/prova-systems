/**
 * PROVA Systems — Stripe Webhook Handler v2 (Supabase-Backend)
 *
 * Sprint Stripe-Migration 03.05.2026:
 *  - Account-Migration auf neuen Stripe-Account (alter war Sandbox)
 *  - DB-Backend: Airtable → Supabase (Voll-Cleanup-Sprint Doktrin)
 *  - Stripe-SDK 14.x → 22.x (Major-Bump, API-Version explizit)
 *  - Idempotenz via stripe_events.stripe_event_id UNIQUE
 *  - DSGVO-Audit-Trail-Logging pro Event
 *
 * Verarbeitete Events:
 *  - checkout.session.completed       → workspace.abo_status='aktiv'
 *  - invoice.payment_succeeded        → workspace.letzte_zahlung_*, MRR
 *  - customer.subscription.deleted    → workspace.abo_status='gekuendigt'
 *  - customer.subscription.updated    → tier/status sync
 *  - invoice.payment_failed           → workspace.abo_status='ueberfaellig'
 *
 * ENV:
 *   STRIPE_SECRET_KEY            (Pflicht)
 *   STRIPE_WEBHOOK_SECRET        (Pflicht — pro Endpoint im Stripe-Dashboard)
 *   PROVA_SUPABASE_PROJECT_URL   (Pflicht)
 *   SUPABASE_SERVICE_ROLE_KEY    (Pflicht — nur server-side, RLS-Bypass)
 *
 * Webhook-URL für Stripe-Dashboard:
 *   https://prova-systems.de/.netlify/functions/stripe-webhook
 *   (oder via netlify.toml /webhook/stripe Alias)
 */

'use strict';

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const log = require('./lib/prova-logger');
const { tierFromPriceId } = require('./lib/prova-stripe-prices');

const STRIPE_API_VERSION = '2024-12-18.acacia';

// ── Stripe-Client (lazy, damit ENV-Fehler nicht im Module-Load auftauchen) ─
function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY fehlt');
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

// ── Supabase-Service-Role-Client (RLS-Bypass für Webhook-Writes) ───────────
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.PROVA_SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase ENV fehlt (PROVA_SUPABASE_PROJECT_URL + SUPABASE_SERVICE_ROLE_KEY)');
  _supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _supabaseAdmin;
}

// ── Idempotenz: pruefen ob Event schon verarbeitet ─────────────────────────
async function isDuplicateEvent(stripeEventId) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from('stripe_events')
    .select('id, status')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();
  return !!data;
}

// ── Event in stripe_events einfuegen (status='empfangen') ──────────────────
async function recordEventReceived(event) {
  const sb = getSupabaseAdmin();
  const obj = event.data.object;
  const row = {
    stripe_event_id:           event.id,
    event_type:                event.type,
    livemode:                  !!event.livemode,
    api_version:               event.api_version || null,
    stripe_customer_id:        obj.customer || null,
    stripe_subscription_id:    obj.subscription || (event.type.startsWith('customer.subscription') ? obj.id : null),
    stripe_invoice_id:         event.type.startsWith('invoice.') ? obj.id : null,
    stripe_payment_intent_id:  obj.payment_intent || null,
    raw_payload:               event,
    relevante_daten:           extractRelevantData(event),
    status:                    'empfangen',
    stripe_created_at:         event.created ? new Date(event.created * 1000).toISOString() : null,
    received_at:               new Date().toISOString()
  };
  const { data, error } = await sb.from('stripe_events').insert(row).select().single();
  if (error) {
    if (error.code === '23505') return null; // UNIQUE-Constraint → Duplikat
    throw error;
  }
  return data;
}

function extractRelevantData(event) {
  const obj = event.data.object;
  const out = { type: event.type };
  if (obj.customer_email) out.customer_email = obj.customer_email;
  if (obj.amount_paid) out.amount_paid = obj.amount_paid;
  if (obj.amount_total) out.amount_total = obj.amount_total;
  if (obj.currency) out.currency = obj.currency;
  if (obj.status) out.stripe_status = obj.status;
  if (obj.metadata) out.metadata = obj.metadata;
  if (obj.items && obj.items.data) {
    out.price_ids = obj.items.data
      .map(it => (it.price && it.price.id) || (it.plan && it.plan.id))
      .filter(Boolean);
  }
  return out;
}

// ── Workspace-Lookup via stripe_customer_id ODER billing_email ─────────────
async function findWorkspaceByCustomer(customerId, fallbackEmail) {
  const sb = getSupabaseAdmin();
  if (customerId) {
    const { data } = await sb
      .from('workspaces')
      .select('id, abo_tier, abo_status, billing_email, gesamtzahlungen_lifetime_eur')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (data) return data;
  }
  if (fallbackEmail) {
    const email = String(fallbackEmail).trim().toLowerCase();
    // 1. Versuch über workspaces.billing_email
    const { data } = await sb
      .from('workspaces')
      .select('id, abo_tier, abo_status, billing_email, gesamtzahlungen_lifetime_eur')
      .eq('billing_email', email)
      .maybeSingle();
    if (data) return data;
    // 2. Fallback über users.email → workspace_memberships → workspaces
    const { data: user } = await sb.from('users').select('id').eq('email', email).maybeSingle();
    if (user) {
      const { data: mship } = await sb
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (mship) {
        const { data: ws } = await sb
          .from('workspaces')
          .select('id, abo_tier, abo_status, billing_email, gesamtzahlungen_lifetime_eur')
          .eq('id', mship.workspace_id)
          .maybeSingle();
        return ws || null;
      }
    }
  }
  return null;
}

// ── Audit-Trail-Logging (DSGVO Art. 5 Abs. 1 lit. f) ───────────────────────
async function auditLog(workspaceId, userIdOrNull, type, details) {
  const sb = getSupabaseAdmin();
  try {
    await sb.from('audit_trail').insert({
      workspace_id: workspaceId || null,
      user_id:      userIdOrNull || null,
      typ:          type,
      sv_email:     null,
      details:      typeof details === 'string' ? details : JSON.stringify(details)
    });
  } catch (e) {
    // best-effort — Audit-Failure darf Webhook nicht blocken
    console.warn('[stripe-webhook] audit_trail insert failed:', e.message);
  }
}

// ── Event-Handler: checkout.session.completed ──────────────────────────────
async function handleCheckoutCompleted(event) {
  const sess = event.data.object;
  const customerId = sess.customer;
  const customerEmail = (sess.customer_email || (sess.customer_details && sess.customer_details.email) || '').toLowerCase();

  // Subscription oder One-Time-Payment?
  const isSubscription = sess.mode === 'subscription' && sess.subscription;
  const isAddonPayment = sess.mode === 'payment';

  const ws = await findWorkspaceByCustomer(customerId, customerEmail);
  if (!ws) {
    log.warn({ fn: 'stripe-webhook', event: 'no_workspace_for_checkout', customer_id: customerId, email_pseudo: '[EMAIL]' });
    return { ok: false, reason: 'no_workspace' };
  }

  const sb = getSupabaseAdmin();

  if (isSubscription) {
    const stripe = getStripeClient();
    const sub = await stripe.subscriptions.retrieve(sess.subscription, { expand: ['items.data.price'] });
    const priceId = sub.items?.data?.[0]?.price?.id || null;
    const tier    = tierFromPriceId(priceId) || (sess.metadata?.prova_plan === 'team' ? 'team' : 'solo');
    const intervalPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

    // C1: Trial-Status erkennen (Founding-Pilot oder generelle Stripe-Trial)
    const isTrialing = sub.status === 'trialing';
    const isPilot = sess.metadata?.prova_pilot === 'true' || sub.metadata?.prova_pilot === 'true';
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

    const updateFields = {
      abo_tier:                tier,
      abo_status:              isTrialing ? 'trial' : 'aktiv',
      stripe_customer_id:      customerId,
      stripe_subscription_id:  sub.id,
      stripe_price_id:         priceId,
      abrechnungs_intervall:   sub.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'jaehrlich' : 'monatlich',
      naechste_zahlung_am:     intervalPeriodEnd ? intervalPeriodEnd.slice(0, 10) : null,
      billing_email:           customerEmail || ws.billing_email,
      updated_at:              new Date().toISOString()
    };

    if (isTrialing) {
      updateFields.abo_trial_endet_am = trialEnd;
    } else {
      updateFields.abo_aktiv_seit = new Date().toISOString();
    }

    const { error } = await sb.from('workspaces').update(updateFields).eq('id', ws.id);
    if (error) throw error;

    const auditType = isPilot
      ? 'stripe.pilot.trial_started'
      : (isTrialing ? 'stripe.subscription.trial_started' : 'stripe.subscription.activated');

    await auditLog(ws.id, null, auditType, {
      stripe_event_id: event.id,
      stripe_subscription_id: sub.id,
      tier,
      price_id: priceId,
      trialing: isTrialing,
      pilot: isPilot,
      trial_end: trialEnd,
      trial_days: sub.trial_end && sub.trial_start
        ? Math.round((sub.trial_end - sub.trial_start) / 86400)
        : null
    });

    return {
      ok: true,
      action: isPilot ? 'pilot_trial_started' : (isTrialing ? 'trial_started' : 'subscription_activated'),
      workspace_id: ws.id,
      tier,
      trial_end: trialEnd
    };
  }

  if (isAddonPayment) {
    // Add-on-Kauf: aktuell nur loggen. Counter-Erhoehung Folge-Sprint
    // (Schema-Erweiterung workspaces.zusatz_kontingent oder eigene Tabelle).
    await auditLog(ws.id, null, 'stripe.addon.purchased', {
      stripe_event_id: event.id,
      session_id:      sess.id,
      amount_total:    sess.amount_total,
      currency:        sess.currency,
      line_items_meta: sess.metadata
    });
    return { ok: true, action: 'addon_logged', workspace_id: ws.id };
  }

  return { ok: true, action: 'noop' };
}

// ── Event-Handler: invoice.payment_succeeded ───────────────────────────────
async function handleInvoicePaymentSucceeded(event) {
  const inv = event.data.object;
  const customerId = inv.customer;
  let customerEmail = (inv.customer_email || '').toLowerCase();

  if (!customerEmail && customerId) {
    try {
      const stripe = getStripeClient();
      const cust = await stripe.customers.retrieve(customerId);
      customerEmail = (cust.email || '').toLowerCase();
    } catch {}
  }

  const ws = await findWorkspaceByCustomer(customerId, customerEmail);
  if (!ws) return { ok: false, reason: 'no_workspace' };

  const sb = getSupabaseAdmin();
  const betragEur = (inv.amount_paid || 0) / 100;
  const lifetimeAlt = Number(ws.gesamtzahlungen_lifetime_eur) || 0;

  // C1: Trial-zu-Paid-Transition erkennen.
  // billing_reason='subscription_cycle' nach Trial → erste echte Zahlung
  // (initial bei Trial-Start ist billing_reason='subscription_create' mit amount=0)
  const isTrialToPaidTransition = ws.abo_status === 'trial' && betragEur > 0;

  const updateFields = {
    letzte_zahlung_am:            new Date().toISOString().slice(0, 10),
    letzte_zahlung_betrag_eur:    betragEur,
    gesamtzahlungen_lifetime_eur: lifetimeAlt + betragEur,
    abo_status:                   'aktiv',
    updated_at:                   new Date().toISOString()
  };

  if (isTrialToPaidTransition) {
    updateFields.abo_aktiv_seit = new Date().toISOString();
    updateFields.abo_trial_endet_am = null;
  }

  const { error } = await sb.from('workspaces').update(updateFields).eq('id', ws.id);
  if (error) throw error;

  // Pilot-spezifische Welcome-Notification: Trial → Founding-Paid Transition
  let auditType = 'stripe.invoice.paid';
  if (isTrialToPaidTransition) {
    // Pilot? prüfe via Stripe-Subscription-Metadata
    try {
      if (inv.subscription) {
        const stripe = getStripeClient();
        const sub = await stripe.subscriptions.retrieve(inv.subscription);
        if (sub.metadata && sub.metadata.prova_pilot === 'true') {
          auditType = 'stripe.pilot.founding_paid';
        }
      }
    } catch {}
  }

  await auditLog(ws.id, null, auditType, {
    stripe_event_id: event.id,
    stripe_invoice_id: inv.id,
    betrag_eur: betragEur,
    currency: inv.currency,
    trial_to_paid: isTrialToPaidTransition,
    billing_reason: inv.billing_reason
  });

  return {
    ok: true,
    action: isTrialToPaidTransition ? (auditType === 'stripe.pilot.founding_paid' ? 'pilot_founding_paid' : 'trial_to_paid') : 'invoice_paid',
    workspace_id: ws.id,
    betrag_eur: betragEur
  };
}

// ── Event-Handler: customer.subscription.trial_will_end (3 Tage vor Trial-Ende) ──
async function handleTrialWillEnd(event) {
  const sub = event.data.object;
  const customerId = sub.customer;
  let customerEmail = (sub.metadata && sub.metadata.prova_email) || '';

  if (!customerEmail && customerId) {
    try {
      const stripe = getStripeClient();
      const cust = await stripe.customers.retrieve(customerId);
      customerEmail = (cust.email || '').toLowerCase();
    } catch {}
  }

  const ws = await findWorkspaceByCustomer(customerId, customerEmail);
  if (!ws) return { ok: false, reason: 'no_workspace' };

  const isPilot = sub.metadata && sub.metadata.prova_pilot === 'true';
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

  // workspaces.abo_status bleibt 'trial', aber Audit-Trail-Eintrag fuer Email-Trigger
  await auditLog(ws.id, null, isPilot ? 'stripe.pilot.trial_ending_soon' : 'stripe.subscription.trial_ending_soon', {
    stripe_event_id: event.id,
    stripe_subscription_id: sub.id,
    trial_end: trialEnd,
    pilot: isPilot,
    days_remaining: sub.trial_end ? Math.ceil((sub.trial_end * 1000 - Date.now()) / 86400000) : null
  });

  // Best-effort Email-Trigger via Resend/SMTP (Folge-Sprint via cron + email-templates)
  // Aktuell: nur loggen, Marcel sieht in audit_trail
  log.info({
    fn: 'stripe-webhook',
    event: 'trial_will_end',
    workspace_id: ws.id,
    pilot: isPilot,
    trial_end: trialEnd
  });

  return {
    ok: true,
    action: isPilot ? 'pilot_trial_ending_soon' : 'trial_ending_soon',
    workspace_id: ws.id,
    trial_end: trialEnd
  };
}

// ── Event-Handler: customer.subscription.deleted ───────────────────────────
async function handleSubscriptionDeleted(event) {
  const sub = event.data.object;
  const customerId = sub.customer;
  let customerEmail = (sub.metadata && sub.metadata.prova_email) || '';

  if (!customerEmail && customerId) {
    try {
      const stripe = getStripeClient();
      const cust = await stripe.customers.retrieve(customerId);
      customerEmail = (cust.email || '').toLowerCase();
    } catch {}
  }

  const ws = await findWorkspaceByCustomer(customerId, customerEmail);
  if (!ws) return { ok: false, reason: 'no_workspace' };

  const sb = getSupabaseAdmin();
  const { error } = await sb.from('workspaces').update({
    abo_status:           'gekuendigt',
    abo_gekuendigt_am:    new Date().toISOString(),
    kuendigung_zum_am:    sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString().slice(0, 10) : null,
    updated_at:           new Date().toISOString()
  }).eq('id', ws.id);
  if (error) throw error;

  await auditLog(ws.id, null, 'stripe.subscription.cancelled', {
    stripe_event_id: event.id,
    stripe_subscription_id: sub.id
  });

  return { ok: true, action: 'subscription_cancelled', workspace_id: ws.id };
}

// ── Event-Handler: invoice.payment_failed ──────────────────────────────────
async function handleInvoicePaymentFailed(event) {
  const inv = event.data.object;
  const ws = await findWorkspaceByCustomer(inv.customer, inv.customer_email);
  if (!ws) return { ok: false, reason: 'no_workspace' };

  const sb = getSupabaseAdmin();
  const { error } = await sb.from('workspaces').update({
    abo_status: 'ueberfaellig',
    updated_at: new Date().toISOString()
  }).eq('id', ws.id);
  if (error) throw error;

  await auditLog(ws.id, null, 'stripe.invoice.failed', {
    stripe_event_id: event.id,
    stripe_invoice_id: inv.id,
    attempt_count: inv.attempt_count
  });

  return { ok: true, action: 'invoice_failed', workspace_id: ws.id };
}

// ── stripe_events-Status nach Verarbeitung updaten ─────────────────────────
async function markEventProcessed(eventRowId, durationMs, result) {
  const sb = getSupabaseAdmin();
  await sb.from('stripe_events').update({
    status:                  'verarbeitet',
    verarbeitet_at:          new Date().toISOString(),
    verarbeitung_dauer_ms:   durationMs,
    auswirkung_beschreibung: typeof result === 'string' ? result : JSON.stringify(result)
  }).eq('id', eventRowId);
}

async function markEventFailed(eventRowId, durationMs, errMsg) {
  const sb = getSupabaseAdmin();
  await sb.from('stripe_events').update({
    status:                'verarbeitung_fehler',
    verarbeitet_at:        new Date().toISOString(),
    verarbeitung_dauer_ms: durationMs,
    verarbeitung_fehler:   String(errMsg).slice(0, 1000)
  }).eq('id', eventRowId);
}

async function markEventIgnored(eventRowId, reason) {
  const sb = getSupabaseAdmin();
  await sb.from('stripe_events').update({
    status:                  'ignoriert',
    verarbeitet_at:          new Date().toISOString(),
    auswirkung_beschreibung: reason
  }).eq('id', eventRowId);
}

// ── Main Handler ───────────────────────────────────────────────────────────
exports.handler = async function (event) {
  const t0 = Date.now();
  log.info({ fn: 'stripe-webhook', event: 'received', method: event.httpMethod });

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ENV-Check
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY oder STRIPE_WEBHOOK_SECRET fehlt');
    return { statusCode: 500, body: 'Webhook nicht konfiguriert' };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !(process.env.PROVA_SUPABASE_PROJECT_URL || process.env.SUPABASE_URL)) {
    console.error('[stripe-webhook] Supabase-ENV fehlt');
    return { statusCode: 500, body: 'Supabase nicht konfiguriert' };
  }

  // Body decoden
  let body = event.body;
  if (event.isBase64Encoded && body) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  // Signature-Verify (Pflicht — niemals umgehen)
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  let stripeEvent;
  try {
    const stripe = getStripeClient();
    stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn('[stripe-webhook] signature verify failed:', err.message);
    return { statusCode: 400, body: 'Webhook signature failed' };
  }

  // Idempotenz-Check
  if (await isDuplicateEvent(stripeEvent.id)) {
    log.info({ fn: 'stripe-webhook', event: 'duplicate', stripe_event_id: stripeEvent.id });
    return { statusCode: 200, body: JSON.stringify({ received: true, duplicate: true }) };
  }

  // Event recordieren (status='empfangen')
  let eventRow;
  try {
    eventRow = await recordEventReceived(stripeEvent);
  } catch (e) {
    console.error('[stripe-webhook] recordEventReceived failed:', e.message);
    return { statusCode: 500, body: 'Event-Record-Fehler' };
  }

  if (!eventRow) {
    // INSERT race-condition: Duplikat
    return { statusCode: 200, body: JSON.stringify({ received: true, duplicate: true }) };
  }

  // Event verarbeiten
  try {
    let result;
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutCompleted(stripeEvent);
        break;
      case 'invoice.payment_succeeded':
        result = await handleInvoicePaymentSucceeded(stripeEvent);
        break;
      case 'invoice.payment_failed':
        result = await handleInvoicePaymentFailed(stripeEvent);
        break;
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(stripeEvent);
        break;
      case 'customer.subscription.updated':
        // einfache Sync-Variante (Tier-Change etc.)
        result = await handleCheckoutCompleted({
          ...stripeEvent,
          data: { object: { ...stripeEvent.data.object, mode: 'subscription', subscription: stripeEvent.data.object.id } }
        });
        break;
      case 'customer.subscription.trial_will_end':
        // C1: 3 Tage vor Trial-Ende → Marcel + SV per Email informieren
        result = await handleTrialWillEnd(stripeEvent);
        break;
      default:
        await markEventIgnored(eventRow.id, 'event_type_not_handled: ' + stripeEvent.type);
        return { statusCode: 200, body: JSON.stringify({ received: true, ignored: stripeEvent.type }) };
    }

    await markEventProcessed(eventRow.id, Date.now() - t0, result || { ok: true });
    return { statusCode: 200, body: JSON.stringify({ received: true, ...result }) };

  } catch (e) {
    console.error('[stripe-webhook] handler error:', e.message);
    await markEventFailed(eventRow.id, Date.now() - t0, e.message);
    // 500 → Stripe retried automatisch (max 3 Tage, exponential Backoff)
    return { statusCode: 500, body: 'Handler error' };
  }
};
