/**
 * PROVA Systems — Stripe Customer Portal v2
 *
 * Sprint Stripe-Migration 03.05.2026:
 *  - Customer-Lookup primär via workspaces.stripe_customer_id (Supabase)
 *  - Fallback: stripe.customers.list({email})
 *  - Email aus JWT statt Body (Defense-in-Depth)
 *  - Stripe-SDK 22.x mit explizit gepinnter API-Version
 *
 * POST /.netlify/functions/stripe-portal
 *   body: { return_url?: "https://..." }
 *   → 200 { url: "https://billing.stripe.com/p/session/..." }
 *
 * Env: STRIPE_SECRET_KEY, PROVA_SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY
 */

'use strict';

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');

const STRIPE_API_VERSION = '2024-12-18.acacia';

let _currentEvent = null;

const DEFAULT_RETURN = 'https://prova-systems.de/einstellungen.html#paket';

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.PROVA_SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  _supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _supabase;
}

async function findStripeCustomerIdForEmail(email, stripe) {
  // 1. Versuch über Supabase: users → workspace_memberships → workspaces.stripe_customer_id
  const sb = getSupabase();
  if (sb) {
    const { data: user } = await sb.from('users').select('id').eq('email', email).maybeSingle();
    if (user) {
      const { data: ms } = await sb
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (ms) {
        const { data: ws } = await sb
          .from('workspaces')
          .select('stripe_customer_id')
          .eq('id', ms.workspace_id)
          .maybeSingle();
        if (ws && ws.stripe_customer_id) return ws.stripe_customer_id;
      }
    }
  }

  // 2. Fallback: Stripe-API-Lookup
  const list = await stripe.customers.list({ email, limit: 1 });
  if (list.data.length) return list.data[0].id;

  return null;
}

exports.handler = requireAuth(async (event, context) => {
  _currentEvent = event;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'STRIPE_SECRET_KEY nicht konfiguriert' }) };
  }

  // Email aus JWT (nicht Body — Defense-in-Depth)
  const email = String(context.userEmail || '').toLowerCase();
  if (!email) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Email aus Token fehlt' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch { /* OK — body optional */ }
  const return_url = body.return_url || DEFAULT_RETURN;

  try {
    const stripe = new Stripe(secret, { apiVersion: STRIPE_API_VERSION });
    const customerId = await findStripeCustomerIdForEmail(email, stripe);

    if (!customerId) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: 'Kein Stripe-Kunde mit dieser E-Mail gefunden',
          hint:  'Der SV muss zuerst ein Abo oder Trial abgeschlossen haben.'
        })
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url
    });

    console.log('[stripe-portal] session erstellt fuer ' + email);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ url: session.url })
    };

  } catch (e) {
    console.error('[stripe-portal] Fehler:', e.message);
    const msg = e.type === 'StripeInvalidRequestError'
      ? 'Stripe-Konfiguration fehlt — Customer Portal im Dashboard aktivieren'
      : e.message;
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: msg })
    };
  }
});

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    ...getCorsHeaders(_currentEvent)
  };
}
