/* ═══════════════════════════════════════════════════════
   PROVA — vor-ort-logic.js
   Vor-Ort Wizard: Auftragstyp → Stammdaten → Airtable → Aktionen
   v94 | §407a ZPO konform
   ═══════════════════════════════════════════════════════ */

var _typ = null;
var _az  = null;
var _svEmail = localStorage.getItem('prova_sv_email') || '';

/* ── Auftragstypen Konfiguration ── */
var TYPEN_CONFIG = {
  standard:       {
    title:'📋 Standard-Gutachten — Stammdaten',
    sub:'Versicherungsschaden / privater Auftraggeber',
    extra:'', agTyp:'Versicherung', schadensart:''
  },
  gericht:        {
    title:'🏛️ Gerichtsgutachten — Stammdaten',
    sub:'§404 ZPO — Beweisfragen nach Speicherung extrahierbar',
    agTyp:'Gericht', schadensart:'Gerichtsgutachten',
    extra:'<div class="vo-card"><div class="vo-card-header"><span>🏛️</span><div class="vo-card-title">Gerichtsdaten</div></div><div class="vo-card-body"><div class="vo-row"><div class="vo-field"><div class="vo-label vo-required">Aktenzeichen (Gericht)</div><input class="vo-input" id="vo-gericht-az" placeholder="12 O 34/25"></div><div class="vo-field"><div class="vo-label vo-required">Gericht</div><input class="vo-input" id="vo-gericht-name" placeholder="Amtsgericht Köln"></div></div><div class="vo-field"><div class="vo-label">Kostenvorschuss (€)</div><input class="vo-input" id="vo-vorschuss" type="number" placeholder="2500"></div></div></div>'
  },
  beweissicherung:{
    title:'🔍 Beweissicherung — Stammdaten',
    sub:'§485 ZPO — Selbständiges Beweisverfahren',
    agTyp:'Gericht', schadensart:'Gerichtsgutachten',
    extra:'<div class="vo-card"><div class="vo-card-header"><span>📄</span><div class="vo-card-title">Verfahrensdaten</div></div><div class="vo-card-body"><div class="vo-row"><div class="vo-field"><div class="vo-label">Verfahrens-AZ</div><input class="vo-input" id="vo-bew-az" placeholder="Az. (falls vorhanden)"></div><div class="vo-field"><div class="vo-label">Antragsteller</div><input class="vo-input" id="vo-bew-ast" placeholder="Name / Anwalt"></div></div></div></div>'
  },
  ergaenzung:     {
    title:'🧩 Ergänzungsgutachten — Stammdaten',
    sub:'§411 ZPO — Bezug auf bestehendes Gutachten',
    agTyp:'Gericht', schadensart:'Gerichtsgutachten',
    extra:'<div class="vo-card"><div class="vo-card-header"><span>🔗</span><div class="vo-card-title">Bezug auf Gutachten</div></div><div class="vo-card-body"><div class="vo-field"><div class="vo-label vo-required">Ursprüngliches Aktenzeichen</div><input class="vo-input" id="vo-erg-az" placeholder="Az. des Ursprungsgutachtens"></div><div class="vo-field"><div class="vo-label">Nachfragen (Kurzfassung)</div><textarea class="vo-input" rows="3" id="vo-erg-fragen" placeholder="Was wurde nachgefragt?"></textarea></div></div></div>'
  },
  schiedsgutachten:{
    title:'⚖️ Schiedsgutachten — Stammdaten',
    sub:'Zwei Parteien — Kostenaufteilung wird gesondert festgelegt',
    agTyp:'Privat', schadensart:'Schiedsgutachten',
    extra:'<div class="vo-card"><div class="vo-card-header"><span>⚖️</span><div class="vo-card-title">Parteien</div></div><div class="vo-card-body"><div class="vo-row"><div class="vo-field"><div class="vo-label vo-required">Partei A (Name)</div><input class="vo-input" id="vo-partei-a" placeholder="Name / Firma"></div><div class="vo-field"><div class="vo-label vo-required">Partei B (Name)</div><input class="vo-input" id="vo-partei-b" placeholder="Name / Firma"></div></div></div></div>'
  },
  baubegleitung:  {
    title:'🏗️ Baubegleitung — Stammdaten',
    sub:'Fortlaufendes Projekt — mehrere Begehungen',
    agTyp:'Privat', schadensart:'Baubegleitung',
    extra:'<div class="vo-card"><div class="vo-card-header"><span>🏗️</span><div class="vo-card-title">Projekt-Details</div></div><div class="vo-card-body"><div class="vo-row"><div class="vo-field"><div class="vo-label">Bauphase</div><select class="vo-input vo-select" id="vo-bauphase"><option>Rohbau</option><option>Rohinstallation</option><option>Innenausbau</option><option>Außenanlagen</option><option>Abnahme</option></select></div><div class="vo-field"><div class="vo-label">Bauleiter</div><input class="vo-input" id="vo-bauleiter" placeholder="Name Bauleiter"></div></div></div></div>'
  },
};

