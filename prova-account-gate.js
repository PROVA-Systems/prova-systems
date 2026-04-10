/**
 * PROVA — Trial abgelaufen: nur Whitelist-Seiten (Archiv, Login, Legal, …)
 * Einbinden direkt nach <body> auf geschützten App-Seiten.
 */
(function () {
  function normPath() {
    return (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
  }

  function pathOk() {
    var p = normPath();
    var file = p.split('/').pop() || '';
    if (p === '/' || p.endsWith('/')) return true;
    if (file === 'index.html') return true;
    if (p.indexOf('archiv') >= 0) return true;
    if (p.indexOf('archiv-logic.js') >= 0) return true;
    if (p.indexOf('app-login') >= 0) return true;
    if (p.indexOf('app-register') >= 0) return true;
    if (p.indexOf('account-gesperrt') >= 0) return true;
    if (p.indexOf('mahnung') >= 0) return true;
    if (p.indexOf('einstellungen') >= 0) return true;
    if (p.indexOf('/legal/') >= 0) return true;
    return false;
  }

  function localGuestTrialExpired() {
    var ts = localStorage.getItem('prova_trial_start');
    if (!ts) return false;
    var user = null;
    try {
      user = JSON.parse(localStorage.getItem('prova_user') || 'null');
    } catch (e) {}
    if (user && user.email) return false;
    var days = (Date.now() - parseInt(ts, 10)) / 86400000;
    return days > 14;
  }

  var status = localStorage.getItem('prova_account_status') || '';
  var air = (localStorage.getItem('prova_airtable_status') || '').trim() || '';
  if (air === 'Gekündigt') {
    localStorage.setItem('prova_account_status', 'read_only');
    status = 'read_only';
  }

  if (status !== 'expired' && status !== 'read_only' && localGuestTrialExpired()) {
    localStorage.setItem('prova_account_status', 'expired');
    status = 'expired';
  }

  if (status !== 'expired' && status !== 'read_only') return;
  if (pathOk()) return;
  window.location.replace('account-gesperrt.html');
})();
