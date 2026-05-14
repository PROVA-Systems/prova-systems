/* ════════════════════════════════════════════════════════════
   PROVA onboarding-logic.js
   Onboarding — Setup-Wizard, Profil-Ersteinrichtung
   Extrahiert aus onboarding.html
════════════════════════════════════════════════════════════ */

/* ============================================================
     PROVA Onboarding — Connect-Block
     Speichert Profil + Paket in localStorage
     Leitet nach Schritt 5 korrekt weiter je nach Paket
  ============================================================ */

  async function showStep(n) {
    // Vor Schritt-Wechsel: Daten speichern
    if (n === 4) speichereProfilSchritt2();
    if (n === 5) speicherePaketSchritt3();
    if (n === 5) await speichereAvvSchritt4(); // async — wartet auf Airtable
    if (n === 6) bereiteFertigSchritt5();

    for (var i = 1; i <= 6; i++) {
      var el = document.getElementById('ob-step-' + i);
      if (el) el.classList.toggle('active', i === n);
    }
    window.scrollTo(0, 0);
  }

  /* AVV-Checkbox prüfen — Weiter-Button freischalten */
  function pruefeAvvWeiter() {
    var avv  = document.getElementById('ob-avv-check') && document.getElementById('ob-avv-check').checked;
    var dsgvo = document.getElementById('ob-dsgvo-check') && document.getElementById('ob-dsgvo-check').checked;
    var agb  = document.getElementById('ob-agb-check') && document.getElementById('ob-agb-check').checked;
    var btn  = document.getElementById('ob-avv-weiter');
    if (!btn) return;
    var ok = avv && dsgvo && agb;
    btn.disabled = !ok;
    btn.style.opacity = ok ? '1' : '.4';
    btn.style.cursor  = ok ? 'pointer' : 'not-allowed';
  }

  /* SHA-256 Hash berechnen (WebCrypto API) */
  async function sha256(text) {
    try {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return 'sha256:' + Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    } catch(e) {
      return 'sha256:unavailable-' + Date.now();
    }
  }

  /* Session-ID generieren (datenschutzkonform — keine echte IP) */
  function getSessionId() {
    var sid = sessionStorage.getItem('prova_session_id');
    if (!sid) {
      sid = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
      sessionStorage.setItem('prova_session_id', sid);
    }
    return sid;
  }

  /* MEGA⁷⁵-F: Einwilligung in audit_trail loggen (eigene einwilligungen-Tabelle
     defer'd, siehe MEGA75-DECISIONS Phase F). DSGVO-Audit-Proof bleibt erhalten. */
  async function schreibeEinwilligung(dokTyp, version, hash, paket, sessionId) {
    try {
      var ad = await import('/lib/prova-supabase-adapters.js');
      await ad.logEinwilligung({
        dok_typ: dokTyp,
        version: version,
        hash: hash,
        paket: paket,
        session_id: sessionId,
        email: localStorage.getItem('prova_sv_email') || ''
      });
    } catch(e) {
      console.warn('Einwilligung-Sync fehlgeschlagen:', e && e.message);
    }
  }

  /* AVV-Signatur speichern — localStorage + Airtable EINWILLIGUNGEN */
  async function speichereAvvSchritt4() {
    var avv  = document.getElementById('ob-avv-check') && document.getElementById('ob-avv-check').checked;
    var dsgvo = document.getElementById('ob-dsgvo-check') && document.getElementById('ob-dsgvo-check').checked;
    var agb  = document.getElementById('ob-agb-check') && document.getElementById('ob-agb-check').checked;
    if (!avv || !dsgvo || !agb) return;

    var ts = new Date().toISOString();
    var paket = localStorage.getItem('prova_paket') || 'Solo';
    var sid = getSessionId();

    // localStorage sofort setzen — unabhängig von API-Ergebnis
    localStorage.setItem('prova_avv_signed', '1');
    localStorage.setItem('prova_avv_ts', ts);
    localStorage.setItem('prova_avv_version', 'v1.0');
    localStorage.setItem('prova_agb_signed', '1');
    localStorage.setItem('prova_agb_version', 'v1.0');
    localStorage.setItem('prova_dsgvo_signed', '1');
    localStorage.setItem('prova_dsgvo_version', 'v1.0');

    // Hashes der Dokument-URLs berechnen (Proxy für Inhalt-Hash)
    var avvHash   = await sha256('AVV v1.0 — https://prova-systems.de/avv.html — ' + ts.slice(0,10));
    var agbHash   = await sha256('AGB v1.0 — https://prova-systems.de/agb.html — ' + ts.slice(0,10));
    var dsgvoHash = await sha256('Datenschutz v1.0 — https://prova-systems.de/datenschutz.html — ' + ts.slice(0,10));

    // Alle 3 Einwilligungen in Airtable schreiben (parallel)
    await Promise.all([
      schreibeEinwilligung('AVV',         'v1.0', avvHash,   paket, sid),
      schreibeEinwilligung('AGB',         'v1.0', agbHash,   paket, sid),
      schreibeEinwilligung('Datenschutz', 'v1.0', dsgvoHash, paket, sid)
    ]);
  }

  /* Schritt 2 → Profildaten in localStorage */
  function speichereProfilSchritt2() {
    var felder = {
      prova_sv_vorname:  document.getElementById('ob-vorname') && document.getElementById('ob-vorname').value.trim()  || '',
      prova_sv_nachname: document.getElementById('ob-nachname') && document.getElementById('ob-nachname').value.trim() || '',
      prova_sv_email:    document.getElementById('ob-email') && document.getElementById('ob-email').value.trim()    || '',
      prova_sv_telefon:  document.getElementById('ob-telefon') && document.getElementById('ob-telefon').value.trim()  || '',
      prova_sv_firma:    document.getElementById('ob-firma') && document.getElementById('ob-firma').value.trim()    || '',
      prova_sv_quali:    document.getElementById('ob-quali') && document.getElementById('ob-quali').value.trim()    || ''
    };
    Object.entries(felder).forEach(function(kv) {
      if (kv[1]) localStorage.setItem(kv[0], kv[1]);
    });
    // Kombi-Key für SV_PROFIL (wird von ladeSVProfil() in App-Seiten gelesen)
    localStorage.setItem('prova_sv_profil', JSON.stringify({
      Vorname:            felder.prova_sv_vorname,
      Nachname:           felder.prova_sv_nachname,
      Email:              felder.prova_sv_email,
      Telefon:            felder.prova_sv_telefon,
      Firma:              felder.prova_sv_firma,
      Zertifizierung:     felder.prova_sv_quali
    }));
  }

  /* Schritt 3 → Paket in localStorage */
  function speicherePaketSchritt3() {
    var radio = document.querySelector('input[name="paket"]:checked');
    var paket = radio ? radio.value : 'Solo'; if(paket==='Solo')paket='Solo'; if(paket==='Team'||paket==='Pro')paket='Team';
    localStorage.setItem('prova_paket', paket);

    // window.PROVA sofort setzen damit andere Seiten es beim ersten Load haben
    window.PROVA = window.PROVA || {};
    window.PROVA.paket = paket;
    window.PROVA.isPro = ['Pro', 'Team'].includes(paket);
    window.PROVA.isEnterprise = paket === 'Team';
  }

  /* Schritt 5 — Weiter-Links je nach Paket anpassen */
  function bereiteFertigSchritt5() {
    var paket = localStorage.getItem('prova_paket') || 'Solo';
    var appLink = document.getElementById('ob-app-link');
    if (appLink) {
      var ziel = {
        Solo:       'app.html',
        Team:       'app.html',
        Starter:    'app.html',
        Pro:        'app.html',
        Enterprise: 'app.html'
      }[paket] || 'app.html';
      appLink.href = ziel;
      appLink.textContent = 'Erstes Gutachten erstellen →';
    }
    // Trial-Start setzen wenn noch nicht gesetzt
    if (!localStorage.getItem('prova_trial_start')) {
      localStorage.setItem('prova_trial_start', Date.now().toString());
    }
    // Onboarding als abgeschlossen markieren
    localStorage.setItem('prova_onboarding_done', 'true');
    // Airtable-Sync: SV-Datensatz anlegen
    syncOnboardingSV();
  }

  /* MEGA⁷⁵-F: syncOnboardingSV → direkter users-Update via Supabase.
     users-Row existiert seit Signup (auth.users-Trigger); wir setzen nur
     onboarding_completed_at + Profil-Felder. */
  async function syncOnboardingSV() {
    var svp = {};
    var paket = localStorage.getItem('prova_paket') || 'Solo';
    try {
      svp = JSON.parse(localStorage.getItem('prova_sv_profil') || '{}');
      if (!svp.Email && !svp.email) return;

      var mod = await import('/lib/supabase-client.js');
      var sb = mod.supabase || (mod.getSupabase && mod.getSupabase());
      if (!sb) return;
      var sess = await sb.auth.getSession();
      var userId = sess?.data?.session?.user?.id;
      if (!userId) return;

      var vorname = svp.Vorname || localStorage.getItem('prova_sv_vorname') || '';
      var nachname = svp.Nachname || localStorage.getItem('prova_sv_nachname') || '';
      var userUpd = {
        name: (vorname + ' ' + nachname).trim(),
        telefon: svp.Telefon || localStorage.getItem('prova_sv_telefon') || '',
        qualifikation: svp.Zertifizierung || svp.Qualifikation || localStorage.getItem('prova_sv_quali') || '',
        onboarding_completed_at: new Date().toISOString()
      };
      var u = await sb.from('users').update(userUpd).eq('id', userId);
      if (u.error) console.warn('[onboarding→users]', u.error.message);

      // workspaces.abo_tier setzen (paket)
      var ad = await import('/lib/prova-supabase-adapters.js');
      var wsId = await ad.getCurrentWorkspaceId();
      if (wsId) {
        var aboTier = paket === 'Team' ? 'team' : 'solo';
        var w = await sb.from('workspaces').update({ abo_tier: aboTier }).eq('id', wsId);
        if (w.error) console.warn('[onboarding→workspaces]', w.error.message);
      }
    } catch(e) {
      console.warn('Onboarding-Sync:', e && e.message);
    }
    // Pipeline-Eintrag fürs Admin-Dashboard
    syncPipeline(svp, paket);
  }

  /* MEGA⁷⁵-F: PILOT_LIST → users.is_founder + audit_trail-Event.
     Sprint-F-Decision: keine eigene pilots-Tabelle, founding_member-Flag reicht. */
  async function syncPipeline(svp, paket) {
    try {
      var email = localStorage.getItem('prova_sv_email') || svp.Email || svp.email || '';
      if (!email) return;
      var ad = await import('/lib/prova-supabase-adapters.js');
      await ad.auditTrailInsert({
        action: 'pipeline.onboarding',
        function_name: 'onboarding-logic',
        payload: {
          vorname:           localStorage.getItem('prova_sv_vorname') || svp.Vorname || '',
          nachname:          localStorage.getItem('prova_sv_nachname') || svp.Nachname || '',
          email:             email,
          telefon:           localStorage.getItem('prova_sv_telefon') || '',
          quelle:            'Onboarding',
          stufe:             'Onboarding',
          status:            'Aktiv',
          erstkontakt_datum: new Date().toISOString().slice(0, 10),
          mrr_eur:           paket === 'Team' ? 699 : paket === 'Pro' ? 369 : 179
        },
        result: 'ok'
      });
    } catch(e) {
      console.warn('Pipeline sync:', e && e.message);
    }
  }

  /* Validierung Schritt 2 — E-Mail Pflichtfeld */
  function validiereSchritt2() {
    var email = document.getElementById('ob-email') && document.getElementById('ob-email').value.trim() || '';
    var vorname = document.getElementById('ob-vorname') && document.getElementById('ob-vorname').value.trim() || '';
    if (!vorname) {
      document.getElementById('ob-vorname').focus();
      zeigeHinweis('Bitte Vorname eingeben.');
      return false;
    }
    if (!email || !email.includes('@')) {
      document.getElementById('ob-email').focus();
      zeigeHinweis('Bitte gültige E-Mail eingeben.');
      return false;
    }
    return true;
  }

  function zeigeHinweis(text) {
    var h = document.getElementById('ob-hinweis');
    if (!h) {
      h = document.createElement('div');
      h.id = 'ob-hinweis';
      h.style.cssText = 'margin-top:12px;padding:10px 14px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#fca5a5;font-size:13px;';
      var step2 = document.getElementById('ob-step-2');
      if (step2) step2.querySelector('.btn-row').before(h);
    }
    h.textContent = '⚠ ' + text;
    h.style.display = 'block';
    setTimeout(function() { h.style.display = 'none'; }, 3000);
  }

  /* Schritt 2 Weiter-Button mit Validierung */
  document.addEventListener('DOMContentLoaded', function() {

    // ── Hash-Anker: #rechtliches → direkt zu Schritt 4 ──
    if (window.location.hash === '#rechtliches') {
      // Nur zu Schritt 4 wenn Onboarding schon teilweise durchlaufen
      if (localStorage.getItem('prova_onboarding_done') === 'true') {
        showStep(4);
      }
    }

    // Weiter-Button in Schritt 2 mit Validierung versehen
    var step2Weiter = document.querySelector('#ob-step-2 .btn-accent');
    if (step2Weiter) {
      step2Weiter.onclick = function() {
        if (validiereSchritt2()) showStep(3);
      };
    }

    // Profil aus localStorage wiederherstellen falls vorhanden (bei erneutem Besuch)
    var gespeichert = localStorage.getItem('prova_sv_profil');
    if (gespeichert) {
      try {
        var p = JSON.parse(gespeichert);
        var map = {
          'ob-vorname':  p.Vorname,
          'ob-nachname': p.Nachname,
          'ob-email':    p.Email,
          'ob-telefon':  p.Telefon,
          'ob-firma':    p.Firma,
          'ob-quali':    p.Zertifizierung
        };
        Object.entries(map).forEach(function(kv) {
          var el = document.getElementById(kv[0]);
          if (el && kv[1]) el.value = kv[1];
        });
      } catch (e) {}
    }

    // Paket aus localStorage wiederherstellen
    var gespeichertesPaket = localStorage.getItem('prova_paket');
    if (gespeichertesPaket) {
      var radio = document.querySelector('input[name="paket"][value="' + gespeichertesPaket + '"]');
      if (radio) radio.checked = true;
    }
  });