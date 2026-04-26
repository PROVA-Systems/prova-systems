/* ════════════════════════════════════════════════════════════
   PROVA jahresbericht-logic.js
   Jahresbericht — KI-Analyse, Statistiken
   Extrahiert aus jahresbericht.html

   P5.B4 (Sprint 04): Defensive Null-Guards.
   Vorher: getElementById('id').innerHTML = ... warf TypeError, wenn die
   HTML-Datei den entsprechenden Container nicht enthielt (Status-Chart,
   Zeit-Card, Faelle-Tabelle existieren in der aktuellen jahresbericht.html
   nicht — geplant fuer Sprint 13). Jetzt: jede Render-Funktion checkt
   Container-Existenz und ueberspringt sich bei null.
════════════════════════════════════════════════════════════ */

function _jb$(id) { return document.getElementById(id); }

function toggleDrawer(){var d=document.getElementById('drawer'),o=document.getElementById('drawerOverlay');d.classList.toggle('open');o.classList.toggle('open');document.body.style.overflow=d.classList.contains('open')?'hidden':'';}
function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('drawerOverlay').classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDrawer();});
function logout(){localStorage.removeItem('prova_user');window.location.href='app-login.html';}
(function(){
  var u=localStorage.getItem('prova_user');if(!u){window.location.href='app-login.html';return;}
  var p=localStorage.getItem('prova_paket')||'Solo';
  var c={Starter:'#4f8ef7',Pro:'#f59e0b',Enterprise:'#a78bfa'}[p]||'#4f8ef7';
  var s='background:'+c+'18;color:'+c+';border:1px solid '+c+'33';
  ['topbarPaket','drawerPaket'].forEach(function(id){var el=document.getElementById(id);if(el){el.textContent=p;el.setAttribute('style',s);}});
  window.PROVA=window.PROVA||{};PROVA.paket=p;PROVA.isEnterprise=p==='Enterprise';
})();

/* ─────────────────────────────────────────── */

const AIRTABLE_BASE  = 'appJ7bLlAHZoxENWE';
const AIRTABLE_TABLE = 'tblSxV8bsXwd1pwa0';

var _alleRecords = [];
var _aktivesJahr = new Date().getFullYear();
var _gefilterteRecords = [];

// ── Farben pro Status ──
var STATUS_FARBEN = {
  'Freigegeben':        {bg:'rgba(16,185,129,.15)',color:'#6ee7b7'},
  'Korrektur_angefordert':{bg:'rgba(245,158,11,.1)',color:'#fcd34d'},
  'Entwurf':            {bg:'rgba(79,142,247,.1)',color:'#93C5FD'},
  'Exportiert':         {bg:'rgba(167,139,250,.1)',color:'#c4b5fd'},
  'Archiviert':         {bg:'rgba(255,255,255,.06)',color:'#9da3b4'},
};
var ART_FARBEN = ['#4f8ef7','#10B981','#f59e0b','#a78bfa','#ef4444','#06b6d4','#f97316','#84cc16'];

