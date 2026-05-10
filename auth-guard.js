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

  /* ── Token-Validierung (MEGA⁵³ — beide Formate)
     Akzeptiert beide:
     - Supabase JWT (3 Teile: header.payload.signature) — Standard seit MEGA⁴⁵
     - Legacy HMAC-Token (2 Teile: header.signature) — auth-token-issue (Pre-MEGA⁴⁵)

     Nur Format-Check + exp + sub. Echte Verify ist server-side (Edge-Functions
     via supabase.auth.getUser()). Hier ist das nur UX-Pre-Check.
  */
  function verifyProvaToken(tok) {
    if (!tok || typeof tok !== 'string') return null;
    var parts = tok.split('.');
    var payloadIdx;
    if (parts.length === 3) {
      payloadIdx = 1;  // Supabase JWT: header.PAYLOAD.signature
    } else if (parts.length === 2) {
      payloadIdx = 0;  // Legacy HMAC: PAYLOAD.signature
    } else {
      return null;
    }
    try {
      var raw = parts[payloadIdx];
      var pad = '='.repeat((4 - (raw.length % 4)) % 4);
      var b64 = (raw + pad).replace(/-/g, '+').replace(/_/g, '/');
      var payload = JSON.parse(atob(b64));
      if (!payload || typeof payload !== 'object') return null;
      if (!payload.sub || typeof payload.sub !== 'string') return null;
      var now = Math.floor(Date.now() / 1000);
      if (typeof payload.exp !== 'number') return null;
      // MEGA⁵³ Defense: 60s Clock-Skew-Toleranz (Browser-Clock kann driften)
      if (payload.exp + 60 <= now) return null;
      // Supabase-JWT hat email statt sub für Display — sub ist UUID. Beides OK.
      return payload;
    } catch (e) {
      return null;
    }
  }

  /* ── Email aus Token (Defense gegen lokale Manipulation) ── */
  function extractEmailFromPayload(payload) {
    if (!payload) return null;
    if (typeof payload.email === 'string' && payload.email.indexOf('@') !== -1) return payload.email;
    if (typeof payload.sub === 'string' && payload.sub.indexOf('@') !== -1) return payload.sub;
    return null;  // Supabase-JWT: sub ist UUID, email kann fehlen
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

  /* P4B.9: provaCreateSession bleibt als no-op-Stub.
     app-login-logic.js ruft das noch auf (defensiv hinter typeof-Guard),
     hat aber keine Wirkung mehr — der HMAC-Token aus auth-token-issue
     ist der einzige Auth-Anker. Wir loeschen die V2-Session-Reste falls
     vorhanden, damit kein altes Session-Objekt herumliegt. */
  window.provaCreateSession = function (userData) {
    if (!userData || !userData.email) return false;
    try {
      localStorage.removeItem(SESSION_KEY);    // alte V2-Session weg
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
      localStorage.setItem(LEGACY_KEY, userData.email);  // fuer Re-Login-Email-Vorbelegung
    } catch (e) {}
    return true;
  };

  /* Session auslesen — P4B.9: liefert Token-basierte Session aus prova_user.
     V2-Session ist weg; provaGetSession bleibt als API fuer Code-Stellen
     die Session-Info brauchen. */
  window.provaGetSession = function () {
    if (!isValidSession()) return null;
    try {
      var raw = localStorage.getItem('prova_user');
      return raw ? JSON.parse(raw) : null;
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
    // MEGA⁵³: Token = Supabase-JWT (3 Teile) ODER Legacy-HMAC (2 Teile).
    // Beide Formate werden akzeptiert.
    var tok = localStorage.getItem(TOKEN_KEY);
    var tokPayload = tok ? verifyProvaToken(tok) : null;
    if (tokPayload) {
      // Email aus payload extrahieren (Supabase: payload.email, Legacy: payload.sub)
      var email = extractEmailFromPayload(tokPayload);
      if (email) {
        try { localStorage.setItem('prova_sv_email', email); } catch (e) {}
      }
      return true;
    }

    // MEGA⁵³ FIX: Token NICHT mehr automatisch löschen wenn verify fail!
    // Auto-Refresh läuft via supabase-js (autoRefreshToken: true). Wenn der
    // Token wirklich expired, refresht supabase ihn. Wenn refresh auch fail,
    // landet User bei nächstem Edge-Call mit 401 → kontrollierte Reaktion.
    // Vorher: removeItem(TOKEN_KEY) hat Supabase-3-Teil-JWTs zerstört
    //         (parts.length !== 2 → null → "ungültig" → gelöscht).
    if (tok && !tokPayload) {
      console.info('[Auth] Token-Verify fehlgeschlagen — aber NICHT gelöscht (supabase auto-refresh läuft)');
    }
    return false;
  }

  // P4B.9: buildToken war fuer V2-Session-Tamper-Detection — ungenutzt nach
  // Entfernung der V2-Session. Funktion entfernt.

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