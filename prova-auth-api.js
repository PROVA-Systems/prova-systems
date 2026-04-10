/**
 * PROVA — Authorization-Header für Netlify Functions (Identity JWT)
 * Erfordert netlify-identity-widget geladen und netlifyIdentity.init() vor Aufrufen.
 */
(function () {
  function getToken() {
    if (window.netlifyIdentity && typeof netlifyIdentity.currentUser === 'function') {
      var u = netlifyIdentity.currentUser();
      if (u && u.token && u.token.access_token) return u.token.access_token;
    }
    return null;
  }

  window.provaAuthHeaders = function () {
    var h = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  };

  window.provaFetchAirtable = function (bodyObj) {
    return fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: window.provaAuthHeaders(),
      body: JSON.stringify(bodyObj)
    });
  };

  window.provaFetchKiProxy = function (bodyObj) {
    return fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: window.provaAuthHeaders(),
      body: JSON.stringify(bodyObj)
    });
  };
})();
