/* ═══════════════════════════════════════════════════════════════════
   PROVA WIZARD — Schritt-für-Schritt Auftrag anlegen
   
   Flow:
   [Schritt 1] Auftragstyp → (bereits in auftragstyp.js)
   [Schritt 2] Wo & Was   → Schadenort + Schadenart
   [Schritt 3] Wer        → Auftraggeber + Erreichbarkeit
   [Schritt 4] Rahmen     → Frist, Gericht-AZ, Gebäude (je nach Typ)
   → Fertig: Diktat & Fotos
   ═══════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

/* ── STATE ── */
var WZ = {
  typ:       null,   // Ausgewählter Auftragstyp
  schritt:   0,      // Aktueller Schritt (2-4)
  felder:    {},     // Gesammelte Felddaten
  el:        null,   // Wizard-DOM-Element
};

/* ── SCHADENARTEN ── */
var SCHADENARTEN = [
  { id:'wasser',    label:'Wasserschaden',    icon:'💧', color:'#3b82f6' },
  { id:'schimmel',  label:'Schimmelbefall',   icon:'🟢', color:'#10b981' },
  { id:'brand',     label:'Brandschaden',     icon:'🔥', color:'#ef4444' },
  { id:'sturm',     label:'Sturmschaden',     icon:'💨', color:'#8b5cf6' },
  { id:'elementar', label:'Elementarschaden', icon:'⛈️', color:'#f59e0b' },
  { id:'baum',      label:'Baumängel',        icon:'🏗️', color:'#ec4899' },
  { id:'einbruch',  label:'Einbruchschaden',  icon:'🔓', color:'#6366f1' },
  { id:'sonstige',  label:'Sonstiger Schaden',icon:'📋', color:'#64748b' },
];

/* ── GEBÄUDETYPEN ── */
var GEBAEUDETYPEN = ['EFH', 'MFH', 'WHG', 'Gewerbe', 'Büro', 'Halle', 'Sonstiges'];

/* ── WIZARD STARTEN (nach Auftragstyp-Auswahl) ── */
window.PROVA_WIZARD = {
  start: function(typ) {
    WZ.typ = typ;
    WZ.felder = {};
    _oeffneSchritt(2);
  },
  close: _schliessen,
};

/* ── SCHRITTE ── */
function _oeffneSchritt(n) {
  WZ.schritt = n;
  if (WZ.el) WZ.el.remove();
  WZ.el = _erstelleWizard(n);
  document.body.appendChild(WZ.el);

  // Fokus auf erstes Input
  setTimeout(function() {
    var first = WZ.el.querySelector('input, select, textarea');
    if (first) first.focus();
  }, 80);
}

function _weiter() {
  if (!_validiere()) return;
  _sammleDaten();
  var maxStep = _brauchSchritt4() ? 4 : 3;
  if (WZ.schritt < maxStep) {
    _oeffneSchritt(WZ.schritt + 1);
  } else {
    _abschliessen();
  }
}

function _zurueck() {
  if (WZ.schritt > 2) {
    _sammleDaten();
    _oeffneSchritt(WZ.schritt - 1);
  } else {
    _schliessen();
    if (window.PROVA && window.PROVA.openAuftragstyp) {
      PROVA.openAuftragstyp();
    }
  }
}

function _brauchSchritt4() {
  var typ = WZ.typ || '';
  return typ === 'gerichtsgutachten' || typ === 'schiedsgutachten'
    || typ === 'versicherungsgutachten' || typ === 'baubegleitung';
}

/* ── DATEN SAMMELN ── */
function _sammleDaten() {
  var f = WZ.el;
  if (!f) return;
  ['wz-strasse','wz-plz','wz-ort','wz-schadensdatum',
   'wz-ag-name','wz-ag-email','wz-ag-tel','wz-ag-typ',
   'wz-geschaedigter','wz-frist','wz-gerichts-az',
   'wz-beweisfragen','wz-gebaeudetyp','wz-baujahr','wz-honorar-art',
  ].forEach(function(id) {
    var el = f.querySelector('#'+id);
    if (el) WZ.felder[id] = el.value;
  });
  // Schadenart (Chip-Auswahl)
  var aktChip = f.querySelector('.wz-sa-chip.selected');
  if (aktChip) WZ.felder['wz-schadenart'] = aktChip.dataset.id;
}

