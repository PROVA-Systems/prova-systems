/* ══════════════════════════════════════════════════════════
   PROVA auth-guard.js — v1.0
   Muss SYNCHRON (kein defer) früh im <head> geladen werden.
   Definiert provaAuthGuard() bevor inline Scripts es rufen.
   ══════════════════════════════════════════════════════════ */
window.provaAuthGuard = function(opts) {
  opts = opts || {};
  var redirectTo = opts.redirectTo || 'app-login.html';

  // 1) Schnell-Check: localStorage-Marker gesetzt?
  if (!localStorage.getItem('prova_user')) {
    window.location.replace(redirectTo);
    return false;
  }

  // 2) Netlify Identity Gegenkontrolle — sobald SDK verfügbar
  function checkIdentity() {
    try {
      if (window.netlifyIdentity) {
        var niUser = window.netlifyIdentity.currentUser();
        if (!niUser) {
          localStorage.removeItem('prova_user');
          window.location.replace(redirectTo);
          return false;
        }
      }
    } catch(e) { /* SDK nicht geladen → silent pass */ }
    return true;
  }

  if (window.netlifyIdentity) {
    return checkIdentity();
  }

  // SDK noch nicht geladen → nach DOMContentLoaded pollen (max 2s)
  var _guardOpts = { redirectTo: redirectTo };
  document.addEventListener('DOMContentLoaded', function() {
    var waited = 0;
    var poll = setInterval(function() {
      waited += 200;
      if (window.netlifyIdentity) { clearInterval(poll); checkIdentity(); return; }
      if (waited >= 2000) clearInterval(poll);
    }, 200);
  });

  return true;
};
