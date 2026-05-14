/* ============================================================
   PROVA prova-fetch-auth.js — zentraler Fetch-Helper mit
   Authorization-Header-Injection (S-SICHER P4B.8, 26.04.2026)

   Verwendung in *-logic.js, prova-* Helpers, etc.:
     await provaFetch('/.netlify/functions/<name>', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({...})
     });

   Verhalten:
   - Wenn url ein /.netlify/functions/-Pfad ist: injiziert
     Authorization: Bearer <prova_auth_token> aus localStorage.
   - Bei response.status === 401: localStorage.prova_auth_token +
     prova_user + prova_session_v2 entfernt, Redirect zu app-login.html.
     -> Server hat den Token abgelehnt (abgelaufen / invalid).
   - Bei allen anderen Antworten: response wird unveraendert
     zurueckgegeben (Caller behandelt 4xx/5xx selbst).

   Fuer cross-origin-Requests (z.B. Airtable, OpenAI direkt):
     KEIN Bearer-Header — der Token ist nur fuer Netlify-Functions
     gedacht und darf NICHT an Drittsysteme leaken.

   Geladen in jeder geschuetzten HTML VOR allen *-logic.js-Scripts
   und VOR auth-guard.js (auth-guard nutzt provaFetch nicht selbst,
   aber andere Scripts die danach laden brauchen das Symbol).

   Im SW-APP_SHELL via /prova-fetch-auth.js (s. sw.js v209).
============================================================ */

