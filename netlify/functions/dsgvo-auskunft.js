const {
  AIRTABLE_API,
  BASE_ID,
  TABLE_SV,
  TABLE_FAELLE,
  TABLE_RECHNUNGEN,
  TABLE_AUDIT
} = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');
const { requireAuth } = require('./lib/jwt-middleware');

// S6 Phase 1.9: per-request event-Capture (siehe ki-proxy.js Begruendung)
let _currentEvent = null;

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(_currentEvent, ['GET', 'OPTIONS'])
    },
    body: JSON.stringify(obj)
  };
}

async function listCount(pat, tableId, formula) {
  const url =
    AIRTABLE_API +
    '/v0/' +
    BASE_ID +
    '/' +
    tableId +
    '?maxRecords=100&filterByFormula=' +
    encodeURIComponent(formula);
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + pat } });
  if (!res.ok) return 0;
  const data = await res.json();
  return Array.isArray(data.records) ? data.records.length : 0;
}

exports.handler = requireAuth(async function (event, context) {
  _currentEvent = event;
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  // P4B.7b: context.userEmail aus HMAC-Token statt Identity-clientContext.user.email
  const userEmail = context.userEmail;
  // Backward-Compat: alte Code-Stellen referenzieren user.email
  const user = { email: userEmail };

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) return json(500, { error: 'AIRTABLE_PAT nicht konfiguriert' });

  const email = String(user.email).trim().toLowerCase();
  const esc = email.replace(/"/g, '\\"');

  const svUrl =
    AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV + '?maxRecords=1&filterByFormula=' + encodeURIComponent('{Email}="' + esc + '"');
  let svProfil = {};
  try {
    const svRes = await fetch(svUrl, { headers: { Authorization: 'Bearer ' + pat } });
    const svData = await svRes.json();
    const f = (svData.records && svData.records[0] && svData.records[0].fields) || {};
    svProfil = {
      email: f.Email || email,
      vorname: f.Vorname || '',
      nachname: f.Nachname || '',
      paket: f.Paket || '',
      status: f.Status || ''
    };
  } catch (e) {
    svProfil = { email: email };
  }

  const fallFormula = '{sv_email}="' + esc + '"';
  const reFormula = '{sv_email}="' + esc + '"';
  const kiFormula = 'AND({Email}="' + esc + '",{Typ}="KI")';

  const [faelle, rechnungen, ki] = await Promise.all([
    listCount(pat, TABLE_FAELLE, fallFormula),
    listCount(pat, TABLE_RECHNUNGEN, reFormula),
    listCount(pat, TABLE_AUDIT, kiFormula)
  ]);

  return json(200, {
    sv_profil: svProfil,
    faelle_anzahl: faelle,
    rechnungen_anzahl: rechnungen,
    ki_anfragen_anzahl: ki,
    generated_at: new Date().toISOString()
  });
});
