/* ============================================================
   PROVA app-login-logic.js — Login/Register/Reset Logic

   MEGA⁴⁵ (09.05.2026) — Komplett-Migration auf Supabase Auth.

   Frühere Bridges entfernt:
   - /.netlify/functions/auth-token-issue (Login-Endpoint, HMAC-Token)
     → ersetzt durch supabase.auth.signInWithPassword().
     auth-token-issue Edge-Function existiert weiter, ist aber NUR
     für admin-impersonate (mit x-internal-secret-Header).
   - netlify-identity-widget.js (Register/Reset)
     → ersetzt durch supabase.auth.signUp() + resetPasswordForEmail().

   Storage-Keys werden weiter befüllt (prova_auth_token, prova_user,
   prova_sv_email, prova_paket, etc.) damit auth-guard.js + Legacy-
   Code unverändert weiter funktionieren.

   Profil-Sync läuft jetzt über public.users + workspace_memberships
   in Supabase (kein Airtable mehr).

   Eingebunden in: app-login.html.
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
     LOGIN — MEGA⁴⁵: supabase.auth.signInWithPassword()

     Profil-Daten kommen aus public.users + workspace_memberships
     (paket, vorname, nachname, abo_status, trial_endet_am).
     Legacy-Storage-Keys werden für auth-guard.js weiter befüllt.
     ──────────────────────────────────────────── */
  // MEGA¹⁰ W5: Form-Validate-Migration via ProvaForm.validateField
  // Pseudo-Form: app-login.html nutzt kein <form>-Tag, sondern <div>-Wrapper mit Click-Handlers.
  // ProvaForm.validateField (Lower-Level-API) funktioniert dennoch — braucht nur ein Input-Element.
  function _validateLoginInputs(emailEl, pwEl) {
    if (!window.ProvaForm || !window.ProvaForm.validateField) return true;  // Library nicht geladen → skip
    var emailRule = {
      name: 'login-email', required: true,
      pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
      errorMsg: { required: 'E-Mail-Adresse erforderlich', pattern: 'Bitte gueltige E-Mail-Adresse eingeben' }
    };
    var pwRule = {
      name: 'login-pw', required: true,
      minLength: 1,  // Login akzeptiert beliebige PW-Laengen (auch alte kurze)
      errorMsg: { required: 'Passwort erforderlich' }
    };
    var emailValid = window.ProvaForm.validateField(emailEl, emailRule);
    var pwValid = window.ProvaForm.validateField(pwEl, pwRule);
    return emailValid && pwValid;
  }

  window.login = async function () {
    var emailEl = document.getElementById('login-email');
    var pwEl = document.getElementById('login-pw');
    var email = (emailEl.value || '').trim();
    var pw    =  pwEl.value || '';
    var errEl = document.getElementById('login-error');
    var btn   = document.getElementById('login-btn');
    if (errEl) errEl.style.display = 'none';

    // MEGA¹⁰ W5: Live-Field-Validation mit ProvaForm
    if (!_validateLoginInputs(emailEl, pwEl)) {
      // Field-Errors sind bereits visuell im DOM von validateField
      // MEGA¹² W16: provaAlert-Helper (DRY)
      if (window.provaAlert) window.provaAlert('Bitte Eingaben pruefen', 'error');
      return;
    }

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

    // MEGA⁴⁵-Fix: Login geht direkt über Supabase Auth (signInWithPassword).
    // Frühere auth-token-issue-Bridge entfernt — diese Edge-Function ist
    // jetzt NUR für admin-impersonate (mit x-internal-secret) reserviert.
    try {
      var sbModule = await import('/lib/supabase-client.js');
      var supabase = sbModule.supabase || sbModule.getSupabase();

      var signin = await supabase.auth.signInWithPassword({ email: email, password: pw });

      if (signin.error) {
        var msg = String(signin.error.message || '').toLowerCase();
        if (msg.indexOf('email not confirmed') !== -1 || msg.indexOf('not confirmed') !== -1) {
          return fail('E-Mail noch nicht bestätigt. Bitte den Link aus der Bestätigungs-Mail klicken.');
        }
        if (msg.indexOf('invalid login') !== -1 || msg.indexOf('invalid credentials') !== -1) {
          return fail('E-Mail oder Passwort falsch.');
        }
        if (signin.error.status === 429 || msg.indexOf('rate limit') !== -1) {
          return fail('Zu viele Login-Versuche. Bitte einige Minuten warten.');
        }
        return fail('Anmeldung fehlgeschlagen: ' + (signin.error.message || 'unbekannt'));
      }

      var session = signin.data && signin.data.session;
      var user    = signin.data && signin.data.user;
      if (!session || !user) return fail('Ungültige Server-Antwort. Bitte erneut versuchen.');

      var resolvedEmail = String(user.email || email).toLowerCase();

      // Profil-Daten aus public.users + workspace_memberships nachziehen
      var displayName = resolvedEmail.split('@')[0];
      var paket = 'Solo'; var aboStatus = null; var trialEnd = null;
      var svVorname = ''; var svNachname = ''; var founding = false;
      try {
        var profileRes = await supabase
          .from('users')
          .select('vorname, nachname, paket, founding_member, workspace_memberships!inner(workspace_id, rolle, workspaces!inner(abo_status, trial_endet_am, paket))')
          .eq('id', user.id)
          .maybeSingle();
        if (profileRes.data) {
          svVorname  = profileRes.data.vorname || '';
          svNachname = profileRes.data.nachname || '';
          if (profileRes.data.paket) paket = profileRes.data.paket;
          founding   = !!profileRes.data.founding_member;
          var ws = (profileRes.data.workspace_memberships || [])[0];
          if (ws && ws.workspaces) {
            if (ws.workspaces.abo_status)     aboStatus = ws.workspaces.abo_status;
            if (ws.workspaces.trial_endet_am) trialEnd  = ws.workspaces.trial_endet_am;
            if (ws.workspaces.paket)          paket     = ws.workspaces.paket;
          }
          displayName = ((svVorname + ' ' + svNachname).trim()) || displayName;
        }
      } catch (eProfile) {
        console.warn('[login] profil-lookup fail (non-blocking):', eProfile && eProfile.message);
      }

      // Legacy-Storage-Keys schreiben für auth-guard.js + bestehenden Code
      localStorage.setItem('prova_auth_token', session.access_token);
      localStorage.setItem('prova_user', JSON.stringify({
        email:       resolvedEmail,
        name:        displayName,
        token:       session.access_token,
        verified:    true,            // Supabase confirms email natively
        provisional: false
      }));
      localStorage.setItem('prova_sv_email', resolvedEmail);
      try { sessionStorage.setItem('prova_email', resolvedEmail); } catch (e) {}

      if (paket)      localStorage.setItem('prova_paket',               paket);
      if (aboStatus)  localStorage.setItem('prova_subscription_status', aboStatus);
      if (trialEnd)   localStorage.setItem('prova_trial_end',           trialEnd);
      if (founding)   localStorage.setItem('prova_testpilot',           '1');
      if (svVorname)  localStorage.setItem('prova_sv_vorname',          svVorname);
      if (svNachname) localStorage.setItem('prova_sv_nachname',         svNachname);

      // Sekundaer: V2-Session als Uebergangs-Anker fuer auth-guard
      if (typeof window.provaCreateSession === 'function') {
        try { window.provaCreateSession({ email: resolvedEmail, name: displayName }); } catch (e) {}
      }

      // Audit-Log (best-effort)
      try {
        if (typeof window.provaAuditLog === 'function') {
          await window.provaAuditLog({
            typ:     'Login',
            email:   resolvedEmail,
            details: { source: 'supabase-auth' }
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
  // MEGA¹¹ W8: Form-Validate-Migration fuer Register (analog zu Login in W5)
  function _validateRegisterInputs(nameEl, emailEl, pwEl) {
    if (!window.ProvaForm || !window.ProvaForm.validateField) return true;
    var nameRule = {
      name: 'reg-name', required: true, minLength: 2,
      errorMsg: { required: 'Vollstaendiger Name erforderlich', minLength: 'Name zu kurz' }
    };
    var emailRule = {
      name: 'reg-email', required: true,
      pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
      errorMsg: { required: 'E-Mail-Adresse erforderlich', pattern: 'Bitte gueltige E-Mail-Adresse eingeben' }
    };
    var pwRule = {
      name: 'reg-pw', required: true, minLength: 8,
      errorMsg: { required: 'Passwort erforderlich', minLength: 'Passwort muss mind. 8 Zeichen haben' }
    };
    var v1 = window.ProvaForm.validateField(nameEl, nameRule);
    var v2 = window.ProvaForm.validateField(emailEl, emailRule);
    var v3 = window.ProvaForm.validateField(pwEl, pwRule);
    return v1 && v2 && v3;
  }

  window.register = async function () {
    var nameEl = document.getElementById('reg-name');
    var emailEl = document.getElementById('reg-email');
    var pwEl = document.getElementById('reg-pw');
    var name  = (nameEl.value  || '').trim();
    var email = (emailEl.value || '').trim();
    var pw    =  pwEl.value || '';
    var errEl = document.getElementById('reg-error');
    var sucEl = document.getElementById('reg-success');
    var btn   = document.getElementById('reg-btn');
    if (errEl) errEl.style.display = 'none';
    if (sucEl) sucEl.style.display = 'none';

    // MEGA¹¹ W8: Live-Field-Validation
    if (!_validateRegisterInputs(nameEl, emailEl, pwEl)) {
      if (window.provaAlert) window.provaAlert('Bitte Eingaben pruefen', 'error');
      return;
    }

    if (!name || !email || pw.length < 8) {
      if (errEl) {
        errEl.textContent = (!name || !email)
          ? 'Bitte alle Felder ausfüllen.'
          : 'Passwort muss mind. 8 Zeichen haben.';
        errEl.style.display = 'block';
      }
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '⏳ wird gesendet…'; }

    // MEGA⁴⁵-Fix: Registrierung via Supabase Auth (netlify-identity-widget entfernt).
    try {
      var sbModule = await import('/lib/supabase-client.js');
      var supabase = sbModule.supabase || sbModule.getSupabase();
      var nameParts = name.split(/\s+/);
      var firstName = nameParts.shift() || '';
      var lastName  = nameParts.join(' ');

      var signup = await supabase.auth.signUp({
        email: email,
        password: pw,
        options: {
          data: { full_name: name, vorname: firstName, nachname: lastName },
          emailRedirectTo: window.location.origin + '/onboarding-supabase.html'
        }
      });
      if (signup.error) {
        var msg = String(signup.error.message || '').toLowerCase();
        if (msg.indexOf('already registered') !== -1 || msg.indexOf('already exists') !== -1) {
          if (errEl) { errEl.textContent = 'E-Mail bereits registriert. Bitte Login verwenden.'; errEl.style.display = 'block'; }
        } else {
          if (errEl) { errEl.textContent = signup.error.message || 'Registrierung fehlgeschlagen.'; errEl.style.display = 'block'; }
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Konto erstellen & loslegen'; }
        return;
      }
      if (sucEl) {
        sucEl.textContent =
          '✅ Bestätigungs-Mail ist unterwegs. Bitte Link in der E-Mail anklicken — danach im Login-Tab anmelden. Trial: 90 Tage.';
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
  window.resetPasswort = async function () {
    var emailEl = document.getElementById('reset-email');
    var email = (emailEl.value || '').trim();
    // MEGA¹¹ W8: Field-Validation fuer Reset-Form
    if (window.ProvaForm && window.ProvaForm.validateField) {
      var resetRule = {
        name: 'reset-email', required: true,
        pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
        errorMsg: { required: 'E-Mail-Adresse erforderlich', pattern: 'Bitte gueltige E-Mail-Adresse eingeben' }
      };
      if (!window.ProvaForm.validateField(emailEl, resetRule)) {
        if (window.provaAlert) window.provaAlert('Bitte gueltige E-Mail-Adresse eingeben', 'error');
        return;
      }
    }
    if (!email) return;
    var ok = document.getElementById('reset-success');
    // MEGA⁴⁵-Fix: Passwort-Reset via Supabase Auth (netlify-identity-widget entfernt).
    try {
      var sbModule = await import('/lib/supabase-client.js');
      var supabase = sbModule.supabase || sbModule.getSupabase();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth-supabase.html?action=reset'
      });
    } catch (e) {
      console.warn('[reset] supabase resetPasswordForEmail fail (non-blocking):', e && e.message);
    }
    // Immer success zeigen (Anti-Email-Enumeration: nicht verraten ob Email existiert)
    if (ok) ok.style.display = 'block';
  };

  /* MEGA⁴⁵: netlifyIdentity-Init entfernt — Identity-Widget wurde aus
     app-login.html entfernt (CSP-Block). Login/Register/Reset laufen
     komplett über Supabase Auth. */

  /* ── DOM-Ready Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initExpiredBanner();
    });
  } else {
    initExpiredBanner();
  }
})();