// ── Daten laden ──
async function ladeDaten() {
  try {
    // P5.B4b: Airtable-Limit pageSize=100, vorher 200 -> 422 Unprocessable
    // Entity. Mit pageSize=100 + maxRecords=200 + offset-Follow-up bleibt
    // das Limit gleich (zwei Seiten a 100), nur der Request ist jetzt valid.
    var svEmail = localStorage.getItem('prova_sv_email') || '';
    var filterF = svEmail ? '&filterByFormula=' + encodeURIComponent('{sv_email}="' + svEmail + '"') : '';
    var url = '/v0/' + AIRTABLE_BASE + '/' + AIRTABLE_TABLE
      + '?pageSize=100&maxRecords=200&sort[0][field]=Timestamp&sort[0][direction]=desc' + filterF;
    var res = await provaFetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({method:'GET', path: url})
    });
    if (!res.ok) {
      // Server-Body bei 4xx/5xx auslesen fuer besseres Logging — zeigt
      // die echte Airtable-Fehlermeldung statt nur "HTTP 422".
      var errBody = '';
      try { errBody = await res.text(); } catch(_) {}
      console.warn('[jahresbericht] airtable-error', res.status, errBody.slice(0, 300));
      throw new Error('HTTP ' + res.status);
    }
    var data = await res.json();
    _alleRecords = (data.records || []).map(function(r){ return r.fields || {}; });

    // Seite 2 wenn vorhanden (max 200 Records gesamt)
    if (data.offset) {
      var url2 = url + '&offset=' + encodeURIComponent(data.offset);
      var res2 = await provaFetch('/.netlify/functions/airtable', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({method:'GET', path: url2})
      });
      if (res2.ok) {
        var data2 = await res2.json();
        _alleRecords = _alleRecords.concat((data2.records||[]).map(function(r){return r.fields||{};}));
      }
    }

    // Jahre ermitteln und Buttons bauen
    var jahre = ermittleJahre(_alleRecords);
    bautJahrButtons(jahre);
    renderBericht(_aktivesJahr);

    var ls = _jb$('loading-state'); if (ls) ls.style.display = 'none';
    var rc = _jb$('report-content'); if (rc) rc.style.display = 'block';

  } catch(e) {
    // P5.B4b: User-facing Message ohne technischen HTTP-Code. Details nur
    // in console (siehe oben) fuer's Debug.
    console.warn('[jahresbericht] load-error:', e && e.message);
    var ls = _jb$('loading-state');
    if (ls) ls.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);">'
      + '<div style="font-size:24px;margin-bottom:8px;">📊</div>'
      + '<div style="font-size:13px;margin-bottom:14px;">Daten konnten nicht geladen werden.</div>'
      + '<button onclick="location.reload()" style="padding:8px 18px;background:var(--accent,#4f8ef7);border:none;border-radius:8px;color:#fff;font-size:12px;cursor:pointer;font-family:inherit;">Erneut versuchen</button>'
      + '</div>';
  }
}

function ermittleJahre(records) {
  var jahre = {};
  records.forEach(function(r) {
    if (r.Timestamp) {
      var j = new Date(r.Timestamp).getFullYear();
      jahre[j] = (jahre[j]||0) + 1;
    }
  });
  return Object.keys(jahre).map(Number).sort(function(a,b){return b-a;});
}

