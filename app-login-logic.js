
/* ── USER-WECHSEL SCHUTZ: bei anderem User alle Caches löschen ── */
window.provaWechselUserCaches = function(neueEmail) {
  var alteEmail = localStorage.getItem('prova_sv_email') || '';
  if (!alteEmail || alteEmail === neueEmail) return; // gleicher User — nichts tun
  
  console.warn('[PROVA Security] User-Wechsel erkannt: ' + alteEmail + ' → ' + neueEmail);
  
  // Alle user-spezifischen Caches und Daten löschen
  var zuLoeschen = [
    'prova_faelle_cache', 'prova_archiv_cache_v2', 'prova_termine_cache',
    'prova_aufmass_cache', 'prova_normen_cache', 'prova_fall_normen_',
    'prova_akten', 'prova_audit_log', 'prova_at_sv_record_id',
    'prova_letztes_az', 'prova_aktiver_fall', 'prova_current_az',
    'prova_letzter_auftraggeber', 'prova_letzter_auftraggeber_email',
    'prova_schadenart', 'prova_adresse', 'prova_diktat_ortstermin',
    'prova_stellungnahme_text', 'prova_offenlegungstext',
    'prova_407a_ts', 'prova_5pruef_ts', 'prova_erster_fall_erstellt',
    'prova_onboarding_done', 'prova_paket', 'prova_status',
    'prova_sv_vorname', 'prova_sv_nachname', 'prova_sv_firma',
    'prova_sv_email', 'prova_sv_ort', 'prova_sv_strasse',
    'prova_sv_plz', 'prova_sv_telefon', 'prova_sv_steuer_nr',
    'prova_session_v2', 'prova_last_activity',
    'prova_stripe_pending', 'prova_stripe_erfolg'
  ];
  
  // Alle Keys aus localStorage durchsuchen und prova_* Keys löschen
  // (außer theme-Einstellungen die gerätespezifisch sind)
  var keepKeys = ['prova_theme', 'prova_font_size', 'prova_accent_color'];
  var allKeys = [];
  for (var i = 0; i < localStorage.length; i++) {
    allKeys.push(localStorage.key(i));
  }
  allKeys.forEach(function(k) {
    if (k && k.startsWith('prova_') && keepKeys.indexOf(k) === -1) {
      localStorage.removeItem(k);
    }
  });
  
  // SessionStorage ebenfalls löschen
  sessionStorage.clear();
  
  console.log('[PROVA Security] Caches gelöscht für User-Wechsel');
};

/* ════════════════════════════════════════════════════════════
   PROVA app-login-logic.js
   Login — Auth, Netlify Identity, Redirect
   Extrahiert aus app-login.html
════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   PROVA AUTH — app-login.html
   
   FLOWS:
   ① Selbst-Registrierung  (normaler Signup-Button)
      → User tippt Name + E-Mail + Passwort
      → POST /.netlify/identity/signup
      → Netlify schickt Bestätigungsmail
      → User klickt Link → kommt mit #confirmation_token=... zurück
      → Passwort ist bereits gesetzt → direkt Login
   
   ② Einladungs-Flow  (invite_token)
      → Admin oder bestehender User hat über Netlify/Make Einladung versandt
      → User klickt Link → kommt mit #invite_token=... zurück
      → Name+E-Mail-Felder versteckt, nur Passwort nötig
      → netlifyIdentity.acceptInvite() → direkt zum Dashboard
   
   ③ Normaler Login
      → POST /.netlify/identity/token (grant_type=password)
      → Airtable-Paket laden → Dashboard
   
   ④ Passwort-Reset
      → POST /.netlify/identity/recover
      → User klickt Link → kommt mit #recovery_token=... zurück
      → Neues Passwort setzen (hier vereinfacht — kann auch separates recovery.html sein)
   
   TOKEN-ERKENNUNG:
   Netlify schickt Tokens immer als Hash-Fragment: /#invite_token=...
   ABER: einige Browser / Redirect-Ketten schicken sie als Query-Parameter: ?invite_token=...
   → Wir prüfen BEIDES
   ═══════════════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────
   HILFSFUNKTIONEN
   ──────────────────────────────────────────── */

