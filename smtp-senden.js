/**
 * PROVA � SMTP �ber /.netlify/functions/smtp-senden (JWT)
 * Protokollierung (BRIEFE / Make K3) erfolgt nur serverseitig � kein Klienten-Doppel-Log.
 */
(function () {
  window.provaSmtpSenden = async function (payload) {
    payload = payload || {};
    var result = { ok: false };
    try {
      var res = await fetch('/.netlify/functions/smtp-senden', {
        method: 'POST',
        headers: window.provaAuthHeaders ? window.provaAuthHeaders() : { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var ok = !!res.ok;
      var data = await res.json().catch(function () {
        return {};
      });
      result = { ok: ok, status: res.status, data: data };
    } catch (e) {
      result = { ok: false, error: String(e && e.message ? e.message : e) };
    }
    return result;
  };
})();
