/* ════════════════════════════════════════════════════════════
   PROVA kontakte-logic.js
   Kontakte — Airtable-Sync, Import, Export
   Extrahiert aus kontakte.html
════════════════════════════════════════════════════════════ */

// ============================================================
// KONSTANTEN & STATE
// ============================================================
const K_KEY = 'prova_kontakte';
var _kontakte = [];
var _editId = null;
var _csvRows = [];
var _vcfRows = [];

var TYP_CONFIG = {
  'Versicherung': {icon:'🏢', color:'rgba(79,142,247,.15)', text:'#93C5FD'},
  'Anwalt':       {icon:'⚖️', color:'rgba(139,92,246,.15)', text:'#c4b5fd'},
  'Privatperson': {icon:'👤', color:'rgba(16,185,129,.12)', text:'#6ee7b7'},
  'Gericht':      {icon:'🏛', color:'rgba(245,158,11,.12)', text:'#fcd34d'},
  'Hausverwaltung':{icon:'🏘',color:'rgba(239,68,68,.1)',  text:'#fca5a5'},
  'Bauherr':      {icon:'🏗', color:'rgba(99,102,241,.15)',text:'#a5b4fc'},
  'Sonstiges':    {icon:'📋', color:'rgba(255,255,255,.05)',text:'#9aa5bc'},
  'Sonstige':     {icon:'📋', color:'rgba(255,255,255,.05)',text:'#9aa5bc'},
};

// ============================================================
// LADEN / SPEICHERN
// ============================================================
// ── Airtable-Proxy für Kontakte ──
const AT_BASE_K = 'appJ7bLlAHZoxENWE';
const AT_KONTAKTE = 'tblMKmPLjRelr6Hal';
async function atKontakte(method, path, body) {
  try {
    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({method: method, path: path, payload: body || null})
    });

    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
}

// Aus localStorage + optional Airtable-Sync
function ladeKontakte() {
  try { _kontakte = JSON.parse(localStorage.getItem(K_KEY) || '[]'); } catch(e) { _kontakte = []; }
  // Async Airtable-Sync im Hintergrund
  syncKontakteVonAirtable();
}

async function syncKontakteVonAirtable() {
  var email = localStorage.getItem('prova_sv_email') || '';
  if (!email) return;
  var filterFormula = email ? encodeURIComponent('{sv_email}="' + email + '"') : '';
  var path = '/v0/' + AT_BASE_K + '/' + AT_KONTAKTE
    + '?maxRecords=200&sort[0][field]=Name&sort[0][direction]=asc'
    + (filterFormula ? '&filterByFormula=' + filterFormula : '');
  var data = await atKontakte('GET', path);
  if (!data || !data.records || !data.records.length) return;
  // Merge: Airtable-Datensätze in lokale Liste — AT-Datensätze haben Vorrang
  var atIds = {};
  data.records.forEach(function(rec) {
    var f = rec.fields;
    var k = {
      id: rec.id, // Airtable Record-ID
      at_id: rec.id,
      name: f.Name || '',
      firma: f.Firma || '',
      typ: (f.Typ && f.Typ.name) ? f.Typ.name : (f.Typ || 'Sonstige'),
      email: f.Email || '',
      telefon: f.Telefon || '',
      strasse: f.Strasse || '',
      plz: String(f.PLZ || ''),
      ort: f.Ort || '',
      ansprechpartner: f.Ansprechpartner || '',
      notizen: f.Notizen || '',
      faelle_anzahl: parseInt(f.Faelle_Anzahl || 0),
      erstellt: rec.createdTime || new Date().toISOString(),
      import_quelle: 'Airtable'
    };
    atIds[rec.id] = true;
    // Update oder hinzufügen
    var idx = _kontakte.findIndex(function(x){return x.at_id === rec.id || x.id === rec.id;});
    if (idx >= 0) { _kontakte[idx] = k; } else { _kontakte.unshift(k); }
  });
  speichereKontakte();
  renderStats();
  renderKontakte();
}

function speichereKontakte() {
  localStorage.setItem(K_KEY, JSON.stringify(_kontakte));
}