(function () {
  'use strict';

  var TOKEN_KEY = 'prova_auth_token';
  var FUNCTION_PREFIX = '/.netlify/functions/';

  // MEGA⁵⁶+⁵⁷ DEFINITIVER FIX: Dynamic window.fetch (NIEMALS cachen!)
  //
  // Grund: Wenn prova-fetch-auth.js VOR edge-shim.js lädt (was in 67 von 71
  // HTMLs der Fall WAR vor MEGA⁵⁷), würde gecachter fetch den edge-shim
  // Patch BYPASSEN. Mit dynamic call wird IMMER aktueller window.fetch
  // genutzt → edge-shim greift IMMER, egal welche Loading-Order.
  //
  // Vorher (BIS MEGA⁵⁵): var nativeFetch = window.fetch.bind(window);
  // → provaFetch bypasste edge-shim → /.netlify/functions/* → 401/500.
  //
  // MEGA⁵⁷-LIVE-VERIFY: curl /prova-fetch-auth.js | grep "MEGA⁵⁷"
  //   muss Match haben für Deploy-Confirmation.
  function nativeFetch(url, options) {
    return window.fetch.call(window, url, options);
  }

  function isFunctionUrl(url) {
    if (typeof url !== 'string') return false;
    // Absolute (https://prova-systems.de/.netlify/functions/...) oder relative
    // (/.netlify/functions/...) Pfade beide erfassen.
    return url.indexOf(FUNCTION_PREFIX) !== -1;
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function clearAuthAndRedirect() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('prova_user');
      localStorage.removeItem('prova_session_v2');
    } catch (e) {}
    // Nicht-aggressiv loggen — Login-Page hat eigenen Banner
    var page = (window.location && window.location.pathname || '').split('/').pop();
    var publicPages = ['app-login.html', 'app-register.html', 'admin-login.html', 'index.html', ''];
    if (publicPages.indexOf(page) === -1) {
      try { localStorage.setItem('prova_logout_grund', 'token_expired'); } catch (e) {}
      window.location.replace('/app-login.html?reason=token_expired');
    }
  }

  // Helper: Token im Auth-Header setzen (oder ueberschreiben)
  function applyAuthHeader(options, token) {
    options.headers = options.headers || {};
    if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
      options.headers.set('Authorization', 'Bearer ' + token);
    } else {
      options.headers['Authorization'] = 'Bearer ' + token;
    }
  }

  // Defense-in-Depth (Cutover Block 3 Phase 2 — Option C, 01.05.2026):
  // Bei 401 mit Supabase-JWT (3-Teiler) erst Refresh versuchen, vor Logout.
  // Verhindert dass User unnoetig ausgesperrt wird wenn nur das Token abgelaufen
  // ist (z.B. nach 1h Inaktivitaet — supabase-js refresht automatisch, aber
  // bei abgelaufenem Token vor naechstem onAuthStateChange-Trigger kann ein
  // Function-Call mit altem Token ankommen).
  // Cache fuer den lazy-imported Supabase-Client (Race-Fix Block 1, 02.05.2026)
  var _supaPromise = null;
  async function getSupabaseClient() {
    // 1. Synchron — ist supabase schon im window registriert?
    var supa = window.PROVA_DEBUG && window.PROVA_DEBUG.supabase;
    if (supa && supa.auth && typeof supa.auth.refreshSession === 'function') return supa;
    // 2. Lazy ESM-Import — Race-Window zwischen defer-Scripts und ESM-Module
    //    eliminiert. Browser cached die import-Promise, zweiter Aufruf ist instant.
    if (!_supaPromise) {
      _supaPromise = import('/lib/supabase-client.js')
        .then(function (mod) { return (mod && mod.supabase) || null; })
        .catch(function (e) {
          console.warn('[fetch-auth] supabase-client lazy-import failed', e);
          _supaPromise = null;
          return null;
        });
    }
    var imported = await _supaPromise;
    if (imported && imported.auth && typeof imported.auth.refreshSession === 'function') {
      return imported;
    }
    return null;
  }

  async function tryRefreshAndRetry(url, options) {
    var supa = await getSupabaseClient();
    if (!supa) {
      console.info('[fetch-auth] supabase nicht verfuegbar — kein Refresh moeglich');
      return null;
    }
    try {
      var refreshRes = await supa.auth.refreshSession();
      var newToken = refreshRes && refreshRes.data && refreshRes.data.session
        && refreshRes.data.session.access_token;
      if (refreshRes.error || !newToken) {
        console.warn('[fetch-auth] refresh failed', refreshRes.error);
        return null;
      }
      console.info('[fetch-auth] refresh OK, retrying fetch with new token');
      try { localStorage.setItem('prova_auth_token', newToken); } catch (e) {}
      // 1× Retry mit neuem Token (frische Options-Kopie)
      var retryOpts = Object.assign({}, options);
      retryOpts.headers = options.headers
        ? (options.headers instanceof Headers ? new Headers(options.headers) : Object.assign({}, options.headers))
        : {};
      applyAuthHeader(retryOpts, newToken);
      return await nativeFetch(url, retryOpts);
    } catch (e) {
      console.warn('[fetch-auth] refresh-retry error', e);
      return null;
    }
  }

  function isSupabaseJwt(tok) {
    return tok && typeof tok === 'string'
      && tok.indexOf('eyJ') === 0
      && tok.split('.').length === 3;
  }

  // MEGA⁷⁶ C.1: Airtable-Reroute-Branch entfernt. Alle Caller sind migriert
  // (Sprint F-Batch1 + F-Batch2 + MEGA76). netlify/functions/airtable.js
  // selbst returnt jetzt 410 — kein clientseitiger Stub mehr nötig.

  window.provaFetch = async function provaFetch(url, options) {
    options = options || {};
    options.headers = options.headers || {};

    if (isFunctionUrl(url)) {
      var tok = getToken();
      if (tok) {
        // Headers koennen Object oder Headers-Instance sein
        if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
          if (!options.headers.has('Authorization')) {
            options.headers.set('Authorization', 'Bearer ' + tok);
          }
        } else {
          if (!options.headers['Authorization'] && !options.headers['authorization']) {
            options.headers['Authorization'] = 'Bearer ' + tok;
          }
        }
      }
    }

    var res;
    try {
      res = await nativeFetch(url, options);
    } catch (err) {
      // Netzwerk-Fehler — keine Auth-Auswirkung, nur weiterwerfen.
      throw err;
    }

    // ════════════════════════════════════════════════════════════════
    // MEGA⁵⁴: SOFT 401-Handling — KEIN Auto-Logout mehr.
    //
    // Vorher (bis MEGA⁵³): 401 → refresh-versuch → bei fail clearAuth +
    //   redirect zu /app-login.html?reason=token_expired. Problem: aggressives
    //   Auto-Logout reißt User raus (Race-Conditions im Refresh-Flow,
    //   Edge-Function 401 wegen Permission statt Auth).
    //
    // Jetzt: 401 → refresh-versuch → bei fail nur Console-Warning. Caller
    //   bekommt 401-Response unverändert. UI handled selbst (z.B. KPI auf "—").
    //   Logout passiert NUR durch expliziten User-Klick auf Logout-Button
    //   ODER auth-guard.js bei nicht-existentem Token.
    //
    // Single Responsibility: Bearer-Token-Injection + Refresh-Retry-Versuch.
    // KEIN UI-Side-Effect (kein redirect) von prova-fetch-auth.js aus.
    // ════════════════════════════════════════════════════════════════
    if (res && res.status === 401 && isFunctionUrl(url)) {
      var currentTok = getToken();
      if (isSupabaseJwt(currentTok)) {
        console.info('[fetch-auth] 401 with supabase-jwt, trying refresh...');
        var retryRes = await tryRefreshAndRetry(url, options);
        if (retryRes && retryRes.status !== 401) {
          return retryRes;
        }
        console.warn('[fetch-auth] refresh-retry failed — Caller bekommt 401, KEIN Auto-Logout (MEGA⁵⁴)');
      } else {
        console.warn('[fetch-auth] 401 (kein Supabase-JWT) — Caller bekommt 401, KEIN Auto-Logout (MEGA⁵⁴)');
      }
    }

    if (res && res.status === 403 && isFunctionUrl(url)) {
      var fnName403 = url.split(FUNCTION_PREFIX)[1]?.split('?')[0] ?? '?';
      console.info('[fetch-auth] 403 forbidden on ' + fnName403 + ' — kein Logout (Permission-Denied)');
    }

    if (res && res.status >= 500 && isFunctionUrl(url)) {
      var fnName500 = url.split(FUNCTION_PREFIX)[1]?.split('?')[0] ?? '?';
      console.warn('[fetch-auth] ' + res.status + ' Server-Error on ' + fnName500 + ' — kein Logout');
    }

    return res;
  };

  // Convenience-Funktion: window.provaFetchJson — fetcht + parsed JSON.
  // Behaelt 4xx/5xx-Errors NICHT als throw, sondern returnt {ok, status, data}
  // wie die meisten Caller das heute manuell machen.
  window.provaFetchJson = async function provaFetchJson(url, options) {
    var res = await window.provaFetch(url, options);
    var data = null;
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data: data, response: res };
  };

  // MEGA³⁴ A1: Auto-Lazy-Load ProvaCookieConsent (DSGVO § 25 TTDSG + Art. 7).
  // Lib hat eigenen DOMContentLoaded-Hook + 13-Monate-Re-Show-Logic.
  // Hier: sicherstellen dass Lib geladen wird (Public + Authenticated Pages).
  try {
    if (typeof document !== 'undefined' && typeof window.ProvaCookieConsent === 'undefined') {
      var ccScript = document.createElement('script');
      ccScript.src = '/lib/cookie-consent.js';
      ccScript.defer = true;
      ccScript.setAttribute('data-mega34-a1', '1');
      document.head.appendChild(ccScript);
    }
  } catch (e) { /* fail-silent */ }

  // MEGA³³ B4: Auto-Lazy-Load ProvaReConsent-Modal-Lib auf authenticated Pages.
  // Lib hat selbst DOMContentLoaded-Auto-Init mit checkAndShow nach 1.5s.
  // Hier nur sicherstellen, dass die Lib auch tatsächlich GELADEN wird —
  // bisher war sie nur in tests, aber nicht in HTML-Pages eingebunden.
  try {
    if (typeof document !== 'undefined' && typeof window.ProvaReConsent === 'undefined') {
      var rcToken = null;
      try { rcToken = localStorage.getItem('prova_auth_token'); } catch (e) {}
      if (rcToken) {
        var rcPath = (window.location && window.location.pathname) || '';
        var rcSkip = ['/login.html', '/login', '/index.html', '/', '/pricing.html', '/datenschutz.html', '/impressum.html', '/agb.html', '/avv.html', '/demo.html'];
        if (rcSkip.indexOf(rcPath) === -1) {
          var rcScript = document.createElement('script');
          rcScript.src = '/lib/re-consent-modal.js';
          rcScript.defer = true;
          rcScript.setAttribute('data-mega33-b4', '1');
          document.head.appendChild(rcScript);
        }
      }
    }
  } catch (e) { /* nicht-kritisch, fail-silent */ }
})();
