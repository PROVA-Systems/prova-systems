/**
 * Netlify Identity Trigger — wird bei Registrierung aufgerufen
 * Legt SV-Zeile in Airtable an: Status="Trial", Trial_End = +14 Tage
 *
 * Airtable: Felder Status, Trial_End, Email, Vorname, Nachname anlegen
 */
const { AIRTABLE_API, BASE_ID, TABLE_SV } = require('./lib/prova-subscription.js');
const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return corsOptionsResponse(event);
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    console.error('identity-signup: AIRTABLE_PAT fehlt');
    return { statusCode: 500, body: 'AIRTABLE_PAT fehlt' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const user = payload.user || payload;
  const email = (user.email && String(user.email).trim().toLowerCase()) || '';
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: 'No email' };
  }

  const meta = user.user_metadata || {};
  const fullName = String(meta.full_name || '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const vorname = parts[0] || email.split('@')[0];
  const nachname = parts.length > 1 ? parts.slice(1).join(' ') : '';

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  const trialEndStr = trialEnd.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  const filter = encodeURIComponent('{Email}="' + email.replace(/"/g, '\\"') + '"');
  const getUrl = AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV + '?filterByFormula=' + filter + '&maxRecords=1';

  try {
    const getRes = await fetch(getUrl, { headers: { Authorization: 'Bearer ' + pat } });
    const getData = await getRes.json();
    if (getData.records && getData.records.length) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, existed: true }) };
    }

    const fields = {
      Email: email,
      Vorname: vorname,
      Nachname: nachname,
      Status: 'Trial',
      trial_end: trialEnd.toISOString(),
      Onboarding_Datum: todayStr,
      Paket: 'Solo',
      subscription_status: 'trialing'
    };

    const postRes = await fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      const minimal = {
        Email: email,
        Vorname: vorname,
        Nachname: nachname,
        Status: 'Trial',
        Paket: 'Solo',
        trial_end: trialEnd.toISOString()
      };
      const r2 = await fetch(AIRTABLE_API + '/v0/' + BASE_ID + '/' + TABLE_SV, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: minimal })
      });
      if (!r2.ok) {
        console.error('identity-signup airtable', errText);
        return { statusCode: 500, body: errText.slice(0, 300) };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, created: true, Trial_End: trialEndStr }) };
  } catch (e) {
    console.error('identity-signup', e);
    return { statusCode: 500, body: String(e.message || e) };
  }
};