/* ── Schritt-3 Aktionen je Typ ── */
var AKTIONEN_CONFIG = {
  standard:        [
    { icon:'🎙️', name:'Diktat aufnehmen', sub:'Sofort vor Ort sprechen — KI erstellt Gutachten-Entwurf', url:'app.html', highlight:true },
    { icon:'📍', name:'Ortstermin-Modus', sub:'Fotos, Messungen, Notizen strukturiert erfassen', url:'ortstermin-modus.html', highlight:false },
    { icon:'📂', name:'Zur Fallakte', sub:'Alle Daten, Fotos und Dokumente dieses Falls', url:'archiv.html', highlight:false },
    { icon:'✅', name:'Freigabe & PDF', sub:'Gutachten direkt freigeben wenn fertig', url:'freigabe.html', highlight:false },
  ],
  gericht:         [
    { icon:'🏛️', name:'Beweisfragen extrahieren', sub:'KI liest Beweisbeschluss aus — per PDF oder Text', url:'gericht-auftrag.html', highlight:true },
    { icon:'🎙️', name:'Diktat aufnehmen', sub:'Befund zu den Beweisfragen diktieren', url:'app.html', highlight:false },
    { icon:'📍', name:'Ortstermin-Modus', sub:'Fotos und Messungen erfassen', url:'ortstermin-modus.html', highlight:false },
    { icon:'📂', name:'Zur Fallakte', sub:'Alle Daten dieses Gerichtsauftrags', url:'archiv.html', highlight:false },
  ],
  beweissicherung: [
    { icon:'📍', name:'Ortstermin-Modus', sub:'Fotos, Messungen, Raumprotokoll — sofort loslegen', url:'ortstermin-modus.html', highlight:true },
    { icon:'🎙️', name:'Diktat aufnehmen', sub:'Befund zu Beweispunkten', url:'app.html', highlight:false },
    { icon:'📂', name:'Zur Fallakte', sub:'Alle Daten des Verfahrens', url:'archiv.html', highlight:false },
  ],
  ergaenzung:      [
    { icon:'🧩', name:'Ergänzungsgutachten', sub:'Nachfragen beantworten — Bezug auf Ursprungsgutachten', url:'ergaenzung.html', highlight:true },
    { icon:'🎙️', name:'Diktat aufnehmen', sub:'Ergänzung diktieren', url:'app.html', highlight:false },
    { icon:'📂', name:'Zur Fallakte', sub:'Ursprünglicher Fall', url:'archiv.html', highlight:false },
  ],
  schiedsgutachten:[
    { icon:'⚖️', name:'Schiedsgutachten', sub:'Weitere Daten erfassen und speichern', url:'schiedsgutachten.html', highlight:true },
    { icon:'📍', name:'Ortstermin-Modus', sub:'Fotos und Befunde erfassen', url:'ortstermin-modus.html', highlight:false },
    { icon:'📂', name:'Zur Fallakte', sub:'Fallübersicht', url:'archiv.html', highlight:false },
  ],
  baubegleitung:   [
    { icon:'📍', name:'Ortstermin-Modus', sub:'Begehungsprotokoll — Räume, Fotos, Mängel', url:'ortstermin-modus.html', highlight:true },
    { icon:'🏗️', name:'Baubegleitung', sub:'Alle Begehungen und Protokolle', url:'baubegleitung.html', highlight:false },
    { icon:'📂', name:'Zur Fallakte', sub:'Alle Begehungen dieses Projekts', url:'archiv.html', highlight:false },
  ],
};

/* ── Auftragstyp wählen (Schritt 1) ── */
function waehleTyp(typ, el) {
  _typ = typ;
  document.querySelectorAll('.vo-typ').forEach(function(t){ t.classList.remove('aktiv'); });
  el.classList.add('aktiv');
  var btn = document.getElementById('btn-weiter-1');
  btn.disabled = false;
  btn.style.opacity = '1';
  updateS2(typ);
}

