/* ════════════════════════════════════════════════════════════
   PROVA statistiken-logic.js
   Statistiken — Daten aus SCHADENSFAELLE via airtable.js
   Felder: Aktenzeichen, Schadensart, Status, Auftraggeber_Typ,
           Fotos_Anzahl, Bearbeitungszeit_Min, Timestamp, Paket
════════════════════════════════════════════════════════════ */

var AT_BASE = 'appJ7bLlAHZoxENWE';
var AT_TABLE = 'tblSxV8bsXwd1pwa0';
var AT_KEY_FIELD = 'flds4E8CirlbIVZ3U'; // Aktenzeichen
var AT_STATUS    = 'fldC75kXC7g6KYAqB'; // Status
var AT_SCHADEN   = 'fldpICKzx0AzXKU6a'; // Schadensart
var AT_AG_TYP    = 'fldS1hbbnBsaOc5tr'; // Auftraggeber_Typ
var AT_FOTOS     = 'fld8GuceJoIVZhVYu'; // Fotos_Anzahl
var AT_ZEIT      = 'fldexEdaixneFZMtH'; // Bearbeitungszeit_Min
var AT_TS        = 'fld7czLIYt5UlspZb'; // Timestamp
var AT_PAKET     = 'fld94vyx5A3wWcY6z'; // Paket

var _allData = [];
var _filterDays = 30;

// Status-Farben
var STATUS_COLORS = {
  'In Bearbeitung': '#4f8ef7',
  'Exportiert':     '#10b981',
  'Freigegeben':    '#34d399',
  'Korrektur_angefordert': '#f59e0b',
};

function setFilter(btn, days) {
  document.querySelectorAll('.filter-chip').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  _filterDays = days === 'all' ? 99999 : parseInt(days);
  renderAll(_allData);
}

function filterByDays(records) {
  if (_filterDays >= 99999) return records;
  var cutoff = Date.now() - _filterDays * 86400000;
  return records.filter(function(r) {
    var ts = r[AT_TS];
    if (!ts) return true;
    return new Date(ts).getTime() >= cutoff;
  });
}

// ── Airtable laden ──────────────────────────────────────────
async function loadData() {
  try {
    // Via Netlify Function proxyen (wie alle anderen Seiten)
    var path = '/v0/' + AT_BASE + '/' + AT_TABLE
      + '?fields[]=' + [AT_KEY_FIELD, AT_STATUS, AT_SCHADEN, AT_AG_TYP, AT_FOTOS, AT_ZEIT, AT_TS, AT_PAKET].join('&fields[]=')
      + '&sort[0][field]=' + AT_TS + '&sort[0][direction]=desc'
      + '&maxRecords=500';

    var resp = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({method: 'GET', path: path, payload: null})
    });

    if (!resp.ok) throw new Error('Airtable Error: ' + resp.status);
    var json = await resp.json();
    if (json.error) throw new Error(json.error);
    return (json.records || []).map(function(r) { return r.fields || r; });
  } catch(e) {
    console.warn('Statistiken: Airtable nicht erreichbar, zeige Demo-Daten', e);
    return getMockData();
  }
}

// ── Mock-Daten falls keine API-Verbindung ───────────────────
function getMockData() {
  var schadensarten = ['Wasserschaden','Schimmelschaden','Brandschaden','Baumängel','Sturmschaden','Feuchteschaden'];
  var agtypen = ['Versicherung','Gericht','Privat','Behörde'];
  var stati = ['In Bearbeitung','Exportiert','Freigegeben','Korrektur_angefordert'];
  var records = [];
  for (var i = 0; i < 38; i++) {
    var d = new Date(Date.now() - Math.random() * 120 * 86400000);
    records.push({
      [AT_KEY_FIELD]: 'SCH-2026-' + String(i+1).padStart(3,'0'),
      [AT_STATUS]:    stati[Math.floor(Math.random() * stati.length)],
      [AT_SCHADEN]:   schadensarten[Math.floor(Math.random() * schadensarten.length)],
      [AT_AG_TYP]:    agtypen[Math.floor(Math.random() * agtypen.length)],
      [AT_FOTOS]:     Math.floor(Math.random() * 12),
      [AT_ZEIT]:      Math.floor(Math.random() * 90 + 10),
      [AT_TS]:        d.toISOString(),
    });
  }
  return records;
}

