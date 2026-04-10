/* PROVA Frist Guard (3/7/heute) */
(function () {
  function mail() {
    try { return (window.PROVA_AIRTABLE && PROVA_AIRTABLE.getSvEmail && PROVA_AIRTABLE.getSvEmail()) || (localStorage.getItem('prova_sv_email') || '').trim().toLowerCase(); } catch (e) { return ''; }
  }
  function esc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
  function daysTo(d) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var x = new Date(String(d) + 'T00:00:00');
    return Math.round((x - t) / 86400000);
  }
  function toast(msg) {
    try {
      if (window.showToast) return window.showToast(msg, 'default', 4500);
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#111827;color:#fff;padding:10px 14px;border-radius:9px;z-index:99999';
      el.textContent = msg; document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 4500);
    } catch (e) {}
  }
  async function run() {
    if (!window.PROVA_AIRTABLE || !PROVA_AIRTABLE.fetchJson) return;
    var m = mail();
    if (!m) return;
    try {
      var p = '/v0/' + PROVA_AIRTABLE.BASE + '/' + PROVA_AIRTABLE.TABLE_TERMINE + '?maxRecords=100&filterByFormula=' + encodeURIComponent('{sv_email}="' + esc(m) + '"');
      var r = await PROVA_AIRTABLE.fetchJson('GET', p);
      var rows = (r.records || []).map(function (x) { return x.fields || {}; });
      var d3 = [], d7 = [], d0 = [];
      rows.forEach(function (f) {
        var dd = daysTo(f.Datum);
        if (dd < 0) return;
        var title = f.Titel || f.Typ || 'Termin';
        if (dd <= 3) d3.push(title);
        if (dd <= 7) d7.push(title);
        if (dd === 0) d0.push(title);
      });
      if (d0.length) toast('Heute faellig: ' + d0[0] + (d0.length > 1 ? ' +' + (d0.length - 1) : ''));
      if (d3.length && window.provaPushNotify) window.provaPushNotify('Frist in <=3 Tagen', d3[0]);
      if (d7.length) {
        var host = document.getElementById('provaFristBannerHost') || document.body;
        var b = document.createElement('div');
        b.style.cssText = 'margin:10px 0;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#fde68a';
        b.textContent = 'Fristen <=7 Tage: ' + d7.length;
        host.prepend(b);
      }
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', run);
})();