function togglePw(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}
window.togglePw = togglePw;

function showTab(tab) {
  ['login','register','reset'].forEach(function(t) {
    var el = document.getElementById('form-' + t);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });
  ['login','register'].forEach(function(t) {
    var btn = document.getElementById('tab-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
}
window.showTab = showTab;

function showErr(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  var ok = el.id ? document.getElementById(el.id.replace('-err','-ok')) : null;
  if (ok) ok.classList.remove('show');
}
function showOk(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  var err = el.id ? document.getElementById(el.id.replace('-ok','-err')) : null;
  if (err) err.classList.remove('show');
}
function clearMessages() {
  document.querySelectorAll('.msg-err,.msg-ok,.msg-warn').forEach(function(el){
    el.classList.remove('show');
  });
}

/* Passwort-Stärke-Anzeige */
function checkPwStrength(pw) {
  var bar  = document.getElementById('pw-bar');
  var text = document.getElementById('pw-strength-text');
  if (!bar || !text) return;
  var score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  var pct  = Math.min(100, score * 20);
  var color = score <= 1 ? '#ef4444' : score <= 2 ? '#f59e0b' : score <= 3 ? '#3b82f6' : '#10b981';
  var label = score <= 1 ? 'Sehr schwach' : score <= 2 ? 'Schwach' : score <= 3 ? 'Gut' : score <= 4 ? 'Stark' : 'Sehr stark';
  bar.style.width  = pct + '%';
  bar.style.background = color;
  text.textContent = pw.length > 0 ? label : '';
  text.style.color = color;
}

/* Token aus URL extrahieren — prüft Hash UND Query-String */
function extractToken(name) {
  // Hash: /#invite_token=abc oder #invite_token=abc
  var hash = window.location.hash || '';
  // Query: ?invite_token=abc
  var search = window.location.search || '';
  // Kombiniert suchen
  var sources = [hash, search];
  for (var i = 0; i < sources.length; i++) {
    var match = sources[i].match(new RegExp('[#?&]?' + name + '=([^&#]+)'));
    if (match && match[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

/* ────────────────────────────────────────────
   TESTVERSION (kein Konto nötig)
   ──────────────────────────────────────────── */
window.starteTestversion = function() {
  window.location.href = 'app-register.html';
};

/* ────────────────────────────────────────────
   AIRTABLE — Paket laden & weiterleiten
   ──────────────────────────────────────────── */
async function ladePaketUndWeiterleiten(email, ziel) {
  if ((email||'').toLowerCase() === 'admin@prova-systems.de') {
    localStorage.removeItem('prova_user');
    localStorage.removeItem('prova_paket');
    localStorage.removeItem('prova_is_admin');
    return;
  }
  var paket = 'Solo';
  if (!ziel) {
    ziel = localStorage.getItem('prova_onboarding_done') ? 'dashboard.html' : 'onboarding-schnellstart.html';
  }
  try {
    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        method: 'GET',
        path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB?filterByFormula=' +
              encodeURIComponent('{Email}="' + email + '"') + '&maxRecords=1'
      })
    });
    if (res.ok) {
      var data = await res.json();
      var records = data.records || [];
      if (records.length > 0) {
        var f = records[0].fields || {};
        // Record-ID für spätere Airtable-Patches speichern (z.B. onboarding_done)
        localStorage.setItem('prova_at_sv_record_id', records[0].id);
        paket = (f.Paket && f.Paket.name) ? f.Paket.name : (f.Paket || f.paket || 'Solo');
        // Paket-Mapping: alte Namen → neue Namen
        var paketMap = {'Starter':'Solo','starter':'Solo','STARTER':'Solo','Pro':'Solo','pro':'Solo','PRO':'Solo','Enterprise':'Team','enterprise':'Team','ENTERPRISE':'Team'};
        paket = paketMap[paket] || paket;
        if (!['Solo','Team'].includes(paket)) paket = 'Solo';
        var status = (f.Status && f.Status.name) ? f.Status.name : (f.Status || 'Aktiv');
        if (status === 'Gesperrt' || status === 'Gekuendigt') {
          localStorage.clear();
          window.location.href = 'app-login.html?reason=account_locked';
          return;
        }
        // ── Profil-Sync: alle relevanten Felder aus Airtable ──────────────
        if (f.sv_vorname)        localStorage.setItem('prova_sv_vorname',       f.sv_vorname);
        if (f.sv_nachname)       localStorage.setItem('prova_sv_nachname',      f.sv_nachname);
        if (f.sv_qualifikation)  localStorage.setItem('prova_sv_qualifikation', f.sv_qualifikation);
        if (f.sv_bueronamen)     localStorage.setItem('prova_bueronamen',       f.sv_bueronamen);
        if (f.sv_telefon)        localStorage.setItem('prova_sv_telefon',       f.sv_telefon);
        if (f.sv_adresse)        localStorage.setItem('prova_sv_adresse',       f.sv_adresse);
        if (f.sv_stempel_url)    localStorage.setItem('prova_sv_stempel_url',   f.sv_stempel_url);
        if (f.sv_signatur)       localStorage.setItem('prova_sv_signatur',      f.sv_signatur);
        if (f.sv_firma)          localStorage.setItem('prova_sv_firma',         f.sv_firma);
        // Trial: aus Airtable laden damit es geräteübergreifend stimmt
        if (f.trial_start)       localStorage.setItem('prova_trial_start',      f.trial_start);
        if (f.trial_days)        localStorage.setItem('prova_trial_days',       String(f.trial_days));
        // Onboarding-Flags: aus Airtable laden
        if (f.onboarding_done || f.Onboarding_Done) {
          localStorage.setItem('prova_onboarding_done',       'true');
          localStorage.setItem('prova_welcome_seen',          '1');
          localStorage.setItem('prova_erster_fall_erstellt',  '1');
          ziel = 'dashboard.html';
        }
        if (f.kontakte_importiert) localStorage.setItem('prova_kontakte_importiert', '1');
        // Testpilot-Flag: dauerhaft Sonderkonditionen, kein Stripe
        if (f.testpilot) {
          localStorage.setItem('prova_testpilot', '1');
          localStorage.setItem('prova_trial_days', '90');
        } else {
          localStorage.removeItem('prova_testpilot');
        }
        // Primärfarbe / Branding
        if (f.primary_color) localStorage.setItem('prova_primary_color', f.primary_color);
      }
    }
  } catch(e) { console.warn('Paket-Abfrage fehlgeschlagen:', e); }
  localStorage.setItem('prova_paket', paket);
  window.location.href = ziel;
}

/* ────────────────────────────────────────────
   FLOW ③ — LOGIN
   ──────────────────────────────────────────── */
window.login = async function() {
  var email = document.getElementById('login-email').value.trim();
  var pw    = document.getElementById('login-pw').value;
  var errEl = document.getElementById('login-err');
  var btn   = document.getElementById('login-btn');
  errEl.classList.remove('show');
  if (!email) { showErr(errEl,'Bitte E-Mail-Adresse eingeben.'); return; }
  if (!pw)    { showErr(errEl,'Bitte Passwort eingeben.'); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Anmelden…';
  try {
    var res = await fetch('/.netlify/identity/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'grant_type=password&username=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(pw)
    });
    if (res.status === 404) {
      showErr(errEl, 'Konto-System noch nicht aktiviert. Bitte Support kontaktieren.');
      btn.disabled = false; btn.textContent = 'Anmelden'; return;
    }
    if (res.status === 400) {
      // Könnte "Email not confirmed" sein — Fallback: Session direkt setzen
      var errBody = {};
      try { errBody = await res.json(); } catch(e){}
      if ((errBody.error_description||'').toLowerCase().includes('confirm')) {
        // User existiert aber ist nicht bestätigt → direkt einloggen via Airtable
        console.log('PROVA: E-Mail nicht bestätigt, Fallback-Login via Airtable');
        localStorage.setItem('prova_user', JSON.stringify({email: email, name: email, token: 'fallback-login'}));
        // User-Wechsel-Schutz: alten Cache löschen falls anderer User
        if (typeof window.provaWechselUserCaches === 'function') {
          window.provaWechselUserCaches(userData.email || '');
        }
        localStorage.setItem('prova_sv_email', email);
        localStorage.setItem('prova_paket', 'Solo');
        localStorage.setItem('prova_status', 'Trial');
        // Trial-Start nur setzen wenn noch NICHT in Airtable und NICHT in localStorage
        if (!localStorage.getItem('prova_trial_start')) {
          var trialStart = new Date().toISOString();
          localStorage.setItem('prova_trial_start', trialStart);
          localStorage.setItem('prova_trial_days', '14');
          // In Airtable speichern damit es geräteübergreifend funktioniert
          fetch('/.netlify/functions/airtable', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              method: 'PATCH',
              path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB',
              payload: { fields: { trial_start: trialStart, trial_days: 14 } }
            })
          }).catch(function(){});
        }
        await ladePaketUndWeiterleiten(email);
        return;
      } else {
        showErr(errEl, 'E-Mail oder Passwort falsch.');
      }
      btn.disabled = false; btn.textContent = 'Anmelden'; return;
    }
    if (res.status === 401 || res.status === 422) {
      showErr(errEl, 'E-Mail oder Passwort falsch.');
      btn.disabled = false; btn.textContent = 'Anmelden'; return;
    }
    if (!res.ok) {
      showErr(errEl, 'Anmeldung fehlgeschlagen (' + res.status + ').');
      btn.disabled = false; btn.textContent = 'Anmelden'; return;
    }
    var data = await res.json();
    if (!data.access_token) throw new Error('No token');
    var userRes  = await fetch('/.netlify/identity/user', {headers: {'Authorization': 'Bearer ' + data.access_token}});
    var userData = userRes.ok ? await userRes.json() : {};
    var md   = userData.user_metadata || {};
    var name = md.full_name || email;
    localStorage.setItem('prova_user',     JSON.stringify({email: userData.email||email, name: name, token: data.access_token}));
    localStorage.setItem('prova_sv_email', userData.email||email);
    if (md.full_name) {
      var parts = name.split(' ');
      localStorage.setItem('prova_sv_vorname',  parts[0]||'');
      localStorage.setItem('prova_sv_nachname', parts.slice(1).join(' ')||'');
    }
    await ladePaketUndWeiterleiten(userData.email||email);
  } catch(e) {
    showErr(errEl, 'Verbindungsfehler. Bitte Internetverbindung prüfen.');
    btn.disabled = false; btn.textContent = 'Anmelden';
  }
};