/* ── Schritt 2: Felder für Typ vorbereiten ── */
function updateS2(typ) {
  var cfg = TYPEN_CONFIG[typ] || TYPEN_CONFIG.standard;
  document.getElementById('s2-title').textContent = cfg.title;
  document.getElementById('s2-sub').textContent = cfg.sub;
  document.getElementById('vo-extra-felder').innerHTML = cfg.extra || '';
  if (cfg.agTyp)      document.getElementById('vo-ag-typ').value = cfg.agTyp;
  if (cfg.schadensart) document.getElementById('vo-schadensart').value = cfg.schadensart;
}

/* ── Step-Navigation ── */
function geheZuSchritt(nr) {
  [1,2,3].forEach(function(i) {
    document.getElementById('screen-' + i).classList.toggle('aktiv', i === nr);
    var stepEl = document.getElementById('step-ind-' + i);
    stepEl.classList.remove('aktiv','fertig');
    if (i < nr) stepEl.classList.add('fertig');
    if (i === nr) stepEl.classList.add('aktiv');
    if (i < 3) document.getElementById('line-' + i).classList.toggle('fertig', i < nr);
    var nrEl = document.getElementById('step-nr-' + i);
    nrEl.textContent = i < nr ? '✓' : i;
  });
  var labels = ['Auftragstyp','Stammdaten','Jetzt starten'];
  var badge = document.getElementById('vo-schritt-badge');
  var bread = document.getElementById('breadcrumb-label');
  if (badge) badge.textContent = 'Schritt ' + nr + ' von 3';
  if (bread) bread.textContent = labels[nr-1];
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ── Airtable speichern + Schritt 3 ── */
async function speichereUndWeiter() {
  var strasse = document.getElementById('vo-strasse').value.trim();
  var ag      = document.getElementById('vo-auftraggeber').value.trim();
  if (!strasse || !ag) {
    showToast('Bitte Schadensort und Auftraggeber eingeben.', 'error');
    return;
  }

  var btn = document.querySelector('#screen-2 .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Speichern…'; }

  var plzOrt = (document.getElementById('vo-plzort').value || '').trim();
  var plz = (plzOrt.match(/^\d{5}/) || [''])[0];
  var ort = plzOrt.replace(/^\d{5}\s*/, '').trim();

  // Aktenzeichen PROVA-YYMM-XXX
  var heute = new Date();
  var mm  = String(heute.getMonth()+1).padStart(2,'0');
  var yy  = String(heute.getFullYear()).slice(2);
  var rand = String(Math.floor(Math.random()*900)+100);
  _az = 'PROVA-' + yy + mm + '-' + rand;

  var felder = {
    Aktenzeichen:        _az,
    Auftragstyp:         _typ || 'standard',
    Auftraggeber_Typ:    document.getElementById('vo-ag-typ').value,
    Auftraggeber_Name:   ag,
    Auftraggeber_Email:  (document.getElementById('vo-ag-email') || {}).value || '',
    Auftraggeber_Telefon:(document.getElementById('vo-ag-tel') || {}).value || '',
    Schaden_Strasse:     strasse,
    Ort:                 ort,
    Schadensart:         document.getElementById('vo-schadensart').value,
    Status:              'Auftrag erhalten',
    sv_email:            _svEmail,
    Timestamp:           heute.toISOString(),
  };
  if (plz) felder.PLZ = parseInt(plz);

  var frist = (document.getElementById('vo-frist') || {}).value;
  if (frist) felder.Abgabefrist = frist;

  // Typ-spezifische Extra-Felder
  if (_typ === 'gericht') {
    var gaz = (document.getElementById('vo-gericht-az') || {}).value;
    var gn  = (document.getElementById('vo-gericht-name') || {}).value;
    if (gaz) felder.Aktenzeichen = gaz;
    if (gn)  felder.Auftraggeber_Name = gn;
    var vs  = (document.getElementById('vo-vorschuss') || {}).value;
    if (vs)  felder.Notizen = 'Kostenvorschuss: ' + vs + ' €';
  }
  if (_typ === 'beweissicherung') {
    var baz = (document.getElementById('vo-bew-az') || {}).value;
    var bast = (document.getElementById('vo-bew-ast') || {}).value;
    if (baz || bast) felder.Notizen = 'Verfahrens-AZ: ' + (baz||'') + '\nAntragsteller: ' + (bast||'');
  }
  if (_typ === 'ergaenzung') {
    var eaz = (document.getElementById('vo-erg-az') || {}).value;
    var efr = (document.getElementById('vo-erg-fragen') || {}).value;
    if (eaz) felder.Notizen = 'Ursprungs-AZ: ' + eaz + (efr ? '\nNachfragen: ' + efr : '');
  }
  if (_typ === 'schiedsgutachten') {
    var pa = (document.getElementById('vo-partei-a') || {}).value;
    var pb = (document.getElementById('vo-partei-b') || {}).value;
    if (pa || pb) felder.Notizen = 'Partei A: ' + (pa||'') + '\nPartei B: ' + (pb||'');
  }
  if (_typ === 'baubegleitung') {
    var bph = (document.getElementById('vo-bauphase') || {}).value;
    var bl  = (document.getElementById('vo-bauleiter') || {}).value;
    if (bph || bl) felder.Notizen = 'Bauphase: ' + (bph||'') + (bl ? '\nBauleiter: ' + bl : '');
  }

  // Airtable speichern
  try {
    var headers = Object.assign({'Content-Type':'application/json'},
      window.provaAuthHeaders ? window.provaAuthHeaders() : {});
    var r = await fetch('/.netlify/functions/airtable', {
      method: 'POST', headers: headers,
      body: JSON.stringify({
        method:  'POST',
        path:    '/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0',
        payload: { records: [{ fields: felder }] }
      })
    });
    var d = await r.json();
    if (r.ok && d.records && d.records[0]) {
      localStorage.setItem('prova_letztes_az',    _az);
      localStorage.setItem('prova_aktiver_fall',  _az);
      localStorage.setItem('prova_schadenart',    felder.Schadensart);
      localStorage.setItem('prova_auftragstyp',   _typ);
      renderSchritt3();
      geheZuSchritt(3);
      showToast('Fall gespeichert: ' + _az, 'ok');
    } else {
      throw new Error(d.error || ('HTTP ' + r.status));
    }
  } catch(e) {
    // Offline-Fallback
    localStorage.setItem('prova_letztes_az',   _az);
    localStorage.setItem('prova_aktiver_fall', _az);
    localStorage.setItem('prova_schadenart',   felder.Schadensart);
    localStorage.setItem('prova_auftragstyp',  _typ);
    showToast('Offline gespeichert — wird synchronisiert wenn online', 'warn');
    renderSchritt3();
    geheZuSchritt(3);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Speichern & weiter'; }
  }
}

/* ── Schritt 3: Aktionen rendern ── */
function renderSchritt3() {
  var aktionen = AKTIONEN_CONFIG[_typ] || AKTIONEN_CONFIG.standard;
  var schadensart = (document.getElementById('vo-schadensart') || {}).value || '';
  var s3sub = document.getElementById('s3-sub');
  if (s3sub) s3sub.innerHTML = 'Aktenzeichen: <strong>' + _az + '</strong> · ' + schadensart;

  var html = aktionen.map(function(a) {
    var cls = 'vo-aktion' + (a.highlight ? ' highlight' : '');
    var href = a.url + '?az=' + encodeURIComponent(_az);
    return '<div class="' + cls + '" onclick="window.location.href=\'' + href + '\'">' +
      '<div class="vo-aktion-icon">' + a.icon + '</div>' +
      '<div class="vo-aktion-name">' + a.name + '</div>' +
      '<div class="vo-aktion-sub">' + a.sub + '</div>' +
      '</div>';
  }).join('');
  var container = document.getElementById('vo-aktionen');
  if (container) container.innerHTML = html;
}

/* ── Toast ── */
function showToast(msg, type) {
  var colors = { error:'rgba(239,68,68,.9)', warn:'rgba(245,158,11,.9)', ok:'rgba(16,185,129,.9)' };
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
    'background:' + (colors[type] || colors.ok) + ';color:#fff;padding:10px 20px;' +
    'border-radius:10px;font-size:13px;font-weight:600;z-index:9999;pointer-events:none;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.4);';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function(){ el.remove(); }, 3500);
}

/* ── Init: Default-Frist (30 Tage) ── */
document.addEventListener('DOMContentLoaded', function() {
  var fristEl = document.getElementById('vo-frist');
  if (fristEl && !fristEl.value) {
    var d = new Date(); d.setDate(d.getDate() + 30);
    fristEl.value = d.toISOString().split('T')[0];
  }
  // sv_email aus JWT wenn vorhanden
  if (window.netlifyIdentity) {
    var u = window.netlifyIdentity.currentUser();
    if (u && u.email) _svEmail = u.email;
  }
});
