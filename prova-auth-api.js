/**
 * PROVA — Authorization-Header für Netlify Functions (Identity JWT)
 * Unterstützt: netlifyIdentity Widget + direkter API-Login (localStorage)
 */
(function () {
  function getToken() {
    // 1. Direkt-Login Token aus localStorage (app-login.html direkte API)
    try {
      var stored = localStorage.getItem('netlify-identity-token');
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && parsed.access_token) return parsed.access_token;
      }
    } catch(e) {}
    // 2. Netlify Identity Widget (Fallback)
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

// Session-Helper für direkten Login
window.provaCreateSession = function(user) {
  if (!user || !user.email) return;
  localStorage.setItem('prova_sv_email', user.email);
  localStorage.setItem('prova_user', JSON.stringify(user));
};
