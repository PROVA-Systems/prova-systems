// ══════════════════════════════════════════════════════════════
// PROVA Systems — Team Interesse Function
// /.netlify/functions/team-interest
//
// Ablauf:
// 1. Validierung (Name, E-Mail)
// 2. Airtable: Lead in TEAM_INTERESSE speichern (via AIRTABLE_PAT)
// 3. Make.com L4: Webhook triggern → E-Mail-Auto-Antwort
// ══════════════════════════════════════════════════════════════

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Make.com L4 Webhook — SV Auto-Antwort
const MAKE_L4_WEBHOOK = '/.netlify/functions/make-proxy?key=l4';
// Make.com L5 Webhook — Marcel Benachrichtigung bei neuem Lead
const MAKE_L5_WEBHOOK = '/.netlify/functions/make-proxy?key=l5';

// Airtable
const AT_BASE  = 'appJ7bLlAHZoxENWE';
const AT_TABLE = 'TEAM_INTERESSE';

exports.handler = async (event) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Body parsen ──
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name = '', email = '', kanzlei_info = '', svs_anzahl = '' } = data;

  // ── Validierung ──
  if (!email || !email.includes('@')) {
    return {
      statusCode: 400, headers: HEADERS,
      body: JSON.stringify({ error: 'Gültige E-Mail-Adresse erforderlich' })
    };
  }

  const pat = process.env.AIRTABLE_PAT;

  // ── 1. Airtable: Lead speichern ──
  let airtableId = null;
  if (pat) {
    try {
      const atRes = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${encodeURIComponent(AT_TABLE)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Name':         name || 'Nicht angegeben',
              'Email':        email,
              'Kanzlei_Info': kanzlei_info || 'Keine Angabe',
              'SVs_Anzahl':   svs_anzahl   || 'Nicht angegeben',
              'Datum':        new Date().toISOString(),
              'Status':       'Interesse',
            }
          }],
          typecast: true,
        }),
      });

      if (atRes.ok) {
        const atData = await atRes.json();
        airtableId = atData.records?.[0]?.id;
        console.log('[PROVA] Team Interesse in Airtable gespeichert:', airtableId);
      } else {
        const err = await atRes.text();
        console.error('[PROVA] Airtable Fehler:', atRes.status, err);
      }
    } catch (e) {
      console.error('[PROVA] Airtable Exception:', e.message);
    }
  } else {
    console.warn('[PROVA] AIRTABLE_PAT nicht konfiguriert — Lead nicht gespeichert');
  }

  // ── 2. Make.com L4: E-Mail-Auto-Antwort triggern ──
  try {
    const makeRes = await fetch(MAKE_L4_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:         name || 'Interessent',
        email,
        kanzlei_info,
        svs_anzahl,
        airtable_id:  airtableId || '',
        datum:        new Date().toLocaleDateString('de-DE'),
      }),
    });

    if (makeRes.ok) {
      console.log('[PROVA] Make.com L4 erfolgreich getriggert');
    } else {
      console.warn('[PROVA] Make.com L4 Fehler:', makeRes.status);
    }
  } catch (e) {
    console.error('[PROVA] Make.com Exception:', e.message);
    // Non-blocking — Airtable ist bereits gespeichert
  }

  // ── 3. Make.com L5: Marcel Benachrichtigung ──
  try {
    fetch(MAKE_L5_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, kanzlei_info, svs_anzahl,
        airtable_id: airtableId || '',
        datum: new Date().toLocaleDateString('de-DE'),
      }),
    }).catch(e => console.warn('[PROVA] L5 non-blocking error:', e.message));
  } catch(e) { /* non-blocking */ }

  // ── Erfolg ──
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      success: true,
      message: 'Interesse gespeichert — Bestätigung wird gesendet',
      airtable_id: airtableId,
    }),
  };
};
