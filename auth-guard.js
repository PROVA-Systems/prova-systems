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
  var TOKEN_KEY      = 'prova_auth_token'; // P4A.4: HMAC-Token aus auth-token-issue

  /* ── HMAC-Token Client-seitig validieren (Format + exp) ──
     Echte HMAC-Verify findet server-seitig in jeder Function statt
     (siehe netlify/functions/lib/auth-token.js). Hier nur:
     - Format-Check (header.signature)
     - exp-Check (Token nicht abgelaufen)
     - sub vorhanden
     Sicherheits-Note: Auth-Guard ist UX (kein Render auf gesperrten
     Seiten). Ein Angreifer kann localStorage manipulieren — die
     echte Sicherheit liegt in der HMAC-Verify der Server-Functions. */
  function verifyProvaToken(tok) {
    if (!tok || typeof tok !== 'string') return null;
    var parts = tok.split('.');
    if (parts.length !== 2) return null;
    try {
      var head = parts[0];
      var pad = '='.repeat((4 - (head.length % 4)) % 4);
      var b64 = (head + pad).replace(/-/g, '+').replace(/_/g, '/');
      var payload = JSON.parse(atob(b64));
      if (!payload || typeof payload !== 'object') return null;
      if (!payload.sub || typeof payload.sub !== 'string') return null;
      var now = Math.floor(Date.now() / 1000);
      if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
      return payload;
    } catch (e) {
      return null;
    }
  }

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

    // P4A.4 (Finding 7.1): Primaerer Auth-Pfad — HMAC-Token aus
    // auth-token-issue.js. Gesetzt in app-login-logic.js durch P4A.5.
    var tok = localStorage.getItem(TOKEN_KEY);
    var tokPayload = tok ? verifyProvaToken(tok) : null;
    if (tokPayload) {
      // sv_email aus Token-sub spiegeln (Defense gegen lokale Manipulation
      // anderer Keys: token.sub gewinnt).
      try { localStorage.setItem('prova_sv_email', tokPayload.sub); } catch (e) {}
      return true;
    }

    // Falls Token vorhanden aber abgelaufen/ungueltig → bereinigen
    if (tok && !tokPayload) {
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      console.info('[Auth] HMAC-Token abgelaufen oder ungueltig — entfernt');
    }

    // Sekundaerer Pfad: Legacy V2-Session (vor P4A.4 erzeugt durch
    // provaCreateSession). Bleibt vorerst — Sprint 3 (P4B) macht den
    // ganzen Auth-Flow auf HMAC-Token-only.
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
          var lastAct = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0');
          if (lastAct && (now - lastAct) < 24 * 60 * 60 * 1000) {
            session.expires = now + SESSION_TTL;
            try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch(e){}
            console.info('[Auth] V2-Session automatisch verlängert');
          } else {
            console.info('[Auth] V2-Session abgelaufen');
            return false;
          }
        }

        var lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0');
        if (lastActivity && (now - lastActivity) > SESSION_TTL) {
          console.info('[Auth] Inaktivitäts-Timeout');
          return false;
        }

        var expectedToken = buildToken(session.user.email, session.created);
        if (session.token !== expectedToken) {
          console.warn('[Auth] V2-Token-Manipulation erkannt');
          return false;
        }

        return true;
      }
    } catch (e) {
      return false;
    }

    // P4A.4 (Finding 7.1): Legacy-Migration aus prova_user-localStorage
    // ENTFERNT. Vorher: jeder uebrig-gebliebene prova_user-Eintrag wurde
    // stillschweigend zu V2 migriert — das war der Bypass der dashboard.html
    // / einstellungen.html ohne echten Login passieren liess.
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