/**
 * PROVA — Nach SMTP-Versand: Toast + Signal für Kommunikation (akte.html)
 * Voraussetzung: netlify-identity-widget, prova-auth-api.js, smtp-senden.js
 */
(function () {
  function toast(msg, ok) {
    var el = document.getElementById('provaToastBrief');
    if (!el) {
      el = document.createElement('div');
      el.id = 'provaToastBrief';
      el.setAttribute(
        'style',
        'position:fixed;bottom:24px;right:24px;padding:12px 18px;border-radius:10px;font:600 14px system-ui,sans-serif;z-index:99999;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.25);max-width:90vw;'
      );
      document.body.appendChild(el);
    }
    el.style.background = ok ? '#047857' : '#b91c1c';
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(function () {
      el.style.display = 'none';
    }, 3800);
  }

  /**
   * @param {object} opts az, to|empfaenger_email, empfaenger (Anzeigename), betreff|subject, typ, html_body|html, text_body|text|body
   */
  window.provaBriefvorlageNachSmtp = async function (opts) {
    opts = opts || {};
    if (!window.provaSmtpSenden) {
      toast('Versand-Modul fehlt (smtp-senden.js).', false);
      return { ok: false, error: 'no provaSmtpSenden' };
    }
    var az = String(opts.az || '').trim();
    try {
      if (!az) az = (localStorage.getItem('prova_letztes_az') || '').trim();
    } catch (e) {}
    var empfaenger = String(opts.empfaenger || opts.empfaenger_name || '').trim().slice(0, 500);
    var to = String(opts.to || opts.empfaenger_email || '').trim();
    var betreff = String(opts.betreff || opts.subject || '').trim();
    var typ = String(opts.typ || 'Sonstiges').trim();
    var html = String(opts.html_body || opts.html || '');
    var text = String(opts.text_body || opts.text || opts.body || '');
    if (!to) {
      toast('E-Mail-Adresse fehlt.', false);
      return { ok: false, error: 'no to' };
    }
    if (!betreff) {
      toast('Betreff fehlt.', false);
      return { ok: false, error: 'no betreff' };
    }
    if (!html) {
      html =
        '<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:14px">' +
        text.replace(/&/g, '&amp;').replace(/</g, '&lt;') +
        '</pre>';
    }
    var r = await provaSmtpSenden({
      az: az,
      empfaenger: empfaenger || to.split('@')[0] || 'Empfänger',
      to: to,
      betreff: betreff,
      typ: typ,
      html_body: html,
      text_body: text || undefined
    });
    if (r.ok) {
      toast('Brief gesendet ✅', true);
      try {
        localStorage.setItem('prova_kommunikation_refresh', String(Date.now()));
      } catch (e) {}
      try {
        window.dispatchEvent(new CustomEvent('prova-kommunikation-refresh'));
      } catch (e2) {}
    } else {
      var errMsg = (r.data && (r.data.error || r.data.message)) || r.error || 'Versand fehlgeschlagen';
      toast(String(errMsg), false);
    }
    return r;
  };
})();
