#!/usr/bin/env node
/**
 * PROVA — Test-Checkout-URL-Generator
 *
 * Erzeugt 6 Test-Checkout-Sessions direkt via Stripe-API (umgeht die
 * stripe-checkout-Function — verifiziert die Stripe-Config selbst).
 *
 * USAGE:
 *   node scripts/test-stripe-checkout.js
 *   ODER:
 *   npm run test-checkouts
 *
 * Output: 6 URLs zum Browser-Oeffnen.
 *
 * ⚠ LIVE-MODE-WARNUNG:
 *   - Wenn STRIPE_SECRET_KEY mit sk_live_ beginnt: ECHTES Geld
 *   - Test-Karte 4242 4242 4242 4242 funktioniert NUR im Test-Mode
 *   - Im Live-Mode: Marcel zahlt selbst + sofort refunden via Dashboard
 *   - Empfehlung: vor Test-Run STRIPE_SECRET_KEY temporaer auf sk_test_ aendern,
 *     ODER eigenen Test-Mode-Account waehlen.
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const STRIPE_API_VERSION = '2024-12-18.acacia';

const C = {
  reset:  process.stdout.isTTY ? '\x1b[0m' : '',
  green:  process.stdout.isTTY ? '\x1b[32m' : '',
  red:    process.stdout.isTTY ? '\x1b[31m' : '',
  yellow: process.stdout.isTTY ? '\x1b[33m' : '',
  cyan:   process.stdout.isTTY ? '\x1b[36m' : '',
  bold:   process.stdout.isTTY ? '\x1b[1m' : '',
  dim:    process.stdout.isTTY ? '\x1b[2m' : ''
};

const TEST_EMAIL = process.env.TEST_CHECKOUT_EMAIL || 'marcel.schreiber891@gmail.com';

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error(`${C.red}STRIPE_SECRET_KEY fehlt — abbruch.${C.reset}`);
    process.exit(1);
  }

  const isLive = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');

  console.log(`${C.bold}🧪 PROVA Stripe Test-Checkout-Generator${C.reset}`);
  console.log(`${C.dim}Datum: ${new Date().toISOString().slice(0,19)}${C.reset}`);
  console.log('');

  if (isLive) {
    console.log(`${C.red}${C.bold}⚠️  LIVE-MODE AKTIV — ECHTES GELD${C.reset}`);
    console.log(`${C.yellow}Empfehlung:${C.reset}`);
    console.log('  1. Diesen Skript NICHT laufen lassen, oder');
    console.log('  2. STRIPE_SECRET_KEY temporaer auf sk_test_… umstellen, oder');
    console.log('  3. Echte Zahlung + sofort refund via Stripe-Dashboard');
    console.log('');
    console.log(`${C.dim}Trotzdem fortfahren? Setze CONFIRM_LIVE_CHECKOUT=ja als ENV.${C.reset}`);
    if (process.env.CONFIRM_LIVE_CHECKOUT !== 'ja') {
      process.exit(1);
    }
    console.log(`${C.yellow}Live-Mode bestaetigt — fortfahren.${C.reset}`);
    console.log('');
  } else if (!isTest) {
    console.log(`${C.yellow}⚠ STRIPE_SECRET_KEY hat unbekanntes Prefix${C.reset}`);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  const {
    resolveSoloPriceId, resolveTeamPriceId, resolveAddonPriceId,
    resolveFoundingCouponId
  } = require('../netlify/functions/lib/prova-stripe-prices');

  const baseUrl = (process.env.URL || 'https://prova-systems.de').replace(/\/$/, '');
  const successUrl = baseUrl + '/dashboard.html?checkout=success&session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl  = baseUrl + '/einstellungen.html?checkout=cancelled';

  const scenarios = [
    {
      label:    'Solo (149€/Mo Subscription)',
      priceId:  resolveSoloPriceId(),
      mode:     'subscription',
      metadata: { prova_plan: 'solo', test_run: '1' }
    },
    {
      label:    'Founding-Pilot (90T Trial + 99€/Mo lifetime)',
      priceId:  resolveSoloPriceId(),
      mode:     'subscription',
      metadata: { prova_plan: 'solo', prova_pilot: 'true', test_run: '1' },
      couponId: resolveFoundingCouponId(),
      trialDays: 90,
      paymentMethodCollection: 'always'
    },
    {
      label:    'Team (279€/Mo Subscription)',
      priceId:  resolveTeamPriceId(),
      mode:     'subscription',
      metadata: { prova_plan: 'team', test_run: '1' }
    },
    {
      label:    'Founding Solo (99€ lifetime via Coupon)',
      priceId:  resolveSoloPriceId(),
      mode:     'subscription',
      metadata: { prova_plan: 'solo', coupon: 'founding', test_run: '1' },
      couponId: resolveFoundingCouponId()
    },
    {
      label:    'Add-on 5 Gutachten (25€ einmalig)',
      priceId:  resolveAddonPriceId(5),
      mode:     'payment',
      metadata: { prova_plan: 'addon-5', test_run: '1' }
    },
    {
      label:    'Add-on 10 Gutachten (45€ einmalig)',
      priceId:  resolveAddonPriceId(10),
      mode:     'payment',
      metadata: { prova_plan: 'addon-10', test_run: '1' }
    },
    {
      label:    'Add-on 20 Gutachten (80€ einmalig)',
      priceId:  resolveAddonPriceId(20),
      mode:     'payment',
      metadata: { prova_plan: 'addon-20', test_run: '1' }
    }
  ];

  console.log(`${C.cyan}── Erzeuge ${scenarios.length} Test-Checkout-Sessions ${'─'.repeat(40)}${C.reset}`);
  console.log('');

  const results = [];

  for (const scenario of scenarios) {
    const params = {
      payment_method_types: ['card', 'sepa_debit'],
      mode:                 scenario.mode,
      customer_email:       TEST_EMAIL,
      line_items:           [{ price: scenario.priceId, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      metadata:             scenario.metadata
    };

    if (scenario.mode === 'subscription') {
      params.subscription_data = { metadata: scenario.metadata };
      if (scenario.trialDays) {
        params.subscription_data.trial_period_days = scenario.trialDays;
      }
      if (scenario.paymentMethodCollection) {
        params.payment_method_collection = scenario.paymentMethodCollection;
      }
      if (scenario.couponId) {
        params.discounts = [{ coupon: scenario.couponId }];
      } else {
        params.allow_promotion_codes = true;
      }
    }

    try {
      const session = await stripe.checkout.sessions.create(params);
      results.push({ label: scenario.label, url: session.url, sessionId: session.id, status: 'ok' });
      console.log(`${C.green}✅${C.reset} ${C.bold}${scenario.label}${C.reset}`);
      console.log(`   ${C.dim}Session: ${session.id}${C.reset}`);
      console.log(`   ${C.cyan}${session.url}${C.reset}`);
      console.log('');
    } catch (e) {
      results.push({ label: scenario.label, error: e.message, status: 'fail' });
      console.log(`${C.red}❌${C.reset} ${C.bold}${scenario.label}${C.reset}`);
      console.log(`   ${C.red}${e.message}${C.reset}`);
      console.log('');
    }
  }

  console.log(`${C.cyan}── Zusammenfassung ${'─'.repeat(60)}${C.reset}`);
  const ok   = results.filter(r => r.status === 'ok').length;
  const fail = results.filter(r => r.status === 'fail').length;
  console.log(`${C.green}✅ ${ok} erstellt${C.reset}  ${C.red}❌ ${fail} fehlgeschlagen${C.reset}`);
  console.log('');

  if (fail === 0) {
    console.log(`${C.green}${C.bold}Alle 6 Test-Sessions verfuegbar.${C.reset}`);
    console.log('');
    console.log(`${C.dim}Naechste Schritte:${C.reset}`);
    console.log(`  1. URLs einzeln im Browser oeffnen`);
    if (isTest) {
      console.log(`  2. Test-Karte: ${C.bold}4242 4242 4242 4242${C.reset} (jedes Datum, jeder CVC)`);
      console.log(`  3. SEPA-Test-IBAN: ${C.bold}DE89370400440532013000${C.reset}`);
    } else {
      console.log(`  2. ${C.yellow}LIVE-Mode: nutze echte Karte + sofort refund via Stripe-Dashboard${C.reset}`);
    }
    console.log(`  4. Nach Checkout: workspaces.abo_status pruefen in Supabase`);
    console.log(`  5. stripe_events-Tabelle pruefen: status='verarbeitet'`);
    console.log(`  6. audit_trail-Tabelle: stripe.subscription.activated`);
  }

  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