// ── Render KPIs ─────────────────────────────────────────────
function renderKPIs(data) {
  var gesamt = data.length;
  var done   = data.filter(function(r) { return r[AT_STATUS] === 'Exportiert' || r[AT_STATUS] === 'Freigegeben'; }).length;
  var pct    = gesamt ? Math.round(done / gesamt * 100) : 0;
  var fotos  = data.reduce(function(s, r) { return s + (parseInt(r[AT_FOTOS]) || 0); }, 0);
  var zeiten = data.map(function(r) { return parseInt(r[AT_ZEIT]) || 0; }).filter(function(z) { return z > 0; });
  var avgZ   = zeiten.length ? Math.round(zeiten.reduce(function(a,b){return a+b;},0) / zeiten.length) : 0;

  document.getElementById('kpi-gesamt').textContent = gesamt;
  document.getElementById('kpi-done').textContent   = done;
  document.getElementById('kpi-done-sub').textContent = pct + '% Abschlussquote';
  document.getElementById('kpi-zeit').textContent   = avgZ || '—';
  document.getElementById('kpi-fotos').textContent  = fotos;
}

// ── Render Monats-Chart ─────────────────────────────────────
function renderMonthChart(data) {
  var months = {};
  data.forEach(function(r) {
    var ts = r[AT_TS];
    if (!ts) return;
    var d = new Date(ts);
    var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    months[key] = (months[key] || 0) + 1;
  });

  var keys = Object.keys(months).sort().slice(-8);
  if (!keys.length) { document.getElementById('month-chart-wrap').innerHTML = '<div class="stat-loading">Keine Daten</div>'; return; }

  var max = Math.max.apply(null, keys.map(function(k){ return months[k]; }));
  var html = '<div class="month-chart">';
  keys.forEach(function(k) {
    var v = months[k];
    var h = max ? Math.max(8, Math.round(v / max * 72)) : 8;
    var parts = k.split('-');
    var label = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][parseInt(parts[1])-1];
    html += '<div class="mc-bar-wrap">'
      + '<div class="mc-val">' + v + '</div>'
      + '<div class="mc-bar" style="height:' + h + 'px" title="' + k + ': ' + v + ' Gutachten"></div>'
      + '<div class="mc-label">' + label + '</div>'
      + '</div>';
  });
  html += '</div>';
  document.getElementById('month-chart-wrap').innerHTML = html;
}

// ── Render Bar Chart (generisch) ────────────────────────────
function renderBarChart(containerId, data, field, colorMap) {
  var counts = {};
  data.forEach(function(r) {
    var v = r[field] || 'Unbekannt';
    counts[v] = (counts[v] || 0) + 1;
  });
  var sorted = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; }).slice(0,6);
  var max = sorted.length ? counts[sorted[0]] : 1;
  var total = data.length;

  var html = '';
  var hues = ['#4f8ef7','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
  sorted.forEach(function(k, i) {
    var pct = Math.round(counts[k] / max * 100);
    var color = (colorMap && colorMap[k]) || hues[i % hues.length];
    html += '<div class="bar-row">'
      + '<div class="bar-label" title="' + k + '">' + k + '</div>'
      + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>'
      + '<div class="bar-count">' + counts[k] + '</div>'
      + '</div>';
  });
  document.getElementById(containerId).innerHTML = html || '<div class="stat-loading">Keine Daten</div>';
}

// ── Render Status ───────────────────────────────────────────
function renderStatus(data) {
  var counts = {};
  data.forEach(function(r) { var v = r[AT_STATUS] || 'Unbekannt'; counts[v] = (counts[v] || 0) + 1; });
  var html = '';
  Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];}).forEach(function(k) {
    var color = STATUS_COLORS[k] || 'var(--text3)';
    html += '<div class="status-row">'
      + '<div class="status-dot" style="background:' + color + '"></div>'
      + '<div class="status-name">' + k.replace('_',' ') + '</div>'
      + '<div class="status-count">' + counts[k] + '</div>'
      + '</div>';
  });
  document.getElementById('status-chart').innerHTML = html || '<div class="stat-loading">Keine Daten</div>';
}

