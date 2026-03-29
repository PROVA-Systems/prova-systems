// ══════════════════════════════════════════════════
// PROVA Systems — Identity Signup (Auto-Confirm + Airtable)
// Netlify Function: identity-signup
//
// Wird automatisch von Netlify Identity aufgerufen.
// 1. Bestätigt den User SOFORT (keine E-Mail nötig)
// 2. Legt Eintrag in Airtable SACHVERSTAENDIGE an
//
// WICHTIG: Die Response MUSS app_metadata enthalten
// damit Netlify den User auto-confirmed.
// ══════════════════════════════════════════════════

exports.handler = async function(event) {
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch(e) {
    return {
      statusCode: 200,
      body: JSON.stringify({ app_metadata: { roles: ['user'] } })
    };
  }

  const user = payload.user || {};
  const email = user.email || '';
  const meta = user.user_metadata || {};
  const name = meta.full_name || '';
  const vorname = meta.vorname || name.split(' ')[0] || '';
  const nachname = meta.nachname || name.split(' ').slice(1).join(' ') || '';

  console.log('PROVA Identity Signup:', email);

  // Airtable-Eintrag anlegen (nicht-blockierend)
  try {
    const pat = process.env.AIRTABLE_PAT;
    const baseId = 'appJ7bLlAHZoxENWE';
    const tableId = 'tbladqEQT3tmx4DIB';

    if (pat && email) {
      const checkRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`,
        { headers: { 'Authorization': `Bearer ${pat}` } }
      );
      const checkData = await checkRes.json();

      if (!checkData.records || checkData.records.length === 0) {
        await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Email: email,
              sv_vorname: vorname,
              sv_nachname: nachname,
              Paket: 'Solo',
              Status: 'Trial',
              onboarding_done: false,
              registriert_am: new Date().toISOString().split('T')[0]
            }
          })
        });
        console.log('Neuer SV in Airtable angelegt:', email);
      }
    }
  } catch(e) {
    console.error('Airtable Fehler (nicht kritisch):', e.message);
  }

  // DIESE RESPONSE BESTÄTIGT DEN USER AUTOMATISCH
  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        roles: ['user'],
        provider: 'prova'
      }
    })
  };
};
