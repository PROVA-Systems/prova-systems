/* ============================================================
   PROVA prova-fetch-auth.js — zentraler Fetch-Helper mit
   Authorization-Header-Injection (S-SICHER P4B.8, 26.04.2026)

   Verwendung in *-logic.js, prova-* Helpers, etc.:
     await provaFetch('/.netlify/functions/airtable', {
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

  // Preserve native fetch for non-Function-Calls (Airtable direct etc.)
  var nativeFetch = window.fetch.bind(window);

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

  // Voll-Cleanup-Sprint Block 2 (02.05.2026): Airtable-Endpoint hart deaktiviert.
  // PROVA ist seit K-1.5 auf Supabase. Calls zu /.netlify/functions/airtable
  // werden mit fake-410 abgewiesen damit Logic-Files in catch-Pfad fallen
  // statt User auszusperren. Code-Stellen werden parallel pro File entfernt
  // (file-by-file Cleanup) bis grep -ri "airtable" nur noch in archivierten
  // Pfaden Treffer hat.
  function isDisabledAirtableUrl(url) {
    return typeof url === 'string'
      && (url.indexOf('/.netlify/functions/airtable') !== -1
          || url.indexOf('api.airtable.com') !== -1);
  }

  function makeAirtableDisabledResponse(url) {
    var body = JSON.stringify({
      error: 'airtable-disabled',
      reason: 'Voll-Supabase-Cleanup-Sprint 02.05.2026 — Airtable ist nicht mehr Live-Datenpfad. Logic-Files werden parallel migriert; siehe docs/diagnose/AIRTABLE-DRIFT-AUDIT.md.',
      records: [],
      data: [],
      items: []
    });
    return {
      ok: false,
      status: 410,
      statusText: 'Gone',
      url: String(url || ''),
      headers: typeof Headers !== 'undefined' ? new Headers({'Content-Type': 'application/json'}) : null,
      json: function () { return Promise.resolve(JSON.parse(body)); },
      text: function () { return Promise.resolve(body); },
      clone: function () { return makeAirtableDisabledResponse(url); }
    };
  }

  window.provaFetch = async function provaFetch(url, options) {
    options = options || {};
    options.headers = options.headers || {};

    // Voll-Cleanup: Airtable-URLs hart abweisen
    if (isDisabledAirtableUrl(url)) {
      console.info('[airtable-cleanup] blocked legacy call:', url);
      return makeAirtableDisabledResponse(url);
    }

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

    // 401 von Function -> versuche Refresh-vor-Logout (Cutover Block 3 Phase 2)
    if (res && res.status === 401 && isFunctionUrl(url)) {
      var currentTok = getToken();
      if (isSupabaseJwt(currentTok)) {
        console.info('[fetch-auth] 401 with supabase-jwt, trying refresh...');
        var retryRes = await tryRefreshAndRetry(url, options);
        if (retryRes && retryRes.status !== 401) {
          // Refresh + Retry erfolgreich → Caller bekommt frische Response
          return retryRes;
        }
        console.warn('[fetch-auth] refresh-retry failed → logout');
      }
      // Alter HMAC-Token ODER Refresh failed → Auto-Logout
      clearAuthAndRedirect();
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
})();
