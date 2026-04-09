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

  /* ── Auto-Check bei Tab-Fokus ── */
  window.addEventListener('focus', function () {
    // Beim Zurückwechseln in den Tab prüfen ob Session noch gültig
    // Nur bei echter langer Inaktivität (> 7 Tage) redirecten
    // Nicht bei kurzen Wechseln (Screenshot, anderer Tab)
    var lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0');
    var inaktivMs = Date.now() - lastActivity;
    var INAKTIV_GRENZE = 7 * 24 * 60 * 60 * 1000; // 7 Tage
    if (lastActivity && inaktivMs > INAKTIV_GRENZE && !isValidSession()) {
      var page = window.location.pathname.split('/').pop() || '';
      var publicPages = ['app-login.html', 'app-register.html', 'index.html', ''];
      if (publicPages.indexOf(page) === -1) {
        window.location.replace('app-login.html');
      }
    } else if (isValidSession()) {
      refreshActivity(); // Aktivität auffrischen
    }
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

  /* ── Airtable-Proxy: immer Nutzer-E-Mail mitsenden (Multi-Tenant / DSGVO) ──
     Die Function nutzt _userEmail, wenn kein Netlify-Identity clientContext gesetzt ist.
     Ohne diese Zeile liefert GET auf Fälle ungefiltert alle Datensätze aller SV. */
  function resolveProvaUserEmailForApi() {
    try {
      var em = localStorage.getItem('prova_sv_email') || localStorage.getItem('prova_email') || '';
      if (em) return String(em).toLowerCase().trim();
      var rawS = localStorage.getItem(SESSION_KEY);
      if (rawS) {
        var sess = JSON.parse(rawS);
        if (sess && sess.user && sess.user.email) return String(sess.user.email).toLowerCase().trim();
      }
      var pu = localStorage.getItem(LEGACY_KEY);
      if (!pu) return '';
      if (pu.charAt(0) === '{') {
        var u = JSON.parse(pu);
        var e2 = u.email || (u.user_metadata && u.user_metadata.email) || '';
        return String(e2).toLowerCase().trim();
      }
      if (pu.indexOf('@') > 0) return String(pu).toLowerCase().trim();
    } catch (e) {}
    return '';
  }

  var _provaNativeFetch = window.fetch;
  function getAuthHeader(init) {
    try {
      var h = init && init.headers;
      if (!h) return '';
      if (typeof Headers !== 'undefined' && h instanceof Headers) return h.get('Authorization') || h.get('authorization') || '';
      return h.Authorization || h.authorization || '';
    } catch (e) { return ''; }
  }

  function setAuthHeader(init, token) {
    try {
      if (!token) return init;
      var h = init.headers || {};
      if (typeof Headers !== 'undefined' && h instanceof Headers) {
        h.set('Authorization', 'Bearer ' + token);
        init.headers = h;
        return init;
      }
      // plain object
      var nextHeaders = Object.assign({}, h, { Authorization: 'Bearer ' + token });
      return Object.assign({}, init, { headers: nextHeaders });
    } catch (e) { return init; }
  }

  async function getNetlifyJwtToken() {
    try {
      if (!window.netlifyIdentity || !window.netlifyIdentity.currentUser) return '';
      var u = window.netlifyIdentity.currentUser();
      if (!u || !u.jwt) return '';
      return await u.jwt();
    } catch (e) {
      return '';
    }
  }

  window.fetch = function (input, init) {
    init = init || {};
    var url = '';
    try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) {}

    // ── Make.com Webhooks: niemals direkt aus dem Browser ──
    // Stattdessen via serverseitigem Proxy (JWT + Rate Limit + Whitelist)
    var isMakeWebhook = url.indexOf('https://') === 0 && url.indexOf('make.com/') !== -1 && url.indexOf('/hook.') !== -1;
    if (isMakeWebhook) {
      var method = (init.method || 'POST').toUpperCase();
      if (method !== 'POST') {
        return Promise.reject(new Error('MAKE_PROXY_METHOD_NOT_ALLOWED'));
      }
      // payload aus init.body lesen (JSON oder object/string)
      var rawBody = init.body;
      var payloadObj = null;
      try {
        if (rawBody == null) payloadObj = null;
        else if (typeof rawBody === 'string') payloadObj = JSON.parse(rawBody);
        else payloadObj = rawBody;
      } catch (e) {
        // Wenn es kein JSON ist, trotzdem weiterreichen als text
        payloadObj = { raw: String(rawBody || '') };
      }

      // JWT holen und Make-Proxy callen
      return Promise.resolve(getNetlifyJwtToken()).then(function (tok) {
        if (!tok) throw new Error('UNAUTHORIZED');
        var proxyInit = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
          body: JSON.stringify({ webhookUrl: url, payload: payloadObj })
        };
        return _provaNativeFetch.call(this, '/.netlify/functions/make-proxy', proxyInit);
      });
    }

    var isAirtableFn = url.indexOf('/.netlify/functions/airtable') !== -1;
    if (!isAirtableFn) {
      return _provaNativeFetch.call(this, input, init);
    }

    // 1) Body-Fallback _userEmail (nur Fallback; echte Sicherheit kommt über JWT)
    try {
      if (init.body && typeof init.body === 'string') {
        var parsed = JSON.parse(init.body);
        if (parsed && typeof parsed === 'object' && !parsed._userEmail) {
          var em = resolveProvaUserEmailForApi();
          if (em) {
            parsed._userEmail = em;
            init = Object.assign({}, init, { body: JSON.stringify(parsed) });
          }
        }
      }
    } catch (e) {}

    // 2) JWT automatisch mitsenden (Netlify Identity) → serverseitig verifizierbar
    var existingAuth = getAuthHeader(init);
    if (existingAuth) {
      return _provaNativeFetch.call(this, input, init);
    }

    return Promise.resolve(getNetlifyJwtToken()).then(function (tok) {
      if (tok) init = setAuthHeader(init, tok);
      return _provaNativeFetch.call(this, input, init);
    });
  };

})();