/* ── VALIDIERUNG ── */
function _validiere() {
  var ok = true;
  var pflicht = [];
  if (WZ.schritt === 2) pflicht = ['wz-strasse','wz-ort'];
  if (WZ.schritt === 3) pflicht = ['wz-ag-name'];

  pflicht.forEach(function(id) {
    var el = WZ.el ? WZ.el.querySelector('#'+id) : null;
    if (el && !el.value.trim()) {
      el.style.borderColor = '#ef4444';
      el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.15)';
      ok = false;
      setTimeout(function(){
        el.style.borderColor='';
        el.style.boxShadow='';
      }, 1800);
    }
  });

  if (!ok) _shake();
  return ok;
}

function _shake() {
  var box = WZ.el ? WZ.el.querySelector('.wz-box') : null;
  if (!box) return;
  box.style.animation = 'none';
  box.offsetHeight; // reflow
  box.style.animation = 'wz-shake .4s ease';
}

/* ── ABSCHLIESSEN: Felder in app.html übertragen ── */
function _abschliessen() {
  var f = WZ.felder;
  _setVal('f-strasse',         f['wz-strasse']     || '');
  _setVal('f-plz',             f['wz-plz']         || '');
  _setVal('f-ort',             f['wz-ort']         || '');
  _setVal('f-schadensdatum',   f['wz-schadensdatum']|| '');
  _setVal('f-auftraggeber-name', f['wz-ag-name']   || '');
  _setVal('f-auftraggeber-email',f['wz-ag-email']  || '');
  _setVal('f-auftraggeber-telefon', f['wz-ag-tel'] || '');
  _setVal('f-geschaedigter',   f['wz-geschaedigter']|| '');
  _setVal('f-fristdatum',      f['wz-frist']       || '');
  _setVal('f-gerichts-az',     f['wz-gerichts-az'] || '');
  _setVal('f-beweisfragen',    f['wz-beweisfragen'] || '');
  _setVal('f-baujahr',         f['wz-baujahr']     || '');
  _setVal('f-honorar-art',     f['wz-honorar-art'] || 'jveg');

  if (f['wz-ag-typ'])    _setVal('f-auftraggeber-typ', f['wz-ag-typ']);
  if (f['wz-gebaeudetyp']) _setVal('f-gebaeudetyp', f['wz-gebaeudetyp']);
  if (f['wz-schadenart'])  _setVal('f-schadenart', _saLabel(f['wz-schadenart']));

  // Auftragstyp in Formular übernehmen
  if (WZ.typ) _setVal('f-auftraggeber-typ', _typZuAgTyp(WZ.typ));

  _schliessen();

  // Direkt zu Diktat springen (Schritt 2)
  if (window.weiterZuSchritt2) {
    weiterZuSchritt2();
  } else if (window.goToStep) {
    goToStep(2);
  }
}

function _typZuAgTyp(typ) {
  var map = {
    'gerichtsgutachten':    'Gericht',
    'versicherungsgutachten':'Versicherung',
    'privatgutachten':      'Privat',
    'schiedsgutachten':     'Privat',
    'kaufberatung':         'Privat',
    'sanierungsberatung':   'Privat',
    'baubegleitung':        'Bauherr',
    'bauabnahme':           'Bauherr',
    'beweissicherung':      'Privat',
  };
  return map[typ] || 'Privat';
}

function _saLabel(id) {
  var sa = SCHADENARTEN.find(function(s){return s.id===id;});
  return sa ? sa.label : id;
}

function _setVal(id, val) {
  var el = document.getElementById(id);
  if (!el || !val) return;
  el.value = val;
  try { el.dispatchEvent(new Event('input', {bubbles:true})); } catch(e){}
  try { el.dispatchEvent(new Event('change',{bubbles:true})); } catch(e){}
}

