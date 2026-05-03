#!/usr/bin/env node
/**
 * PROVA — Stripe-Setup Verification
 *
 * Verifiziert in <30s die komplette Stripe + Supabase-Konfiguration.
 *
 * USAGE:
 *   node scripts/verify-stripe-setup.js
 *   ODER:
 *   npm run verify-stripe
 *
 * EXIT-CODES:
 *   0 — alles ✅
 *   1 — mind. ein Check ❌
 *
 * ENV (aus .env.local oder Netlify-Env, je nachdem wo es laeuft):
 *   STRIPE_SECRET_KEY            (Pflicht)
 *   STRIPE_PUBLISHABLE_KEY       (Pflicht — Format-Check)
 *   STRIPE_WEBHOOK_SECRET        (Pflicht — Format-Check)
 *   STRIPE_FOUNDING_COUPON_ID    (Pflicht — sonst kein Founding-Test)
 *   PROVA_SUPABASE_PROJECT_URL   (Pflicht)
 *   SUPABASE_SERVICE_ROLE_KEY    (Pflicht)
 *   STRIPE_PRICE_SOLO/TEAM/ADDON_5/10/20  (Optional — Default-Check sonst)
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const STRIPE_API_VERSION = '2024-12-18.acacia';

// ── ANSI-Farben (auch ohne TTY akzeptabel) ─────────────────────────────────
const isTty = process.stdout.isTTY;
const C = {
  reset:  isTty ? '\x1b[0m' : '',
  green:  isTty ? '\x1b[32m' : '',
  red:    isTty ? '\x1b[31m' : '',
  yellow: isTty ? '\x1b[33m' : '',
  cyan:   isTty ? '\x1b[36m' : '',
  bold:   isTty ? '\x1b[1m' : '',
  dim:    isTty ? '\x1b[2m' : ''
};

const results = [];

function check(name, status, detail) {
  const symbol = status === 'pass' ? '✅' : (status === 'warn' ? '⚠️' : '❌');
  const color  = status === 'pass' ? C.green : (status === 'warn' ? C.yellow : C.red);
  results.push({ name, status, detail });
  console.log(`${color}${symbol}${C.reset}  ${C.bold}${name}${C.reset}${detail ? `  ${C.dim}${detail}${C.reset}` : ''}`);
}

function section(title) {
  console.log('');
  console.log(`${C.cyan}── ${title} ${'─'.repeat(Math.max(0, 70 - title.length))}${C.reset}`);
}

function envOk(name, predicate, exampleFormat) {
  const val = process.env[name];
  if (!val) return check(name + ' fehlt', 'fail', 'Pflicht — siehe docs/strategie/STRIPE-SETUP.md');
  if (predicate && !predicate(val)) return check(name + ' Format ungueltig', 'fail', exampleFormat ? 'erwartet: ' + exampleFormat : '');
  check(name, 'pass', val.slice(0, 12) + '…');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${C.bold}🔍 PROVA Stripe-Setup Verification${C.reset}`);
  console.log(`${C.dim}Datum: ${new Date().toISOString().slice(0,19)}${C.reset}`);

  // 1. ENV-Vars Format-Check ───────────────────────────────────────────────
  section('1. ENV-Vars (Format-Check)');

  const stripeSecretOk = envOk('STRIPE_SECRET_KEY', v => /^sk_(live|test)_[A-Za-z0-9]{20,}$/.test(v), 'sk_live_… oder sk_test_…');
  envOk('STRIPE_PUBLISHABLE_KEY', v => /^pk_(live|test)_[A-Za-z0-9]{20,}$/.test(v), 'pk_live_… oder pk_test_…');
  const webhookSecretOk = envOk('STRIPE_WEBHOOK_SECRET', v => /^whsec_[A-Za-z0-9]{20,}$/.test(v), 'whsec_…');
  envOk('STRIPE_FOUNDING_COUPON_ID', v => v.length >= 3, 'z.B. FOUNDING-99');

  const supabaseUrlOk = envOk('PROVA_SUPABASE_PROJECT_URL', v => /^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(v), 'https://<project>.supabase.co');
  const supabaseSrkOk = envOk('SUPABASE_SERVICE_ROLE_KEY', v => /^eyJ/.test(v), 'eyJ…(JWT)');

  // Optional Price-IDs
  ['STRIPE_PRICE_SOLO', 'STRIPE_PRICE_TEAM', 'STRIPE_PRICE_ADDON_5', 'STRIPE_PRICE_ADDON_10', 'STRIPE_PRICE_ADDON_20'].forEach(name => {
    const v = process.env[name];
    if (!v) check(name, 'warn', 'nicht gesetzt — Default aus prova-stripe-prices.js wird genutzt');
    else if (!/^price_[A-Za-z0-9]{20,}$/.test(v)) check(name + ' Format', 'fail', 'erwartet: price_…');
    else check(name, 'pass', v.slice(0, 12) + '…');
  });

  if (!stripeSecretOk || !webhookSecretOk || !supabaseUrlOk || !supabaseSrkOk) {
    console.log('');
    console.log(`${C.red}${C.bold}Aborting: Pflicht-ENV-Vars fehlen.${C.reset}`);
    summary();
    process.exit(1);
  }

  // 2. Stripe-API: Live-Key Validierung ────────────────────────────────────
  section('2. Stripe-API (Live-Key valide?)');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  let account;
  try {
    account = await stripe.accounts.retrieve();
    check('Stripe-API erreichbar', 'pass',
      `Account: ${account.id} · Country: ${account.country} · Charges enabled: ${account.charges_enabled}`);
  } catch (e) {
    check('Stripe-API-Call fehlgeschlagen', 'fail', e.message);
    summary(); process.exit(1);
  }

  if (!account.charges_enabled) {
    check('Stripe-Account akzeptiert KEINE Zahlungen', 'fail',
      'Marcel: Stripe-Onboarding abschliessen (Identitaets-Verifikation, Bank-Daten)');
  }

  // 3. Webhook-Endpoint via Stripe-API holen ───────────────────────────────
  section('3. Webhook-Endpoint im Stripe-Dashboard');

  const expectedUrl = 'https://prova-systems.de/.netlify/functions/stripe-webhook';
  const expectedAltUrl = 'https://app.prova-systems.de/.netlify/functions/stripe-webhook';
  const expectedEvents = [
    'checkout.session.completed',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.subscription.deleted',
    'customer.subscription.updated'
  ];

  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const provaEndpoint = endpoints.data.find(ep =>
      ep.url === expectedUrl || ep.url === expectedAltUrl
    );

    if (!provaEndpoint) {
      check('Webhook-Endpoint NICHT gefunden', 'fail',
        `erwartet: ${expectedUrl} (oder ${expectedAltUrl})`);
    } else {
      check('Webhook-Endpoint existiert', 'pass', provaEndpoint.url + ' (status: ' + provaEndpoint.status + ')');

      if (provaEndpoint.status !== 'enabled') {
        check('Webhook-Endpoint nicht aktiv', 'fail', 'status: ' + provaEndpoint.status);
      }

      const subscribedEvents = new Set(provaEndpoint.enabled_events);
      const missing = expectedEvents.filter(e => !subscribedEvents.has(e) && !subscribedEvents.has('*'));
      if (missing.length === 0) {
        check('Alle 5 Pflicht-Events abonniert', 'pass', expectedEvents.length + ' Events');
      } else {
        check('Fehlende Pflicht-Events', 'fail', missing.join(', '));
      }
    }
  } catch (e) {
    check('Webhook-Endpoints-API fehlgeschlagen', 'fail', e.message);
  }

  // 4. Founding-Coupon ───────────────────────────────────────────────────────
  section('4. Founding-Coupon');

  try {
    const couponId = process.env.STRIPE_FOUNDING_COUPON_ID;
    const coupon = await stripe.coupons.retrieve(couponId);
    if (!coupon.valid) {
      check('Coupon nicht mehr gueltig', 'fail',
        'redeem_by abgelaufen oder max_redemptions erreicht');
    } else {
      const detail = [
        coupon.amount_off ? `${coupon.amount_off / 100}${coupon.currency.toUpperCase()} off` : `${coupon.percent_off}% off`,
        coupon.duration === 'forever' ? 'lifetime' : coupon.duration,
        coupon.max_redemptions ? `max ${coupon.max_redemptions} Plaetze` : 'unbegrenzt',
        `${coupon.times_redeemed} eingeloest`
      ].join(' · ');
      check('Coupon ' + couponId + ' aktiv', 'pass', detail);

      if (coupon.duration !== 'forever') {
        check('Coupon-Dauer NICHT lifetime', 'warn',
          'Erwartet: forever — aktuell: ' + coupon.duration);
      }
      if (coupon.amount_off !== 5000 || coupon.currency !== 'eur') {
        check('Coupon-Discount nicht 50 EUR', 'warn',
          'Erwartet: 50.00 EUR — aktuell: ' + (coupon.amount_off ? coupon.amount_off/100 + ' ' + coupon.currency : coupon.percent_off + '%'));
      }
    }
  } catch (e) {
    if (e.code === 'resource_missing') {
      check('Founding-Coupon nicht gefunden', 'fail',
        'Im Stripe-Dashboard anlegen — Doku in docs/strategie/STRIPE-SETUP.md');
    } else {
      check('Coupon-Lookup fehlgeschlagen', 'fail', e.message);
    }
  }

  // 5. Price-IDs aktiv? ─────────────────────────────────────────────────────
  section('5. Price-IDs (existieren + aktiv im Stripe-Account)');

  const {
    resolveSoloPriceId,
    resolveTeamPriceId,
    resolveAddonPriceId
  } = require('../netlify/functions/lib/prova-stripe-prices');

  const priceMap = {
    'Solo (149€/Mo)':       resolveSoloPriceId(),
    'Team (279€/Mo)':       resolveTeamPriceId(),
    'Add-on 5 (25€)':       resolveAddonPriceId(5),
    'Add-on 10 (45€)':      resolveAddonPriceId(10),
    'Add-on 20 (80€)':      resolveAddonPriceId(20)
  };

  for (const [label, priceId] of Object.entries(priceMap)) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) {
        check(label, 'fail', 'inaktiv im Stripe-Account: ' + priceId);
      } else {
        const amount = (price.unit_amount || 0) / 100;
        const interval = price.recurring ? '/' + price.recurring.interval : ' einmalig';
        check(label, 'pass', amount + ' ' + price.currency.toUpperCase() + interval + ' · ' + priceId);
      }
    } catch (e) {
      if (e.code === 'resource_missing') {
        check(label, 'fail', 'Price-ID nicht gefunden: ' + priceId);
      } else {
        check(label, 'fail', e.message);
      }
    }
  }

  // 6. Supabase Service-Role-Test ──────────────────────────────────────────
  section('6. Supabase (Service-Role-Key)');
  try {
    const sb = createClient(process.env.PROVA_SUPABASE_PROJECT_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // RLS-Bypass-Test: workspaces zaehlen
    const { count, error } = await sb.from('workspaces').select('*', { count: 'exact', head: true });
    if (error) {
      check('Supabase workspaces-Read', 'fail', error.message);
    } else {
      check('Supabase workspaces-Read', 'pass', `${count} Workspaces gesamt (RLS-Bypass aktiv)`);
    }

    // stripe_events-Tabelle existiert
    const { error: seError } = await sb.from('stripe_events').select('id', { head: true, count: 'exact' });
    if (seError) {
      check('Supabase stripe_events-Tabelle', 'fail', seError.message);
    } else {
      check('Supabase stripe_events-Tabelle', 'pass', 'erreichbar');
    }

    // audit_trail-Tabelle existiert
    const { error: atError } = await sb.from('audit_trail').select('id', { head: true, count: 'exact' });
    if (atError) {
      check('Supabase audit_trail-Tabelle', 'fail', atError.message);
    } else {
      check('Supabase audit_trail-Tabelle', 'pass', 'erreichbar');
    }
  } catch (e) {
    check('Supabase-Client fehlgeschlagen', 'fail', e.message);
  }

  // 7. Customer-Portal Status (Stripe-API) ──────────────────────────────────
  section('7. Customer-Portal');
  try {
    // Versuch: Portal-Configuration abrufen
    const configs = await stripe.billingPortal.configurations.list({ limit: 1 });
    if (configs.data.length === 0) {
      check('Customer-Portal nicht konfiguriert', 'fail',
        'Marcel: Stripe-Dashboard → Settings → Billing → Customer Portal aktivieren');
    } else {
      const cfg = configs.data[0];
      check('Customer-Portal aktiv', 'pass',
        'Default: ' + (cfg.is_default ? 'ja' : 'nein') + ' · Active: ' + cfg.active);
    }
  } catch (e) {
    check('Customer-Portal-Status', 'warn', e.message);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  summary();

  const fails = results.filter(r => r.status === 'fail').length;
  process.exit(fails === 0 ? 0 : 1);
}

function summary() {
  console.log('');
  console.log(`${C.cyan}── Summary ${'─'.repeat(70)}${C.reset}`);
  const pass = results.filter(r => r.status === 'pass').length;
  const warn = results.filter(r => r.status === 'warn').length;
  const fail = results.filter(r => r.status === 'fail').length;
  console.log(`${C.green}✅ ${pass} pass${C.reset}  ${C.yellow}⚠️  ${warn} warn${C.reset}  ${C.red}❌ ${fail} fail${C.reset}`);

  if (fail === 0) {
    console.log('');
    console.log(`${C.green}${C.bold}🎉 Alle Pflicht-Checks gruen!${C.reset}`);
    if (warn > 0) {
      console.log(`${C.yellow}Hinweise (warn) sind nicht blockierend, aber Marcel sollte sie pruefen.${C.reset}`);
    }
    console.log('');
    console.log(`${C.dim}Naechste Schritte:${C.reset}`);
    console.log('  npm run test-checkouts   ← Test-Checkouts erzeugen (4242-Karte)');
    console.log('  npm run test-webhook     ← Webhook-Mock-Test');
  } else {
    console.log('');
    console.log(`${C.red}${C.bold}Setup unvollstaendig.${C.reset} Siehe docs/strategie/STRIPE-VERIFICATION-RUNBOOK.md fuer Troubleshooting.`);
  }
}

main().catch(e => {
  console.error(`${C.red}FATAL:${C.reset}`, e);
  process.exit(2);
});
