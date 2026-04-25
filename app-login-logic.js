/* ============================================================
   PROVA app-login-logic.js — Login/Register/Reset Logic

   S-SICHER P4A.5-v2 (26.04.2026)
   Externalisiert aus app-login.html Inline-Scripts (vorher
   Zeilen 418-590 inline). Genau eine funktionale Aenderung
   gegenueber der Inline-Version: window.login ruft jetzt den
   eigenen HMAC-Endpoint /.netlify/functions/auth-token-issue
   statt direkt /.netlify/identity/token. Alles andere ist 1:1
   uebernommen — Register/Reset bleiben via netlifyIdentity-Widget,
   da diese Endpoints funktionieren und die Email-Confirmation /
   Password-Recovery-Flows daran haengen.

   Folge der Externalisierung:
   - netlifyIdentity.on('login', ...)-Handler entfernt: das war
     ein Parallel-Pfad, der durch das Identity-Widget getriggert
     werden konnte. Mit P4A.5-v2 ist auth-token-issue der einzige
     Login-Pfad.
   - netlifyIdentity.on('init', ...) bleibt wegen Invite-/Recovery-
     URL-Hash-Routing — beide Flows brauchen das Widget.

   Eingebunden in: app-login.html (am Ende des <body> via
   <script src="app-login-logic.js"></script>).
============================================================ */

