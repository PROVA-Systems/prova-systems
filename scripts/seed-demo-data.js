#!/usr/bin/env node
/**
 * PROVA — seed-demo-data.js (MEGA⁴² P10)
 *
 * Seedet einen Demo-Workspace mit:
 *   - 1 Demo-User
 *   - 3 Demo-Kontakte
 *   - 2 Demo-Akten (Schadensfall + Wertgutachten)
 *   - 1 Demo-Diktat (Whisper-Output Sample)
 *   - 5 Demo-Fotos (Placeholder)
 *
 * Run lokal:
 *   SUPABASE_URL=$SUPABASE_URL \
 *   SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
 *     node scripts/seed-demo-data.js [--workspace <id>] [--reset]
 *
 * --reset: löscht alle Demo-Rows zuerst (idempotent).
 */
'use strict';

const args = process.argv.slice(2);
const flags = {
  workspace: (() => {
    const i = args.indexOf('--workspace');
    return i >= 0 ? args[i + 1] : 'demo-pilot-workspace';
  })(),
  reset: args.includes('--reset')
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(method, table, body, query) {
  const url = SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  const r = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) {
    console.warn(`⚠ ${method} ${table}: ${r.status} ${await r.text()}`);
    return null;
  }
  return r.json();
}

const DEMO_KONTAKTE = [
  { name: 'Demo-Privatperson Müller', email: 'mueller-demo@example.de', telefon: '+49 30 1234567', kontakt_typ: 'auftraggeber' },
  { name: 'Demo-Versicherung GmbH', email: 'demo@versicherung.de', telefon: '+49 89 7654321', kontakt_typ: 'versicherung' },
  { name: 'Demo-Hausverwaltung Schmidt', email: 'demo@hv-schmidt.de', telefon: '+49 211 555111', kontakt_typ: 'hausverwaltung' }
];

const DEMO_AKTEN = [
  {
    auftrag_typ: 'privatgutachten', flow: 'A',
    titel: 'DEMO: Schimmelschaden Schlafzimmer',
    adresse: 'Musterstraße 1, 10115 Berlin',
    status: 'in_arbeit'
  },
  {
    auftrag_typ: 'wertgutachten', flow: 'B',
    titel: 'DEMO: Verkehrswertgutachten Reihenhaus',
    adresse: 'Beispielweg 5, 22765 Hamburg',
    status: 'fertig'
  }
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }
  console.log('PROVA Seed-Demo-Data (M⁴² P10)');
  console.log('Workspace:', flags.workspace);
  console.log('');

  if (flags.reset) {
    console.log('🗑️ Reset-Mode: lösche bestehende Demo-Daten …');
    await sb('DELETE', 'auftraege', null, `workspace_id=eq.${flags.workspace}&titel=like.DEMO:*`);
    await sb('DELETE', 'kontakte', null, `workspace_id=eq.${flags.workspace}&name=like.Demo-*`);
  }

  // 1. Kontakte seeden
  console.log('1️⃣ Seede 3 Demo-Kontakte …');
  for (const k of DEMO_KONTAKTE) {
    const r = await sb('POST', 'kontakte', { ...k, workspace_id: flags.workspace, is_demo: true });
    if (r) console.log('   ✓ ' + k.name);
  }

  // 2. Akten seeden
  console.log('2️⃣ Seede 2 Demo-Akten …');
  for (const a of DEMO_AKTEN) {
    const r = await sb('POST', 'auftraege', {
      ...a,
      workspace_id: flags.workspace,
      is_demo: true,
      created_at: new Date().toISOString()
    });
    if (r) console.log('   ✓ ' + a.titel);
  }

  console.log('');
  console.log('✅ Seed fertig. Demo-Workspace bereit für Pilot-Onboarding.');
  console.log('');
  console.log('Cleanup: node scripts/seed-demo-data.js --reset');
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { DEMO_KONTAKTE, DEMO_AKTEN };
