/**
 * PROVA — Authorization-Header + Fetch-Interceptor
 * Alle Requests zu /.netlify/functions/* bekommen automatisch JWT-Header
 * Unterstützt: direkter API-Login (localStorage) + Netlify Identity Widget
 * v95 — globaler Interceptor eliminiert 401-Fehler in allen Logic-Dateien
 */
(function () {

  /* ── Token ermitteln ── */
  function getToken() {
    try {
      var stored = localStorage.getItem('netlify-identity-token');
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && parsed.access_token) return parsed.access_token;
      }
    } catch(e) {}
    if (window.netlifyIdentity && typeof netlifyIdentity.currentUser === 'function') {
      var u = netlifyIdentity.currentUser();
      if (u && u.token && u.token.access_token) return u.token.access_token;
    }
    return null;
  }

  /* ── Auth-Header Objekt ── */
  window.provaAuthHeaders = function () {
    var h = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  };

  /* ── Globaler Fetch-Interceptor ──
     Alle Requests zu /.netlify/functions/* erhalten automatisch den JWT-Header.
     Bestehende Authorization-Header werden nicht überschrieben.
  ── */
  /* ── Request Deduplication ─────────────────────────────────────
     Verhindert doppelte identische GET-Requests (z.B. bei schnellen Tab-Wechseln).
     Wirkt auf ALLE fetch()-Calls zu Netlify Functions — kein manuelles PROVA_API nötig.
  ── */
  var _dedupMap = {};

  var _originalFetch = window.fetch;
  window.fetch = function(url, options) {
    var urlStr = String(url || '');
    var method = (options && options.method || 'GET').toUpperCase();

    /* Nur GET-artige Airtable-Calls deduplizieren */
    var isAirtableGet = urlStr.indexOf('/.netlify/functions/airtable') !== -1
      && method === 'POST'; /* Airtable-Calls sind immer POST mit method:'GET' im Body */

    if (isAirtableGet && options && options.body) {
      try {
        var b = JSON.parse(options.body);
        if (b.method === 'GET') {
          var dedupKey = b.path || urlStr;
          if (_dedupMap[dedupKey]) return _dedupMap[dedupKey];
          var promise = _originalFetch.apply(window, arguments);
          _dedupMap[dedupKey] = promise;
          promise.finally(function() { delete _dedupMap[dedupKey]; });
          return promise;
        }
      } catch(e) {}
    }
    var urlStr = String(url || '');
    if (urlStr.indexOf('/.netlify/functions/') !== -1) {
      var token = getToken();
      if (token) {
        options = options || {};
        var existingHeaders = options.headers || {};
        // Nicht überschreiben wenn bereits gesetzt
        var hasAuth = false;
        if (existingHeaders instanceof Headers) {
          hasAuth = existingHeaders.has('Authorization');
        } else if (typeof existingHeaders === 'object') {
          hasAuth = !!(existingHeaders['Authorization'] || existingHeaders['authorization']);
        }
        if (!hasAuth) {
          var newHeaders = {};
          if (existingHeaders instanceof Headers) {
            existingHeaders.forEach(function(v, k) { newHeaders[k] = v; });
          } else {
            Object.assign(newHeaders, existingHeaders);
          }
          newHeaders['Authorization'] = 'Bearer ' + token;
          options = Object.assign({}, options, { headers: newHeaders });
        }
      }
    }
    return _originalFetch.apply(window, [url, options]);
  };

  /* ── Convenience-Wrapper ── */
  window.provaFetchAirtable = function (bodyObj) {
    return provaFetch('/.netlify/functions/airtable', {
      method:  'POST',
      headers: window.provaAuthHeaders(),
      body:    JSON.stringify(bodyObj)
    });
  };

  window.provaFetchKiProxy = function (bodyObj) {
    return provaFetch('/.netlify/functions/ki-proxy', {
      method:  'POST',
      headers: window.provaAuthHeaders(),
      body:    JSON.stringify(bodyObj)
    });
  };

})();

/* ── Session-Helper ── */
window.provaCreateSession = function(user) {
  if (!user || !user.email) return;
  localStorage.setItem('prova_sv_email', user.email);
  localStorage.setItem('prova_user', JSON.stringify(user));
};

/* ── E-Mail direkt via smtp-senden senden ── */
/* Passwort wird NIEMALS im Frontend gespeichert — smtp-credentials.js übernimmt das server-seitig */
window.provaMailSenden = async function(opts) {
  // opts: { to, subject, text, html, az }
  var headers = window.provaAuthHeaders ? window.provaAuthHeaders() : {'Content-Type':'application/json'};
  var r = await provaFetch('/.netlify/functions/smtp-senden', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(opts) // KEIN Passwort im Body!
  });
  return r.json().catch(function(){ return { ok: false, error: 'Netzwerkfehler' }; });
};
