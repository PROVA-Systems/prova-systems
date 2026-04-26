/* ══════════════════════════════════════════════════════════════
   PROVA AUDIT — Zentrale Logging-Funktionen
   - AUDIT_TRAIL: §407a ZPO Compliance (tblqQmMwJKxltXXXl)
   - STATISTIKEN: Jahresbericht-Daten (tblb0j9qOhMExVEFH)
   - KI_STATISTIK: KI-Nutzungs-Tracking (tblv9F8LEnUC3mKru)
══════════════════════════════════════════════════════════════ */

var AT_BASE = 'appJ7bLlAHZoxENWE';
var AT_AUDIT = 'tblqQmMwJKxltXXXl';
var AT_STAT  = 'tblb0j9qOhMExVEFH';
var AT_KI    = 'tblv9F8LEnUC3mKru';

/* ── AUDIT_TRAIL Eintrag schreiben (§407a ZPO) ── */
window.provaAuditLog = async function(opts) {
  /* opts: {
       aktenzeichen, sv_email, paket, aktion,
       ki_modell, sv_validiert, input_hash,
       output_laenge, aenderungsquote, offenlegungstext, notizen
     }
  */
  var svEmail = opts.sv_email || localStorage.getItem('prova_sv_email') || '';
  var paket   = opts.paket   || localStorage.getItem('prova_paket')    || 'Solo';
  var az      = opts.aktenzeichen || localStorage.getItem('prova_aktiver_fall') || '';

  try {
    await provaFetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        path: '/v0/' + AT_BASE + '/' + AT_AUDIT,
        payload: { records: [{ fields: {
          Name:              (opts.aktion || 'KI-Nutzung') + ' · ' + az,
          aktenzeichen:      az,
          sv_email:          svEmail,
          paket:             paket,
          aktion:            opts.aktion || 'KI-Assist',
          ki_modell:         'PROVA KI',
          sv_validiert:      !!opts.sv_validiert,
          timestamp:         new Date().toISOString(),
          input_hash:        opts.input_hash        || '',
          output_laenge:     opts.output_laenge      || 0,
          aenderungsquote:   opts.aenderungsquote    || 0,
          offenlegungstext:  opts.offenlegungstext   || '',
          notizen:           opts.notizen            || '',
        }}]}
      })
    });
  } catch(e) {
    console.warn('[PROVA Audit] Fehler:', e.message);
  }
};

/* ── STATISTIKEN Eintrag schreiben (Jahresbericht) ── */
window.provaStatLog = async function(opts) {
  /* opts: {
       aktenzeichen, paket, ereignis, schadensart,
       plz, ort, auftraggeber_typ,
       foto_anzahl, erstellungszeit_sekunden, transkript_laenge
     }
  */
  var jetzt = new Date();
  var monat = jetzt.getFullYear() + '-' +
              String(jetzt.getMonth() + 1).padStart(2, '0');

  try {
    await provaFetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        path: '/v0/' + AT_BASE + '/' + AT_STAT,
        payload: { records: [{ fields: {
          Aktenzeichen_Ref:       opts.aktenzeichen || '',
          Paket:                  opts.paket || localStorage.getItem('prova_paket') || 'Solo',
          Datum:                  jetzt.toISOString(),
          Monat:                  monat,
          Ereignis:               opts.ereignis || 'Gutachten_Erstellt',
          Schadensart:            opts.schadensart || '',
          PLZ:                    opts.plz || '',
          Ort:                    opts.ort || '',
          Auftraggeber_Typ:       opts.auftraggeber_typ || '',
          Foto_Anzahl:            opts.foto_anzahl || 0,
          Erstellungszeit_Sekunden: opts.erstellungszeit_sekunden || 0,
          Transkript_Laenge:      opts.transkript_laenge || 0,
        }}]}
      })
    });
  } catch(e) {
    console.warn('[PROVA Stat] Fehler:', e.message);
  }
};

/* ── KI_STATISTIK Eintrag schreiben ── */
window.provaKILog = async function(opts) {
  /* opts: {
       schadenart, ursache_quelle, ursache_kategorien,
       eigentext_zeichen, weg, diktat
     }
  */
  try {
    await provaFetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        path: '/v0/' + AT_BASE + '/' + AT_KI,
        payload: { records: [{ fields: {
          Schadenart:         opts.schadenart || '',
          Ursache_Quelle:     opts.ursache_quelle || 'KI-Vorschlag',
          Ursache_Kategorien: opts.ursache_kategorien || '',
          Eigentext_Zeichen:  opts.eigentext_zeichen || 0,
          Weg:                opts.weg || 'Assistent',
          Diktat:             !!opts.diktat,
          Datum:              new Date().toISOString().split('T')[0],
        }}]}
      })
    });
  } catch(e) {
    console.warn('[PROVA KI-Log] Fehler:', e.message);
  }
};
