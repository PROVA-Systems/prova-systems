const { AIRTABLE_API, BASE_ID, TABLE_SV } = require('./lib/prova-subscription');

const TABLE_FAELLE = 'tblSxV8bsXwd1pwa0';
const TABLE_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';
const TABLE_AUDIT =
  process.env.PROVA_AUDIT_TRAIL_TABLE || process.env.AIRTABLE_AUDIT_TRAIL_TABLE || 'tblqQmMwJKxltXXXl';

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
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

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) return json(401, { error: 'Anmeldung erforderlich' });

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
};
