#!/usr/bin/env node
/**
 * PROVA — Normen-Sync
 *
 * Liest NORMEN_DB aus normen-logic.js und führt einen
 * Upsert gegen die Airtable NORMEN-Tabelle (tblnceVJIW7BjHsPF) durch.
 *
 * Benutzung:
 *   AIRTABLE_PAT=pat123... node scripts/sync-normen.js
 *   AIRTABLE_PAT=pat123... node scripts/sync-normen.js --apply
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const APPLY = process.argv.includes('--apply');
const PAT = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
const BASE = 'appJ7bLlAHZoxENWE';
const TABLE = 'tblnceVJIW7BjHsPF';

if (!PAT) {
  console.error('AIRTABLE_PAT nicht gesetzt.');
  console.error('Benutzung: AIRTABLE_PAT=pat123... node scripts/sync-normen.js [--apply]');
  process.exit(1);
}

function extractFallback() {
  const logic = fs.readFileSync(
    path.join(__dirname, '..', 'normen-logic.js'),
    'utf8'
  );
  const start = logic.indexOf('const NORMEN_DB = [');
  if (start < 0) throw new Error('NORMEN_DB nicht gefunden');
  const arrStart = logic.indexOf('[', start);
  let depth = 0, i = arrStart, end = -1;
  while (i < logic.length) {
    const c = logic[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    i++;
  }
  if (end < 0) throw new Error('Array-Ende nicht gefunden');
  const arrSrc = logic.substring(arrStart, end);
  return (new Function('return ' + arrSrc))();
}

function atRequest(method, pathPart, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.airtable.com',
      path: '/v0/' + BASE + '/' + TABLE + pathPart,
      method,
      headers: {
        'Authorization': 'Bearer ' + PAT,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error('HTTP ' + res.statusCode + ': ' + data.substring(0, 200)));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function loadExisting() {
  const all = [];
  let offset = null;
  do {
    const q = offset ? '?pageSize=100&offset=' + encodeURIComponent(offset) : '?pageSize=100';
    const data = await atRequest('GET', q);
    all.push.apply(all, data.records || []);
    offset = data.offset || null;
  } while (offset);
  return all;
}

function getNormNum(rec) {
  const f = rec.fields || {};
  return f['Norm-Nummer'] || f['\ufeffNorm-Nummer'] || f['num'] || '';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('='.repeat(70));
  console.log(' PROVA — Normen-Sync  ' + (APPLY ? '[APPLY]' : '[DRY-RUN]'));
  console.log('='.repeat(70));

  const fallback = extractFallback();
  console.log(' Fallback-DB:      ' + fallback.length + ' Normen');

  console.log(' Lade Airtable...');
  const existing = await loadExisting();
  console.log(' Airtable aktuell: ' + existing.length + ' Einträge');

  const existingByNum = {};
  existing.forEach(rec => {
    const num = String(getNormNum(rec)).trim();
    if (num) existingByNum[num] = rec;
  });

  const toCreate = [];
  const toUpdate = [];
  fallback.forEach(n => {
    const num = String(n.num || '').trim();
    if (!num) return;
    const match = existingByNum[num];
    if (!match) {
      toCreate.push(n);
    } else {
      const ex = match.fields || {};
      const changed =
        (ex['Titel'] || '') !== (n.titel || '') ||
        (ex['Grenzwerte'] || '') !== (n.gw || '') ||
        ex['Aktiv'] !== true;
      if (changed) toUpdate.push({ id: match.id, data: n });
    }
  });

  console.log('');
  console.log(' Neu anzulegen: ' + toCreate.length);
  console.log(' Zu updaten:    ' + toUpdate.length);
  console.log('');

  if (toCreate.length) {
    console.log(' Erste 5 neu anzulegen:');
    toCreate.slice(0, 5).forEach(n => {
      console.log('   + ' + n.num + ' — ' + (n.titel || '').substring(0, 60));
    });
    if (toCreate.length > 5) console.log('   (+' + (toCreate.length - 5) + ' weitere)');
  }

  if (!APPLY) {
    console.log('');
    console.log(' DRY-RUN. Mit --apply ausführen um Änderungen zu übernehmen.');
    return 0;
  }

  let created = 0;
  for (let i = 0; i < toCreate.length; i += 10) {
    const batch = toCreate.slice(i, i + 10).map(n => ({
      fields: {
        'Norm-Nummer':       n.num || '',
        'Titel':             n.titel || '',
        'Bereich':           n.bereich || '',
        'Anwendung':         n.anw || '',
        'Grenzwerte':        n.gw || '',
        'Messtechnik':       n.mess || '',
        'Gutachter-Hinweis': n.hint || '',
        'Häufigkeit':        { name: n.hf || 'mittel' },
        'Aktiv':             true,
      },
    }));
    try {
      await atRequest('POST', '', { records: batch, typecast: true });
      created += batch.length;
      process.stdout.write('\r Create ' + created + '/' + toCreate.length);
    } catch (e) {
      console.error('\n Batch-Create fehlgeschlagen: ' + e.message);
    }
    await sleep(250);
  }
  console.log('');

  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += 10) {
    const batch = toUpdate.slice(i, i + 10).map(u => ({
      id: u.id,
      fields: {
        'Titel':       u.data.titel || '',
        'Grenzwerte':  u.data.gw || '',
        'Aktiv':       true,
      },
    }));
    try {
      await atRequest('PATCH', '', { records: batch, typecast: true });
      updated += batch.length;
      process.stdout.write('\r Update ' + updated + '/' + toUpdate.length);
    } catch (e) {
      console.error('\n Batch-Update fehlgeschlagen: ' + e.message);
    }
    await sleep(250);
  }
  console.log('');
  console.log('');
  console.log(' Fertig. Erstellt: ' + created + ', Updated: ' + updated);
  return 0;
}

main().catch(e => {
  console.error('Fehler:', e.message);
  process.exit(1);
});
