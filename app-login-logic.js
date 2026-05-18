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

  /* ── MEGA⁵⁰ Auto-Redirect bei Session vorhanden + Loop-Counter ──
     Wenn User auf Login-Page landet aber bereits eingeloggt ist:
       → ?next-Param respektieren ODER zum Dashboard
     Loop-Counter via sessionStorage verhindert Endlos-Loops:
       Wenn 3+ Redirects in 10s → bleibe auf Login + Console-Warning. */
  async function initSessionAutoRedirect() {
    var params = new URLSearchParams(window.location.search);
    var reason = params.get('reason');
    var nextUrl = params.get('next');

    // Bei expliziten Reason-Codes (logout, token_expired) NICHT auto-redirect
    if (reason === 'logout' || reason === 'token_expired' || reason === 'trial_expired') return;

    // Loop-Counter
    var LOOP_KEY = 'prova_login_redirect_count';
    var LOOP_TS_KEY = 'prova_login_redirect_ts';
    try {
      var now = Date.now();
      var lastTs = parseInt(sessionStorage.getItem(LOOP_TS_KEY) || '0', 10);
      var count = parseInt(sessionStorage.getItem(LOOP_KEY) || '0', 10);
      if (now - lastTs > 10000) { count = 0; }   // Reset nach 10s Inaktivität
      if (count >= 3) {
        console.warn('[auth] Loop-Counter > 3 — auto-redirect deaktiviert. Manuell einloggen.');
        return;
      }

      var sbModule = await import('/lib/supabase-client.js');
      var supabase = sbModule.supabase || (sbModule.getSupabase && sbModule.getSupabase());
      if (!supabase) return;
      var sess = await supabase.auth.getSession();
      var session = sess && sess.data && sess.data.session;
      if (!session) return;

      sessionStorage.setItem(LOOP_KEY, String(count + 1));
      sessionStorage.setItem(LOOP_TS_KEY, String(now));

      var target = nextUrl && /^\/[^\/]/.test(nextUrl) ? decodeURIComponent(nextUrl) : '/dashboard.html';
      console.debug('[auth] Session aktiv, redirect zu:', target);
      window.location.replace(target);
    } catch (e) {
      console.warn('[auth] Auto-Redirect-Check failed:', e && e.message);
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

      // MEGA⁵²: 2FA-Step-2 Check via Supabase Native MFA
      try {
        var aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        var currentLevel = aal && aal.data && aal.data.currentLevel;
        var nextLevel    = aal && aal.data && aal.data.nextLevel;
        if (currentLevel === 'aal1' && nextLevel === 'aal2') {
          // 2FA erforderlich → Step-2-Form zeigen
          var fac = await supabase.auth.mfa.listFactors();
          var verifiedFactor = (fac.data && fac.data.totp || []).find(function (f) { return f.status === 'verified'; });
          if (!verifiedFactor) {
            // Edge-Case: aal2 required aber kein verified Factor → fall through to normal login (Account-Recovery-Pfad)
            console.warn('[login] aal2 required but no verified TOTP-factor — proceeding to dashboard, user soll 2FA neu einrichten');
          } else {
            window.__provaMfaContext = {
              factorId: verifiedFactor.id,
              user: user, supabase: supabase, resolvedEmail: resolvedEmail,
              originalEmail: email
            };
            // Login-Form ausblenden, MFA-Step zeigen
            document.getElementById('login-error').style.display = 'none';
            if (btn) { btn.disabled = false; btn.textContent = 'Anmelden'; }
            var mfaStep = document.getElementById('mfa-step');
            if (mfaStep) mfaStep.style.display = 'block';
            var loginForm = document.getElementById('form-login');
            // Verstecke Email/Passwort + Trial-Box, lasse nur MFA sichtbar
            ['login-email','login-pw'].forEach(function (id) { var el = document.getElementById(id); if (el && el.parentElement) el.parentElement.style.display = 'none'; });
            ['login-btn'].forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
            var trialBox = document.querySelector('.trial-box');
            if (trialBox) trialBox.style.display = 'none';
            var dividers = document.querySelectorAll('.divider');
            dividers.forEach(function (d) { d.style.display = 'none'; });
            setTimeout(function () { var mc = document.getElementById('mfa-code'); if (mc) mc.focus(); }, 100);
            return;  // Pause Login bis MFA verified
          }
        }
      } catch (eAal) {
        console.warn('[login] aal-Check failed (non-blocking):', eAal && eAal.message);
      }

      await _completeLogin(supabase, user, resolvedEmail);
      return;
    } catch (e) {
      console.warn('[login] Verbindungsfehler', e && e.message);
      fail('Verbindungsfehler. Bitte Internetverbindung prüfen.');
    }
  };

  /* ── MEGA⁵² MFA Step-2 Verify (TOTP Code) ── */
  window.verifyMfa = async function () {
    var ctx = window.__provaMfaContext;
    if (!ctx) { console.warn('[mfa] no context'); return; }
    var code = (document.getElementById('mfa-code').value || '').trim();
    var errEl = document.getElementById('mfa-error');
    var btn = document.getElementById('mfa-verify-btn');
    if (!/^\d{6}$/.test(code)) {
      errEl.textContent = 'Bitte 6-stelligen Code eingeben.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = '⏳ Verifiziere…';
    try {
      var ch = await ctx.supabase.auth.mfa.challenge({ factorId: ctx.factorId });
      if (ch.error) throw new Error(ch.error.message);
      var v = await ctx.supabase.auth.mfa.verify({ factorId: ctx.factorId, challengeId: ch.data.id, code: code });
      if (v.error) throw new Error(v.error.message);
      // aal2 erfolgreich → fortfahren
      await _completeLogin(ctx.supabase, ctx.user, ctx.resolvedEmail);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Bestätigen';
      errEl.textContent = 'Code ungültig. Bitte erneut versuchen.';
      errEl.style.display = 'block';
    }
  };

  /* ── MEGA⁵² Recovery-Code-Login ── */
  window.zeigeRecoveryCode = function () {
    document.getElementById('mfa-step').style.display = 'none';
    document.getElementById('recovery-step').style.display = 'block';
    setTimeout(function () { var rc = document.getElementById('recovery-code'); if (rc) rc.focus(); }, 100);
  };
  window.zurueckZuMfa = function () {
    document.getElementById('recovery-step').style.display = 'none';
    document.getElementById('mfa-step').style.display = 'block';
  };
  window.verifyRecoveryCode = async function () {
    var ctx = window.__provaMfaContext;
    if (!ctx) { console.warn('[mfa] no context for recovery'); return; }
    var code = (document.getElementById('recovery-code').value || '').trim().toUpperCase();
    var errEl = document.getElementById('recovery-error');
    var btn = document.getElementById('recovery-verify-btn');
    var pwEl = document.getElementById('login-pw');
    var pw = pwEl ? pwEl.value : '';
    if (!code || code.length < 8) {
      errEl.textContent = 'Bitte vollständigen Recovery-Code eingeben.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    btn.disabled = true; btn.textContent = '⏳ Verifiziere…';
    try {
      var SB_URL = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_URL) || 'https://cngteblrbpwsyypexjrv.supabase.co';
      var SB_ANON = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_ANON_KEY) || '';
      var res = await fetch(SB_URL + '/functions/v1/verify-mfa-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SB_ANON, 'Authorization': 'Bearer ' + SB_ANON },
        body: JSON.stringify({ email: ctx.resolvedEmail, password: pw, recovery_code: code })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      // Session in localStorage + auf den supabase-Client setzen
      if (data.session && data.session.access_token) {
        await ctx.supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }
      if (data.warning) alert(data.warning);
      await _completeLogin(ctx.supabase, ctx.user || data.user, ctx.resolvedEmail);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Bestätigen';
      errEl.textContent = 'Recovery-Code ungültig: ' + e.message;
      errEl.style.display = 'block';
    }
  };

  /* ── MEGA⁵² _completeLogin: Profile-Sync + localStorage + Redirect ── */
  async function _completeLogin(supabase, user, resolvedEmail) {
    var ses = await supabase.auth.getSession();
    var session = ses && ses.data && ses.data.session;
    if (!session) { console.warn('[mfa] no session post-verify'); window.location.href = 'dashboard.html'; return; }

      // Profil-Daten aus public.users + workspace_memberships nachziehen
      var displayName = resolvedEmail.split('@')[0];
      var paket = 'Solo'; var aboStatus = null; var trialEnd = null;
      var svVorname = ''; var svNachname = ''; var founding = false;
      var workspaceId = null;
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
          if (ws) {
            if (ws.workspace_id) workspaceId = ws.workspace_id;
            if (ws.workspaces) {
              if (ws.workspaces.abo_status)     aboStatus = ws.workspaces.abo_status;
              if (ws.workspaces.trial_endet_am) trialEnd  = ws.workspaces.trial_endet_am;
              if (ws.workspaces.paket)          paket     = ws.workspaces.paket;
            }
          }
          displayName = ((svVorname + ' ' + svNachname).trim()) || displayName;
        }
      } catch (eProfile) {
        console.warn('[login] profil-lookup fail (non-blocking):', eProfile && eProfile.message);
      }

      // MEGA⁷⁵-A: workspace_id-Fallback wenn join nichts liefert (User mit nur memberships, ohne public.users-Row).
      if (!workspaceId) {
        try {
          var wsRes = await supabase
            .from('workspace_memberships')
            .select('workspace_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          if (wsRes.data && wsRes.data.workspace_id) workspaceId = wsRes.data.workspace_id;
        } catch (eWs) {
          console.warn('[login] workspace-fallback-lookup fail (non-blocking):', eWs && eWs.message);
        }
      }

      // Legacy-Storage-Keys schreiben für auth-guard.js + bestehenden Code
      // MEGA⁸³ C: ProvaLegacyBridge.set() schreibt sowohl localStorage als auch
      // .prova-systems.de Cookie → Cross-Subdomain-Bridge ohne Doppel-Login.
      var bridge = window.ProvaLegacyBridge || { set: function(k,v){ try{localStorage.setItem(k,v);}catch(_){} } };
      bridge.set('prova_auth_token', session.access_token);
      bridge.set('prova_user', JSON.stringify({
        email:       resolvedEmail,
        name:        displayName,
        token:       session.access_token,
        verified:    true,            // Supabase confirms email natively
        provisional: false
      }));
      bridge.set('prova_sv_email', resolvedEmail);
      try { sessionStorage.setItem('prova_email', resolvedEmail); } catch (e) {}

      if (paket)      bridge.set('prova_paket', paket);
      if (aboStatus)  localStorage.setItem('prova_subscription_status', aboStatus);
      if (trialEnd)   localStorage.setItem('prova_trial_end',           trialEnd);
      if (founding)   localStorage.setItem('prova_testpilot',           '1');
      if (svVorname)  localStorage.setItem('prova_sv_vorname',          svVorname);
      if (svNachname) localStorage.setItem('prova_sv_nachname',         svNachname);
      // MEGA⁷⁵-A: workspace_id-Cache für RLS-Writes (INSERT auftraege etc.).
      // Ohne diesen Key scheitert jede INSERT-Payload an workspace_id NOT NULL +
      // RLS-WITH-CHECK. Fallback: lib/prova-supabase-adapters.js getCurrentWorkspaceId()
      // lädt live aus workspace_memberships, wenn dieser Key fehlt.
      if (workspaceId) localStorage.setItem('prova_workspace_id', workspaceId);
      else console.warn('[login] kein workspace gefunden für user', user.id, '— INSERT-Writes werden fail bis Workspace existiert.');

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

      // MEGA89 Block C: record_user_login() — atomarer Login-Tracking-Insert.
      // Schreibt users.last_login_at + user_sessions + audit_trail in einer Transaction.
      // Idempotent: session-Token-Hash würde Duplikate verhindern, aber DB-Function
      // schreibt einfach jedes Mal eine neue Session (page-reload nach Login = 1 Session, akzeptabel).
      try {
        if (!sessionStorage.getItem('prova_login_recorded_' + (session?.access_token || '').slice(-12))) {
          var ua = navigator.userAgent || '';
          var deviceTyp = /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile'
                        : /Tablet|iPad/.test(ua) ? 'tablet'
                        : 'desktop';
          var deviceName = (function(){
            var m = ua.match(/\(([^)]+)\)/);
            return m ? m[1].split(';')[0].trim().slice(0, 60) : null;
          })();
          await supabase.rpc('record_user_login', {
            p_ip_address: null,        // Server-side via X-Forwarded-For — DB-Function bekommt NULL, audit_trail-Trigger füllt aus headers
            p_user_agent: ua.slice(0, 240),
            p_device_typ: deviceTyp,
            p_ip_country: null,
            p_ip_city: null,
            p_device_name: deviceName
          });
          sessionStorage.setItem('prova_login_recorded_' + (session?.access_token || '').slice(-12), '1');
        }
      } catch (eLogin) {
        console.warn('[login] record_user_login fail (non-blocking):', eLogin && eLogin.message);
      }

      window.location.href = 'dashboard.html';
  }
  /* ── End of _completeLogin ── */

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
  function _bootInits() {
    initExpiredBanner();
    initSessionAutoRedirect();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootInits);
  } else {
    _bootInits();
  }
})();
