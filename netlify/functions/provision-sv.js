/**
 * PROVA — Neuer SV in Airtable (nach Identity-Login / bestätigter E-Mail)
 * POST /.netlify/functions/provision-sv
 * Header: Authorization: Bearer <Netlify Identity access_token>
 * Body optional: { "full_name": "Max Mustermann" }
 *
 * Erwartet Airtable-Felder (mind.): Email, Vorname, Nachname, Paket
 * Optional (in Airtable anlegen): Trial_End (Datum), Onboarding_Datum (Datum)
 */
const { AIRTABLE_API, BASE_ID, TABLE_SV } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse, jsonResponse } = require('./lib/cors-helper');

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj)
  };
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return corsOptionsResponse(event);
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.email) {
    return json(401, { error: 'Nicht autorisiert — gültiges Netlify Identity JWT erforderlich (Authorization: Bearer …)' });
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return json(500, { error: 'AIRTABLE_PAT nicht konfiguriert' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Ungültiger JSON-Body' });
  }

  const email = String(user.email).trim().toLowerCase();
  const metaName = (user.user_metadata && user.user_metadata.full_name) || '';
  const fullName = String(body.full_name || metaName || '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const vorname = parts[0] || email.split('@')[0] || 'SV';
  const nachname = parts.length > 1 ? parts.slice(1).join(' ') : '';

  const authH = { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' };

  const filter = encodeURIComponent('{Email}="' + email.replace(/"/g, '\\"') + '"');
  const getUrl = AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV + '?filterByFormula=' + filter + '&maxRecords=1';

  try {
    const getRes = await fetch(getUrl, { headers: { Authorization: 'Bearer ' + pat } });
    const getData = await getRes.json();
    if (getData.records && getData.records.length) {
      return json(200, { ok: true, existed: true, recordId: getData.records[0].id });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    const trialEndStr = trialEnd.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    const fullFields = {
      Email: email,
      Vorname: vorname,
      Nachname: nachname,
      Status: 'Trial',
      Paket: 'Trial',
      Trial_End: trialEndStr,
      Onboarding_Datum: todayStr,
      subscription_status: 'trialing'
    };

    async function create(fields) {
      return fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ fields })
      });
    }

    let postRes = await create(fullFields);
    if (!postRes.ok) {
      const errText = await postRes.text();
      const minimal = {
        Email: email,
        Vorname: vorname,
        Nachname: nachname,
        Status: 'Trial',
        Paket: 'Trial',
        Trial_End: trialEndStr,
        subscription_status: 'trialing'
      };
      postRes = await create(minimal);
      if (!postRes.ok) {
        return json(postRes.status, { error: 'Airtable Create fehlgeschlagen', detail: errText.slice(0, 400) });
      }
      return json(200, {
        ok: true,
        created: true,
        recordId: (await postRes.json()).id,
        hint: 'Hinweis: Felder Trial_End und Onboarding_Datum in Airtable anlegen für volle Trial-Steuerung.'
      });
    }

    const created = await postRes.json();
    return json(200, { ok: true, created: true, recordId: created.id, Trial_End: trialEndStr });
  } catch (e) {
    return json(502, { error: String(e && e.message ? e.message : e) });
  }
};