// Kontakt in Airtable speichern/aktualisieren
async function syncKontaktZuAirtable(k) {
  var felder = {
    Name: k.name || '',
    Firma: k.firma || '',
    Typ: k.typ || 'Sonstige',
    Email: k.email || '',
    Telefon: k.telefon || '',
    Strasse: k.strasse || '',
    PLZ: k.plz || '',
    Ort: k.ort || '',
    Ansprechpartner: k.ansprechpartner || '',
    Notizen: k.notizen || ''
  };
  if (k.at_id && k.at_id.startsWith('rec')) {
    // Update
    var path = '/v0/' + AT_BASE_K + '/' + AT_KONTAKTE + '/' + k.at_id;
    await atKontakte('PATCH', path, {fields: felder});
  } else {
    // Neu anlegen
    var path2 = '/v0/' + AT_BASE_K + '/' + AT_KONTAKTE;
    var res = await atKontakte('POST', path2, {fields: felder, typecast: true});
    if (res && res.id) {
      // at_id merken
      var idx = _kontakte.findIndex(function(x){return x.id === k.id;});
      if (idx >= 0) { _kontakte[idx].at_id = res.id; _kontakte[idx].id = res.id; }
      speichereKontakte();
    }
  }
}

// Kontakt aus Airtable löschen
async function deleteKontaktInAirtable(k) {
  if (!k.at_id || !k.at_id.startsWith('rec')) return;
  var path = '/v0/' + AT_BASE_K + '/' + AT_KONTAKTE + '/' + k.at_id;
  await atKontakte('DELETE', path);
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

// ============================================================
// RENDER
// ============================================================
function renderStats() {
  var counts = {};
  _kontakte.forEach(function(k){ counts[k.typ] = (counts[k.typ]||0)+1; });
  var el = document.getElementById('statsBar');
  if (!_kontakte.length) { el.innerHTML=''; return; }
  el.innerHTML = [
    {label:'Gesamt', val:_kontakte.length, icon:'👥'},
    {label:'Versicherung', val:counts['Versicherung']||0, icon:'🏢'},
    {label:'Anwalt', val:counts['Anwalt']||0, icon:'⚖️'},
    {label:'Privat', val:counts['Privatperson']||0, icon:'👤'},
    {label:'Gericht', val:counts['Gericht']||0, icon:'🏛'},
  ].map(function(s){
    return '<div class="stat-card"><div class="stat-val">'+s.val+'</div><div class="stat-label">'+s.icon+' '+s.label+'</div></div>';
  }).join('');
}

function renderKontakte() {
  var suche = (document.getElementById('searchInput').value||'').toLowerCase();
  var filterTyp = document.getElementById('filterTyp').value;
  var sort = document.getElementById('filterSort').value;

  var liste = _kontakte.filter(function(k){
    if (filterTyp && k.typ !== filterTyp) return false;
    if (suche) {
      var haystack = [k.name,k.vorname,k.firma,k.email,k.ort,k.telefon].join(' ').toLowerCase();
      if (!haystack.includes(suche)) return false;
    }
    return true;
  });

  liste.sort(function(a,b){
    if (sort==='name') return (a.name||'').localeCompare(b.name||'','de');
    if (sort==='typ') return (a.typ||'').localeCompare(b.typ||'');
    if (sort==='faelle') return (b.faelle_anzahl||0)-(a.faelle_anzahl||0);
    if (sort==='neu') return new Date(b.erstellt||0)-new Date(a.erstellt||0);
    return 0;
  });

  var grid = document.getElementById('kontakteGrid');

  // Figma-Style: Zuletzt verwendete Kontakte als Banner
  var recentBanner = document.getElementById('recent-kontakte-banner');
  if (!suche && !filterTyp) {
    try {
      var recentIds = JSON.parse(localStorage.getItem('prova_kontakte_recent')||'[]');
      var recentK = recentIds.map(function(id){ return _kontakte.find(function(k){return k.id===id;}); }).filter(Boolean).slice(0,3);
      if (recentK.length > 0 && !recentBanner) {
        var banner = document.createElement('div');
        banner.id = 'recent-kontakte-banner';
        banner.style.cssText = 'margin-bottom:16px;';
        banner.innerHTML = '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px;">Zuletzt verwendet</div>'
          + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
          + recentK.map(function(k){
              var tc = TYP_CONFIG[k.typ]||TYP_CONFIG['Sonstiges'];
              return '<button data-kid="'+escH(k.id)+'" onclick="quickImportInApp(this.getAttribute(\'data-kid\'))" style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;background:var(--surface);border:1px solid var(--border);color:var(--text2);font-size:12px;cursor:pointer;font-family:inherit;">'
                + '<span style="font-size:14px;">'+tc.icon+'</span><span>'+escH(k.vorname?k.vorname+' '+k.name:k.name)+'</span>'
                + '</button>';
            }).join('')
          + '</div>';
        grid.parentNode.insertBefore(banner, grid);
      } else if (recentBanner && recentK.length === 0) {
        recentBanner.remove();
      }
    } catch(e) {}
  } else if (recentBanner) {
    recentBanner.remove();
  }

  if (!liste.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">👥</div><div style="font-size:14px;font-weight:600;margin-bottom:6px;">'+(suche||filterTyp?'Keine Treffer':'Noch keine Kontakte')+'</div><div style="font-size:12px;">'+(suche||filterTyp?'Filter anpassen':'+ Neuer Kontakt oder ⬆ Importieren')+'</div></div>';
    return;
  }

  grid.innerHTML = '';
  liste.forEach(function(k) {
    var tc = TYP_CONFIG[k.typ] || TYP_CONFIG['Sonstiges'];
    var initials = ((k.vorname||'')[0]||(k.name||'')[0]||'?').toUpperCase() + ((k.name||'')[0]||'').toUpperCase();
    if (k.vorname) initials = (k.vorname[0]||'').toUpperCase() + (k.name[0]||'').toUpperCase();

    var card = document.createElement('div');
    card.className = 'k-card';
    card.innerHTML =
      '<div class="k-header">'+
        '<div class="k-avatar" style="background:'+tc.color+';color:'+tc.text+';">'+tc.icon+'</div>'+
        '<div style="flex:1;min-width:0;">'+
          '<div class="k-name">'+escH(k.vorname?k.vorname+' '+k.name:k.name||k.firma||k.email||('Kontakt '+k.id.slice(-4)))+'</div>'+
          (k.firma?'<div class="k-firma">'+escH(k.firma)+'</div>':'<div class="k-firma" style="color:'+tc.text+';">'+escH(k.typ||'')+'</div>')+
        '</div>'+
        '<span class="k-typ" style="background:'+tc.color+';color:'+tc.text+';">'+escH(k.typ||'')+'</span>'+
      '</div>'+
      '<div class="k-meta">'+
        (k.email?'<div class="k-meta-row"><span class="k-meta-icon">✉️</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escH(k.email)+'</span></div>':'')+
        (k.telefon?'<div class="k-meta-row"><span class="k-meta-icon">📞</span>'+escH(k.telefon)+'</div>':'')+
        (k.ort?'<div class="k-meta-row"><span class="k-meta-icon">📍</span>'+escH((k.plz?k.plz+' ':'')+k.ort)+'</div>':'')+
        (k.ansprechpartner?'<div class="k-meta-row"><span class="k-meta-icon">👤</span>'+escH(k.ansprechpartner)+'</div>':'')+
      '</div>'+
      '<div class="k-footer">'+
        '<span class="k-faelle">'+(k.faelle_anzahl>0?'📂 '+k.faelle_anzahl+' Fälle':'Noch keine Fälle')+'</span>'+
        '<div class="k-actions">'+
          '<button class="k-btn k-btn-import" onclick="event.stopPropagation();quickImportInApp(\''+k.id+'\')">↗ Einfügen</button>'+
          '<button class="k-btn k-btn-edit" onclick="event.stopPropagation();openEditor(\''+k.id+'\')">✎</button>'+
          '<button class="k-btn k-btn-del" onclick="event.stopPropagation();loescheKontakt(\''+k.id+'\')">✕</button>'+
        '</div>'+
      '</div>';
    grid.appendChild(card);
  });
}

// ============================================================
// CRUD
// ============================================================
function openEditor(id) {
  _editId = id || null;
  var m = document.getElementById('modal-editor');
  var t = document.getElementById('editor-title');
  if (id) {
    var k = _kontakte.find(function(x){return x.id===id;});
    if (!k) return;
    t.textContent = '✎ Kontakt bearbeiten';
    document.getElementById('e-name').value = k.name||'';
    document.getElementById('e-vorname').value = k.vorname||'';
    document.getElementById('e-typ').value = k.typ||'Sonstiges';
    document.getElementById('e-firma').value = k.firma||'';
    document.getElementById('e-strasse').value = k.strasse||'';
    document.getElementById('e-plz').value = k.plz||'';
    document.getElementById('e-ort').value = k.ort||'';
    document.getElementById('e-telefon').value = k.telefon||'';
    document.getElementById('e-email').value = k.email||'';
    document.getElementById('e-ansprechpartner').value = k.ansprechpartner||'';
    document.getElementById('e-notizen').value = k.notizen||'';
    document.getElementById('e-briefvorlage').value = k.briefvorlage||'';
    document.getElementById('e-gutachten-format').value = k.gutachtenFormat||'';
    document.getElementById('e-sonder').value = k.sonder||'';
  } else {
    t.textContent = '👤 Neuer Kontakt';
    ['e-name','e-vorname','e-firma','e-strasse','e-plz','e-ort','e-telefon','e-email','e-ansprechpartner','e-notizen','e-sonder'].forEach(function(fid){document.getElementById(fid).value='';});
    document.getElementById('e-typ').value = 'Versicherung';
    document.getElementById('e-briefvorlage').value = '';
    document.getElementById('e-gutachten-format').value = '';
  }
  m.classList.add('open');
  setTimeout(function(){document.getElementById('e-name').focus();},100);
}

function closeEditor() { document.getElementById('modal-editor').classList.remove('open'); _editId=null; }

function speichereKontakt() {
  var name = document.getElementById('e-name').value.trim();
  if (!name) { showToast('Name ist Pflichtfeld','err'); return; }
  var felder = {
    name: name,
    vorname: document.getElementById('e-vorname').value.trim(),
    typ: document.getElementById('e-typ').value,
    firma: document.getElementById('e-firma').value.trim(),
    strasse: document.getElementById('e-strasse').value.trim(),
    plz: document.getElementById('e-plz').value.trim(),
    ort: document.getElementById('e-ort').value.trim(),
    telefon: document.getElementById('e-telefon').value.trim(),
    email: document.getElementById('e-email').value.trim(),
    ansprechpartner: document.getElementById('e-ansprechpartner').value.trim(),
    notizen: document.getElementById('e-notizen').value.trim(),
    briefvorlage: document.getElementById('e-briefvorlage').value,
    gutachtenFormat: document.getElementById('e-gutachten-format').value,
    sonder: document.getElementById('e-sonder').value.trim(),
  };
  var savedKontakt;
  if (_editId) {
    var k = _kontakte.find(function(x){return x.id===_editId;});
    if (k) { Object.assign(k, felder); savedKontakt = k; }
  } else {
    savedKontakt = Object.assign({id:genId(), erstellt:new Date().toISOString(), faelle_anzahl:0, import_quelle:'Manuell'}, felder);
    _kontakte.unshift(savedKontakt);
  }
  speichereKontakte();
  closeEditor();
  renderStats();
  renderKontakte();
  showToast(_editId?'Kontakt aktualisiert ✅':'Kontakt gespeichert ✅');
  // Async Airtable-Sync
  if (savedKontakt) syncKontaktZuAirtable(savedKontakt);
}

function loescheKontakt(id) {
  if (!confirm('Kontakt löschen?')) return;
  var zuLoeschen = _kontakte.find(function(k){return k.id===id;});
  _kontakte = _kontakte.filter(function(k){return k.id!==id;});
  speichereKontakte();
  renderStats();
  renderKontakte();
  showToast('Kontakt gelöscht');
  // Async Airtable-Sync
  if (zuLoeschen) deleteKontaktInAirtable(zuLoeschen);
}

// ============================================================
// IMPORT MODAL
// ============================================================
function openImport() { document.getElementById('modal-import').classList.add('open'); }
function closeImport() { document.getElementById('modal-import').classList.remove('open'); }

function switchImportTab(id, btn) {
  document.querySelectorAll('.itab-pane').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.itab').forEach(function(b){b.classList.remove('active');});
  document.getElementById('itab-'+id).classList.add('active');
  btn.classList.add('active');
}

// ── CSV IMPORT ──
function handleCsvDrop(e) {
  e.preventDefault();
  document.getElementById('csv-drop').classList.remove('drag');
  var f = e.dataTransfer.files[0];
  if (f) handleCsvFile(f);
}

function handleCsvFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var text = e.target.result;
    // Versuche Windows-1252 Erkennung (häufig bei GM)
    if (text.includes('\uFFFD')) {
      reader.readAsText(file, 'windows-1252');
      return;
    }
    parseCsv(text);
  };
  reader.readAsText(file, 'utf-8');
}

