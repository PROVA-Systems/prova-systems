#!/usr/bin/env node
/**
 * PROVA — Stripe Test-Suite (8 Szenarien)
 *
 * Erzeugt 8 Test-Checkout-Sessions inkl. Edge-Cases. Marcel klickt durch.
 * Im LIVE-Mode: ECHTE Charges → Refund-Liste am Ende.
 * Im TEST-Mode: 4242-Karte verwenden, kein echtes Geld.
 *
 * USAGE:
 *   npm run test:stripe-suite            # erzeugt URLs (kein Charge bis Marcel klickt)
 *   CONFIRM_LIVE_CHECKOUT=ja npm run ... # Live-Bestaetigung
 *
 * Szenarien:
 *   1. Solo (149€/Mo)
 *   2. Team (279€/Mo)
 *   3. Founding-Pilot (90T Trial + 99€)
 *   4. Pilot-Coupon-Validation (max-redemptions)
 *   5. Add-on-5 (25€ einmalig)
 *   6. Failed-Payment-Karte (4000000000000341 — Test-Mode)
 *   7. 3DS-Challenge (4000002500003155 — Test-Mode)
 *   8. SEPA-Erfolg (DE89370400440532013000 — Test-Mode)
 *
 * Output:
 *   - 8 Checkout-URLs zum Browser-Klicken
 *   - JSON-Report in docs/audit/STRIPE-TEST-RUN-<datum>.json
 *   - Refund-Reminder fuer Live-Mode
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

const STRIPE_API_VERSION = '2024-12-18.acacia';
const TEST_EMAIL = process.env.TEST_CHECKOUT_EMAIL || 'marcel-test+prova@example.com';

const C = {
  reset: process.stdout.isTTY ? '\x1b[0m' : '',
  green: process.stdout.isTTY ? '\x1b[32m' : '',
  red:   process.stdout.isTTY ? '\x1b[31m' : '',
  yellow:process.stdout.isTTY ? '\x1b[33m' : '',
  cyan:  process.stdout.isTTY ? '\x1b[36m' : '',
  bold:  process.stdout.isTTY ? '\x1b[1m' : '',
  dim:   process.stdout.isTTY ? '\x1b[2m' : ''
};

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error(C.red + 'STRIPE_SECRET_KEY fehlt' + C.reset);
    process.exit(1);
  }

  const isLive = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');

  console.log(C.bold + '🧪 PROVA Stripe Test-Suite (N1)' + C.reset);
  console.log(C.dim + 'Datum: ' + new Date().toISOString() + C.reset);
  console.log('');

  if (isLive && process.env.CONFIRM_LIVE_CHECKOUT !== 'ja') {
    console.log(C.red + C.bold + '⚠ LIVE-MODE — abbrechen.' + C.reset);
    console.log(C.yellow + 'Setze CONFIRM_LIVE_CHECKOUT=ja wenn Marcel die Charges + Refund will.' + C.reset);
    console.log(C.dim + 'Empfohlen: Test-Mode-Switch (sk_test_*) fuer 4242-Karte.' + C.reset);
    process.exit(1);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  const {
    resolveSoloPriceId, resolveTeamPriceId, resolveAddonPriceId, resolveFoundingCouponId
  } = require('../netlify/functions/lib/prova-stripe-prices');

  const baseUrl = (process.env.URL || 'https://prova-systems.de').replace(/\/$/, '');
  const successUrl = baseUrl + '/dashboard.html?checkout=success&session_id={CHECKOUT_SESSION_ID}&test=N1';
  const cancelUrl  = baseUrl + '/pilot.html?checkout=cancelled&test=N1';

  const scenarios = [
    {
      n: 1, label: 'Solo Subscription (149€/Mo)',
      priceId: resolveSoloPriceId(), mode: 'subscription',
      metadata: { prova_plan: 'solo', test_run: 'N1', test_szenario: '1' },
      cardHint: 'Test-Mode: 4242 4242 4242 4242  · Live: eigene Karte → SOFORT REFUND'
    },
    {
      n: 2, label: 'Team Subscription (279€/Mo)',
      priceId: resolveTeamPriceId(), mode: 'subscription',
      metadata: { prova_plan: 'team', test_run: 'N1', test_szenario: '2' },
      cardHint: '4242 4242 4242 4242 (Test) — sofort kuendigen + refund (Live)'
    },
    {
      n: 3, label: 'Founding-Pilot (90T Trial → 99€/Mo lifetime)',
      priceId: resolveSoloPriceId(), mode: 'subscription',
      metadata: { prova_plan: 'solo', prova_pilot: 'true', test_run: 'N1', test_szenario: '3' },
      couponId: resolveFoundingCouponId(),
      trialDays: 90,
      paymentMethodCollection: 'always',
      cardHint: 'Karte wird sofort verifiziert, KEINE Charge bis Tag 90 — sicher zum Testen!'
    },
    {
      n: 4, label: 'Pilot-Coupon-Validation (zeigt remaining seats)',
      priceId: resolveSoloPriceId(), mode: 'subscription',
      metadata: { prova_plan: 'solo', prova_pilot: 'true', test_run: 'N1', test_szenario: '4' },
      couponId: resolveFoundingCouponId(),
      trialDays: 90,
      paymentMethodCollection: 'always',
      _checkCouponOnly: true,
      cardHint: 'Pre-Check: zeigt verbleibende Plaetze (max_redemptions Sperre). Stripe-Sub erst bei Checkout-Klick.'
    },
    {
      n: 5, label: 'Add-on 5 Gutachten (25€ einmalig)',
      priceId: resolveAddonPriceId(5), mode: 'payment',
      metadata: { prova_plan: 'addon-5', test_run: 'N1', test_szenario: '5' },
      cardHint: 'One-Time Payment, kein Subscription-Cancel noetig'
    },
    {
      n: 6, label: 'Failed-Payment-Test (Karte 4000000000000341)',
      priceId: resolveSoloPriceId(), mode: 'subscription',
      metadata: { prova_plan: 'solo', test_run: 'N1', test_szenario: '6' },
      cardHint: 'TEST-MODE-PFLICHT: 4000 0000 0000 0341 → Stripe akzeptiert Setup, aber erste Charge faellt'
    },
    {
      n: 7, label: '3DS-Challenge-Karte (4000002500003155)',
      priceId: resolveSoloPriceId(), mode: 'subscription',
      metadata: { prova_plan: 'solo', test_run: 'N1', test_szenario: '7' },
      cardHint: 'TEST-MODE-PFLICHT: 4000 0025 0000 3155 → Stripe loest 3DS-Auth-Flow aus'
    },
    {
      n: 8, label: 'SEPA-Direktdebit (DE89370400440532013000)',
      priceId: resolveSoloPriceId(), mode: 'subscription',
      metadata: { prova_plan: 'solo', test_run: 'N1', test_szenario: '8' },
      paymentMethodTypes: ['sepa_debit'],
      cardHint: 'TEST-IBAN: DE89 3704 0044 0532 0130 00 → Mandat + Charge'
    }
  ];

  const results = [];
  console.log(C.cyan + '── Erzeuge ' + scenarios.length + ' Test-Sessions ' + '─'.repeat(40) + C.reset);
  console.log('');

  // Pre-Check Founding-Coupon
  let pilotSeatsRemaining = null;
  try {
    const cId = resolveFoundingCouponId();
    if (cId) {
      const coupon = await stripe.coupons.retrieve(cId);
      pilotSeatsRemaining = coupon.max_redemptions != null
        ? (coupon.max_redemptions - (coupon.times_redeemed || 0))
        : null;
      console.log(C.dim + 'Founding-Coupon ' + cId + ' (Pre-Check): ' + pilotSeatsRemaining + '/' + coupon.max_redemptions + ' frei' + C.reset);
      console.log('');
    }
  } catch (e) {
    console.log(C.yellow + '⚠ Founding-Coupon-Pre-Check failed: ' + e.message + C.reset);
  }

  for (const s of scenarios) {
    if (s._checkCouponOnly) {
      // Szenario 4: nur Coupon-Status, keine Session
      results.push({
        n: s.n, label: s.label, status: 'check-only',
        seats_remaining: pilotSeatsRemaining,
        cardHint: s.cardHint
      });
      console.log(C.green + '✅' + C.reset + ' ' + C.bold + s.label + C.reset);
      console.log('   ' + C.dim + 'Pre-Check: ' + pilotSeatsRemaining + ' Plaetze frei' + C.reset);
      console.log('   ' + C.dim + s.cardHint + C.reset);
      console.log('');
      continue;
    }

    const params = {
      payment_method_types: s.paymentMethodTypes || ['card', 'sepa_debit'],
      mode: s.mode,
      customer_email: TEST_EMAIL,
      line_items: [{ price: s.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: s.metadata
    };

    if (s.mode === 'subscription') {
      params.subscription_data = { metadata: s.metadata };
      if (s.trialDays) params.subscription_data.trial_period_days = s.trialDays;
      if (s.paymentMethodCollection) params.payment_method_collection = s.paymentMethodCollection;
      if (s.couponId) {
        params.discounts = [{ coupon: s.couponId }];
      } else {
        params.allow_promotion_codes = true;
      }
    }

    try {
      const session = await stripe.checkout.sessions.create(params);
      results.push({
        n: s.n, label: s.label, status: 'ok',
        sessionId: session.id, url: session.url, mode: s.mode,
        cardHint: s.cardHint
      });
      console.log(C.green + '✅' + C.reset + ' ' + C.bold + s.label + C.reset);
      console.log('   ' + C.dim + 'Session: ' + session.id + C.reset);
      console.log('   ' + C.cyan + session.url + C.reset);
      console.log('   ' + C.dim + s.cardHint + C.reset);
      console.log('');
    } catch (e) {
      results.push({ n: s.n, label: s.label, status: 'fail', error: e.message });
      console.log(C.red + '❌' + C.reset + ' ' + C.bold + s.label + C.reset);
      console.log('   ' + C.red + e.message + C.reset);
      console.log('');
    }
  }

  // Report
  const ok = results.filter(r => r.status === 'ok').length;
  const checkOnly = results.filter(r => r.status === 'check-only').length;
  const fail = results.filter(r => r.status === 'fail').length;

  console.log(C.cyan + '── Summary ' + '─'.repeat(70) + C.reset);
  console.log(C.green + '✅ ' + ok + ' Sessions erstellt' + C.reset
    + '  ' + C.dim + 'ℹ ' + checkOnly + ' check-only' + C.reset
    + '  ' + C.red + '❌ ' + fail + ' fail' + C.reset);
  console.log('');

  // JSON-Report
  const reportPath = path.join('docs', 'audit', 'STRIPE-TEST-RUN-' + new Date().toISOString().slice(0, 10) + '.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: isLive ? 'live' : (isTest ? 'test' : 'unknown'),
    pilot_seats_remaining: pilotSeatsRemaining,
    scenarios: results
  }, null, 2));
  console.log(C.dim + 'Report: ' + reportPath + C.reset);
  console.log('');

  if (isLive && ok > 0) {
    console.log(C.red + C.bold + '⚠ LIVE-MODE: Refund-Pflicht!' + C.reset);
    console.log(C.dim + 'Nach Klick durch Checkout: jede Subscription cancel + Charge refund via Stripe-Dashboard.' + C.reset);
  } else if (isTest) {
    console.log(C.dim + 'Test-Mode: 4242 4242 4242 4242 sicher. Kein Refund noetig.' + C.reset);
  }

  console.log('');
  console.log(C.cyan + 'Naechste Schritte:' + C.reset);
  console.log('  1. URLs einzeln im Browser oeffnen');
  console.log('  2. Mit ' + C.bold + 'TEST-Karten' + C.reset + ' bezahlen (Hinweise pro Szenario)');
  console.log('  3. Verify in Supabase: workspaces.abo_status, stripe_events');
  console.log('  4. ' + C.bold + 'npm run stripe-status' + C.reset + ' fuer Webhook-Health');
  console.log('  5. Bei Live-Mode: Refund + Subscription-Cancel');

  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
