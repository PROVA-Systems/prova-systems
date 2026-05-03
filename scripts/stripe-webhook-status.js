#!/usr/bin/env node
/**
 * PROVA — Stripe-Webhook-Status (Live-Monitoring)
 *
 * Holt die letzten 50 Webhook-Delivery-Attempts via Stripe-API und
 * korreliert mit stripe_events-Table in Supabase.
 *
 * USAGE:
 *   npm run stripe-status
 *
 * Output: farbige Tabelle pro Event:
 *   - Stripe-Event-ID
 *   - Event-Type
 *   - Stripe-Delivery-Status (delivered / pending / failed)
 *   - PROVA-Status (verarbeitet / verarbeitung_fehler / ignoriert / fehlt)
 *   - Workspace-ID falls verknuepft
 *
 * EXIT-CODES:
 *   0 — alle delivered + verarbeitet
 *   1 — mind. 1 Failed-Delivery oder Verarbeitung_fehler
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const STRIPE_API_VERSION = '2024-12-18.acacia';

const C = {
  reset:  process.stdout.isTTY ? '\x1b[0m' : '',
  green:  process.stdout.isTTY ? '\x1b[32m' : '',
  red:    process.stdout.isTTY ? '\x1b[31m' : '',
  yellow: process.stdout.isTTY ? '\x1b[33m' : '',
  cyan:   process.stdout.isTTY ? '\x1b[36m' : '',
  bold:   process.stdout.isTTY ? '\x1b[1m' : '',
  dim:    process.stdout.isTTY ? '\x1b[2m' : '',
  gray:   process.stdout.isTTY ? '\x1b[90m' : ''
};

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error(`${C.red}STRIPE_SECRET_KEY fehlt.${C.reset}`);
    process.exit(1);
  }
  if (!process.env.PROVA_SUPABASE_PROJECT_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`${C.red}Supabase ENV fehlt.${C.reset}`);
    process.exit(1);
  }

  console.log(`${C.bold}🔌 PROVA Stripe-Webhook-Status${C.reset}`);
  console.log(`${C.dim}Datum: ${new Date().toISOString().slice(0,19)}${C.reset}`);
  console.log('');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  const sb = createClient(process.env.PROVA_SUPABASE_PROJECT_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ── 1. Webhook-Endpoints holen ─────────────────────────────────────────────
  const expectedUrl1 = 'https://prova-systems.de/.netlify/functions/stripe-webhook';
  const expectedUrl2 = 'https://app.prova-systems.de/.netlify/functions/stripe-webhook';
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const provaEndpoints = endpoints.data.filter(ep =>
    ep.url === expectedUrl1 || ep.url === expectedUrl2
  );

  if (!provaEndpoints.length) {
    console.error(`${C.red}❌ Kein PROVA-Webhook-Endpoint im Stripe-Dashboard${C.reset}`);
    process.exit(1);
  }

  console.log(`${C.cyan}── Webhook-Endpoints ${'─'.repeat(60)}${C.reset}`);
  for (const ep of provaEndpoints) {
    const statusColor = ep.status === 'enabled' ? C.green : C.red;
    console.log(`${statusColor}${ep.status === 'enabled' ? '✅' : '❌'}${C.reset} ${ep.url}  ${C.dim}(${ep.id})${C.reset}`);
    console.log(`   Events: ${ep.enabled_events.length} subscribed`);
  }
  console.log('');

  // ── 2. Letzte 50 Events via Stripe-API ─────────────────────────────────────
  console.log(`${C.cyan}── Letzte 50 Stripe-Events ${'─'.repeat(55)}${C.reset}`);
  const events = await stripe.events.list({ limit: 50 });

  // ── 3. stripe_events-Korrelation aus Supabase ──────────────────────────────
  const stripeEventIds = events.data.map(e => e.id);
  const { data: dbEvents } = await sb
    .from('stripe_events')
    .select('stripe_event_id, status, verarbeitet_at, verarbeitung_fehler, auswirkung_beschreibung, workspace_id')
    .in('stripe_event_id', stripeEventIds);

  const dbEventMap = new Map();
  for (const r of (dbEvents || [])) dbEventMap.set(r.stripe_event_id, r);

  // ── 4. Pro Event ausgeben ──────────────────────────────────────────────────
  let okCount = 0;
  let failCount = 0;
  let missingCount = 0;

  console.log(`${C.dim}${pad('Stripe-ID', 25)} ${pad('Type', 38)} ${pad('PROVA-Status', 22)} ${pad('Created', 12)}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(99)}${C.reset}`);

  for (const evt of events.data) {
    const db = dbEventMap.get(evt.id);
    const created = new Date(evt.created * 1000).toISOString().slice(11, 19);
    let statusStr;
    let lineColor = '';

    if (!db) {
      statusStr = 'fehlt in DB';
      lineColor = C.yellow;
      missingCount++;
    } else if (db.status === 'verarbeitet' || db.status === 'duplikat' || db.status === 'ignoriert') {
      statusStr = '✅ ' + db.status;
      lineColor = C.green;
      okCount++;
    } else if (db.status === 'verarbeitung_fehler') {
      statusStr = '❌ fehler';
      lineColor = C.red;
      failCount++;
    } else {
      statusStr = '⚠️ ' + db.status;
      lineColor = C.yellow;
    }

    const typeShort = evt.type.length > 36 ? evt.type.slice(0, 35) + '…' : evt.type;
    console.log(
      lineColor +
      pad(evt.id.slice(0, 24), 25) + ' ' +
      pad(typeShort, 38) + ' ' +
      pad(statusStr, 22) + ' ' +
      pad(created, 12) +
      C.reset
    );

    if (db && db.verarbeitung_fehler) {
      console.log(`   ${C.dim}└─ ${db.verarbeitung_fehler.slice(0, 90)}${C.reset}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('');
  console.log(`${C.cyan}── Summary ${'─'.repeat(70)}${C.reset}`);
  console.log(`${C.green}✅ ${okCount} verarbeitet${C.reset}  ${C.red}❌ ${failCount} fehler${C.reset}  ${C.yellow}⚠️  ${missingCount} fehlt in DB${C.reset}`);

  if (missingCount > 0) {
    console.log('');
    console.log(`${C.yellow}Hinweis:${C.reset} ${missingCount} Events ohne stripe_events-Eintrag.`);
    console.log(`${C.dim}Mögliche Gründe:${C.reset}`);
    console.log(`  - Event-Type wird nicht von PROVA-Webhook gehandelt (default-case → ignoriert)`);
    console.log(`  - Webhook-Endpoint nicht aktiviert für diesen Event-Type`);
    console.log(`  - Webhook-Failure (siehe ${C.bold}npm run stripe-replay${C.reset})`);
  }

  if (failCount > 0) {
    console.log(`${C.red}Failed-Events: ${C.bold}npm run stripe-replay${C.reset}${C.red} um Re-Delivery zu triggern${C.reset}`);
    process.exit(1);
  }

  process.exit(0);
}

function pad(s, n) {
  s = String(s);
  if (s.length >= n) return s.slice(0, n);
  return s + ' '.repeat(n - s.length);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