function bautJahrButtons(jahre) {
  var bar = _jb$('year-bar'); if (!bar) return;
  // Aktuelles Jahr immer dabei
  var aktuellesJahr = new Date().getFullYear();
  if (!jahre.includes(aktuellesJahr)) jahre.unshift(aktuellesJahr);
  jahre.forEach(function(j) {
    var btn = document.createElement('button');
    btn.className = 'year-btn' + (j === _aktivesJahr ? ' active' : '');
    btn.textContent = j;
    btn.onclick = function() {
      _aktivesJahr = j;
      document.querySelectorAll('.year-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      renderBericht(j);
    };
    bar.appendChild(btn);
  });
}

// ── Hauptrender ──
function renderBericht(jahr) {
  _gefilterteRecords = _alleRecords.filter(function(r) {
    return r.Timestamp && new Date(r.Timestamp).getFullYear() === jahr;
  });

  var sub = _jb$('bericht-subtitle');
  if (sub) sub.textContent = 'Sachverständigenbüro · Statistik ' + jahr + ' · ' + _gefilterteRecords.length + ' Fälle';

  renderKPIs(_gefilterteRecords, jahr);
  renderMonatChart(_gefilterteRecords);
  renderArtChart(_gefilterteRecords);
  renderStatusChart(_gefilterteRecords);
  renderZeitCard(_gefilterteRecords);
  renderTabelle(_gefilterteRecords);
}

// ── KPIs ──
function renderKPIs(records, jahr) {
  var gesamt = records.length;
  var freigegeben = records.filter(function(r){return r.Status==='Freigegeben'||r.Status==='Exportiert';}).length;
  var freigaberate = gesamt > 0 ? Math.round(freigegeben/gesamt*100) : 0;

  // Bearbeitungszeit
  var mitZeit = records.filter(function(r){return r.Bearbeitungszeit_Min > 0;});
  var avgMin = mitZeit.length > 0
    ? Math.round(mitZeit.reduce(function(s,r){return s+(r.Bearbeitungszeit_Min||0);},0) / mitZeit.length)
    : 0;

  // Vorjahr-Vergleich
  var vorjahr = _alleRecords.filter(function(r){
    return r.Timestamp && new Date(r.Timestamp).getFullYear() === (jahr-1);
  }).length;
  var delta = vorjahr > 0 ? Math.round((gesamt-vorjahr)/vorjahr*100) : null;

  // Pro Monat
  var proMonat = gesamt > 0 ? (gesamt/12).toFixed(1) : '0';

  // Schadensarten-Diversität
  var arten = {};
  records.forEach(function(r){var art=r.Schadensart||r.Schadensart||r.schadenart||'';if(art)arten[art]=(arten[art]||0)+1;});
  var topArt = Object.keys(arten).sort(function(a,b){return arten[b]-arten[a];})[0] || '—';

  var kpis = [
    {label:'Fälle gesamt', val: gesamt, sub: delta !== null ? 'Vorjahr: ' + vorjahr : 'Erstes Jahr',
     delta: delta, valFmt: String(gesamt)},
    {label:'Freigegeben', val: freigegeben, sub: freigaberate + '% Freigaberate', valFmt: String(freigegeben)},
    {label:'∅ / Monat', val: proMonat, sub: 'Durchschnitt ' + jahr, valFmt: proMonat},
    {label:'∅ Bearbeitung', val: avgMin, sub: mitZeit.length + ' auswertbare Fälle',
     valFmt: avgMin > 0 ? avgMin + ' Min' : '—'},
    {label:'Top Schadensart', val: topArt, sub: arten[topArt] ? arten[topArt] + ' Fälle' : '—',
     valFmt: topArt.length > 10 ? topArt.slice(0,10)+'…' : topArt},
    {label:'Schadensarten', val: Object.keys(arten).length, sub: 'verschiedene Typen',
     valFmt: String(Object.keys(arten).length)},
  ];

  var grid = _jb$('kpi-grid'); if (!grid) return;
  grid.innerHTML = '';
  kpis.forEach(function(k) {
    var div = document.createElement('div');
    div.className = 'kpi-card';
    var deltaHtml = '';
    if (k.delta !== null && k.delta !== undefined) {
      var cls = k.delta >= 0 ? 'pos' : 'neg';
      var pfeil = k.delta >= 0 ? '▲' : '▼';
      deltaHtml = '<div class="kpi-delta '+cls+'">'+pfeil+' '+Math.abs(k.delta)+'% ggü. Vorjahr</div>';
    }
    div.innerHTML =
      '<div class="kpi-label">'+k.label+'</div>' +
      '<div class="kpi-val">'+escHtml(k.valFmt)+'</div>' +
      '<div class="kpi-sub">'+k.sub+'</div>' +
      deltaHtml;
    grid.appendChild(div);
  });
}

// ── Monat-Chart ──
function renderMonatChart(records) {
  var monate = new Array(12).fill(0);
  records.forEach(function(r){
    if (r.Timestamp) monate[new Date(r.Timestamp).getMonth()]++;
  });
  var max = Math.max.apply(null, monate) || 1;
  var monatNamen = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  var chart = _jb$('monat-chart');
  var labels = _jb$('monat-labels');
  if (!chart) return;
  chart.innerHTML = '';
  if (labels) labels.innerHTML = '';

  monate.forEach(function(n, i) {
    var col = document.createElement('div');
    col.className = 'monat-col';
    var h = Math.round((n/max)*90);
    col.innerHTML =
      '<div style="font-size:9px;color:var(--text3);min-height:14px;">'+( n > 0 ? n : '' )+'</div>' +
      '<div class="monat-bar" style="height:'+h+'px;' + (n===0?'background:rgba(255,255,255,.05);':'') + '" title="'+monatNamen[i]+': '+n+'"></div>' +
      '<div class="monat-label">'+monatNamen[i]+'</div>';
    chart.appendChild(col);
  });
}

// ── Schadensart-Chart ──
function renderArtChart(records) {
  var arten = {};
  records.forEach(function(r){if(r.Schadensart)arten[r.Schadensart]=(arten[r.Schadensart]||0)+1;});
  var sorted = Object.keys(arten).sort(function(a,b){return arten[b]-arten[a];}).slice(0,8);
  var max = sorted.length > 0 ? arten[sorted[0]] : 1;

  var chart = _jb$('art-chart'); if (!chart) return;
  chart.innerHTML = '';
  if (!sorted.length) { chart.innerHTML = '<div style="color:var(--text3);font-size:12px;">Keine Daten</div>'; return; }

  sorted.forEach(function(art, i) {
    var n = arten[art];
    var pct = Math.round(n/max*100);
    var row = document.createElement('div');
    row.className = 'bar-row';
    var label = art.length > 12 ? art.slice(0,12)+'…' : art;
    row.innerHTML =
      '<div class="bar-label" title="'+escHtml(art)+'">'+escHtml(label)+'</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+ART_FARBEN[i%ART_FARBEN.length]+';">'+n+'</div></div>' +
      '<div class="bar-val">'+n+'</div>';
    chart.appendChild(row);
  });
}

// ── Status-Chart ──
function renderStatusChart(records) {
  var stati = {};
  records.forEach(function(r){var s=r.Status||'Unbekannt';stati[s]=(stati[s]||0)+1;});
  var sorted = Object.keys(stati).sort(function(a,b){return stati[b]-stati[a];});
  var max = sorted.length > 0 ? stati[sorted[0]] : 1;

  var chart = _jb$('status-chart'); if (!chart) return;
  chart.innerHTML = '';
  sorted.forEach(function(s) {
    var n = stati[s];
    var pct = Math.round(n/max*100);
    var m = STATUS_FARBEN[s] || {bg:'rgba(255,255,255,.06)',color:'#9da3b4'};
    var row = document.createElement('div');
    row.className = 'bar-row';
    var label = s.length > 14 ? s.slice(0,14)+'…' : s;
    row.innerHTML =
      '<div class="bar-label" title="'+escHtml(s)+'">'+escHtml(label)+'</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+m.color.replace(')',',0.8)').replace('rgb','rgba')+';">'+n+'</div></div>' +
      '<div class="bar-val">'+n+'</div>';
    chart.appendChild(row);
  });
}