function parseCsv(text) {
  // Auto-Trennzeichen erkennen
  var delim = text.split('\n')[0].includes(';') ? ';' : ',';
  var lines = text.split('\n').map(function(l){return l.trim();}).filter(Boolean);
  if (lines.length < 2) { showToast('CSV zu klein oder leer','err'); return; }

  var headers = lines[0].split(delim).map(function(h){return h.replace(/^["']|["']$/g,'').trim().toLowerCase();});

  // Spalten-Mapping (fuzzy — erkennt GM, Bauexpert, Excel)
  var MAP = {
    name: ['name','nachname','firmenname','firma','bezeichnung','company','organization','organisation'],
    vorname: ['vorname','firstname','givenname','first name'],
    firma: ['firma','unternehmen','organization','organisation','company','kanzlei'],
    strasse: ['straße','strasse','adresse','address','street'],
    plz: ['plz','postleitzahl','zip','postal','postcode'],
    ort: ['ort','stadt','city','place'],
    telefon: ['telefon','tel','telefonnummer','phone','fon','festnetz'],
    email: ['email','e-mail','mail','e_mail'],
    typ: ['typ','kategorie','type','category','auftraggeber_typ'],
  };

  function findCol(field) {
    var aliases = MAP[field] || [field];
    for (var i=0; i<aliases.length; i++) {
      var idx = headers.indexOf(aliases[i]);
      if (idx>=0) return idx;
    }
    return -1;
  }

  var colMap = {};
  Object.keys(MAP).forEach(function(f){ colMap[f] = findCol(f); });

  var rows = [];
  for (var i=1; i<lines.length; i++) {
    var cols = splitCsvLine(lines[i], delim);
    var get = function(f){ var c=colMap[f]; return c>=0&&c<cols.length ? cols[c].replace(/^["']|["']$/g,'').trim() : ''; };
    var name = get('name');
    if (!name) continue;
    rows.push({
      _sel: true,
      name: name, vorname: get('vorname'),
      firma: get('firma'),
      strasse: get('strasse'), plz: get('plz'), ort: get('ort'),
      telefon: get('telefon'), email: get('email'),
      typ: mapTyp(get('typ')),
      import_quelle: 'CSV-Import',
    });
  }

  _csvRows = rows;
  renderCsvPreview();
}

function splitCsvLine(line, delim) {
  var result = []; var cur = ''; var inQ = false;
  for (var i=0; i<line.length; i++) {
    var c = line[i];
    if (c==='"') { inQ=!inQ; }
    else if (c===delim && !inQ) { result.push(cur); cur=''; }
    else cur+=c;
  }
  result.push(cur);
  return result;
}

function mapTyp(raw) {
  var r = (raw||'').toLowerCase();
  if (r.includes('versicher')) return 'Versicherung';
  if (r.includes('anwalt')||r.includes('rechts')||r.includes('kanzlei')) return 'Anwalt';
  if (r.includes('gericht')) return 'Gericht';
  if (r.includes('hausverwalt')) return 'Hausverwaltung';
  if (r.includes('bauherr')||r.includes('eigentümer')||r.includes('eigentumer')) return 'Bauherr';
  if (r.includes('privat')||r.includes('person')) return 'Privatperson';
  return 'Sonstiges';
}

function renderCsvPreview() {
  document.getElementById('csv-preview').style.display = 'block';
  document.getElementById('csv-info').textContent = _csvRows.length + ' Kontakte erkannt — bitte Auswahl prüfen';
  var sel = _csvRows.filter(function(r){return r._sel;}).length;
  document.getElementById('csv-count-info').textContent = sel + ' von ' + _csvRows.length + ' ausgewählt';

  var table = document.getElementById('csv-preview-table');
  var headRow = '<div class="preview-row preview-head"><div></div><div>Name</div><div>Firma/Typ</div><div>E-Mail / Ort</div><div>Typ</div></div>';
  var rows = _csvRows.map(function(r, i) {
    return '<div class="preview-row">'+
      '<input type="checkbox" class="preview-cb" '+(r._sel?'checked':'')+' onchange="_csvRows['+i+']._sel=this.checked;updateCsvCount()">'+
      '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:12px;color:var(--text);">'+(r.vorname?r.vorname+' ':'')+escH(r.name)+'</div>'+
      '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escH(r.firma||r.typ||'')+'</div>'+
      '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escH(r.email||r.ort||'')+'</div>'+
      '<div><span style="font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(79,142,247,.1);color:#93C5FD;">'+escH(r.typ)+'</span></div>'+
    '</div>';
  }).join('');
  table.innerHTML = headRow + rows;
}

function updateCsvCount() {
  var sel = _csvRows.filter(function(r){return r._sel;}).length;
  document.getElementById('csv-count-info').textContent = sel + ' von ' + _csvRows.length + ' ausgewählt';
}

function csvToggleAlle(val) {
  _csvRows.forEach(function(r){r._sel=val;});
  renderCsvPreview();
}

function csvImportieren() {
  var sel = _csvRows.filter(function(r){return r._sel;});
  if (!sel.length) { showToast('Keine Kontakte ausgewählt','err'); return; }
  var neuAngelegt = 0, doppelt = 0;
  sel.forEach(function(r) {
    // Duplikat-Check per Name+Email
    var dup = _kontakte.find(function(k){
      return k.name.toLowerCase()===r.name.toLowerCase() && (k.email===r.email||!r.email);
    });
    if (dup) { doppelt++; return; }
    _kontakte.unshift(Object.assign({id:genId(), erstellt:new Date().toISOString(), faelle_anzahl:0}, r));
    neuAngelegt++;
  });
  speichereKontakte();
  closeImport();
  resetCsvImport();
  renderStats();
  renderKontakte();
  if(neuAngelegt>0) localStorage.setItem('prova_kontakte_importiert','1');
  showToast(neuAngelegt+' Kontakte importiert'+(doppelt?' ('+doppelt+' Duplikate übersprungen)':'')+'✅');
}

function resetCsvImport() {
  _csvRows = [];
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('csv-file').value = '';
}

// ── VCARD IMPORT ──
function handleVcfDrop(e) {
  e.preventDefault();
  document.getElementById('vcf-drop').classList.remove('drag');
  var f = e.dataTransfer.files[0];
  if (f) handleVcfFile(f);
}

function handleVcfFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e){ parseVcf(e.target.result); };
  reader.readAsText(file, 'utf-8');
}

function parseVcf(text) {
  var vcards = text.split(/BEGIN:VCARD/i).filter(function(v){return v.trim();});
  var rows = [];
  vcards.forEach(function(vc) {
    var get = function(key) {
      var m = vc.match(new RegExp('^'+key+'[^:]*:(.*)','im'));
      return m ? m[1].replace(/\\n/g,'\n').replace(/\\,/g,',').trim() : '';
    };
    var fn = get('FN') || get('N').split(';').reverse().filter(Boolean).join(' ');
    if (!fn) return;

    var nameParts = fn.split(' ');
    var vorname = nameParts.length>1 ? nameParts[0] : '';
    var name = nameParts.length>1 ? nameParts.slice(1).join(' ') : fn;

    var adr = get('ADR').split(';');
    rows.push({
      _sel: true,
      name: name, vorname: vorname,
      firma: get('ORG').split(';')[0],
      strasse: adr[2]||'', plz: adr[5]||'', ort: adr[3]||'',
      telefon: get('TEL'),
      email: get('EMAIL'),
      typ: 'Sonstiges',
      import_quelle: 'vCard-Import',
    });
  });

  _vcfRows = rows;
  renderVcfPreview();
}

function renderVcfPreview() {
  document.getElementById('vcf-preview').style.display='block';
  document.getElementById('vcf-info').textContent = _vcfRows.length + ' Kontakte aus vCard erkannt';
  var table = document.getElementById('vcf-preview-table');
  var head = '<div class="preview-row preview-head"><div></div><div>Name</div><div>Firma</div><div>E-Mail</div><div>Tel</div></div>';
  var rows = _vcfRows.map(function(r,i){
    return '<div class="preview-row">'+
      '<input type="checkbox" class="preview-cb" checked onchange="_vcfRows['+i+']._sel=this.checked">'+
      '<div style="font-size:12px;font-weight:600;color:var(--text);">'+(r.vorname?r.vorname+' ':'')+escH(r.name)+'</div>'+
      '<div>'+escH(r.firma||'')+'</div>'+
      '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escH(r.email||'')+'</div>'+
      '<div>'+escH(r.telefon||'')+'</div>'+
    '</div>';
  }).join('');
  table.innerHTML = head + rows;
}

function vcfImportieren() {
  var sel = _vcfRows.filter(function(r){return r._sel;});
  if (!sel.length) { showToast('Keine Kontakte ausgewählt','err'); return; }
  sel.forEach(function(r){
    _kontakte.unshift(Object.assign({id:genId(), erstellt:new Date().toISOString(), faelle_anzahl:0}, r));
  });
  speichereKontakte();
  closeImport();
  resetVcfImport();
  renderStats();
  renderKontakte();
  if(sel.length>0) localStorage.setItem('prova_kontakte_importiert','1');
  showToast(sel.length+' Kontakte aus vCard importiert ✅');
}

function resetVcfImport() {
  _vcfRows = [];
  document.getElementById('vcf-preview').style.display='none';
  document.getElementById('vcf-file').value='';
}

// ============================================================
// QUICK-IMPORT (wird aus app-starter/pro/enterprise aufgerufen)
// ============================================================
function quickImportInApp(id) {
  var k = _kontakte.find(function(x){return x.id===id;});
  if (!k) return;

  // Felder in sessionStorage für die aufrufende App
  var payload = {
    auftraggeber_name: (k.vorname?k.vorname+' ':'')+k.name,
    auftraggeber_typ: k.typ,
    auftraggeber_email: k.email||'',
    auftraggeber_telefon: k.telefon||'',
    ansprechpartner: k.ansprechpartner||'',
    firma: k.firma||'',
  };
  sessionStorage.setItem('prova_kontakt_import', JSON.stringify(payload));

  // postMessage falls Popup — kompatibel mit app-pro + app-enterprise
  var msgPayload = {
    name: k.name || k.firma || '',
    firma: k.firma || '',
    typ: k.typ || '',
    email: k.email || '',
    telefon: k.telefon || '',
    ort: k.ort || '',
    ansprechpartner: k.ansprechpartner || ''
  };
  // Recent-Tracking (Figma-Style: zuletzt verwendet oben)
  try {
    var rk = JSON.parse(localStorage.getItem('prova_kontakte_recent')||'[]');
    rk = rk.filter(function(x){return x!==id;});
    rk.unshift(id); rk = rk.slice(0,5);
    localStorage.setItem('prova_kontakte_recent', JSON.stringify(rk));
  } catch(e) {}

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({type:'prova_kontakt_selected', kontakt: msgPayload}, '*');
    window.opener.postMessage({type:'prova_kontakt_import', kontakt: payload}, '*');
    showToast('Kontakt übertragen ✅');
    setTimeout(function(){ window.close(); }, 600);
  } else {
    var lastApp = sessionStorage.getItem('prova_last_app') || 'app.html';
    showToast('Kontakt geladen — weiter zu ' + lastApp.split('.')[0]);
    setTimeout(function(){ window.location.href = lastApp; }, 800);
  }
}

window.openQuickImport = function(returnUrl) {
  if (returnUrl) sessionStorage.setItem('prova_last_app', returnUrl);
  document.getElementById('qi-search').value = '';
  renderQuickImportListe();
  document.getElementById('modal-quickimport').classList.add('open');
};

function closeQuickImport() { document.getElementById('modal-quickimport').classList.remove('open'); }

function renderQuickImportListe() {
  var suche = (document.getElementById('qi-search').value||'').toLowerCase();
  var gefiltert = _kontakte.filter(function(k){
    if (!suche) return true;
    return [(k.vorname||''),(k.name||''),(k.firma||''),(k.email||''),(k.ort||'')].join(' ').toLowerCase().includes(suche);
  }).slice(0,30);

  var liste = document.getElementById('qi-liste');
  if (!gefiltert.length) {
    liste.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;">Keine Kontakte'+(suche?' gefunden':' vorhanden')+'</div>';
    return;
  }
  liste.innerHTML = gefiltert.map(function(k){
    var tc = TYP_CONFIG[k.typ]||TYP_CONFIG['Sonstiges'];
    return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">'+
      '<div style="width:32px;height:32px;border-radius:8px;background:'+tc.color+';color:'+tc.text+';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">'+tc.icon+'</div>'+
      '<div style="flex:1;min-width:0;">'+
        '<div style="font-size:13px;font-weight:700;color:var(--text);">'+(k.vorname?k.vorname+' ':'')+escH(k.name)+'</div>'+
        '<div style="font-size:11px;color:var(--text3);">'+escH(k.typ+(k.ort?' · '+k.ort:'')+(k.email?' · '+k.email:''))+'</div>'+
      '</div>'+
      '<button onclick="quickImportInApp(\''+k.id+'\')" style="padding:6px 12px;background:var(--accent);border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font-ui);">↗ Einfügen</button>'+
    '</div>';
  }).join('');
}

// ============================================================
// HELPERS
// ============================================================
function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.showToast = window.showToast || window.zeigToast || function(m){ alert(m); };

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function(){
  // Auth
  if (!localStorage.getItem('prova_user')) { window.location.href='app-login.html'; return; }

  // Paket Badge
  var p = localStorage.getItem('prova_paket')||'Solo';
  var c = {Solo:'#4f8ef7',Team:'#a78bfa',Starter:'#4f8ef7',Pro:'#4f8ef7',Enterprise:'#a78bfa'}[p]||'#4f8ef7';
  var badge = document.getElementById('topbarPaket');
  if (badge) { badge.textContent=p; badge.setAttribute('style','background:'+c+'18;color:'+c+';border:1px solid '+c+'33'); }

  ladeKontakte();
  renderStats();
  renderKontakte();

  // URL-Parameter: ?modus=quickimport
  var params = new URLSearchParams(window.location.search);
  if (params.get('modus')==='quickimport') {
    var returnUrl = params.get('return')||'app.html';
    setTimeout(function(){ window.openQuickImport(returnUrl); }, 200);
  }

  // Escape schliesst Modals
  document.addEventListener('keydown', function(e){
    if (e.key==='Escape') {
      closeEditor(); closeImport(); closeQuickImport();
    }
  });
});

/* ─────────────────────────────────────────── */

var _supT;
var _SFAQ=[
  {q:['pdf','download'],a:'PDFs werden nach der Freigabe automatisch erstellt und per E-Mail versendet.'},
  {q:['rechnung','jveg'],a:'Im JVEG-Rechner können Sie Stunden erfassen und direkt "Als Rechnung übernehmen" klicken.'},
  {q:['frist','termin','kalender'],a:'Unter Kalender können Sie alle Fristen und Termine einsehen und neu anlegen.'},
  {q:['passwort','login'],a:'Das Passwort kann nur durch einen Administrator zurückgesetzt werden. Bitte wenden Sie sich an support@prova-systems.de.'}
];
function supAnalyse(){clearTimeout(_supT);_supT=setTimeout(function(){var txt=(document.getElementById('sup-betreff').value+' '+document.getElementById('sup-msg').value).toLowerCase();var f=_SFAQ.find(function(x){return x.q.some(function(w){return txt.includes(w);});});var box=document.getElementById('sup-faq-box');if(f){document.getElementById('sup-faq-txt').textContent=f.a;box.style.display='block';}else box.style.display='none';},600);}
function supFaqOk(){document.getElementById('sup-form').style.display='none';document.getElementById('sup-faq-box').style.display='none';document.getElementById('sup-ok').style.display='block';}
function supClose(){document.getElementById('sup-modal').classList.remove('open');document.getElementById('sup-ok').style.display='none';document.getElementById('sup-form').style.display='block';document.getElementById('sup-betreff').value='';document.getElementById('sup-msg').value='';}
async function supSend(){var b=document.getElementById('sup-betreff').value.trim(),n=document.getElementById('sup-msg').value.trim();if(!b||!n){document.getElementById('sup-err').style.display='block';return;}document.getElementById('sup-err').style.display='none';var btn=document.getElementById('sup-btn');btn.disabled=true;btn.textContent='⏳ Wird gesendet...';try{await fetch('https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({betreff:b,nachricht:n,sv_email:localStorage.getItem('prova_sv_email')||'',paket:localStorage.getItem('prova_paket')||'Solo',seite:window.location.pathname,ts:new Date().toISOString()})});}catch(e){}document.getElementById('sup-form').style.display='none';document.getElementById('sup-faq-box').style.display='none';document.getElementById('sup-ok').style.display='block';}

/* ─────────────────────────────────────────── */

(function(){
  var paket=localStorage.getItem('prova_paket')||'Solo';
  var pc={'Solo':'#4f8ef7','Team':'#a78bfa'}[paket]||'#4f8ef7';
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.textContent=paket;el.style.cssText='font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;letter-spacing:.04em;background:'+pc+'18;color:'+pc+';border:1px solid '+pc+'33;';}
  var appUrl=paket==='Team'?'app.html':paket==='Solo'?'gutachten.html':'app.html';
})();

/* ── VCF-EXPORT ALLE KONTAKTE ── */
window.exportAlleVCF = function() {
  if (typeof ladeKontakte === 'function') ladeKontakte();
  var alle = typeof alleKontakte !== 'undefined' ? alleKontakte : [];
  if (!alle.length) {
    try { alle = JSON.parse(localStorage.getItem('prova_kontakte') || '[]'); } catch(e) {}
  }
  if (!alle.length) { if(typeof showToast==='function') showToast('Keine Kontakte zum Exportieren', 'warning'); return; }

  var vcf = alle.map(function(k) {
    var lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    var name = k.name || k.fields?.Name || '';
    var firma = k.firma || k.fields?.Firma || '';
    var email = k.email || k.fields?.Email || '';
    var tel   = k.telefon || k.fields?.Telefon || '';
    var typ   = k.typ || k.fields?.Typ || '';
    var adr   = k.adresse || k.fields?.Adresse || '';

    if (name) {
      var parts = name.trim().split(/\s+/);
      var last = parts.length > 1 ? parts.pop() : '';
      lines.push('FN:' + name);
      lines.push('N:' + last + ';' + parts.join(' ') + ';;;');
    }
    if (firma) lines.push('ORG:' + firma);
    if (email) lines.push('EMAIL;TYPE=INTERNET:' + email);
    if (tel)   lines.push('TEL;TYPE=VOICE:' + tel);
    if (adr)   lines.push('ADR;TYPE=WORK:;;' + adr + ';;;;');
    if (typ)   lines.push('TITLE:' + typ);
    lines.push('END:VCARD');
    return lines.join('\n');
  }).join('\n');

  var blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'PROVA_Kontakte_' + new Date().toISOString().split('T')[0] + '.vcf';
  a.click();
  URL.revokeObjectURL(url);
  if(typeof showToast==='function') showToast(alle.length + ' Kontakte als VCF exportiert ✅', 'success');
};


/* ── escHtml: XSS-Schutz ── */
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}