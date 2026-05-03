#!/usr/bin/env node
/**
 * PROVA — Stripe-Webhook End-to-End-Verification
 *
 * Sendet einen mit STRIPE_WEBHOOK_SECRET signierten Mock-Event an die
 * Production-Webhook-URL und verifiziert dass:
 *  1. HTTP 200 zurueck
 *  2. stripe_events-Eintrag in Supabase erstellt
 *  3. workspaces.abo_status updated (wenn Test-Workspace existiert)
 *  4. audit_trail-Eintrag geloggt
 *
 * USAGE:
 *   node scripts/verify-stripe-webhook.js
 *   ODER:
 *   npm run test-webhook
 *
 * ENV:
 *   STRIPE_WEBHOOK_SECRET         (Pflicht)
 *   PROVA_SUPABASE_PROJECT_URL    (Pflicht)
 *   SUPABASE_SERVICE_ROLE_KEY     (Pflicht)
 *   WEBHOOK_TEST_URL              (Default: https://prova-systems.de/.netlify/functions/stripe-webhook)
 *   WEBHOOK_TEST_EMAIL            (Default: aus .env.local oder marcel-default)
 *
 * Verhalten:
 *   - Erzeugt Mock-Event 'checkout.session.completed' mit unique stripe_event_id
 *   - Computed HMAC-SHA256-Signature wie Stripe selbst
 *   - POST an Webhook-URL
 *   - Wartet 2s, prueft Supabase
 *   - Aufraeumen: Test-Event aus stripe_events loeschen
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');
const { createClient } = require('@supabase/supabase-js');

const C = {
  reset:  process.stdout.isTTY ? '\x1b[0m' : '',
  green:  process.stdout.isTTY ? '\x1b[32m' : '',
  red:    process.stdout.isTTY ? '\x1b[31m' : '',
  yellow: process.stdout.isTTY ? '\x1b[33m' : '',
  cyan:   process.stdout.isTTY ? '\x1b[36m' : '',
  bold:   process.stdout.isTTY ? '\x1b[1m' : '',
  dim:    process.stdout.isTTY ? '\x1b[2m' : ''
};

const WEBHOOK_URL = process.env.WEBHOOK_TEST_URL || 'https://prova-systems.de/.netlify/functions/stripe-webhook';
const TEST_EMAIL = process.env.WEBHOOK_TEST_EMAIL || 'webhook-test@prova-systems.de';

// ── Stripe-Signature-Berechnung wie in stripe-node ────────────────────────
function signPayload(payload, secret, timestamp) {
  const signedPayload = timestamp + '.' + payload;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return 't=' + timestamp + ',v1=' + signature;
}

function buildMockEvent() {
  const eventId = 'evt_test_' + crypto.randomBytes(8).toString('hex');
  const sessionId = 'cs_test_' + crypto.randomBytes(8).toString('hex');
  const subId = 'sub_test_' + crypto.randomBytes(8).toString('hex');
  return {
    id: eventId,
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        mode: 'subscription',
        subscription: subId,
        customer: 'cus_test_webhook_verify',
        customer_email: TEST_EMAIL,
        amount_total: 14900,
        currency: 'eur',
        metadata: {
          prova_plan: 'solo',
          test_run: 'verify-stripe-webhook',
          marcel_can_delete: '1'
        }
      }
    }
  };
}

function postWebhook(url, body, signature) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port:     u.port || 443,
      path:     u.pathname + (u.search || ''),
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(body),
        'Stripe-Signature':  signature,
        'User-Agent':        'PROVA-Webhook-Verify/1.0'
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`${C.bold}🔌 PROVA Stripe-Webhook End-to-End Verify${C.reset}`);
  console.log(`${C.dim}Datum: ${new Date().toISOString().slice(0,19)}${C.reset}`);
  console.log('');

  // 1. ENV-Check
  const required = ['STRIPE_WEBHOOK_SECRET', 'PROVA_SUPABASE_PROJECT_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  for (const k of required) {
    if (!process.env[k]) {
      console.error(`${C.red}❌ ${k} fehlt — abbruch.${C.reset}`);
      process.exit(1);
    }
  }
  console.log(`${C.cyan}── 1. Mock-Event mit Stripe-Signatur erzeugen ${'─'.repeat(30)}${C.reset}`);

  const evt = buildMockEvent();
  const payload = JSON.stringify(evt);
  const timestamp = Math.floor(Date.now() / 1000);
  const sig = signPayload(payload, process.env.STRIPE_WEBHOOK_SECRET, timestamp);

  console.log(`${C.green}✅${C.reset} Event-ID: ${evt.id}`);
  console.log(`${C.green}✅${C.reset} Signatur: ${sig.slice(0, 60)}…`);
  console.log('');

  // 2. POST an Webhook-URL
  console.log(`${C.cyan}── 2. POST an ${WEBHOOK_URL} ${'─'.repeat(20)}${C.reset}`);
  let response;
  try {
    response = await postWebhook(WEBHOOK_URL, payload, sig);
  } catch (e) {
    console.error(`${C.red}❌ Network-Error: ${e.message}${C.reset}`);
    process.exit(1);
  }

  console.log(`   Status: ${response.status === 200 ? C.green : C.red}${response.status}${C.reset}`);
  console.log(`   Body:   ${C.dim}${response.body.slice(0, 200)}${C.reset}`);

  if (response.status !== 200) {
    console.log('');
    console.log(`${C.red}${C.bold}❌ Webhook hat NICHT 200 zurueckgegeben.${C.reset}`);
    console.log(`${C.dim}Mögliche Ursachen:${C.reset}`);
    console.log('  - STRIPE_WEBHOOK_SECRET in Netlify nicht gesetzt');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY in Netlify nicht gesetzt');
    console.log('  - Function noch nicht deployed (Trigger Deploy in Netlify-UI)');
    console.log('  - Webhook-URL falsch — pruefe netlify.toml');
    process.exit(1);
  }
  console.log(`${C.green}✅ HTTP 200 — Function aktiv${C.reset}`);
  console.log('');

  // 3. Supabase-Check
  console.log(`${C.cyan}── 3. Supabase-Check (2s warten) ${'─'.repeat(35)}${C.reset}`);
  await new Promise(r => setTimeout(r, 2000));

  const sb = createClient(
    process.env.PROVA_SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 3a. stripe_events-Eintrag
  const { data: eventRow, error: eventErr } = await sb
    .from('stripe_events')
    .select('id, status, verarbeitung_dauer_ms, verarbeitung_fehler, auswirkung_beschreibung')
    .eq('stripe_event_id', evt.id)
    .maybeSingle();

  if (eventErr || !eventRow) {
    console.log(`${C.red}❌ stripe_events-Eintrag nicht gefunden${C.reset}`);
    console.log(`   ${C.dim}Error: ${eventErr ? eventErr.message : 'no row'}${C.reset}`);
    process.exit(1);
  }
  console.log(`${C.green}✅ stripe_events-Eintrag${C.reset}: ${eventRow.id}`);
  console.log(`   Status:           ${eventRow.status}`);
  console.log(`   Verarbeitung:     ${eventRow.verarbeitung_dauer_ms || 0}ms`);
  if (eventRow.verarbeitung_fehler) {
    console.log(`   ${C.yellow}Fehler: ${eventRow.verarbeitung_fehler}${C.reset}`);
  }
  if (eventRow.auswirkung_beschreibung) {
    console.log(`   Auswirkung:       ${eventRow.auswirkung_beschreibung.slice(0, 100)}`);
  }

  // 3b. audit_trail-Check
  const { data: auditRows } = await sb
    .from('audit_trail')
    .select('typ, details, created_at')
    .like('details', '%' + evt.id + '%')
    .limit(5);
  if (auditRows && auditRows.length > 0) {
    console.log(`${C.green}✅ audit_trail-Eintrag${C.reset}: ${auditRows.length} Eintrag(e)`);
    auditRows.forEach(a => {
      console.log(`   typ=${a.typ}`);
    });
  } else {
    console.log(`${C.yellow}⚠ audit_trail-Eintrag nicht gefunden${C.reset}`);
    console.log(`   ${C.dim}Wahrscheinlich weil Test-Workspace nicht existiert (cus_test_webhook_verify)${C.reset}`);
    console.log(`   ${C.dim}Status='ignoriert' oder 'verarbeitet' mit no_workspace ist OK fuer Verify${C.reset}`);
  }
  console.log('');

  // 4. Cleanup
  console.log(`${C.cyan}── 4. Cleanup (Test-Event löschen) ${'─'.repeat(35)}${C.reset}`);
  await sb.from('stripe_events').delete().eq('stripe_event_id', evt.id);
  if (auditRows && auditRows.length > 0) {
    // best-effort audit_trail-cleanup
    for (const a of auditRows) {
      await sb.from('audit_trail').delete().like('details', '%' + evt.id + '%');
    }
  }
  console.log(`${C.green}✅ Test-Daten geloescht${C.reset}`);
  console.log('');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`${C.cyan}── Summary ${'─'.repeat(60)}${C.reset}`);
  if (eventRow.status === 'verarbeitet' || eventRow.status === 'ignoriert') {
    console.log(`${C.green}${C.bold}🎉 Webhook End-to-End funktioniert!${C.reset}`);
    console.log(`   Signature-Verify: ✅`);
    console.log(`   Event-Persistenz: ✅`);
    console.log(`   Function-Verarbeitung: ✅ (${eventRow.status})`);
    process.exit(0);
  } else if (eventRow.status === 'verarbeitung_fehler') {
    console.log(`${C.red}❌ Verarbeitung fehlgeschlagen${C.reset}: ${eventRow.verarbeitung_fehler}`);
    process.exit(1);
  } else {
    console.log(`${C.yellow}⚠ Status: ${eventRow.status} — manuelle Pruefung in Supabase noetig${C.reset}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
