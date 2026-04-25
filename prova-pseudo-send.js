/* ════════════════════════════════════════════════════════════════════
   PROVA — prova-pseudo-send.js
   S-SICHER P3.2 (25.04.2026) · Finding 2.1 + 2.5

   Client-Wrapper fuer fetch(), der jeden Body an 4 KI-Endpunkte rekursiv
   pseudonymisiert BEVOR der Request abgeht. Defense-in-Depth zur
   Server-seitigen Pseudonymisierung in ki-proxy.js / whisper-diktat.js.

   API
     window.PROVA_PSEUDO_SEND.fetch(url, options)  — drop-in fuer fetch()
     Pass-through wenn URL keinen KI-Endpunkt matcht.

   Endpunkte (URL-Substring-Match)
     /.netlify/functions/ki-proxy
     /.netlify/functions/foto-captioning
     hook.eu1.make.com/imn2     (G1 Gutachten-Webhook)
     hook.eu1.make.com/h019     (Whisper-Diktat-Webhook)

   Defensiv
     - Nicht-string Body, FormData oder kein JSON → unveraendert durch.
     - Strings >50 KB (Base64-Image/Audio) → unveraendert (kein Pseudo).
     - SKIP_KEYS-Whitelist fuer steuernde Felder (model, aufgabe etc.).
     - X-Pseudo-Counts Header NUR bei Same-Origin (Make.com setzt keinen
       CORS-Allow-Header fuer Custom-Header).
     - Wenn ProvaPseudo nicht geladen → console.warn + nativer fetch.

   Eingebunden in 11 Kern-HTMLs nach prova-sanitize.js, vor logic-Scripts.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KI_URL_PATTERNS = [
    '/.netlify/functions/ki-proxy',
    '/.netlify/functions/foto-captioning',
    'hook.eu1.make.com/imn2',
    'hook.eu1.make.com/h019'
  ];

  // Felder die NICHT pseudonymisiert werden (binaer-Daten, steuernde
  // Parameter, Klassifikatoren ohne Personenbezug):
  var SKIP_KEYS = {
    imageBase64: 1, audioBase64: 1, mediaType: 1,
    aufgabe: 1, paragraph_nr: 1, verwendungszweck: 1,
    ki_analyse_modus: 1, model: 1, max_tokens: 1, temperature: 1,
    sprache: 1, schadenart: 1, schadensart: 1, baujahr: 1,
    role: 1, type: 1, _userEmail: 1
  };

  var MAX_DEPTH = 6;
  var MAX_STR_LEN = 50000;

  function isKiUrl(url) {
    if (!url || typeof url !== 'string') return false;
    for (var i = 0; i < KI_URL_PATTERNS.length; i++) {
      if (url.indexOf(KI_URL_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  function isSameOrigin(url) {
    if (url.indexOf('/') === 0) return true;
    try { return url.indexOf(window.location.origin) === 0; } catch (e) { return false; }
  }

  function pseudoBody(obj, totalCounts, depth) {
    if (depth > MAX_DEPTH) return obj;
    if (obj == null) return obj;

    if (typeof obj === 'string') {
      if (obj.length > MAX_STR_LEN) return obj;
      if (!window.ProvaPseudo || typeof window.ProvaPseudo.apply !== 'function') return obj;
      var out = window.ProvaPseudo.apply(obj);
      var rep = window.ProvaPseudo.lastReport;
      if (rep) {
        ['iban', 'telefon', 'email', 'strasse', 'plz_ort', 'person'].forEach(function (k) {
          totalCounts[k] = (totalCounts[k] || 0) + (rep[k] || 0);
        });
      }
      return out;
    }

    if (Array.isArray(obj)) {
      return obj.map(function (item) { return pseudoBody(item, totalCounts, depth + 1); });
    }

    if (typeof obj === 'object') {
      var copy = {};
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (SKIP_KEYS[k]) {
          copy[k] = obj[k];
        } else {
          copy[k] = pseudoBody(obj[k], totalCounts, depth + 1);
        }
      }
      return copy;
    }

    return obj; // number, boolean, etc.
  }

  function pseudoFetch(url, opts) {
    var origFetch = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!origFetch) {
      throw new Error('[PseudoSend] window.fetch nicht verfuegbar');
    }
    if (!isKiUrl(url)) return origFetch(url, opts);
    if (!opts || !opts.body) return origFetch(url, opts);

    if (!window.ProvaPseudo || typeof window.ProvaPseudo.apply !== 'function') {
      console.warn('[PseudoSend] ProvaPseudo nicht geladen — fetch geht ungeschuetzt durch:', url);
      return origFetch(url, opts);
    }

    // Nur JSON-Bodies anpacken. FormData / Blob / String-non-JSON → durch.
    var bodyStr = opts.body;
    if (typeof bodyStr !== 'string') return origFetch(url, opts);

    var parsed;
    try { parsed = JSON.parse(bodyStr); }
    catch (e) { return origFetch(url, opts); }

    var counts = {};
    var newBody;
    try {
      newBody = pseudoBody(parsed, counts, 0);
    } catch (e) {
      console.warn('[PseudoSend] Pseudonymisierung fehlgeschlagen — Original-Body geht durch:', e && e.message);
      return origFetch(url, opts);
    }

    var newOpts = {};
    for (var k in opts) {
      if (Object.prototype.hasOwnProperty.call(opts, k)) newOpts[k] = opts[k];
    }
    newOpts.headers = {};
    if (opts.headers) {
      for (var h in opts.headers) {
        if (Object.prototype.hasOwnProperty.call(opts.headers, h)) newOpts.headers[h] = opts.headers[h];
      }
    }

    if (isSameOrigin(url)) {
      newOpts.headers['X-Pseudo-Counts'] = JSON.stringify(counts);
    }
    newOpts.body = JSON.stringify(newBody);

    var anyHits = Object.keys(counts).some(function (k) { return counts[k] > 0; });
    if (anyHits) {
      console.log('[PseudoSend] Pseudonymisiert vor Send:', url.slice(0, 60), counts);
    }

    return origFetch(url, newOpts);
  }

  window.PROVA_PSEUDO_SEND = {
    fetch: pseudoFetch,
    _isKiUrl: isKiUrl,
    _pseudoBody: pseudoBody,
    _patterns: KI_URL_PATTERNS
  };
})();