(function () {
  'use strict';

  /* ── Trial-Expired-Banner aus URL-Param ── */
  function initExpiredBanner() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'trial_expired') {
      var b = document.getElementById('expired-banner');
      if (b) b.style.display = 'block';
      if (typeof window.showTab === 'function') window.showTab('login');
    }
  }

  /* ── Tab-Switching ── */
  window.showTab = function (tab) {
    var fLogin    = document.getElementById('form-login');
    var fRegister = document.getElementById('form-register');
    var fReset    = document.getElementById('form-reset');
    var tLogin    = document.getElementById('tab-login');
    var tRegister = document.getElementById('tab-register');
    if (fLogin)    fLogin.style.display    = tab === 'login'    ? 'block' : 'none';
    if (fRegister) fRegister.style.display = tab === 'register' ? 'block' : 'none';
    if (fReset)    fReset.style.display    = tab === 'reset'    ? 'block' : 'none';
    if (tLogin)    tLogin.classList.toggle('active', tab === 'login');
    if (tRegister) tRegister.classList.toggle('active', tab === 'register');
  };

  window.zeigePasswortReset = function () {
    var fLogin = document.getElementById('form-login');
    var fReset = document.getElementById('form-reset');
    if (fLogin) fLogin.style.display = 'none';
    if (fReset) fReset.style.display = 'block';
  };

  window.starteTestversion = function () {
    var KEY = 'prova_trial_start';
    if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, Date.now().toString());
    window.location.href = 'app.html';
  };

  /* ────────────────────────────────────────────
     LOGIN — P4A.5-v2: gegen /.netlify/functions/auth-token-issue

     Erwartete Response (200): { token, sv: { email, sv_record_id,
       paket, status, subscription_status, trial_end, sv_vorname,
       sv_nachname, testpilot, verified, provisional } }
     401 → Email/Passwort falsch oder Provisional-Lookup fehlgeschlagen
     403 → Konto gesperrt
     502 → Identity-Backend nicht erreichbar
     500 → Server-Misconfig (AUTH_HMAC_SECRET fehlt)
     ──────────────────────────────────────────── */
  window.login = async function () {
    var email = (document.getElementById('login-email').value || '').trim();
    var pw    =  document.getElementById('login-pw').value || '';
    var errEl = document.getElementById('login-error');
    var btn   = document.getElementById('login-btn');
    if (errEl) errEl.style.display = 'none';

    if (!email || !pw) {
      if (errEl) {
        errEl.textContent = 'Bitte E-Mail und Passwort eingeben.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Anmelden…'; }

    function fail(msg) {
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
      if (btn)   { btn.disabled = false; btn.textContent = 'Anmelden'; }
    }

    try {
      var res = await fetch('/.netlify/functions/auth-token-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pw })
      });

      if (res.status === 401) return fail('E-Mail oder Passwort falsch — oder E-Mail noch nicht bestätigt.');
      if (res.status === 403) return fail('Konto gesperrt. Bitte kontakt@prova-systems.de kontaktieren.');
      if (res.status === 502) return fail('Auth-Backend vorübergehend nicht erreichbar. Bitte erneut versuchen.');
      if (!res.ok)            return fail('Anmeldung fehlgeschlagen (' + res.status + ').');

      var data = await res.json();
      if (!data || !data.token || !data.sv) return fail('Ungültige Server-Antwort. Bitte erneut versuchen.');

      var sv = data.sv;
      var resolvedEmail = String(sv.email || email).toLowerCase();
      var displayName   = ((sv.sv_vorname || '') + ' ' + (sv.sv_nachname || '')).trim()
                          || resolvedEmail.split('@')[0];

      // Primary Auth-Anker fuer auth-guard.js (P4A.4 prueft prova_auth_token zuerst)
      localStorage.setItem('prova_auth_token', data.token);

      localStorage.setItem('prova_user', JSON.stringify({
        email:       resolvedEmail,
        name:        displayName,
        token:       data.token,
        verified:    !!sv.verified,
        provisional: !!sv.provisional
      }));
      localStorage.setItem('prova_sv_email', resolvedEmail);
      try { sessionStorage.setItem('prova_email', resolvedEmail); } catch (e) {}

      if (sv.paket)               localStorage.setItem('prova_paket',               sv.paket);
      if (sv.status)              localStorage.setItem('prova_status',              sv.status);
      if (sv.subscription_status) localStorage.setItem('prova_subscription_status', sv.subscription_status);
      if (sv.trial_end)           localStorage.setItem('prova_trial_end',           sv.trial_end);
      if (sv.testpilot)           localStorage.setItem('prova_testpilot',           '1');
      if (sv.sv_vorname)          localStorage.setItem('prova_sv_vorname',          sv.sv_vorname);
      if (sv.sv_nachname)         localStorage.setItem('prova_sv_nachname',         sv.sv_nachname);
      if (sv.sv_record_id)        localStorage.setItem('prova_at_sv_record_id',     sv.sv_record_id);

      // Sekundaer: V2-Session als Uebergangs-Anker fuer auth-guard
      // (Sprint P4B macht den Auth-Flow auf HMAC-Token-only)
      if (typeof window.provaCreateSession === 'function') {
        try { window.provaCreateSession({ email: resolvedEmail, name: displayName }); } catch (e) {}
      }

      // Profil-Sync aus Airtable (zusaetzliche Felder wie sv_qualifikation,
      // sv_telefon, sv_adresse — auth-token-issue liefert nur Kern-Stamm).
      try {
        if (typeof window.provaLoadSVProfilNachLogin === 'function') {
          await window.provaLoadSVProfilNachLogin(resolvedEmail);
        }
      } catch (e2) { console.warn('[login] profil-sync', e2 && e2.message); }

      // Audit-Log (best-effort)
      try {
        if (typeof window.provaAuditLog === 'function') {
          await window.provaAuditLog({
            typ:     'Login',
            email:   resolvedEmail,
            details: { provisional: !!sv.provisional, verified: !!sv.verified }
          });
        }
      } catch (e3) {}

      window.location.href = 'dashboard.html';
    } catch (e) {
      console.warn('[login] Verbindungsfehler', e && e.message);
      fail('Verbindungsfehler. Bitte Internetverbindung prüfen.');
    }
  };

  /* ────────────────────────────────────────────
     REGISTER — bleibt via netlifyIdentity.signup
     (Endpoint funktioniert; neue User werden in Identity angelegt;
      Email-Confirmation laeuft nativ.)
     ──────────────────────────────────────────── */
  window.register = async function () {
    var name  = (document.getElementById('reg-name').value  || '').trim();
    var email = (document.getElementById('reg-email').value || '').trim();
    var pw    =  document.getElementById('reg-pw').value || '';
    var errEl = document.getElementById('reg-error');
    var sucEl = document.getElementById('reg-success');
    var btn   = document.getElementById('reg-btn');
    if (errEl) errEl.style.display = 'none';
    if (sucEl) sucEl.style.display = 'none';

    if (!name || !email || pw.length < 8) {
      if (errEl) {
        errEl.textContent = (!name || !email)
          ? 'Bitte alle Felder ausfüllen.'
          : 'Passwort muss mind. 8 Zeichen haben.';
        errEl.style.display = 'block';
      }
      return;
    }
    if (typeof netlifyIdentity === 'undefined') {
      if (errEl) {
        errEl.textContent = 'Anmeldedienst wird nicht geladen.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ wird gesendet…'; }

    try {
      if (typeof netlifyIdentity.signup === 'function') {
        await netlifyIdentity.signup({ email: email, password: pw, data: { full_name: name } });
      } else {
        netlifyIdentity.open('signup');
        if (sucEl) {
          sucEl.textContent =
            'Bitte Registrierung im Fenster abschließen. Sie erhalten eine E-Mail mit Bestätigungslink — danach erscheint Ihr Datensatz in Airtable (Trial 14 Tage).';
          sucEl.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Konto erstellen & loslegen'; }
        return;
      }
      if (sucEl) {
        sucEl.textContent =
          '✅ Bestätigungs-Mail ist unterwegs. Bitte Link in der E-Mail anklicken — danach anmelden. Erst dann wird Ihr SV-Datensatz angelegt (14 Tage Trial).';
        sucEl.style.display = 'block';
      }
    } catch (e) {
      if (errEl) {
        errEl.textContent = (e && e.message) ? e.message : 'Registrierung fehlgeschlagen.';
        errEl.style.display = 'block';
      }
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Konto erstellen & loslegen'; }
  };

  /* ────────────────────────────────────────────
     PASSWORT-RESET — bleibt via netlifyIdentity.open('recovery')
     ──────────────────────────────────────────── */
  window.resetPasswort = function () {
    var email = (document.getElementById('reset-email').value || '').trim();
    if (!email) return;
    if (typeof netlifyIdentity !== 'undefined' && netlifyIdentity.open) {
      netlifyIdentity.open('recovery');
    }
    var ok = document.getElementById('reset-success');
    if (ok) ok.style.display = 'block';
  };

  /* ────────────────────────────────────────────
     netlifyIdentity Init — Invite/Recovery-URL-Hash-Routing
     'login'-Handler ist BEWUSST entfernt (P4A.5-v2): auth-token-issue
     ist der einzige Login-Pfad. Wenn das Identity-Widget einen Login
     triggert (z.B. nach Recovery-Reset), laeuft das ohne unsere Logik
     durch — der Auth-Guard auf den geschuetzten Seiten holt sich beim
     naechsten Page-Load entweder einen prova_auth_token (gibt's dann
     nicht -> Redirect zu Login) oder akzeptiert die V2-Session. Saubere
     Loesung kommt in AUTH-PERFEKT 2.0.
     ──────────────────────────────────────────── */
  function initNetlifyIdentity() {
    if (typeof netlifyIdentity === 'undefined') return;
    netlifyIdentity.on('init', function () {
      var hash = window.location.hash || '';
      if (hash.indexOf('invite_token')   !== -1) netlifyIdentity.open('signup');
      if (hash.indexOf('recovery_token') !== -1) netlifyIdentity.open('recovery');
    });
    netlifyIdentity.on('error', function (err) {
      console.error('Netlify Identity Fehler:', err);
    });
    netlifyIdentity.init();
  }

  /* ── DOM-Ready Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initExpiredBanner();
      initNetlifyIdentity();
    });
  } else {
    initExpiredBanner();
    initNetlifyIdentity();
  }
})();