// ── Bearbeitungszeit-Card ──
function renderZeitCard(records) {
  var body = _jb$('zeit-card-body'); if (!body) return;
  var mitZeit = records.filter(function(r){return r.Bearbeitungszeit_Min > 0;});
  if (!mitZeit.length) {
    body.innerHTML = '<div style="color:var(--text3);font-size:12px;">Noch keine Bearbeitungszeiten erfasst.<br><span style="font-size:11px;">Werden automatisch aus App-Zeitstempeln berechnet.</span></div>';
    return;
  }
  var mins = mitZeit.map(function(r){return r.Bearbeitungszeit_Min;}).sort(function(a,b){return a-b;});
  var sum = mins.reduce(function(s,v){return s+v;},0);
  var avg = Math.round(sum/mins.length);
  var median = mins[Math.floor(mins.length/2)];
  var min = mins[0];
  var max = mins[mins.length-1];

  var rows = [
    ['Durchschnitt', formatMin(avg)],
    ['Median', formatMin(median)],
    ['Schnellster', formatMin(min)],
    ['Längster', formatMin(max)],
    ['Auswertbare Fälle', mitZeit.length + ' von ' + records.length],
    ['Gesamt (alle Fälle)', formatMin(Math.round(sum/60)*60)],
  ];
  body.innerHTML = rows.map(function(r){
    return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px;">' +
      '<span style="color:var(--text3);">'+r[0]+'</span>' +
      '<span style="color:var(--text);font-weight:600;">'+r[1]+'</span>' +
      '</div>';
  }).join('');
}

function formatMin(min) {
  if (min < 60) return min + ' Min';
  var h = Math.floor(min/60);
  var m = min % 60;
  return h + 'h ' + (m > 0 ? m + 'min' : '');
}

