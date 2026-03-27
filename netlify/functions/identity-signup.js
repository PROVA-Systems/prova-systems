// PROVA Systems — Netlify Identity Trigger
// Wird automatisch aufgerufen wenn sich ein neuer User registriert
// Legt automatisch einen Airtable-Eintrag in SACHVERSTAENDIGE an

exports.handler = async function(event) {
  // Nur POST von Netlify Identity akzeptieren
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Netlify Identity sendet: { event: "signup", user: { email, user_metadata: { full_name } } }
  if (!payload.user || !payload.user.email) {
    return { statusCode: 400, body: 'No user data' };
  }

  const email = payload.user.email;
  const meta  = payload.user.user_metadata || {};
  const name  = meta.full_name || '';
  const parts = name.split(' ');
  const vorname  = parts[0] || '';
  const nachname = parts.slice(1).join(' ') || '';

  const pat     = process.env.AIRTABLE_PAT;
  const baseId  = process.env.AIRTABLE_BASE || 'appJ7bLlAHZoxENWE';
  const tableId = 'tbladqEQT3tmx4DIB'; // SACHVERSTAENDIGE

  if (!pat) {
    console.error('AIRTABLE_PAT nicht gesetzt');
    return { statusCode: 500, body: 'Config error' };
  }

  try {
    // Prüfen ob Nutzer bereits existiert
    // FIX: doppelte }} entfernt → korrekte URL
    const checkRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`,
      { headers: { 'Authorization': `Bearer ${pat}` } }
    );
    const checkData = await checkRes.json();

    if (checkData.records && checkData.records.length > 0) {
      // Bereits vorhanden — kein Duplikat anlegen
      console.log('User bereits in Airtable:', email);
      return { statusCode: 200, body: 'Already exists' };
    }

    // Neuen Eintrag anlegen
    const createRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Email:           email,
            sv_vorname:      vorname,
            sv_nachname:     nachname,
            Paket:           'Starter',
            Status:          'Aktiv',
            onboarding_done: false,
            registriert_am:  new Date().toISOString().split('T')[0]
          }
        })
      }
    );

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('Airtable Fehler:', err);
      return { statusCode: 502, body: 'Airtable error' };
    }

    console.log('Neuer SV in Airtable angelegt:', email);
    return { statusCode: 200, body: 'Created' };

  } catch(e) {
    console.error('Fehler:', e.message);
    return { statusCode: 502, body: e.message };
  }
};