function _schliessen() {
  if (WZ.el) { WZ.el.remove(); WZ.el = null; }
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════
   WIZARD HTML — Schritt 2: Wo ist der Schaden?
   ══════════════════════════════════════════════════════ */
function _html2() {
  var typLabel = _typLabel(WZ.typ);
  var sa = WZ.felder['wz-schadenart'] || '';
  var heut = new Date().toISOString().split('T')[0];

  var chips = SCHADENARTEN.map(function(s) {
    var sel = s.id === sa ? ' selected' : '';
    return '<button type="button" class="wz-sa-chip'+sel+'" data-id="'+s.id+'" '
      + 'style="display:flex;align-items:center;gap:6px;padding:8px 13px;border-radius:20px;'
      + 'border:1.5px solid '+(sel?' var(--accent,#4f8ef7);background:rgba(79,142,247,.1);':'var(--border,rgba(255,255,255,.1));background:var(--surface2,rgba(255,255,255,.05));')
      + 'color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;'
      + 'transition:all .15s;" onclick="PROVA_WZ_chipSA(this)">'
      + '<span>'+s.icon+'</span><span>'+s.label+'</span>'
      + '</button>';
  }).join('');

  return ''
    + _header('Wo ist der Schaden?', 2, typLabel)
    + '<div class="wz-section">'
    +   '<div class="wz-section-label">Schadenart</div>'
    +   '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:6px;">' + chips + '</div>'
    + '</div>'
    + '<div class="wz-section">'
    +   '<div class="wz-section-label">Adresse des Schadenorts <span class="wz-pflicht">Pflicht</span></div>'
    +   '<input class="wz-input" id="wz-strasse" placeholder="Straße & Hausnummer" value="'+(WZ.felder['wz-strasse']||'')+'" onkeydown="if(event.key===\'Enter\')document.getElementById(\'wz-plz\').focus()">'
    +   '<div style="display:grid;grid-template-columns:100px 1fr;gap:8px;margin-top:8px;">'
    +     '<input class="wz-input" id="wz-plz" placeholder="PLZ" value="'+(WZ.felder['wz-plz']||'')+'" maxlength="5" inputmode="numeric" onkeydown="if(event.key===\'Enter\')document.getElementById(\'wz-ort\').focus()">'
    +     '<input class="wz-input" id="wz-ort" placeholder="Ort" value="'+(WZ.felder['wz-ort']||'')+'" onkeydown="if(event.key===\'Enter\')_wzWeiter()">'
    +   '</div>'
    + '</div>'
    + '<div class="wz-section">'
    +   '<div class="wz-section-label">Schadensdatum <span style="font-size:10px;color:var(--text3);font-weight:400;">(optional)</span></div>'
    +   '<input class="wz-input" id="wz-schadensdatum" type="date" value="'+(WZ.felder['wz-schadensdatum']||'')+'" max="'+heut+'">'
    + '</div>';
}

/* ══════════════════════════════════════════════════════
   Schritt 3: Wer beauftragt Sie?
   ══════════════════════════════════════════════════════ */
function _html3() {
  var typLabel = _typLabel(WZ.typ);
  var agTypOpt = ['Versicherung','Gericht','Privat','Bauherr','Architekt','Verwaltung','Sonstiges'].map(function(t) {
    var pre = _typZuAgTyp(WZ.typ);
    var sel = (WZ.felder['wz-ag-typ'] || pre) === t ? ' selected' : '';
    return '<option'+sel+'>'+t+'</option>';
  }).join('');

  return ''
    + _header('Wer beauftragt Sie?', 3, typLabel)
    + '<div class="wz-section">'
    +   '<div class="wz-section-label">Auftraggeber <span class="wz-pflicht">Pflicht</span></div>'
    +   '<input class="wz-input" id="wz-ag-name" placeholder="Firma oder vollständiger Name" value="'+(WZ.felder['wz-ag-name']||'')+'" onkeydown="if(event.key===\'Enter\')document.getElementById(\'wz-ag-email\').focus()">'
    +   '<select class="wz-input" id="wz-ag-typ" style="margin-top:8px;">' + agTypOpt + '</select>'
    + '</div>'
    + '<div class="wz-section">'
    +   '<div class="wz-section-label">Kontakt</div>'
    +   '<input class="wz-input" id="wz-ag-email" type="email" placeholder="E-Mail-Adresse" value="'+(WZ.felder['wz-ag-email']||'')+'" onkeydown="if(event.key===\'Enter\')document.getElementById(\'wz-ag-tel\').focus()">'
    + '</div>'
    + '<div class="wz-section">'
    +   '<div class="wz-section-label">Erreichbarkeit <span style="font-size:10px;color:var(--text3);font-weight:400;">(optional)</span></div>'
    +   '<input class="wz-input" id="wz-ag-tel" type="tel" placeholder="Telefon für Rückfragen" value="'+(WZ.felder['wz-ag-tel']||'')+'">'
    +   '<div style="font-size:11px;color:var(--text3);margin-top:4px;">Wird in der Akte als Anruf-Button angezeigt</div>'
    + '</div>'
    + '<div class="wz-section">'
    +   '<div class="wz-section-label">Geschädigter / Versicherungsnehmer <span style="font-size:10px;color:var(--text3);font-weight:400;">(optional)</span></div>'
    +   '<input class="wz-input" id="wz-geschaedigter" placeholder="z.B. Familie Müller" value="'+(WZ.felder['wz-geschaedigter']||'')+'" onkeydown="if(event.key===\'Enter\')_wzWeiter()">'
    + '</div>';
}

/* ══════════════════════════════════════════════════════
   Schritt 4: Rahmendaten (typ-spezifisch)
   ══════════════════════════════════════════════════════ */
function _html4() {
  var typ     = WZ.typ || '';
  var typLabel= _typLabel(typ);
  var istGericht = typ === 'gerichtsgutachten' || typ === 'schiedsgutachten';
  var istVers    = typ === 'versicherungsgutachten';

  var gebaeudeOpts = GEBAEUDETYPEN.map(function(g) {
    var sel = WZ.felder['wz-gebaeudetyp'] === g ? ' selected' : '';
    return '<option'+sel+'>'+g+'</option>';
  }).join('');

  var html = _header('Rahmendaten', 4, typLabel);

  if (istGericht) {
    html += '<div class="wz-section">'
      + '<div class="wz-section-label">Gericht & Aktenzeichen</div>'
      + '<input class="wz-input" id="wz-gerichts-az" placeholder="Gerichts-Aktenzeichen, z.B. 3 OH 12/25" value="'+(WZ.felder['wz-gerichts-az']||'')+'">'
      + '</div>'
      + '<div class="wz-section">'
      + '<div class="wz-section-label">Frist zur Gutachtenabgabe</div>'
      + '<input class="wz-input" id="wz-frist" type="date" value="'+(WZ.felder['wz-frist']||'')+'">'
      + '</div>'
      + '<div class="wz-section">'
      + '<div class="wz-section-label">Beweisfragen des Gerichts <span style="font-size:10px;color:var(--text3);font-weight:400;">(optional)</span></div>'
      + '<textarea class="wz-input" id="wz-beweisfragen" rows="3" placeholder="Beweisfragen aus dem Beweisbeschluss">'+(WZ.felder['wz-beweisfragen']||'')+'</textarea>'
      + '</div>';
  } else if (istVers) {
    html += '<div class="wz-section">'
      + '<div class="wz-section-label">Abgabefrist</div>'
      + '<input class="wz-input" id="wz-frist" type="date" value="'+(WZ.felder['wz-frist']||'')+'">'
      + '</div>';
  }

  html += '<div class="wz-section">'
    + '<div class="wz-section-label">Gebäude</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
    +   '<select class="wz-input" id="wz-gebaeudetyp"><option value="">Gebäudetyp</option>' + gebaeudeOpts + '</select>'
    +   '<input class="wz-input" id="wz-baujahr" placeholder="Baujahr" inputmode="numeric" maxlength="4" value="'+(WZ.felder['wz-baujahr']||'')+'">'
    + '</div>'
    + '</div>'
    + '<div class="wz-section">'
    + '<div class="wz-section-label">Honorarart</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">'
    + ['jveg','frei','pauschal'].map(function(ha) {
        var labels = {jveg:'JVEG ⚖️', frei:'Frei vereinbart', pauschal:'Pauschal'};
        var sel = (WZ.felder['wz-honorar-art']||'jveg') === ha;
        return '<button type="button" class="wz-ha-btn'+(sel?' active':'')+'" data-ha="'+ha+'" '
          + 'style="padding:8px;border-radius:8px;border:1.5px solid '
          + (sel ? 'var(--accent);background:rgba(79,142,247,.1);color:var(--accent)' : 'var(--border);background:var(--surface2);color:var(--text2)')
          + ';font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;" '
          + 'onclick="PROVA_WZ_chipHA(this)">'
          + labels[ha]
          + '</button>';
      }).join('')
    + '</div>'
    + '</div>';

  return html;
}

/* ── HEADER ── */
function _header(titel, schritt, sub) {
  var maxStep = _brauchSchritt4() ? 4 : 3;
  var steps = ['','','Wo & Was','Von wem','Details'].slice(0, maxStep+1);

  var progress = '';
  for (var i = 2; i <= maxStep; i++) {
    var done   = schritt > i;
    var active = schritt === i;
    progress += '<div style="display:flex;align-items:center;gap:6px;'+(i>2?'margin-left:4px;':'')+'">';
    if (i > 2) progress += '<div style="width:24px;height:1px;background:'+(done?'#10b981':active?'var(--accent)':'var(--border)')+';"></div>';
    progress += '<div style="width:22px;height:22px;border-radius:50%;background:'
      + (done ? '#10b981' : active ? 'var(--accent,#4f8ef7)' : 'var(--surface2)')
      + ';border:1.5px solid '+(done?'#10b981':active?'var(--accent,#4f8ef7)':'var(--border)')
      + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:'+(done||active?'#fff':'var(--text3)')
      + ';transition:all .3s;">'+(done?'✓':i-1)+'</div>';
    if (active) {
      progress += '<span style="font-size:11px;font-weight:700;color:var(--text2);">' + (steps[i]||'') + '</span>';
    }
    progress += '</div>';
  }

  return '<div class="wz-header">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
    +   '<div>'
    +     '<div style="font-size:18px;font-weight:800;color:var(--text);">'+titel+'</div>'
    +     (sub ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;">'+sub+'</div>' : '')
    +   '</div>'
    +   '<button type="button" onclick="PROVA_WIZARD.close()" style="width:30px;height:30px;border-radius:8px;border:none;background:var(--surface2);color:var(--text3);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;">✕</button>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:0;margin-bottom:20px;">'+progress+'</div>'
    + '</div>';
}

/* ── WIZARD ZUSAMMENSETZEN ── */
function _erstelleWizard(schritt) {
  var overlay = document.createElement('div');
  overlay.id = 'prova-wizard-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9800;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';

  document.body.style.overflow = 'hidden';

  var maxStep = _brauchSchritt4() ? 4 : 3;
  var isLast  = schritt === maxStep;

  var bodyHtml = '';
  if (schritt === 2) bodyHtml = _html2();
  if (schritt === 3) bodyHtml = _html3();
  if (schritt === 4) bodyHtml = _html4();

  overlay.innerHTML = ''
    + '<style>'
    + '@keyframes wz-in{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}'
    + '@keyframes wz-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}'
    + '.wz-box{background:var(--bg2,#111827);border:1px solid var(--border2,rgba(255,255,255,.1));border-radius:18px;'
    +   'width:min(500px,94vw);max-height:88vh;overflow-y:auto;'
    +   'box-shadow:0 20px 60px rgba(0,0,0,.55);animation:wz-in .25s cubic-bezier(.32,.72,0,1);}'
    + '.wz-box::-webkit-scrollbar{width:3px;}.wz-box::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}'
    + '.wz-header{padding:20px 20px 0;}'
    + '.wz-section{padding:0 20px;margin-bottom:16px;}'
    + '.wz-section-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:6px;display:flex;align-items:center;gap:6px;}'
    + '.wz-pflicht{font-size:9px;padding:2px 6px;border-radius:8px;background:rgba(239,68,68,.1);color:#ef4444;text-transform:none;letter-spacing:0;font-weight:700;}'
    + '.wz-input{width:100%;padding:10px 12px;background:var(--surface2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:10px;color:var(--text,#eaecf4);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box;}'
    + '.wz-input:focus{border-color:var(--accent,#4f8ef7);box-shadow:0 0 0 3px rgba(79,142,247,.12);}'
    + '.wz-input select,.wz-input option{background:var(--bg2,#111827);}'
    + 'select.wz-input{cursor:pointer;} textarea.wz-input{resize:vertical;min-height:70px;line-height:1.6;}'
    + '.wz-sa-chip.selected{border-color:var(--accent,#4f8ef7)!important;background:rgba(79,142,247,.12)!important;color:var(--accent,#4f8ef7)!important;}'
    + '.wz-ha-btn.active{border-color:var(--accent,#4f8ef7)!important;background:rgba(79,142,247,.1)!important;color:var(--accent,#4f8ef7)!important;}'
    + '.wz-footer{padding:16px 20px;border-top:1px solid var(--border,rgba(255,255,255,.07));display:flex;gap:8px;}'
    + '.wz-btn-back{padding:10px 18px;border-radius:10px;border:1px solid var(--border2,rgba(255,255,255,.1));background:transparent;color:var(--text3);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;}'
    + '.wz-btn-back:hover{background:var(--surface2);color:var(--text);}'
    + '.wz-btn-next{flex:1;padding:10px 18px;border-radius:10px;border:none;background:var(--accent,#4f8ef7);color:#fff;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px;}'
    + '.wz-btn-next:hover{background:#3a7ef0;box-shadow:0 4px 14px rgba(79,142,247,.4);}'
    + '.wz-btn-finish{background:linear-gradient(135deg,#10b981,#059669)!important;}'
    + '.wz-btn-finish:hover{box-shadow:0 4px 14px rgba(16,185,129,.4)!important;}'
    + '@media(max-width:600px){.wz-box{width:100%;max-height:94vh;border-radius:20px 20px 0 0;}.wz-overlay-mobile{align-items:flex-end!important;padding:0!important;}}'
    + '</style>'
    + '<div class="wz-box" id="wz-box-inner">'
    + bodyHtml
    + '<div class="wz-footer">'
    +   '<button type="button" class="wz-btn-back" onclick="_wzZurueck()">← Zurück</button>'
    +   '<button type="button" class="wz-btn-next'+(isLast?' wz-btn-finish':'')+'" onclick="_wzWeiter()">'
    +   (isLast ? '✅ Los geht\'s — Diktat starten' : 'Weiter →')
    +   '</button>'
    + '</div>'
    + '</div>';

  // Overlay-Klick zum Schließen (nur außerhalb der Box)
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) PROVA_WIZARD.close();
  });

  // Keyboard
  overlay.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') PROVA_WIZARD.close();
  });

  return overlay;
}

