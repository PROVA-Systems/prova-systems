/**
 * PROVA — E-Mail-Client öffnen (mailto) mit Betreff und Textkörper
 */
(function () {
  window.provaBriefSenden = function (opts) {
    opts = opts || {};
    var to = String(opts.to || '').trim();
    var subject = encodeURIComponent(opts.subject || 'PROVA — Schreiben');
    var body = encodeURIComponent(opts.body || '');
    var href = to ? 'mailto:' + encodeURIComponent(to) + '?' : 'mailto:?';
    href += 'subject=' + subject + '&body=' + body;
    window.location.href = href;
  };
})();
