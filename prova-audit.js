/**
 * PROVA Audit helper.
 * Client-side convenience wrapper for /.netlify/functions/audit-log.
 */
(function () {
  function readEmail() {
    try {
      return (
        (localStorage.getItem('prova_sv_email') || '').trim() ||
        ((JSON.parse(localStorage.getItem('prova_user') || '{}').email || '').trim())
      );
    } catch (e) {
      return '';
    }
  }

  window.provaAuditLog = async function (payload) {
    payload = payload || {};
    var body = {
      typ: String(payload.typ || payload.type || 'Event'),
      email: String(payload.email || readEmail() || 'unbekannt'),
      az: String(payload.az || ''),
      details: payload.details && typeof payload.details === 'object' ? payload.details : {},
      timestamp: new Date().toISOString()
    };
    try {
      await fetch('/.netlify/functions/audit-log', {
        method: 'POST',
        headers: window.provaAuthHeaders ? window.provaAuthHeaders() : { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return true;
    } catch (e2) {
      return false;
    }
  };
})();
