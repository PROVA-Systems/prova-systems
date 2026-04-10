/**
 * PROVA — KI-Proxy (OpenAI)
 * Actions: foto_analyse | beweisfragen_text | metadata_ping
 * ENV: OPENAI_API_KEY, AIRTABLE_PAT
 */
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const { hasProvaAccess } = require('./lib/prova-subscription');

function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'X-PROVA-AI': 'Assisted',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(obj)
  };
}

async function logKiAudit(pat, email, action, az, tokensApprox) {
  const tableAudit =
    process.env.PROVA_AUDIT_TRAIL_TABLE || process.env.AIRTABLE_AUDIT_TRAIL_TABLE || 'tbloeYUDuu0wRxpM8';
  try {
    await fetch('https://api.airtable.com/v0/' + (process.env.AIRTABLE_BASE_ID || 'appJ7bLlAHZoxENWE') + '/' + tableAudit, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Typ: 'KI',
          Email: email || 'unbekannt',
          AZ: az || '',
          Details: JSON.stringify({ aufgabe: action || '', tokens_approx: tokensApprox || 0 }),
          Zeitstempel: new Date().toISOString(),
          IP_Hint: ''
        }
      })
    });
  } catch (e) {}
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return json(500, { error: 'OPENAI_API_KEY nicht gesetzt' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Ungültiger JSON-Body' });
  }

  const meta = {
    ki_modell: 'PROVA KI (OpenAI)',
    ki_datum: new Date().toISOString(),
    ki_version: '1.0',
    eu_ai_act_art52: true
  };

  const action = body.action || body.aufgabe || '';

  if (action !== 'metadata_ping' && action !== 'eu_ai_label') {
    const pat = process.env.AIRTABLE_PAT;
    const user = context.clientContext && context.clientContext.user;
    if (!pat || !user || !user.email) {
      return json(401, { error: 'Anmeldung erforderlich', _prova_ki_meta: meta });
    }
    const access = await hasProvaAccess(String(user.email).trim().toLowerCase(), pat);
    if (!access.ok) {
      return json(403, { error: 'Kein Zugriff — Testphase beendet oder kein aktives Abo', _prova_ki_meta: meta });
    }
    body._prova_user_email = String(user.email).trim().toLowerCase();
  }

  try {
    if (action === 'metadata_ping' || action === 'eu_ai_label') {
      return json(200, { ok: true, _prova_ki_meta: meta });
    }

    if (action === 'foto_analyse' || body.aufgabe === 'foto_analyse') {
      const b64 = body.imageBase64 || body.b64;
      const mime = body.mimeType || 'image/jpeg';
      if (!b64) return json(400, { error: 'imageBase64 fehlt' });

      const prompt =
        'Du bist Sachverständiger für Gebäudeschäden. Beschreibe prägnant was auf dem Foto zu sehen ist. ' +
        'Antworte NUR als kompaktes JSON mit den Schlüsseln: beschreibung (string), schadenart (string oder leer), ' +
        'messwert_hinweis (string, z.B. geschätzte Abmessungen wenn erkennbar), normen_hinweis (string, relevante DIN wenn erkennbar). Deutsch.';

      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 900,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } }
              ]
            }
          ]
        })
      });
      const raw = await res.text();
      if (!res.ok) return json(res.status, { error: raw.slice(0, 500), _prova_ki_meta: meta });

      const data = JSON.parse(raw);
      const txt = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      let parsed = {};
      try {
        const m = txt.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : { beschreibung: txt };
      } catch (e2) {
        parsed = { beschreibung: txt || '' };
      }
      await logKiAudit(process.env.AIRTABLE_PAT, body._prova_user_email, 'foto_analyse', body.az || body.aktenzeichen || '', 900);
      return json(200, Object.assign(parsed, { _prova_ki_meta: meta }));
    }

    if (action === 'beweisfragen_text' || body.aufgabe === 'beweisfragen') {
      const text = body.text || body.pdfText || '';
      if (!text || text.length < 20) return json(400, { error: 'text zu kurz (Beweisbeschluss einfügen)' });

      const prompt =
        'Extrahiere aus folgendem Gerichtstext die Beweisfragen / Beweisthemen. ' +
        'Antworte NUR als JSON: { "fragen": [ { "nr": number, "text": string } ], "aktenzeichen_gericht": string|null }. Deutsch.\n\n---\n' +
        text.slice(0, 28000);

      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const raw = await res.text();
      if (!res.ok) return json(res.status, { error: raw.slice(0, 500), _prova_ki_meta: meta });

      const data = JSON.parse(raw);
      const txt = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      let parsed = { fragen: [], rohtext: txt };
      try {
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      } catch (e3) {}
      await logKiAudit(process.env.AIRTABLE_PAT, body._prova_user_email, 'beweisfragen_text', body.az || body.aktenzeichen_gericht || '', 4000);
      return json(200, Object.assign(parsed, { _prova_ki_meta: meta }));
    }

    return json(400, { error: 'Unbekannte action: ' + action, _prova_ki_meta: meta });
  } catch (err) {
    return json(502, { error: err.message || String(err), _prova_ki_meta: meta });
  }
};
