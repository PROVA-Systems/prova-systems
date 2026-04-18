#!/usr/bin/env node
/**
 * PROVA Systems — Einmaliges Migrations-Script
 *
 * Schreibt sv_email = marcel_schreiber891@gmx.de auf alle bestehenden KONTAKTE-Records
 * die das Feld noch leer haben. Idempotent — mehrfaches Ausführen schadet nicht.
 *
 * Voraussetzung: AIRTABLE_PAT in .env.local
 *
 * Aufruf (aus Repo-Root):
 *   node scripts/migrate-kontakte-sv-email.js
 *
 * Nach erfolgreicher Migration kann das Script gelöscht werden.
 */

const fs = require('fs');
const path = require('path');

// .env.local laden (ohne externe Deps)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  });
}

const PAT          = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
const BASE_ID      = 'appJ7bLlAHZoxENWE';
const TABLE_ID     = 'tblMKmPLjRelr6Hal';   // KONTAKTE
const TARGET_EMAIL = 'marcel_schreiber891@gmx.de';

if (!PAT) {
  console.error('❌ FEHLER: AIRTABLE_PAT fehlt. Bitte in .env.local setzen.');
  process.exit(1);
}

async function listAllRecords() {
  const records = [];
  let offset = null;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${PAT}` } });
    if (!res.ok) {
      console.error(`❌ GET ${url} → HTTP ${res.status}`);
      console.error(await res.text());
      process.exit(1);
    }
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset || null;
  } while (offset);
  return records;
}

async function patchBatch(recs) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ records: recs, typecast: true })
  });
  if (!res.ok) {
    console.error(`❌ PATCH fehlgeschlagen → HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }
  return res.json();
}

(async () => {
  console.log('📥 Lade alle KONTAKTE-Records ...');
  const all = await listAllRecords();
  console.log(`   Gefunden: ${all.length} Records`);

  const ohneEmail = all.filter(r => !r.fields.sv_email);
  console.log(`   Davon ohne sv_email: ${ohneEmail.length}`);

  if (!ohneEmail.length) {
    console.log('✅ Nichts zu tun — alle Records haben bereits sv_email.');
    return;
  }

  console.log(`✏️  Schreibe sv_email="${TARGET_EMAIL}" auf ${ohneEmail.length} Records ...`);

  const batches = [];
  for (let i = 0; i < ohneEmail.length; i += 10) batches.push(ohneEmail.slice(i, i + 10));

  let done = 0;
  for (const batch of batches) {
    const payload = batch.map(r => ({ id: r.id, fields: { sv_email: TARGET_EMAIL } }));
    await patchBatch(payload);
    done += batch.length;
    console.log(`   ${done}/${ohneEmail.length} aktualisiert ...`);
    await new Promise(r => setTimeout(r, 250));   // Airtable-Ratenlimit schonen
  }

  console.log(`✅ Fertig. ${done} Records migriert.`);
  console.log('→ Kannst das Script jetzt löschen oder für spätere Tenants behalten.');
})().catch(err => {
  console.error('❌ Unerwarteter Fehler:', err);
  process.exit(1);
});
