/* ══════════════════════════════════════════════════════════
   PROVA auth-guard.js — v1.1
   Muss SYNCHRON (kein defer) früh im <head> geladen werden.
   
   Prüft nur localStorage — der Identity-Check via
   netlifyIdentity.currentUser() wurde entfernt, da er
   bestehende localStorage-Sessions fälschlich invalidiert.
   Echte Sicherheit liegt in den Netlify Functions (server-side).
   ══════════════════════════════════════════════════════════ */
window.provaAuthGuard = function(opts) {
  opts = opts || {};
  var redirectTo = opts.redirectTo || 'app-login.html';

  if (!localStorage.getItem('prova_user')) {
    window.location.replace(redirectTo);
    return false;
  }
  return true;
};