/* ── GLOBALE HANDLER (von onclick erreichbar) ── */
window._wzWeiter  = function() { _weiter(); };
window._wzZurueck = function() { _zurueck(); };

window.PROVA_WZ_chipSA = function(btn) {
  var parent = btn.closest('.wz-box') || btn.parentElement.parentElement;
  parent.querySelectorAll('.wz-sa-chip').forEach(function(c) {
    c.classList.remove('selected');
    c.style.borderColor = 'var(--border,rgba(255,255,255,.1))';
    c.style.background  = 'var(--surface2,rgba(255,255,255,.05))';
    c.style.color       = 'var(--text2)';
  });
  btn.classList.add('selected');
  btn.style.borderColor = 'var(--accent,#4f8ef7)';
  btn.style.background  = 'rgba(79,142,247,.12)';
  btn.style.color       = 'var(--accent,#4f8ef7)';
};

window.PROVA_WZ_chipHA = function(btn) {
  var parent = btn.parentElement;
  parent.querySelectorAll('.wz-ha-btn').forEach(function(b) {
    b.classList.remove('active');
    b.style.borderColor = 'var(--border)';
    b.style.background  = 'var(--surface2)';
    b.style.color       = 'var(--text2)';
  });
  btn.classList.add('active');
  btn.style.borderColor = 'var(--accent,#4f8ef7)';
  btn.style.background  = 'rgba(79,142,247,.1)';
  btn.style.color       = 'var(--accent,#4f8ef7)';
};

