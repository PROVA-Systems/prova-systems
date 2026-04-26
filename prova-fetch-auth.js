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

    // 401 von Function -> Token ist tot, ausloggen.
    if (res && res.status === 401 && isFunctionUrl(url)) {
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
