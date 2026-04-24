/* ============================================================
   PROVA auth-guard.js — Sichere Session-Validierung
   
   VERBESSERUNGEN gegenüber v1:
   - JWT-ähnliche Token-Struktur mit Expiry
   - Tamper-Detection via simplem Hash
   - Session-Timeout (8h inaktiv → Logout)
   - Rollback-sicher: erkennt alten localStorage-Format
   - Netlify Identity optional eingebunden
   
   EINBINDEN: <script src="auth-guard.js"></script>
   MUSS VOR allen anderen Scripts geladen werden (kein defer!)
============================================================ */

(function () {
  'use strict';

  var SESSION_KEY    = 'prova_session_v2';
  var LEGACY_KEY     = 'prova_user';
  var SESSION_TTL    = 30 * 24 * 60 * 60 * 1000; // 30 Tage
  var ACTIVITY_KEY   = 'prova_last_activity';

  /* ── Öffentliche API ── */
  window.provaAuthGuard = function (opts) {
    opts = opts || {};
    var redirectTo = opts.redirectTo || 'app-login.html';
    var silent     = opts.silent || false;

    if (!isValidSession()) {
      clearSession();
      if (!silent) window.location.replace(redirectTo);
      return false;
    }

    refreshActivity();
    return true;
  };

  /* Beim Login aufrufen: createSession(userData) */
  window.provaCreateSession = function (userData) {
    if (!userData || !userData.email) return false;

    var now    = Date.now();
    var token  = buildToken(userData.email, now);
    var session = {
      user:      userData,
      created:   now,
      expires:   now + SESSION_TTL,
      token:     token,
      v:         2
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(ACTIVITY_KEY, now.toString());
      // Legacy-Key für Backward-Kompatibilität
      localStorage.setItem(LEGACY_KEY, userData.email);
    } catch (e) {
      console.warn('[Auth] Session speichern fehlgeschlagen:', e);
      return false;
    }

    // MOBILE-RESCUE P0.4: Defensive Absicherung — wenn der Caller die
    // Abo-Status-Felder an createSession durchreicht, hier mitspeichern.
    // Der Haupt-Login-Flow (app-login-logic.js, P0.1) schreibt die Werte
    // bereits direkt; diese Route ist Backup fuer andere Session-Quellen.
    try {
      if (userData.subscription_status) localStorage.setItem('prova_subscription_status', userData.subscription_status);
      if (userData.status)              localStorage.setItem('prova_status',              userData.status);
      if (userData.trial_end)           localStorage.setItem('prova_trial_end',           userData.trial_end);
      if (userData.paket)               localStorage.setItem('prova_paket',               userData.paket);
    } catch (e) {}

    return true;
  };

  /* Session auslesen */
  window.provaGetSession = function () {
    if (!isValidSession()) return null;
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  /* Logout */
  window.provaLogout = function (redirectTo) {
    clearSession();
    window.location.href = redirectTo || 'app-login.html';
  };

  /* ── Private Helfer ── */

  function isValidSession() {
    var now = Date.now();

    // V2 Session prüfen
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        var session = JSON.parse(raw);

        // Format-Check
        if (!session || session.v !== 2 || !session.user || !session.token) {
          return false;
        }

        // Expiry-Check — verlängern wenn noch aktiv (letzte 24h)
        if (now > session.expires) {
          // Prüfe ob letzte Aktivität < 24h her ist → dann verlängern
          var lastAct = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0');
          if (lastAct && (now - lastAct) < 24 * 60 * 60 * 1000) {
            // Session verlängern statt ablaufen lassen
            session.expires = now + SESSION_TTL;
            try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch(e){}
            console.info('[Auth] Session automatisch verlängert');
          } else {
            console.info('[Auth] Session abgelaufen');
            return false;
          }
        }

        // Inaktivitäts-Check
        var lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0');
        if (lastActivity && (now - lastActivity) > SESSION_TTL) {
          console.info('[Auth] Inaktivitäts-Timeout');
          return false;
        }

        // Token-Integrität prüfen
        var expectedToken = buildToken(session.user.email, session.created);
        if (session.token !== expectedToken) {
          console.warn('[Auth] Token-Manipulation erkannt');
          return false;
        }

        return true;
      }
    } catch (e) {
      // JSON-Parse-Fehler → ungültig
      return false;
    }

    // Legacy-Fallback: prova_user existiert → einmalig migrieren
    var legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && legacy.length > 0 && legacy !== '1' && legacy.includes('@')) {
      // Alten User migrieren
      console.info('[Auth] Legacy-Session gefunden, migriere zu V2');
      var userData = {
        email:    legacy,
        migrated: true,
        name:     localStorage.getItem('prova_sv_vorname') || ''
      };
      window.provaCreateSession(userData);

      // MOBILE-RESCUE P0.6: Nach Legacy-Migration fehlen die Abo-Felder
      // (paket/status/subscription_status/trial_end). Fire-and-forget
      // Airtable-Sync, damit sie nachgeladen werden. Greift auch bei
      // Netlify-Identity-Direct-Redirects die app-login-logic.js umgehen.
      try {
        fetch('/.netlify/functions/airtable', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            method: 'GET',
            path: '/v0/appJ7bLlAHZoxENWE/tbladqEQT3tmx4DIB?filterByFormula=' +
                  encodeURIComponent('{Email}="' + legacy + '"') + '&maxRecords=1'
          })
        }).then(function(r) { return r.ok ? r.json() : null; })
          .then(function(data) {
            if (!data || !data.records || !data.records.length) return;
            var f = data.records[0].fields || {};
            try {
              if (data.records[0] && data.records[0].id) localStorage.setItem('prova_at_sv_record_id', data.records[0].id);
              var paket = (f.Paket && f.Paket.name) ? f.Paket.name : (f.Paket || f.paket || 'Solo');
              var paketMap = {'Starter':'Solo','Pro':'Solo','Enterprise':'Team'};
              paket = paketMap[paket] || paket;
              if (!['Solo','Team'].includes(paket)) paket = 'Solo';
              var status = (f.Status && f.Status.name) ? f.Status.name : (f.Status || 'Aktiv');
              localStorage.setItem('prova_paket', paket);
              localStorage.setItem('prova_status', status);
              if (f.subscription_status)  localStorage.setItem('prova_subscription_status', f.subscription_status);
              if (f.trial_end)            localStorage.setItem('prova_trial_end', f.trial_end);
              if (f.current_period_end)   localStorage.setItem('prova_current_period_end', f.current_period_end);
              if (f.testpilot)            localStorage.setItem('prova_testpilot', '1');
              console.info('[Auth] Legacy-Session: Abo-Felder aus Airtable nachgeladen');
            } catch(e) { console.warn('[Auth] Legacy-Sync-Parse-Fehler:', e); }
          })
          .catch(function(e) { console.warn('[Auth] Legacy-Airtable-Sync fehlgeschlagen:', e); });
      } catch(e) {}

      return true;
    }

    return false;
  }

  function buildToken(email, timestamp) {
    // Einfaches, nicht-kryptografisches Token für Client-Side Tamper-Detection
    // Echte Sicherheit liegt server-side in den Netlify Functions
    var str = email + ':' + timestamp + ':' + navigator.userAgent.slice(0, 20);
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'prova_' + Math.abs(hash).toString(36);
  }

  function refreshActivity() {
    try {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
    } catch (e) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACTIVITY_KEY);
      // Legacy-Key NICHT entfernen (enthält E-Mail für Re-Login)
    } catch (e) {}
  }

  /* ── Session-Timeout (Session 23) ─────────────────────────────────
     Liest aus Einstellungen → Sicherheit → Sitzungs-Timeout.
     Werte: 4, 8, 24 (Stunden) oder 0 (= Nie, hardcoded 7 Tage Legacy).
     Default bei fehlender Einstellung: 8 Stunden. */
  function getInaktivGrenze() {
    try {
      var es = JSON.parse(localStorage.getItem('prova_einstellungen') || '{}');
      var stunden = parseInt(es.session_timeout, 10);
      if (!isNaN(stunden)) {
        if (stunden === 0) return null; // "Nie" — kein Auto-Logout
        if (stunden >= 1 && stunden <= 168) return stunden * 60 * 60 * 1000;
      }
    } catch(e) {}
    return 8 * 60 * 60 * 1000; // Default 8 Stunden
  }

  function checkInaktivitaet() {
    var grenze = getInaktivGrenze();
    if (grenze === null) return; // "Nie" gewählt → nichts tun
    var lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10);
    if (!lastActivity) return;
    var inaktivMs = Date.now() - lastActivity;
    if (inaktivMs > grenze) {
      var page = window.location.pathname.split('/').pop() || '';
      var publicPages = ['app-login.html', 'app-register.html', 'index.html', ''];
      if (publicPages.indexOf(page) === -1) {
        try { localStorage.setItem('prova_logout_grund', 'inaktivitaet'); } catch(e) {}
        window.location.replace('app-login.html?reason=inactivity');
      }
    }
  }

  /* ── Auto-Check bei Tab-Fokus ── */
  window.addEventListener('focus', function () {
    checkInaktivitaet();
    if (isValidSession()) refreshActivity();
  });

  /* ── Periodischer Check (alle 60s) ── */
  setInterval(checkInaktivitaet, 60 * 1000);

  /* ── Inaktivitäts-Timer ── */
  var activityThrottleTimer;
  ['click', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (activityThrottleTimer) return;
      activityThrottleTimer = setTimeout(function () {
        refreshActivity();
        activityThrottleTimer = null;
      }, 30000); // Maximal alle 30s schreiben
    }, { passive: true });
  });

})();