// ══════════════════════════════════════════════════════════════════
// PROVA Systems — Identity Signup Handler
// Netlify Identity Lifecycle Hook: läuft bei jeder Registrierung
//
// FLOW:
// 1. User registriert sich → Netlify sendet Bestätigungsmail
// 2. Diese Function legt den Airtable-Record an (Status: "Trial")
// 3. Nach E-Mail-Bestätigung kann der User sich einloggen
//
// Netlify-Einstellung: Site Settings → Identity → "Registration"
// → "Invite only" ODER "Open" + diese Function als Identity Hook
// ══════════════════════════════════════════════════════════════════

exports.handler = async function(event) {
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 200, body: JSON.stringify({ app_metadata: { roles: ['user'] } }) };
  }

  const user      = payload.user || {};
  const email     = user.email   || '';
  const meta      = user.user_metadata || {};
  const fullName  = meta.full_name || '';
  const vorname   = meta.vorname  || fullName.split(' ')[0] || '';
  const nachname  = meta.nachname || fullName.split(' ').slice(1).join(' ') || '';

  console.log('[PROVA Identity] Neue Registrierung:', email);

  // ── Airtable-Record anlegen ─────────────────────────────────────
  try {
    const pat    = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
    const baseId = 'appJ7bLlAHZoxENWE';
    const tblSV  = 'tbladqEQT3tmx4DIB';

    if (!pat) {
      console.warn('[PROVA Identity] AIRTABLE_PAT nicht gesetzt!');
    } else if (email) {
      // Prüfen ob Record schon existiert (Duplikat-Schutz)
      const checkRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tblSV}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`,
        { headers: { 'Authorization': `Bearer ${pat}` } }
      );
      const checkData = await checkRes.json();

      if (!checkData.records || checkData.records.length === 0) {
        // Trial-Ende: 14 Tage ab heute
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);

        const createRes = await fetch(`https://api.airtable.com/v0/${baseId}/${tblSV}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              // !! Korrekte Feldnamen aus Airtable-Schema !!
              Email:            email,
              Vorname:          vorname,
              Nachname:         nachname,
              Paket:            'Solo',
              Status:           'Aktiv',
              // Trial-Zeitraum
              Trial_Start:      new Date().toISOString().split('T')[0],
              trial_end:        trialEnd.toISOString(),
              current_period_end: trialEnd.toISOString(),
              subscription_status: 'trialing',
              // Onboarding
              onboarding_done:  false,
              testpiloten:      false,
              // Aktivitäts-Tracking
              Onboarding_Datum: new Date().toISOString().split('T')[0],
              Letzter_Login:    new Date().toISOString()
            }
          })
        });

        const createData = await createRes.json();
        if (createData.id) {
          console.log('[PROVA Identity] Neuer SV angelegt:', email, '→', createData.id);
        } else {
          console.error('[PROVA Identity] Airtable-Fehler:', JSON.stringify(createData));
        }
      } else {
        console.log('[PROVA Identity] SV bereits vorhanden:', email);
        // Letzter Login aktualisieren
        const recId = checkData.records[0].id;
        await fetch(`https://api.airtable.com/v0/${baseId}/${tblSV}/${recId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Letzter_Login: new Date().toISOString() } })
        });
      }
    }
  } catch(e) {
    // Nie blockieren — Netlify-Antwort muss immer kommen
    console.error('[PROVA Identity] Fehler (nicht kritisch):', e.message);
  }

  // ── Netlify Identity Response ───────────────────────────────────
  // app_metadata wird dem User-Token hinzugefügt
  // Ohne diese Response schlägt die Registrierung fehl!
  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        roles:    ['user'],
        provider: 'prova',
        paket:    'Solo'
      }
    })
  };
};