// ── Render All ──────────────────────────────────────────────
function renderAll(allRecords) {
  var data = filterByDays(allRecords);
  renderKPIs(data);
  renderMonthChart(data);
  renderBarChart('schadenart-chart', data, AT_SCHADEN);
  renderStatus(data);
  renderBarChart('auftraggeber-chart', data, AT_AG_TYP);
}

// ── Init ────────────────────────────────────────────────────
(function() {
  loadData().then(function(records) {
    _allData = records;
    renderAll(records);
  }).catch(function(e) {
    console.error('Statistiken Ladefehler:', e);
    _allData = getMockData();
    renderAll(_allData);
  });
})();

// ── Jahresbericht PDF Export (PDFMonkey F-01) ─────────────────
window.exportJahresberichtPDF = async function(){
  var btn = document.getElementById('btn-jahresbericht-pdf');
  var prevTxt = btn ? btn.textContent : '';
  function setBusy(on){
    if(!btn) return;
    btn.disabled = !!on;
    btn.textContent = on ? '⏳ PDF wird erstellt…' : (prevTxt || '📄 Als PDF exportieren');
  }
  try {
    var year = new Date().getFullYear();
    var data = Array.isArray(_allData) ? _allData : [];
    // Nur aktuelles Jahr (Timestamp Feld)
    var yr = data.filter(function(r){
      var ts = r[AT_TS];
      if(!ts) return false;
      try { return (new Date(ts)).getFullYear() === year; } catch(e) { return false; }
    });
    if(!yr.length) { alert('Keine Daten im aktuellen Jahr.'); return; }

    setBusy(true);

    // Umsatz: aus RECHNUNGEN dieses Jahres summieren (brutto)
    var umsatz = 0;
    try {
      var svEmail = localStorage.getItem('prova_sv_email') || '';
      var fromIso = year + '-01-01';
      var toIso   = year + '-12-31';
      var filt = 'AND({sv_email}="' + svEmail + '",IS_AFTER({Rechnungsdatum},"' + fromIso + '"),IS_BEFORE({Rechnungsdatum},"' + toIso + '"))';
      var pathR = '/v0/appJ7bLlAHZoxENWE/tblF6MS7uiFAJDjiT?fields[]=brutto_betrag_eur&fields[]=Rechnungsdatum&fields[]=sv_email'
        + '&filterByFormula=' + encodeURIComponent(filt) + '&maxRecords=500';
      var rResp = await fetch('/.netlify/functions/airtable', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({method:'GET', path: pathR}) });
      if (rResp.ok) {
        var rJson = await rResp.json();
        (rJson.records||[]).forEach(function(rec){
          var f = rec.fields||{};
          umsatz += parseFloat(f.brutto_betrag_eur||0) || 0;
        });
      }
    } catch(e) {}

    // Schadensarten-Verteilung
    var dist = {};
    yr.forEach(function(r){
      var sa = r[AT_SCHADEN] || 'Unbekannt';
      dist[sa] = (dist[sa]||0) + 1;
    });
    var distArr = Object.keys(dist).sort(function(a,b){return dist[b]-dist[a];}).map(function(k){ return {label:k,count:dist[k]}; });

    var resp = await fetch('/.netlify/functions/jahresbericht-pdf', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        year: year,
        gutachten_anzahl: yr.length,
        umsatz_eur: Math.round(umsatz * 100) / 100,
        schadensarten: distArr
      })
    });
    var out = await resp.json().catch(function(){ return {}; });
    if(!resp.ok){ alert('PDF Fehler: HTTP '+resp.status); return; }
    if(out && out.pdf_url){ window.open(out.pdf_url, '_blank', 'noopener'); }
    else { alert('PDF wird generiert. Bitte später erneut versuchen.'); }
  } catch(e) {
    alert('Export fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'));
  } finally {
    setBusy(false);
  }
};