// ── Tabelle ──
var _alleFaelleTabelle = [];
function renderTabelle(records) {
  _alleFaelleTabelle = records;
  var count = _jb$('faelle-count');
  if (count) count.textContent = '· ' + records.length + ' Einträge';
  filterTabelle();
}

function filterTabelle() {
  var sucheEl = _jb$('tabelle-suche');
  if (!sucheEl) return; // Tabelle-Section nicht gerendert (HTML-Stub)
  var suche = (sucheEl.value||'').toLowerCase();
  var gefiltert = suche
    ? _alleFaelleTabelle.filter(function(r){
        return (r.Aktenzeichen||'').toLowerCase().includes(suche) ||
               (r.Schadensart||'').toLowerCase().includes(suche) ||
               (r.Ort||'').toLowerCase().includes(suche);
      })
    : _alleFaelleTabelle;

  var tbody = _jb$('faelle-tbody'); if (!tbody) return;
  if (!gefiltert.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px;">Keine Treffer</td></tr>';
    return;
  }
  tbody.innerHTML = gefiltert.slice(0,100).map(function(r) {
    var adresse = [r.Schaden_Strasse, r.PLZ, r.Ort].filter(Boolean).join(', ') || '—';
    var datum = r.Timestamp ? new Date(r.Timestamp).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
    var s = r.Status||'—';
    var m = STATUS_FARBEN[s]||{bg:'rgba(255,255,255,.04)',color:'#9da3b4'};
    var statusTag = '<span class="tag" style="background:'+m.bg+';color:'+m.color+';">'+escHtml(s)+'</span>';
    var bearb = r.Bearbeitungszeit_Min > 0 ? r.Bearbeitungszeit_Min + ' Min' : '—';
    return '<tr>' +
      '<td style="color:var(--accent);font-weight:600;">'+escHtml(r.Aktenzeichen||'—')+'</td>' +
      '<td>'+datum+'</td>' +
      '<td>'+escHtml(r.Schadensart||'—')+'</td>' +
      '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+escHtml(adresse)+'">'+escHtml(adresse)+'</td>' +
      '<td>'+statusTag+'</td>' +
      '<td>'+bearb+'</td>' +
      '</tr>';
  }).join('');
  if (gefiltert.length > 100) {
    tbody.innerHTML += '<tr><td colspan="6" style="text-align:center;color:var(--text3);font-size:11px;padding:10px;">… und '+(gefiltert.length-100)+' weitere (Export für vollständige Liste)</td></tr>';
  }
}

// ── CSV Export ──
function exportCSV() {
  var records = _gefilterteRecords;
  if (!records.length) { zeigToast('Keine Daten für ' + _aktivesJahr, 'err'); return; }
  var header = ['Aktenzeichen','Datum','Schadensart','Straße','PLZ','Ort','Status','Bearbeitungszeit_Min','Baujahr','Gebäudetyp'];
  var rows = records.map(function(r) {
    return [
      r.Aktenzeichen||'', r.Timestamp?new Date(r.Timestamp).toLocaleDateString('de-DE'):'',
      r.Schadensart||'', r.Schaden_Strasse||'', r.PLZ||'', r.Ort||'',
      r.Status||'', r.Bearbeitungszeit_Min||'', r.Baujahr||'', r.Gebaeude_Typ||''
    ].map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(';');
  });
  var csv = '\uFEFF' + header.join(';') + '\n' + rows.join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='PROVA_Jahresbericht_'+_aktivesJahr+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  zeigToast('CSV exportiert (' + records.length + ' Fälle) ✅');
}

function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
window.zeigToast = window.zeigToast || window.showToast || function(m){ alert(m); };


document.addEventListener('DOMContentLoaded', function() {
  // Responsive charts-row
  function checkGrid(){
    var r1=_jb$('charts-row');
    var r2=_jb$('status-row');
    if (!r1 && !r2) return;
    var cols = window.innerWidth < 640 ? '1fr' : '1fr 1fr';
    if(r1)r1.style.gridTemplateColumns=cols;
    if(r2)r2.style.gridTemplateColumns=cols;
  }
  checkGrid();
  window.addEventListener('resize', checkGrid);
  ladeDaten();
});