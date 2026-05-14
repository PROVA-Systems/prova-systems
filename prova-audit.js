/* ══════════════════════════════════════════════════════════════
   PROVA AUDIT — Zentrale Logging-Funktionen
   MEGA⁷⁵-F: Airtable-Calls (AUDIT_TRAIL/STATISTIKEN/KI_STATISTIK)
   abgelöst. Alle drei Logger schreiben jetzt in Supabase audit_trail
   mit unterschiedlichen action-Codes:
     - 'sv.audit.407a'        (§407a-Compliance, vorher AUDIT_TRAIL)
     - 'stat.jahresbericht'    (Jahresbericht-Daten, vorher STATISTIKEN)
     - 'stat.ki_nutzung'       (KI-Tracking, vorher KI_STATISTIK)
   ki_protokoll bleibt für echte KI-Calls (siehe ki-proxy / MEGA⁷³).
══════════════════════════════════════════════════════════════ */

/* ── AUDIT_TRAIL Eintrag schreiben (§407a ZPO) ── */
window.provaAuditLog = async function(opts) {
  /* opts: {
       aktenzeichen, sv_email, paket, aktion,
       ki_modell, sv_validiert, input_hash,
       output_laenge, aenderungsquote, offenlegungstext, notizen
     }
  */
  opts = opts || {};
  var svEmail = opts.sv_email || localStorage.getItem('prova_sv_email') || '';
  var paket   = opts.paket   || localStorage.getItem('prova_paket')    || 'Solo';
  var az      = opts.aktenzeichen || localStorage.getItem('prova_aktiver_fall') || '';

  try {
    var ad = await import('/lib/prova-supabase-adapters.js');
    await ad.auditTrailInsert({
      action: 'sv.audit.407a',
      function_name: opts.aktion || 'KI-Assist',
      payload: {
        aktenzeichen:     az,
        sv_email:         svEmail,
        paket:            paket,
        aktion:           opts.aktion || 'KI-Assist',
        ki_modell:        opts.ki_modell || 'PROVA KI',
        sv_validiert:     !!opts.sv_validiert,
        input_hash:       opts.input_hash       || '',
        output_laenge:    opts.output_laenge    || 0,
        aenderungsquote:  opts.aenderungsquote  || 0,
        offenlegungstext: opts.offenlegungstext || '',
        notizen:          opts.notizen          || ''
      },
      result: 'ok'
    });
  } catch(e) {
    console.warn('[PROVA Audit] Fehler:', e && e.message);
  }
};

/* ── STATISTIKEN (Jahresbericht-Datenbasis) ── */
window.provaStatLog = async function(opts) {
  /* opts: {
       aktenzeichen, paket, ereignis, schadensart,
       plz, ort, auftraggeber_typ,
       foto_anzahl, erstellungszeit_sekunden, transkript_laenge
     }
  */
  opts = opts || {};
  var jetzt = new Date();
  var monat = jetzt.getFullYear() + '-' + String(jetzt.getMonth() + 1).padStart(2, '0');

  try {
    var ad = await import('/lib/prova-supabase-adapters.js');
    await ad.auditTrailInsert({
      action: 'stat.jahresbericht',
      function_name: 'prova-stat-log',
      payload: {
        aktenzeichen:             opts.aktenzeichen || '',
        paket:                    opts.paket || localStorage.getItem('prova_paket') || 'Solo',
        monat:                    monat,
        ereignis:                 opts.ereignis || 'Gutachten_Erstellt',
        schadensart:              opts.schadensart || '',
        plz:                      opts.plz || '',
        ort:                      opts.ort || '',
        auftraggeber_typ:         opts.auftraggeber_typ || '',
        foto_anzahl:              opts.foto_anzahl || 0,
        erstellungszeit_sekunden: opts.erstellungszeit_sekunden || 0,
        transkript_laenge:        opts.transkript_laenge || 0
      },
      result: 'ok'
    });
  } catch(e) {
    console.warn('[PROVA Stat] Fehler:', e && e.message);
  }
};

/* ── KI_STATISTIK Eintrag schreiben ── */
window.provaKILog = async function(opts) {
  /* opts: {
       schadenart, ursache_quelle, ursache_kategorien,
       eigentext_zeichen, weg, diktat
     }
  */
  opts = opts || {};
  try {
    var ad = await import('/lib/prova-supabase-adapters.js');
    await ad.auditTrailInsert({
      action: 'stat.ki_nutzung',
      function_name: 'prova-ki-log',
      payload: {
        schadenart:         opts.schadenart || '',
        ursache_quelle:     opts.ursache_quelle || 'KI-Vorschlag',
        ursache_kategorien: opts.ursache_kategorien || '',
        eigentext_zeichen:  opts.eigentext_zeichen || 0,
        weg:                opts.weg || 'Assistent',
        diktat:             !!opts.diktat,
        datum:              new Date().toISOString().split('T')[0]
      },
      result: 'ok'
    });
  } catch(e) {
    console.warn('[PROVA KI-Log] Fehler:', e && e.message);
  }
};
