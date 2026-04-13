const { AIRTABLE_API, BASE_ID, TABLE_AUDIT } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');

function json(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': (event && event.headers && event.headers.origin && (event.headers.origin.includes('prova-systems') || event.headers.origin.includes('localhost')) ? event.headers.origin : (process.env.URL || 'https://prova-systems.de')),
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    },
    body: JSON.stringify(obj)
  };
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' });

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) return json(401, { error: 'Anmeldung erforderlich' });

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) return json(500, { error: 'AIRTABLE_PAT nicht konfiguriert' });

  const email = String(user.email).trim().toLowerCase().replace(/"/g, '\\"');
  const formula = '{Email}="' + email + '"';
  const url =
    AIRTABLE_API +
    '/v0/' +
    BASE_ID +
    '/' +
    TABLE_AUDIT +
    '?maxRecords=50&sort[0][field]=Zeitstempel&sort[0][direction]=desc&filterByFormula=' +
    encodeURIComponent(formula);

  try {
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + pat } });
    if (!res.ok) {
      return json(200, { ok: true, records: [] });
    }
    const data = await res.json();
    return json(200, { ok: true, records: data.records || [] });
  } catch (e) {
    return json(200, { ok: true, records: [] });
  }
};