/* ────────────────────────────────────────────
   FLOW ① + ② — REGISTRIERUNG / PASSWORT SETZEN
   ──────────────────────────────────────────── */
window.register = async function() {
  var errEl = document.getElementById('reg-err');
  var okEl  = document.getElementById('reg-ok');
  var btn   = document.getElementById('reg-btn');
  errEl.classList.remove('show'); okEl.classList.remove('show');

  // Token aus sessionStorage (wurde beim Seitenaufruf gespeichert)
  var inviteToken = sessionStorage.getItem('prova_invite_token');
  var confirmToken = sessionStorage.getItem('prova_confirm_token');
  var isInviteFlow = !!(inviteToken || confirmToken);

  // Felder lesen
  var name  = (document.getElementById('reg-name')?.value || '').trim();
  var email = (document.getElementById('reg-email')?.value || '').trim();
  var pw    = (document.getElementById('reg-pw')?.value || '');

  // Validierung
  if (!isInviteFlow) {
    // Normale Registrierung: Name + E-Mail + Passwort pflicht
    if (!name)  { showErr(errEl, 'Bitte vollständigen Namen eingeben.'); return; }
    if (!email) { showErr(errEl, 'Bitte E-Mail-Adresse eingeben.'); return; }
    if (!email.includes('@')) { showErr(errEl, 'Bitte eine gültige E-Mail-Adresse eingeben.'); return; }
  }
  if (pw.length < 8) { showErr(errEl, 'Passwort muss mindestens 8 Zeichen haben.'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Konto wird erstellt…';

  try {
    /* ── FLOW ②: Invite-Token → acceptInvite() ── */
    if (inviteToken) {
      if (typeof netlifyIdentity === 'undefined') {
        showErr(errEl, 'Authentifizierungssystem nicht geladen. Bitte Seite neu laden.');
        btn.disabled = false; btn.textContent = 'Passwort festlegen & loslegen';
        return;
      }
      netlifyIdentity.acceptInvite(inviteToken, pw, function(err, user) {
        if (err) {
          var msg = (err && err.json && err.json.error_description)
            ? err.json.error_description
            : 'Einladungslink abgelaufen oder ungültig. Bitte neuen Link anfordern.';
          showErr(errEl, msg);
          btn.disabled = false; btn.textContent = 'Passwort festlegen & loslegen';
          return;
        }
        var md = (user && user.user_metadata) ? user.user_metadata : {};
        var resolvedName  = name || md.full_name || (user && user.email) || '';
        var resolvedEmail = (user && user.email) || '';
        var parts = resolvedName.split(' ');
        sessionStorage.removeItem('prova_invite_token');
        localStorage.setItem('prova_user',        JSON.stringify({name: resolvedName, email: resolvedEmail, token: 'netlify'}));
        localStorage.setItem('prova_sv_email',    resolvedEmail);
        localStorage.setItem('prova_sv_vorname',  parts[0] || '');
        localStorage.setItem('prova_sv_nachname', parts.slice(1).join(' ') || '');
        showOk(okEl, '✅ Passwort gesetzt — Sie werden weitergeleitet…');
        setTimeout(function() { ladePaketUndWeiterleiten(resolvedEmail); }, 1500);
      });
      return;
    }

    /* ── FLOW ② ALT: Confirmation-Token (E-Mail-Bestätigung nach Self-Signup) ── */
    if (confirmToken) {
      // Bei confirmation_token: User hat bereits Passwort gesetzt beim Signup.
      // Confirmation-Flow bedeutet: E-Mail wurde bestätigt → direkt einloggen.
      // Falls Netlify Identity Widget vorhanden, confirmen wir über die API.
      try {
        var confRes = await fetch('/.netlify/identity/verify', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({token: confirmToken, type: 'signup'})
        });
        sessionStorage.removeItem('prova_confirm_token');
        if (confRes.ok) {
          // Direkt versuchen einzuloggen mit gespeicherter E-Mail
          var storedEmail = localStorage.getItem('prova_sv_email') || '';
          if (storedEmail) {
            showOk(okEl, '✅ E-Mail bestätigt! Bitte jetzt anmelden.');
            setTimeout(function() {
              showTab('login');
              var el = document.getElementById('login-email');
              if (el) el.value = storedEmail;
            }, 1500);
          } else {
            showOk(okEl, '✅ E-Mail bestätigt! Bitte jetzt anmelden.');
            setTimeout(function() { showTab('login'); }, 1500);
          }
        } else {
          // Verification-Endpunkt nicht verfügbar oder schon bestätigt — trotzdem zum Login
          showOk(okEl, '✅ Bestätigung empfangen — bitte jetzt anmelden.');
          setTimeout(function() { showTab('login'); }, 1800);
        }
      } catch(e) {
        showOk(okEl, '✅ Bitte jetzt anmelden.');
        setTimeout(function() { showTab('login'); }, 1500);
      }
      btn.disabled = false; btn.textContent = 'Konto erstellen & loslegen';
      return;
    }

    /* ── FLOW ①: Normale Selbst-Registrierung ── */
    var signupRes = await fetch('/.netlify/identity/signup', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: email, password: pw, data: {full_name: name}})
    });

    if (signupRes.ok) {
      // Netlify sendet automatisch Bestätigungsmail.
      // identity-signup.js Trigger legt Airtable-Eintrag an.
      var parts = name.split(' ');
      localStorage.setItem('prova_sv_email',    email);
      localStorage.setItem('prova_sv_vorname',  parts[0] || '');
      localStorage.setItem('prova_sv_nachname', parts.slice(1).join(' ') || '');
      // KEIN prova_user setzen — erst nach E-Mail-Bestätigung + Login
      showOk(okEl, '✅ Konto erstellt! Bitte E-Mail bestätigen — wir haben Ihnen einen Link geschickt.');
      btn.disabled = false; btn.textContent = 'Konto erstellen & loslegen';
      return;
    }

    // Fehlerfall auswerten
    var errData = {};
    try { errData = await signupRes.json(); } catch(e) {}
    var errMsg = errData.msg || errData.error_description || '';
    if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists') || signupRes.status === 422) {
      // User existiert bereits → zum Login hinweisen
      var warnEl = document.getElementById('reg-warn');
      if (warnEl) {
        warnEl.textContent = '⚠️ Diese E-Mail ist bereits registriert. Bitte direkt anmelden.';
        warnEl.classList.add('show');
      }
      setTimeout(function() {
        showTab('login');
        var el = document.getElementById('login-email');
        if (el) el.value = email;
      }, 2000);
    } else {
      showErr(errEl, errMsg || 'Registrierung fehlgeschlagen. Bitte erneut versuchen.');
    }
    btn.disabled = false; btn.textContent = 'Konto erstellen & loslegen';

  } catch(e) {
    console.error('Registrierung Fehler:', e);
    showErr(errEl, 'Verbindungsfehler. Bitte Internetverbindung prüfen.');
    btn.disabled = false; btn.textContent = 'Konto erstellen & loslegen';
  }
};