/* ── HILFSFUNKTIONEN ── */
function _typLabel(typ) {
  var labels = {
    'gerichtsgutachten':    '⚖️ Gerichtsgutachten',
    'versicherungsgutachten':'🛡️ Versicherungsgutachten',
    'privatgutachten':      '👤 Privatgutachten',
    'schiedsgutachten':     '⚔️ Schiedsgutachten',
    'baubegleitung':        '🏗️ Baubegleitung',
    'bauabnahme':           '✅ Bauabnahme',
    'beweissicherung':      '📸 Beweissicherung',
    'kaufberatung':         '🏠 Kaufberatung',
    'sanierungsberatung':   '🔧 Sanierungsberatung',
  };
  return labels[typ] || '';
}

/* ── AUFTRAGSTYP.JS INTEGRATION ── */
// Warte bis auftragstyp.js bereit ist, dann Hook einbauen
function _hookAuftragstyp() {
  if (!window.PROVA || !window.PROVA.closeAuftragstyp) {
    setTimeout(_hookAuftragstyp, 100);
    return;
  }
  // Original weiter-Funktion patchen
  var origClose = PROVA.closeAuftragstyp.bind(PROVA);
  // "Auftrag starten"-Button in auftragstyp.js triggert window.location.href
  // Wir hängen uns an den DOMContentLoaded des Dialogs
  var origOpen = PROVA.openAuftragstyp.bind(PROVA);
  PROVA.openAuftragstyp = function() {
    origOpen();
    // Nach Dialog-Aufbau: Weiter-Button patchen
    setTimeout(function() {
      var btn = document.querySelector('.at-btn-start, [onclick*="weiterZuSchritt"], .at-next, .at-continue');
      if (btn) {
        var orig = btn.getAttribute('onclick') || '';
        // Typ aus Dialog auslesen und Wizard starten
      }
      // Intercept: wenn auf "Weiter" geklickt wird → Wizard starten
      document.querySelectorAll('[onclick*="location"], [onclick*="window.location"]').forEach(function(el) {
        var oc = el.getAttribute('onclick') || '';
        if (oc.includes('gutachten.html') || oc.includes('app.html')) {
          el.setAttribute('onclick', ''); // Entfernen
          el.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Typ ermitteln
            var sel = document.querySelector('.at-card.selected, [data-id].selected, .at-type.selected');
            var typ = sel ? (sel.dataset.id || sel.dataset.type || 'privatgutachten') : 'privatgutachten';
            origClose();
            PROVA_WIZARD.start(typ);
          });
        }
      });
    }, 200);
  };
}

