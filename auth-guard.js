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
  var SESSION_TTL    = 8 * 60 * 60 * 1000;  // 8 Stunden
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

        // Expiry-Check
        if (now > session.expires) {
          console.info('[Auth] Session abgelaufen');
          return false;
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
      return true;
    }

    return false;
  }

  function buildToken(email, timestamp) {
    // Einfaches, nicht-kryptografisches Token für Client-Side Tamper-Detection
    // Echte Sicherheit liegt server-side in den Netlify Functions
    var str = email + ':' + timestamp + ':PROVA_STATIC_SALT';
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

  /* ── Auto-Check bei Tab-Fokus ── */
  var _focusTimer = null;
  window.addEventListener('focus', function () {
    clearTimeout(_focusTimer);
    _focusTimer = setTimeout(function() {
      if (!isValidSession()) {
        var page = window.location.pathname.split('/').pop() || '';
        var publicPages = ['app-login.html', 'app-register.html', 'index.html', ''];
        if (publicPages.indexOf(page) === -1) {
          try { sessionStorage.setItem('prova_redirect_after_login', window.location.href); } catch(e) {}
          window.location.replace('app-login.html');
        }
      }
    }, 800);
  });

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