/* ────────────────────────────────────────────
   FLOW ④ — PASSWORT RESET
   ──────────────────────────────────────────── */
window.resetPasswort = async function() {
  var email = document.getElementById('reset-email').value.trim();
  var okEl  = document.getElementById('reset-ok');
  if (!email) return;
  try {
    await fetch('/.netlify/identity/recover', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: email})
    });
  } catch(e) {}
  if (okEl) okEl.classList.add('show');
};

/* ═══════════════════════════════════════════════════════════════════
   INITIALISIERUNG — NACH Funktionsdefinition
   ═══════════════════════════════════════════════════════════════════ */

(function init() {

  /* Netlify Identity Widget initialisieren (immer — nötig für acceptInvite) */
  if (typeof netlifyIdentity !== 'undefined') {
    netlifyIdentity.init();
  }

  /* ── URL-Parameter & Hash auswerten ── */
  var urlParams = new URLSearchParams(window.location.search);
  var reason = urlParams.get('reason');

  // Bereits abgemeldete / gesperrte Session
  if (reason === 'trial_expired') {
    var banner = document.getElementById('expired-banner');
    if (banner) banner.classList.add('show');
    showTab('register');
    return;
  }
  if (reason === 'logout' || reason === 'account_locked') {
    localStorage.removeItem('prova_user');
    localStorage.removeItem('prova_paket');
    if (reason === 'account_locked') {
      var errEl = document.getElementById('login-err');
      if (errEl) showErr(errEl, '⛔ Ihr Konto wurde gesperrt. Bitte Support kontaktieren.');
    }
    return;
  }

  /* ── TOKEN-ERKENNUNG (Hash + Query) ── */
  var inviteToken  = extractToken('invite_token');
  var confirmToken = extractToken('confirmation_token');
  var recoveryToken = extractToken('recovery_token');

  if (inviteToken) {
    /* FLOW ②: Invite */
    sessionStorage.setItem('prova_invite_token', inviteToken);
    showTab('register');
    // Invite-Hint zeigen
    var hint = document.getElementById('invite-hint');
    if (hint) hint.style.display = 'block';
    // Info-Box und Name/E-Mail-Felder verstecken
    var infoBox    = document.getElementById('reg-info-box');
    var nameGroup  = document.getElementById('reg-name-group');
    var emailGroup = document.getElementById('reg-email-group');
    if (infoBox)    infoBox.style.display    = 'none';
    if (nameGroup)  nameGroup.style.display  = 'none';
    if (emailGroup) emailGroup.style.display = 'none';
    // Button-Text anpassen
    var btn = document.getElementById('reg-btn');
    if (btn) btn.textContent = 'Passwort festlegen & loslegen';
    // Passwortfeld fokussieren
    setTimeout(function() {
      var pw = document.getElementById('reg-pw');
      if (pw) pw.focus();
    }, 200);
    // URL-Hash bereinigen (Token nicht im Browser-Verlauf lassen)
    history.replaceState(null, '', window.location.pathname);
    return;
  }

  if (confirmToken) {
    /* FLOW ①-Bestätigung: E-Mail-Bestätigungslink geklickt */
    sessionStorage.setItem('prova_confirm_token', confirmToken);
    showTab('register');
    // Passwortfelder nicht nötig — Info anzeigen
    var infoBox = document.getElementById('reg-info-box');
    if (infoBox) infoBox.innerHTML = '<strong>✅ E-Mail bestätigt!</strong><br>Klicken Sie auf "Bestätigen & Anmelden" um fortzufahren.';
    var hint = document.getElementById('invite-hint');
    if (hint) { hint.textContent = '✅ Ihre E-Mail-Adresse wurde bestätigt.'; hint.style.display = 'block'; }
    var nameGroup  = document.getElementById('reg-name-group');
    var emailGroup = document.getElementById('reg-email-group');
    var pwGroup    = document.getElementById('reg-pw')?.closest('.form-group');
    if (nameGroup)  nameGroup.style.display  = 'none';
    if (emailGroup) emailGroup.style.display = 'none';
    if (pwGroup)    pwGroup.style.display    = 'none';
    var btn = document.getElementById('reg-btn');
    if (btn) btn.textContent = 'Bestätigen & Anmelden';
    history.replaceState(null, '', window.location.pathname);
    return;
  }

  if (recoveryToken) {
    /* FLOW ④: Passwort-Reset */
    sessionStorage.setItem('prova_recovery_token', recoveryToken);
    showTab('reset');
    history.replaceState(null, '', window.location.pathname);
    return;
  }

  /* ── Netlify Identity Widget Login-Event (OAuth-kompatibel) ── */
  if (typeof netlifyIdentity !== 'undefined') {
    netlifyIdentity.on('login', function(user) {
      var md = user.user_metadata || {};
      localStorage.setItem('prova_user', JSON.stringify({email: user.email, name: md.full_name || user.email, token: 'netlify'}));
      if (md.full_name) {
        var parts = md.full_name.split(' ');
        localStorage.setItem('prova_sv_vorname',  parts[0] || '');
        localStorage.setItem('prova_sv_nachname', parts.slice(1).join(' ') || '');
      }
      localStorage.setItem('prova_sv_email', user.email);
      ladePaketUndWeiterleiten(user.email);
    });
  }

  /* ── Bereits eingeloggt? Direkt weiterleiten ── */
  /* NICHT wenn User explizit von der Landingpage kommt (?from=landing) */
  var fromLanding = window.location.search.indexOf('from=landing') !== -1;
  var stored = JSON.parse(localStorage.getItem('prova_user') || 'null');
  if (stored && stored.email && !fromLanding) {
    if (stored.email.toLowerCase() === 'admin@prova-systems.de') {
      localStorage.removeItem('prova_user');
      localStorage.removeItem('prova_paket');
      localStorage.removeItem('prova_is_admin');
      return;
    }
    ladePaketUndWeiterleiten(stored.email);
  }

})();

/* ── Mobile Logo ── */
if (window.innerWidth <= 800) {
  var ml = document.getElementById('mobile-logo');
  if (ml) ml.style.display = 'flex';
}