/* PROVA dashboard realtime KPIs from Airtable */
(function () {
  function qs(id) { return document.getElementById(id); }
  function euro(n) { return (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR'; }
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function svMail() {
    try { return (window.PROVA_AIRTABLE && PROVA_AIRTABLE.getSvEmail && PROVA_AIRTABLE.getSvEmail()) || (localStorage.getItem('prova_sv_email') || '').trim().toLowerCase(); } catch (e) { return ''; }
  }
  function showKpi(id, value) { var el = qs(id); if (el) { var v = el.querySelector('.kpi-value'); if (v) v.textContent = value; } }
  function trialStatus() {
    var endRaw = localStorage.getItem('prova_trial_end');
    var status = (localStorage.getItem('prova_status') || localStorage.getItem('prova_account_status') || '').toLowerCase();
    if (!endRaw || status !== 'trial') {
      var card = qs('kpi-kontingent');
      if (card) card.style.display = 'none';
      return;
    }
    var ms = Number(endRaw) || Date.parse(endRaw);
    if (!ms) return;
    var days = Math.max(0, Math.ceil((ms - Date.now()) / 86400000));
    var card2 = qs('kpi-kontingent');
    if (card2) {
      card2.style.display = '';
      var lbl = card2.querySelector('.kpi-label');
      if (lbl) lbl.textContent = 'Trial-Tage';
    }
    showKpi('kpi-kontingent', String(days));
  }
  async function loadStarter() {
    if (!window.PROVA_AIRTABLE || !PROVA_AIRTABLE.fetchJson) return;
    var email = svMail();
    if (!email) return;
    var f = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
    var offF = 'AND({sv_email}="' + f(email) + '",{Status}="Offen")';
    var today = new Date().toISOString().slice(0, 10);
    try {
      var openPath = '/v0/' + PROVA_AIRTABLE.BASE + '/' + PROVA_AIRTABLE.TABLE_FAELLE + '?maxRecords=100&filterByFormula=' + encodeURIComponent(offF);
      var openRes = await PROVA_AIRTABLE.fetchJson('GET', openPath);
      var openRows = openRes.records || [];
      showKpi('kpi-offene-gutachten', String(openRows.length));

      var invPath = '/v0/' + PROVA_AIRTABLE.BASE + '/' + PROVA_AIRTABLE.TABLE_RECHNUNGEN + '?maxRecords=100&filterByFormula=' + encodeURIComponent(offF);
      var invRes = await PROVA_AIRTABLE.fetchJson('GET', invPath);
      var inv = invRes.records || [];
      var sum = inv.reduce(function (a, r) {
        var fi = r.fields || {};
        return a + (Number(fi.Brutto || fi.betrag_brutto || fi.Betrag || fi.netto || 0) || 0);
      }, 0);
      showKpi('kpi-offene-rechnungen', euro(sum));

      var termF = 'AND({sv_email}="' + f(email) + '",IS_AFTER({Datum},"' + today + '"))';
      var termPath = '/v0/' + PROVA_AIRTABLE.BASE + '/' + PROVA_AIRTABLE.TABLE_TERMINE + '?maxRecords=1&sort[0][field]=Datum&sort[0][direction]=asc&filterByFormula=' + encodeURIComponent(termF);
      var termRes = await PROVA_AIRTABLE.fetchJson('GET', termPath);
      var t = ((termRes.records || [])[0] || {}).fields || {};
      var txt = t.Datum ? (t.Datum + (t.Uhrzeit ? ' ' + t.Uhrzeit : '') + (t.Ort ? ' - ' + t.Ort : '')) : 'Keine';
      showKpi('kpi-heute-faellig', txt);

      var rows = document.querySelectorAll('#layout-starter .list .list-row');
      for (var i = 0; i < rows.length && i < openRows.length; i++) {
        var rf = openRows[i].fields || {};
        var az = rf.AZ || rf.Aktenzeichen || '';
        rows[i].innerHTML = '<div><strong>' + esc(rf.Schadensart || 'Fall') + '</strong><div class="subtle">' + esc(rf.Auftraggeber_Name || rf.Auftraggeber || '—') + '</div></div><a class="mono" href="akte.html?az=' + encodeURIComponent(az) + '">' + esc(az || 'Öffnen') + '</a>';
      }
    } catch (e) {}
  }
  function quickButtonsFix() {
    var map = {
      'Schnellrechnung': 'schnelle-rechnung.html',
      'Gerichtsauftrag': 'gericht-auftrag.html',
      'Ortstermin': 'ortstermin-modus.html',
      'Neuer Fall': 'app.html'
    };
    var links = document.querySelectorAll('a');
    links.forEach(function (a) {
      var t = (a.textContent || '').trim();
      Object.keys(map).forEach(function (k) {
        if (t.indexOf(k) >= 0) a.href = map[k];
      });
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    trialStatus();
    quickButtonsFix();
    loadStarter();
  });
})();