// Direkter Hook über globale Callback-Funktion
// auftragstyp.js soll window.PROVA_WIZARD.start(typ) aufrufen
// Nach Auswahl und Klick auf "Auftrag starten"
// Das passiert in auftragstyp.js via: window.location.href = zielSeite
// Wir müssen das abfangen

// Einfachster Ansatz: Wenn Wizard aktiv ist, Seiten-Navigation abfangen
var _origHref = Object.getOwnPropertyDescriptor(window.location.__proto__, 'href');
// Alternativer Ansatz: auftragstyp.js callback

// Sicherheitshalber: Wizard auch direkt triggerbar machen
window.PROVA_START_WIZARD = function(typ) {
  PROVA_WIZARD.start(typ || 'privatgutachten');
};

document.addEventListener('DOMContentLoaded', function() {
  // Wenn wir auf app.html sind: Link "Neuer Fall" patchen
  var neuFallBtn = document.querySelector('#btn-neuer-fall, [onclick*="openAuftragstyp"], .neuer-fall-btn');
  // Das passiert via nav.js → openAuftragstyp()
  // auftragstyp.js hat einen Callback-Hook den wir nutzen
  // auftragstyp.js definiert window.PROVA.onTypSelected = callback
  if (window.PROVA) {
    PROVA.onWizardStart = function(typ) {
      PROVA_WIZARD.start(typ);
    };
  }
});

})();
