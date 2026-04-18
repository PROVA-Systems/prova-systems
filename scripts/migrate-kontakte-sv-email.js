/**
 * migrate-kontakte-sv-email.js
 *
 * Einmalige Migration: Trägt auf allen bestehenden KONTAKTE-Records ein sv_email-Feld nach.
 *
 * Hintergrund: Bis Session 8 hatte die KONTAKTE-Tabelle kein sv_email-Feld.
 * Nach Session 8 wird airtable.js den sv_email-Filter server-seitig anhängen —
 * das hätte bestehende Kontakte unsichtbar gemacht.
 *
 * Voraussetzungen:
 *   1. In Airtable: In der KONTAKTE-Tabelle ein Feld "sv_email" (Typ: E-Mail oder Einzeiliger Text)
 *      manuell anlegen, BEVOR dieses Script läuft.
 *   2. .env.local enthält AIRTABLE_PAT.
 *
 * Aufruf:
 *   node scripts/migrate-kontakte-sv-email.js
 *
 * Idempotent: Überschreibt niemals existierende sv_email-Werte.
 */

require('dotenv').config({ path: '.env.local' });

const AIRTABLE_PAT = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
const BASE_ID    = 'appJ7bLlAHZoxENWE';
const TABLE_ID   = 'tblMKmPLjRelr6Hal'; // KONTAKTE
const DEFAULT_SV = 'marcel_schreiber891@gmx.de'; // einziger Founder-Account

if (!AIRTABLE_PAT) {
  console.error('✗ AIRTABLE_PAT fehlt in .env.local');
  process.exit(1);
}

const AT_HEADERS = {
  'Authorization': `Bearer ${AIRTABLE_PAT}`,
  'Content-Type': 'application/json',
};

async function fetchAllRecords() {
  let all = [];
  let offset;
  do {
    const qs = new URLSearchParams({ pageSize: '100' });
    if (offset) qs.set('offset', offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${qs.toString()}`,
      { headers: AT_HEADERS }
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GET ${TABLE_ID} → HTTP ${res.status}: ${txt}`);
    }
    const data = await res.json();
    all = all.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  return all;
}

async function patchBatch(updates) {
  // Airtable max. 10 Records pro PATCH
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
    {
      method: 'PATCH',
      headers: AT_HEADERS,
      body: JSON.stringify({ records: updates, typecast: true }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH → HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KONTAKTE-Migration: sv_email nachtragen');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Default sv_email für alle:  ${DEFAULT_SV}`);
  console.log('');

  try {
    console.log('→ Lade alle KONTAKTE-Records…');
    const records = await fetchAllRecords();
    console.log(`  Gefunden: ${records.length} Records`);

    const missing = records.filter(r => !r.fields.sv_email);
    const already = records.length - missing.length;
    console.log(`  Bereits mit sv_email: ${already}`);
    console.log(`  Zu migrieren:         ${missing.length}`);

    if (!missing.length) {
      console.log('');
      console.log('✓ Nichts zu tun — alle Records haben bereits sv_email.');
      return;
    }

    console.log('');
    console.log('→ Migriere in Batches à 10…');

    let done = 0;
    for (let i = 0; i < missing.length; i += 10) {
      const batch = missing.slice(i, i + 10);
      const updates = batch.map(r => ({
        id: r.id,
        fields: { sv_email: DEFAULT_SV },
      }));
      await patchBatch(updates);
      done += updates.length;
      console.log(`  Batch ${Math.floor(i/10) + 1}: ${updates.length} Records ✓  (Gesamt: ${done}/${missing.length})`);
      // Rate-Limit-Puffer
      await new Promise(r => setTimeout(r, 220));
    }

    console.log('');
    console.log(`✓ Migration fertig. ${done} Records aktualisiert.`);
    console.log('');
    console.log('Nächster Schritt: Teste den KONTAKTE-Sync im UI — alle Kontakte');
    console.log('müssen weiter sichtbar sein, und der Security-Test #2 sollte grün werden.');
  } catch (e) {
    console.error('');
    console.error('✗ Migration fehlgeschlagen:', e.message);
    process.exit(1);
  }
})();
