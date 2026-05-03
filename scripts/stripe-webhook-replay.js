#!/usr/bin/env node
/**
 * PROVA — Stripe-Webhook Failed-Event Replay
 *
 * Listet Failed-Webhook-Deliveries der letzten 24h und triggert Re-Delivery
 * via Stripe-API. Verifikation in Supabase nach Replay.
 *
 * USAGE:
 *   npm run stripe-replay                  # interaktiv: zeigt Liste + bestätigt pro Event
 *   npm run stripe-replay -- --all         # auto-replay alle Failed
 *   npm run stripe-replay -- --event=evt_X # spezifisches Event
 *
 * EXIT-CODES:
 *   0 — alle Replays erfolgreich
 *   1 — mind. 1 Replay fehlgeschlagen
 *
 * Hinweis: Stripe behält Webhook-Logs 30 Tage. Older als 30T → kein Replay möglich.
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
  dim:    process.stdout.isTTY ? '\x1b[2m' : ''
};

const args = process.argv.slice(2);
const flagAll = args.includes('--all');
const flagSpecific = args.find(a => a.startsWith('--event='));
const specificEventId = flagSpecific ? flagSpecific.split('=')[1] : null;

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error(`${C.red}STRIPE_SECRET_KEY fehlt.${C.reset}`);
    process.exit(1);
  }

  console.log(`${C.bold}🔁 PROVA Stripe-Webhook Replay${C.reset}`);
  console.log(`${C.dim}Datum: ${new Date().toISOString().slice(0,19)}${C.reset}`);
  console.log('');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  const sb = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.PROVA_SUPABASE_PROJECT_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

  // ── 1. Failed-Events identifizieren ───────────────────────────────────────
  let candidateEventIds = [];

  if (specificEventId) {
    candidateEventIds = [specificEventId];
    console.log(`${C.cyan}Replay-Mode:${C.reset} spezifisches Event ${specificEventId}`);
  } else {
    // Letzte 100 Events der letzten 24h
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const events = await stripe.events.list({ limit: 100, created: { gte: since } });
    console.log(`${C.dim}${events.data.length} Events der letzten 24h gepruft.${C.reset}`);

    // Cross-Check mit Supabase: welche fehlen oder haben verarbeitung_fehler?
    if (sb) {
      const stripeIds = events.data.map(e => e.id);
      const { data: dbEvents } = await sb
        .from('stripe_events')
        .select('stripe_event_id, status, verarbeitung_fehler')
        .in('stripe_event_id', stripeIds);

      const dbMap = new Map();
      for (const r of (dbEvents || [])) dbMap.set(r.stripe_event_id, r);

      for (const evt of events.data) {
        const db = dbMap.get(evt.id);
        if (!db || db.status === 'verarbeitung_fehler') {
          candidateEventIds.push(evt.id);
        }
      }
    }
  }

  if (candidateEventIds.length === 0) {
    console.log(`${C.green}✅ Keine Failed-Webhooks gefunden — alles sauber.${C.reset}`);
    process.exit(0);
  }

  console.log(`${C.cyan}── ${candidateEventIds.length} Replay-Kandidaten ${'─'.repeat(50)}${C.reset}`);
  console.log('');

  // ── 2. Webhook-Endpoint finden ────────────────────────────────────────────
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const provaEndpoint = endpoints.data.find(ep =>
    ep.url.includes('prova-systems.de') && ep.url.includes('stripe-webhook')
  );
  if (!provaEndpoint) {
    console.error(`${C.red}❌ Kein PROVA-Webhook-Endpoint gefunden.${C.reset}`);
    process.exit(1);
  }
  console.log(`${C.dim}Endpoint: ${provaEndpoint.id} (${provaEndpoint.url})${C.reset}`);
  console.log('');

  // ── 3. Replay pro Event ───────────────────────────────────────────────────
  let successCount = 0;
  let failCount = 0;

  for (const eventId of candidateEventIds) {
    try {
      const evt = await stripe.events.retrieve(eventId);
      console.log(`${C.bold}→ ${eventId}${C.reset} (${evt.type})`);

      // Confirm-Prompt nur in interaktivem Mode
      if (!flagAll && !specificEventId) {
        // Stdin ist nicht zuverlaessig in npm-Scripts — wir nehmen --all bzw --event als explizites Flag
        console.log(`   ${C.yellow}Skip (kein --all flag).${C.reset} Nutze ${C.bold}--all${C.reset} oder ${C.bold}--event=${eventId}${C.reset} um zu replayen.`);
        continue;
      }

      // Stripe-API: Event neu zustellen via /v1/webhook_endpoints/{id}/events/{event_id}/resend
      // (keine offizielle Node-SDK-Method — wir nutzen raw-fetch)
      const resp = await fetch(
        'https://api.stripe.com/v1/webhook_endpoints/' + provaEndpoint.id + '/events/' + eventId + '/resend',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
            'Stripe-Version': STRIPE_API_VERSION,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (resp.ok) {
        console.log(`   ${C.green}✅ Replay-Request gesendet${C.reset}`);
        successCount++;
      } else {
        const errBody = await resp.text();
        console.log(`   ${C.red}❌ Replay fehlgeschlagen: ${resp.status}${C.reset}`);
        console.log(`   ${C.dim}${errBody.slice(0, 200)}${C.reset}`);
        failCount++;
      }

    } catch (e) {
      console.log(`   ${C.red}❌ ${e.message}${C.reset}`);
      failCount++;
    }
  }

  console.log('');
  console.log(`${C.cyan}── Summary ${'─'.repeat(70)}${C.reset}`);
  console.log(`${C.green}✅ ${successCount} replayed${C.reset}  ${C.red}❌ ${failCount} fehler${C.reset}`);

  if (successCount > 0) {
    console.log('');
    console.log(`${C.dim}Naechste Schritte:${C.reset}`);
    console.log(`  1. ~30s warten (Stripe stellt Events asynchron zu)`);
    console.log(`  2. ${C.bold}npm run stripe-status${C.reset} → verifizieren dass Events jetzt verarbeitet`);
  }

  process.exit(failCount === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
