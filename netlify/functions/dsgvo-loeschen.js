/**
 * PROVA — dsgvo-loeschen.js
 * DSGVO Art. 17 — Recht auf Löschung (Recht auf Vergessenwerden)
 *
 * Löscht alle personenbezogenen Daten des eingeloggten SVs.
 * AUSNAHME: Rechnungen (§257 HGB / §147 AO — 10 Jahre Aufbewahrungspflicht)
 *
 * POST { confirm: true, reason: "..." }
 */
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
const { fetchWithRetry } = require('./lib/fetch-with-timeout');
const { provaFetch } = require('./lib/prova-fetch');
const { requireAuth } = require('./lib/jwt-middleware');
const RateLimit = require('./lib/rate-limit-user');

const AT_BASE = process.env.AIRTABLE_BASE_ID  || 'appJ7bLlAHZoxENWE';
const AT_PAT  = process.env.AIRTABLE_PAT      || process.env.AIRTABLE_TOKEN || '';
const AT_URL  = 'https://api.airtable.com';

// Tabellen die gelöscht werden (mit sv_email Feld)
const LOESCHBARE_TABELLEN = [
  { id: 'tblSxV8bsXwd1pwa0', name: 'SCHADENSFAELLE',   field: 'sv_email' },
  { id: 'tblyMTTdtfGQjjmc2', name: 'TERMINE',           field: 'sv_email' },
  { id: 'tblMKmPLjRelr6Hal', name: 'KONTAKTE',          field: 'sv_email' },
  { id: 'tblDS8NQxzceGedJO', name: 'TEXTBAUSTEINE',     field: 'sv_email' },
  { id: 'tblSzxvnkRE6B0thx', name: 'BRIEFE',            field: 'sv_email' },
  { id: 'tblv9F8LEnUC3mKru', name: 'KI_STATISTIK',      field: 'SV_Email' },
  { id: 'tbl4LEsMvcDKFCYaF', name: 'KI_LERNPOOL',       field: 'SV_Email' },
];

// RECHNUNGEN werden NICHT gelöscht (§257 HGB Aufbewahrungspflicht 10 Jahre)
// SACHVERSTAENDIGE wird anonymisiert, nicht gelöscht

async function atGet(path) {
  const res = await fetchWithRetry(AT_URL + path, {
    headers: { Authorization: 'Bearer ' + AT_PAT }
  });
  return res.json();
}

async function atDelete(tableId, recordIds) {
  // Airtable erlaubt max 10 Deletes pro Request
  const chunks = [];
  for (let i = 0; i < recordIds.length; i += 10) chunks.push(recordIds.slice(i, i + 10));
  let deleted = 0;
  for (const chunk of chunks) {
    const params = chunk.map(id => `records[]=${id}`).join('&');
    const res = await provaFetch(`${AT_URL}/v0/${AT_BASE}/${tableId}?${params}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + AT_PAT }
    });
    if (res.ok) deleted += chunk.length;
  }
  return deleted;
}

async function getRecordIds(tableId, emailField, email) {
  const formula = encodeURIComponent(`{${emailField}}="${email}"`);
  const ids = [];
  let offset = '';
  do {
    const url = `/v0/${AT_BASE}/${tableId}?filterByFormula=${formula}&fields%5B%5D=${emailField}&pageSize=100${offset ? '&offset=' + offset : ''}`;
    const d = await atGet(url);
    if (d.records) ids.push(...d.records.map(r => r.id));
    offset = d.offset || '';
  } while (offset);
  return ids;
}

exports.handler = requireAuth(async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // S6 X4 H-14: DSGVO-Löschung Abuse-Schutz — 1 Anfrage / Tag / User
  // (destruktiver Workflow, Race-Condition-Schutz, kein Doppel-Trigger)
  const rl = RateLimit.check(context.userEmail, 1, 24 * 60 * 60, { event, functionName: 'dsgvo-loeschen' });
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...getCorsHeaders(event), 'Retry-After': String(rl.retryAfter) },
      body: JSON.stringify({
        error: 'DSGVO-Löschung kann nur 1× pro Tag angefordert werden. Bitte ' + Math.ceil(rl.retryAfter / 3600) + ' Stunden warten.',
        retryAfter: rl.retryAfter
      })
    };
  }

  // P4B.7b: context.userEmail aus HMAC-Token, kein Identity-clientContext mehr.
  const user = { email: context.userEmail };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  if (!body.confirm) {
    return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Bitte confirm: true setzen um die Löschung zu bestätigen' }) };
  }

  const email = user.email.toLowerCase().trim();
  const protokoll = [];
  let fehler = [];

  // 1. Alle löschbaren Tabellen bereinigen
  for (const tbl of LOESCHBARE_TABELLEN) {
    try {
      const ids = await getRecordIds(tbl.id, tbl.field, email);
      if (ids.length > 0) {
        const n = await atDelete(tbl.id, ids);
        protokoll.push(`${tbl.name}: ${n} Datensätze gelöscht`);
      } else {
        protokoll.push(`${tbl.name}: keine Datensätze vorhanden`);
      }
    } catch(e) {
      fehler.push(`${tbl.name}: Fehler — ${e.message}`);
    }
  }

  // 2. SACHVERSTAENDIGE anonymisieren (nicht löschen — für Rechnungs-Referenz)
  try {
    const svRes = await atGet(`/v0/${AT_BASE}/tbladqEQT3tmx4DIB?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`);
    if (svRes.records && svRes.records[0]) {
      const recId = svRes.records[0].id;
      await provaFetch(`${AT_URL}/v0/${AT_BASE}/tbladqEQT3tmx4DIB/${recId}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + AT_PAT, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          Vorname: '[GELÖSCHT]', Nachname: '[GELÖSCHT]', Firma: '[GELÖSCHT]',
          Strasse: '[GELÖSCHT]', Ort: '[GELÖSCHT]', Telefon: '[GELÖSCHT]',
          Website: '', IBAN: '[GELÖSCHT]', BIC: '[GELÖSCHT]', Bank: '[GELÖSCHT]',
          smtp_pass_encrypted: '', smtp_host: '', smtp_user: '',
          geloescht_am: new Date().toISOString(), geloescht_grund: body.reason || 'DSGVO Art. 17'
        }})
      });
      protokoll.push('SACHVERSTAENDIGE: Profil anonymisiert (Email-Referenz für Rechnungen erhalten)');
    }
  } catch(e) {
    fehler.push('SACHVERSTAENDIGE: Anonymisierung fehlgeschlagen — ' + e.message);
  }

  // 3. Rechnungen: Nur Hinweis, KEINE Löschung
  protokoll.push('RECHNUNGEN: NICHT gelöscht — gesetzliche Aufbewahrungspflicht §257 HGB / §147 AO (10 Jahre)');

  return {
    statusCode: 200,
    headers: getCorsHeaders(event),
    body: JSON.stringify({
      ok: fehler.length === 0,
      protokoll,
      fehler,
      hinweis: 'Ihre Rechnungen werden gem. §257 HGB bis zum Ende der gesetzlichen Aufbewahrungsfrist (10 Jahre) aufbewahrt und danach automatisch gelöscht.'
    })
  };
});
